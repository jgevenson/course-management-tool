async function test() {
  console.log('Fetching Nominatim...');
  const nomRes = await fetch('https://nominatim.openstreetmap.org/search?q=Blue+Top+Ridge&format=jsonv2&class=leisure&type=golf_course', {
    headers: { 'User-Agent': 'CourseManagementTool/1.0' }
  });
  const nomData = await nomRes.json();
  
  if (nomData.length > 0) {
    const course = nomData[0];
    const bbox = course.boundingbox;
    const bboxQuery = `(${bbox[0]}, ${bbox[2]}, ${bbox[1]}, ${bbox[3]})`;
    
    const overpassQuery = `[out:json][timeout:25]; ( nwr["golf"]${bboxQuery}; nwr(id:${course.osm_id}); ); out body; >; out skel qt;`;
    
    console.log('Overpass Query:', overpassQuery);
    
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(overpassQuery)
    });
    
    const overpassData = await overpassRes.json();
    console.log('Overpass elements count:', overpassData.elements.length);
    
    const tags = new Set();
    overpassData.elements.forEach(el => {
      if (el.tags && el.tags.golf) {
        tags.add(el.tags.golf);
      }
    });
    console.log('Golf tags found:', Array.from(tags));
  }
}
test();
