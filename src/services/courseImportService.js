import { supabase } from '../supabaseClient'

export async function importCourseToSupabase(parsedData) {
  try {
    // 1. Insert Course (without location first, then update location via RPC)
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert({
        name: parsedData.course.name,
        user_id: parsedData.course.user_id,
        is_active: true
      })
      .select()
      .single()

    if (courseError) throw courseError

    const courseId = courseData.id

    // Update location via RPC
    if (parsedData.course.course_lat && parsedData.course.course_lng) {
      const { error: locError } = await supabase.rpc('update_course_location', {
        p_course_id: courseId,
        p_lat: parsedData.course.course_lat,
        p_lng: parsedData.course.course_lng
      })
      if (locError) throw locError
    }

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

    // 3. Insert Hole Markers (Tees, Greens) - use RPC for PostGIS
    const markersToInsert = parsedData.holeMarkers.map(marker => {
      const holeNumber = parseInt(marker._osm_ref)
      const holeId = holeIdMap[holeNumber]

      return {
        hole_id: holeId || null,
        marker_kind: marker.marker_kind,
        lat: marker.lat,
        lng: marker.lng
      }
    }).filter(m => m.hole_id !== null)

    for (const m of markersToInsert) {
      const { error: mErr } = await supabase.rpc('add_map_marker', {
        p_hole_id: m.hole_id,
        p_marker_kind: m.marker_kind,
        p_lat: m.lat,
        p_lng: m.lng
      })
      if (mErr) throw mErr
    }

    // 4. Insert Terrain Overlays (Fairways, Bunkers, Water, Greens) - use RPC for PostGIS
    if (parsedData.terrainOverlays && parsedData.terrainOverlays.length > 0) {
      for (const overlay of parsedData.terrainOverlays) {
        const { error: overlaysError } = await supabase.rpc('upsert_terrain_overlay', {
          p_id: null,
          p_course_id: courseId,
          p_terrain_type: overlay.terrain_type,
          p_risk_tier: overlay.risk_tier,
          p_geojson_data: overlay.geojson_data
        })
        if (overlaysError) throw overlaysError
      }
    }

    // Return the new course ID so we can navigate to it
    return courseId
  } catch (error) {
    console.error('Error importing course to Supabase:', error)
    throw error
  }
}

export async function importApiCourseToSupabase(courseData, userId) {
  try {
    const courseName = courseData.course_name || courseData.club_name;
    const { data: courseDbData, error: courseError } = await supabase
      .from('courses')
      .insert({
        name: courseName,
        user_id: userId,
        address_line: courseData.location?.address || null,
        city: courseData.location?.city || null,
        region: courseData.location?.state || null,
        country: courseData.location?.country || null,
        course_lat: courseData.location?.latitude || 0,
        course_lng: courseData.location?.longitude || 0,
        is_active: true
      })
      .select()
      .single()

    if (courseError) throw courseError

    const courseId = courseDbData.id

    if (courseData.location?.latitude && courseData.location?.longitude) {
      const { error: locError } = await supabase.rpc('update_course_location', {
        p_course_id: courseId,
        p_lat: courseData.location.latitude,
        p_lng: courseData.location.longitude
      })
      if (locError) throw locError
    }

    const maleTees = courseData.tees?.male || [];
    if (maleTees.length === 0) {
      return courseId;
    }

    const teesToInsert = maleTees.map((tee, index) => ({
      course_id: courseId,
      user_id: userId,
      name: tee.tee_name,
      rating: tee.course_rating,
      slope: tee.slope_rating,
      sort_order: index,
      is_default: index === 0,
      is_active: true
    }));

    const { data: teesData, error: teesError } = await supabase
      .from('course_tees')
      .insert(teesToInsert)
      .select()

    if (teesError) throw teesError

    const primaryTee = maleTees[0];
    const holesToInsert = primaryTee.holes.map((hole, index) => ({
      course_id: courseId,
      hole_number: index + 1,
      par: hole.par,
      stroke_index: hole.handicap,
      is_active: true
    }));

    let insertedHoles = []
    if (holesToInsert.length > 0) {
      const { data: holesData, error: holesError } = await supabase
        .from('holes')
        .insert(holesToInsert)
        .select()
      
      if (holesError) throw holesError
      insertedHoles = holesData
    }

    const holeIdMap = {}
    insertedHoles.forEach(h => {
      holeIdMap[h.hole_number] = h.id
    })

    const yardagesToInsert = [];
    maleTees.forEach((tee, teeIndex) => {
      const teeDbId = teesData[teeIndex].id;
      tee.holes.forEach((hole, holeIndex) => {
        const holeNumber = holeIndex + 1;
        const holeDbId = holeIdMap[holeNumber];
        if (holeDbId && hole.yardage) {
          yardagesToInsert.push({
            hole_id: holeDbId,
            tee_id: teeDbId,
            yardage: hole.yardage,
            is_active: true
          });
        }
      });
    });

    if (yardagesToInsert.length > 0) {
      const { error: yardagesError } = await supabase
        .from('hole_tee_yardages')
        .insert(yardagesToInsert)
      
      if (yardagesError) throw yardagesError
    }

    return courseId
  } catch (error) {
    console.error('Error importing API course to Supabase:', error)
    throw error
  }
}
