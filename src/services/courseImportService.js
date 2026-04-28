import { supabase } from '../supabaseClient'

export async function importCourseToSupabase(parsedData) {
  try {
    // 1. Insert Course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert({
        name: parsedData.course.name,
        user_id: parsedData.course.user_id,
        course_lat: parsedData.course.course_lat,
        course_lng: parsedData.course.course_lng,
        is_active: true
      })
      .select()
      .single()

    if (courseError) throw courseError

    const courseId = courseData.id

    // 2. Insert Holes
    const holesToInsert = parsedData.holes.map(hole => ({
      course_id: courseId,
      hole_number: hole.hole_number,
      par: hole.par,
      stroke_index: hole.stroke_index,
      is_active: true
    }))

    let insertedHoles = []
    if (holesToInsert.length > 0) {
      const { data: holesData, error: holesError } = await supabase
        .from('holes')
        .insert(holesToInsert)
        .select()
      
      if (holesError) throw holesError
      insertedHoles = holesData
    }

    // Map hole numbers to their generated IDs
    const holeIdMap = {}
    insertedHoles.forEach(h => {
      holeIdMap[h.hole_number] = h.id
    })

    // 3. Insert Hole Markers (Tees, Greens)
    const markersToInsert = parsedData.holeMarkers.map(marker => {
      const holeNumber = parseInt(marker._osm_ref)
      const holeId = holeIdMap[holeNumber] // Might be undefined if OSM data is disconnected

      return {
        hole_id: holeId || null, // Allow null if we couldn't match a hole
        marker_kind: marker.marker_kind,
        lat: marker.lat,
        lng: marker.lng,
        is_active: true
      }
    }).filter(m => m.hole_id !== null) // Only insert if we mapped it to a hole

    if (markersToInsert.length > 0) {
      const { error: markersError } = await supabase
        .from('hole_map_markers')
        .insert(markersToInsert)
      
      if (markersError) throw markersError
    }

    // 4. Insert Terrain Overlays (Fairways, Bunkers, Water, Greens)
    const overlaysToInsert = parsedData.terrainOverlays.map(overlay => ({
      course_id: courseId,
      terrain_type: overlay.terrain_type,
      risk_tier: overlay.risk_tier,
      label: overlay.label,
      geojson_data: overlay.geojson_data,
      is_active: true
    }))

    if (overlaysToInsert.length > 0) {
      const { error: overlaysError } = await supabase
        .from('terrain_overlays')
        .insert(overlaysToInsert)
      
      if (overlaysError) throw overlaysError
    }

    // Return the new course ID so we can navigate to it
    return courseId
  } catch (error) {
    console.error('Error importing course to Supabase:', error)
    throw error
  }
}
