import { supabase } from '../../supabaseClient'
import * as GeoTIFF from 'geotiff'
import { polygonContains } from 'd3-polygon'

function getBoundingBox(coordinates) {
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
  for (const [lon, lat] of coordinates) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return { minLon, minLat, maxLon, maxLat }
}

export async function fetchGreenElevationMatrix(holeId) {
  try {
    // 1. Fetch green polygon for the hole
    const { data: mappingData, error: mappingError } = await supabase
      .from('terrain_overlay_holes')
      .select(`
        terrain_overlays!inner (
          id,
          geojson_data,
          terrain_type
        )
      `)
      .eq('hole_id', holeId)
      .eq('terrain_overlays.terrain_type', 'green')

    if (mappingError) throw mappingError
    if (!mappingData || mappingData.length === 0) {
      throw new Error('No green terrain overlay found for this hole.')
    }

    const greenFeature = mappingData[0].terrain_overlays.geojson_data
    if (!greenFeature || !greenFeature.geometry || !greenFeature.geometry.coordinates) {
      throw new Error('Green overlay is missing valid GeoJSON geometry.')
    }

    // Assuming a single outer ring for the polygon
    const coordinates = greenFeature.geometry.type === 'Polygon' 
      ? greenFeature.geometry.coordinates[0] 
      : greenFeature.geometry.coordinates[0][0]; // For MultiPolygon

    const bbox = getBoundingBox(coordinates)
    
    // 2. Calculate dimensions (1 point per foot)
    const latRad = bbox.minLat * Math.PI / 180
    const feetPerLat = 364000
    const feetPerLon = 364000 * Math.cos(latRad)
    
    const widthFeet = (bbox.maxLon - bbox.minLon) * feetPerLon
    const heightFeet = (bbox.maxLat - bbox.minLat) * feetPerLat
    
    // Safety throttle: Limit size to prevent abuse or memory issues
    if (widthFeet > 500 || heightFeet > 500) {
      throw new Error('Green bounding box exceeds 500x500 feet, which is too large for this pipeline.')
    }

    const widthPixels = Math.max(10, Math.ceil(widthFeet))
    const heightPixels = Math.max(10, Math.ceil(heightFeet))

    // 3. Fetch from USGS 3DEP Web Coverage Service (exportImage)
    // We request a GeoTIFF using Web Mercator (102100) or WGS84 (4326). 
    // exportImage automatically interpolates a raster for the bounding box.
    const usgsUrl = new URL('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage')
    usgsUrl.searchParams.append('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
    usgsUrl.searchParams.append('bboxSR', '4326')
    usgsUrl.searchParams.append('size', `${widthPixels},${heightPixels}`)
    usgsUrl.searchParams.append('imageSR', '4326')
    usgsUrl.searchParams.append('time', '')
    usgsUrl.searchParams.append('format', 'tiff')
    usgsUrl.searchParams.append('pixelType', 'F32')
    usgsUrl.searchParams.append('noData', '')
    usgsUrl.searchParams.append('noDataInterpretation', 'esriNoDataMatchAny')
    usgsUrl.searchParams.append('interpolation', '+RSP_BilinearInterpolation')
    usgsUrl.searchParams.append('f', 'image')

    const response = await fetch(usgsUrl.toString())
    if (!response.ok) {
      throw new Error(`USGS API responded with status: ${response.status}`)
    }

    // 4. Parse the GeoTIFF
    const buffer = await response.arrayBuffer()
    const tiff = await GeoTIFF.fromArrayBuffer(buffer)
    const image = await tiff.getImage()
    const rasters = await image.readRasters()
    const elevationData = rasters[0] // Float32Array containing meters
    
    const imgWidth = image.getWidth()
    const imgHeight = image.getHeight()

    // 5. Process matrix data (Filter by polygon and calc slope)
    const matrixData = []
    
    // Helper to read elevation from raster array (handling bounds)
    const getZ = (x, y) => {
      if (x < 0 || x >= imgWidth || y < 0 || y >= imgHeight) return null
      const meters = elevationData[y * imgWidth + x]
      // Exclude standard no-data values which are usually very large negative numbers in USGS
      if (meters < -10000) return null 
      return meters * 3.28084 // Convert meters to feet
    }

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        // Map pixel back to lat/lon (USGS exportImage returns top-down image)
        const lon = bbox.minLon + (x / (imgWidth - 1)) * (bbox.maxLon - bbox.minLon)
        const lat = bbox.maxLat - (y / (imgHeight - 1)) * (bbox.maxLat - bbox.minLat)

        // Point-in-polygon check
        if (!polygonContains(coordinates, [lon, lat])) {
          continue; // Skip points outside the green
        }

        const z = getZ(x, y)
        if (z === null) continue

        // Calculate slope (dz/dx and dz/dy) using central difference
        const zLeft = getZ(x - 1, y) ?? z
        const zRight = getZ(x + 1, y) ?? z
        const zUp = getZ(x, y - 1) ?? z
        const zDown = getZ(x, y + 1) ?? z

        const dx = (zRight - zLeft) / 2.0 // change in feet per 1 foot horizontal
        const dy = (zDown - zUp) / 2.0    // change in feet per 1 foot vertical

        const slope_pct = Math.sqrt(dx * dx + dy * dy) * 100
        // Aspect in degrees (0 = North, 90 = East, etc.)
        let aspect_deg = Math.atan2(dx, -dy) * (180 / Math.PI)
        if (aspect_deg < 0) aspect_deg += 360

        matrixData.push({
          x,
          y,
          z,
          slope_pct,
          aspect_deg,
          lon,
          lat
        })
      }
    }

    if (matrixData.length === 0) {
      throw new Error('No valid elevation points found within the green polygon.')
    }

    // 6. Save to Supabase
    const payload = {
      hole_id: holeId,
      grid_spacing_feet: 1.0,
      matrix_data: {
        width: imgWidth,
        height: imgHeight,
        bbox: bbox,
        points: matrixData
      }
    }

    const { data: upsertData, error: upsertError } = await supabase
      .from('green_contours')
      .upsert(payload, { onConflict: 'hole_id' })
      .select()
      .single()

    if (upsertError) throw upsertError

    return upsertData

  } catch (err) {
    console.error('fetchGreenElevationMatrix failed:', err)
    throw err
  }
}
