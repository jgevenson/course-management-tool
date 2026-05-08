const API_BASE_URL = 'https://api.golfcourseapi.com/v1';

export async function searchCourses(query) {
  const apiKey = import.meta.env.VITE_GOLF_COURSE_API_KEY;
  if (!apiKey) {
    throw new Error('Golf Course API key is missing from environment variables.');
  }

  const response = await fetch(`${API_BASE_URL}/search?search_query=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to search courses: ${response.statusText}`);
  }

  const data = await response.json();
  return data.courses || [];
}

export async function getCourseDetails(id) {
  const apiKey = import.meta.env.VITE_GOLF_COURSE_API_KEY;
  if (!apiKey) {
    throw new Error('Golf Course API key is missing from environment variables.');
  }

  const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch course details: ${response.statusText}`);
  }

  const data = await response.json();
  return data.course;
}
