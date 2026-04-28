import osmtogeojson from 'osmtogeojson'

// Search for golf courses using Nominatim API
export async function searchOSMCourses(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&class=leisure&type=golf_course`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch from Nominatim')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error searching OSM courses:', error)
    throw error
  }
}

// Fetch detailed golf course data from Overpass API
export async function fetchCourseDetailsFromOverpass(osmType, osmId, bbox) {
  // Bbox from Nominatim is [minLat, maxLat, minLon, maxLon]
  // Overpass expects (minLat, minLon, maxLat, maxLon)
  const bboxQuery = `(${bbox[0]}, ${bbox[2]}, ${bbox[1]}, ${bbox[3]})`

  // The query fetches the main course polygon/way, and all golf-related features inside its bounding box.
  const query = `
    [out:json][timeout:25];
    (
      nwr["golf"]${bboxQuery};
      nwr(id:${osmId});
    );
    out body;
    >;
    out skel qt;
  `
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(query)
    })
    
    if (!response.ok) throw new Error('Failed to fetch from Overpass API')
    const data = await response.json()
    
    // Convert OSM JSON to GeoJSON
    const geojson = osmtogeojson(data)
    
    return { osmData: data, geojson }
  } catch (error) {
    console.error('Error fetching details from Overpass:', error)
    throw error
  }
}

// Map OSM/GeoJSON data to our application's database schema
export function parseOSMDataToSchema(geojson, courseName, userId) {
  // We need to generate a course object, holes, terrain overlays, etc.
  const parsed = {
    course: {
      name: courseName,
      user_id: userId,
      // We will set lat/lng based on the course polygon centroid
      course_lat: null,
      course_lng: null,
      is_active: true
    },
    holes: [],
    terrainOverlays: [],
    holeMarkers: []
  }

  // Helper to find the main course polygon
  let courseFeature = null

  // Helper to get centroid of a polygon coordinates array
  const getCentroid = (coords) => {
    // For a simple polygon (first ring)
    const ring = coords[0]
    if (!ring || ring.length === 0) return null
    let lat = 0, lng = 0
    for (let i = 0; i < ring.length - 1; i++) {
      lng += ring[i][0]
      lat += ring[i][1]
    }
    // Divide by number of vertices (excluding the closing duplicate vertex)
    const len = ring.length - 1
    return { lat: lat / len, lng: lng / len }
  }

  geojson.features.forEach(feature => {
    const tags = feature.properties || {}
    
    if (tags.leisure === 'golf_course' && !courseFeature) {
      courseFeature = feature
      if (feature.geometry.type === 'Polygon') {
        const centroid = getCentroid(feature.geometry.coordinates)
        if (centroid) {
          parsed.course.course_lat = centroid.lat
          parsed.course.course_lng = centroid.lng
        }
      } else if (feature.geometry.type === 'Point') {
        parsed.course.course_lat = feature.geometry.coordinates[1]
        parsed.course.course_lng = feature.geometry.coordinates[0]
      }
    }

    if (tags.golf === 'hole') {
      const holeNum = parseInt(tags.ref)
      if (!isNaN(holeNum) && holeNum >= 1 && holeNum <= 18) {
        parsed.holes.push({
          hole_number: holeNum,
          par: parseInt(tags.par) || 4, // Default to 4 if missing
          stroke_index: parseInt(tags.handicap) || null,
          is_active: true
        })
      }
      
      // If it's a polygon, we might also want to save it as a terrain overlay, but typically holes are just logical groupings or centerlines.
      // We will just extract the data.
    }

    if (tags.golf === 'green') {
      parsed.terrainOverlays.push({
        terrain_type: 'green',
        geojson_data: feature,
        label: tags.ref ? `Green ${tags.ref}` : 'Green',
        risk_tier: null
      })
      // If we have a green polygon, let's create a green_center marker
      if (feature.geometry.type === 'Polygon') {
        const centroid = getCentroid(feature.geometry.coordinates)
        if (centroid) {
          parsed.holeMarkers.push({
            marker_kind: 'green_center',
            lat: centroid.lat,
            lng: centroid.lng,
            // we will link hole_id later
            _osm_ref: tags.ref // store temp ref to link to hole
          })
        }
      }
    }

    if (tags.golf === 'tee') {
      // It could be a point or a polygon
      let lat, lng
      if (feature.geometry.type === 'Point') {
        lng = feature.geometry.coordinates[0]
        lat = feature.geometry.coordinates[1]
      } else if (feature.geometry.type === 'Polygon') {
        const centroid = getCentroid(feature.geometry.coordinates)
        if (centroid) {
          lat = centroid.lat
          lng = centroid.lng
        }
      }

      if (lat && lng) {
        parsed.holeMarkers.push({
          marker_kind: 'tee_back', // default to back tee, user can change later
          lat,
          lng,
          _osm_ref: tags.ref
        })
      }
    }

    if (['fairway', 'bunker', 'water_hazard', 'rough'].includes(tags.golf)) {
      parsed.terrainOverlays.push({
        terrain_type: tags.golf,
        geojson_data: feature,
        label: tags.golf.replace('_', ' '),
        risk_tier: tags.golf === 'water_hazard' ? 3 : (tags.golf === 'bunker' ? 2 : 1)
      })
    }
  })

  // Ensure course has lat/lng, if not, pick from a hole marker
  if (!parsed.course.course_lat && parsed.holeMarkers.length > 0) {
    parsed.course.course_lat = parsed.holeMarkers[0].lat
    parsed.course.course_lng = parsed.holeMarkers[0].lng
  }

  // Default lat/lng if we still have nothing
  if (!parsed.course.course_lat) {
    parsed.course.course_lat = 0
    parsed.course.course_lng = 0
  }

  return parsed
}

// Fetch general OSM features (golf, natural=water/sand) within a specific bounding box
export async function fetchOSMFeaturesInBbox(minLat, minLon, maxLat, maxLon) {
  const bboxQuery = `(${minLat}, ${minLon}, ${maxLat}, ${maxLon})`

  const query = `
    [out:json][timeout:25];
    (
      nwr["golf"]${bboxQuery};
      nwr["natural"="water"]${bboxQuery};
      nwr["natural"="sand"]${bboxQuery};
    );
    out body;
    >;
    out skel qt;
  `
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(query)
    })
    
    if (!response.ok) throw new Error('Failed to fetch from Overpass API')
    const data = await response.json()
    
    // Convert OSM JSON to GeoJSON
    const geojson = osmtogeojson(data)
    
    // Filter out the nodes that make up polygons if they don't have tags of their own
    // OSmtogeojson sometimes includes raw points that are part of ways if they have tags,
    // but we only want features with actual meaning (golf=*, natural=*)
    const filteredFeatures = geojson.features.filter(f => {
      const p = f.properties || {}
      return p.golf || p.natural === 'water' || p.natural === 'sand'
    })
    
    return { ...geojson, features: filteredFeatures }
  } catch (error) {
    console.error('Error fetching features from Overpass:', error)
    throw error
  }
}
