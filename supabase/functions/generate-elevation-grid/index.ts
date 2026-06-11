// Deno Supabase Edge Function to fetch, parse and store USGS elevation grids.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import * as GeoTIFF from "https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { hole_id, resolution } = await req.json()
    if (!hole_id) {
      return new Response(JSON.stringify({ error: "Missing hole_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch hole extent bounding box from DB view
    const { data: extent, error: extErr } = await supabase.rpc('get_hole_extent', { p_hole_id: hole_id })
    if (extErr || !extent) {
      throw new Error(extErr?.message || "Could not find extent for hole. Make sure the hole has planar overlays drawn.")
    }

    const { minLon, minLat, maxLon, maxLat } = extent

    // 2. Calculate pixel width/height based on resolution (meters)
    const latMid = (minLat + maxLat) / 2
    const metersPerDegreeLat = 111320
    const metersPerDegreeLon = 111320 * Math.cos(latMid * Math.PI / 180)

    const widthMeters = (maxLon - minLon) * metersPerDegreeLon
    const heightMeters = (maxLat - minLat) * metersPerDegreeLat

    const res = resolution || 3 // Default 3 meters spacing
    const widthPixels = Math.max(5, Math.ceil(widthMeters / res))
    const heightPixels = Math.max(5, Math.ceil(heightMeters / res))

    // 3. Construct USGS 3DEP exportImage REST API URL
    const usgsUrl = new URL('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage')
    usgsUrl.searchParams.append('bbox', `${minLon},${minLat},${maxLon},${maxLat}`)
    usgsUrl.searchParams.append('bboxSR', '4326')
    usgsUrl.searchParams.append('size', `${widthPixels},${heightPixels}`)
    usgsUrl.searchParams.append('imageSR', '4326')
    usgsUrl.searchParams.append('format', 'tiff')
    usgsUrl.searchParams.append('pixelType', 'F32')
    usgsUrl.searchParams.append('f', 'image')

    // 4. Fetch USGS GeoTIFF with a 3-attempt retry loop
    let response = null;
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`USGS Fetch attempt ${i + 1} for URL: ${usgsUrl.toString()}`);
        response = await fetch(usgsUrl.toString());
        if (response.ok) {
          break;
        }
        if (response.status >= 500 && i < attempts - 1) {
          console.warn(`USGS API returned status ${response.status}. Retrying in 1s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw new Error(`USGS WCS request failed with status: ${response.status}`);
        }
      } catch (err) {
        if (i < attempts - 1) {
          console.warn(`USGS API fetch failed: ${err.message}. Retrying in 1s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw err;
        }
      }
    }

    if (!response || !response.ok) {
      throw new Error(`USGS WCS request failed after ${attempts} attempts.`);
    }

    // 5. Parse the GeoTIFF binary
    const buffer = await response.arrayBuffer()
    const tiff = await GeoTIFF.fromArrayBuffer(buffer)
    const image = await tiff.getImage()
    const rasters = await image.readRasters()
    const elevationData = rasters[0] as Float32Array

    const imgWidth = image.getWidth()
    const imgHeight = image.getHeight()

    // 6. Convert Float32 elevation array (meters) to 2D matrix (yards)
    const grid: number[][] = []
    for (let y = 0; y < imgHeight; y++) {
      const row: number[] = []
      for (let x = 0; x < imgWidth; x++) {
        const meters = elevationData[y * imgWidth + x]
        // Convert to yards (meters * 1.09361)
        row.push(meters * 1.09361)
      }
      grid.push(row)
    }

    // 7. Upsert the grid data to Supabase using WKT geometry representation
    const bboxWkt = `POLYGON((${minLon} ${minLat}, ${maxLon} ${minLat}, ${maxLon} ${maxLat}, ${minLon} ${maxLat}, ${minLon} ${minLat}))`
    const gridPayload = {
      width: imgWidth,
      height: imgHeight,
      grid,
      extent
    }

    const { data: upsertData, error: upsertErr } = await supabase.rpc('upsert_hole_elevation_grid', {
      p_hole_id: hole_id,
      p_resolution: res,
      p_wkt_bbox: bboxWkt,
      p_grid_data: gridPayload
    })

    if (upsertErr) throw upsertErr

    return new Response(JSON.stringify(upsertData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
