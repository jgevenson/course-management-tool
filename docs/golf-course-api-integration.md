# Golf Course API Integration

This document outlines the integration with the external Golf Course API (`api.golfcourseapi.com`). This API is used to search for golf courses and import them into the Supabase database.

## Prerequisites

To use the API, you must have an API key. 
1. The API key must be placed in the `.env` file.
2. The variable must be named `VITE_GOLF_COURSE_API_KEY` so that Vite can expose it to the React frontend.

```env
VITE_GOLF_COURSE_API_KEY=your_api_key_here
```

## Data Flow

1. **Search (`GET /v1/search?search_query=...`)**:
   When a user types a course name into the `CourseSearchModal`, a request is made to the search endpoint. A list of matching courses (with basic details like name, city, state) is returned and displayed in the modal.
   
2. **Details (`GET /v1/courses/{id}`)**:
   When a user selects a specific course, a request is made to fetch the full details of the course, including all tee boxes, hole pars, handicaps, and yardages.

3. **Database Insertion**:
   The `importApiCourseToSupabase` service function takes the raw JSON response and maps it to the Supabase schema, performing multiple insertions to fully hydrate the course data.

## Field Mapping Table

Below is the field mapping detailing how the external API data translates to our database schema. Currently, only **Male Tees** are processed and imported.

### 1. `courses` Table
| Supabase Column | API Field Path | Description |
| :--- | :--- | :--- |
| `name` | `course_name` (or `club_name`) | The name of the golf course. |
| `address_line` | `location.address` | The street address. |
| `city` | `location.city` | The city where the course is located. |
| `region` | `location.state` | The state or region. |
| `country` | `location.country` | The country. |
| `course_lat` | `location.latitude` | Initial map centering latitude. |
| `course_lng` | `location.longitude` | Initial map centering longitude. |

### 2. `course_tees` Table
*Iterates over `tees.male[]`*

| Supabase Column | API Field Path | Description |
| :--- | :--- | :--- |
| `name` | `tee_name` | The name of the tee box (e.g. "Blue", "White"). |
| `rating` | `course_rating` | USGA Course Rating. |
| `slope` | `slope_rating` | USGA Slope Rating. |
| `is_default` | *Computed* | `true` for the first tee box imported, `false` otherwise. |

### 3. `holes` Table
*Uses the `holes[]` array from the **first** male tee as the source of truth for par and stroke index.*

| Supabase Column | API Field Path | Description |
| :--- | :--- | :--- |
| `hole_number` | *Index + 1* | Sequence from 1 to 18. |
| `par` | `holes[i].par` | Standard par for the hole. |
| `stroke_index` | `holes[i].handicap` | The handicap stroke index. |

### 4. `hole_tee_yardages` Table
*Maps the yardages for every hole across every male tee box.*

| Supabase Column | API Field Path | Description |
| :--- | :--- | :--- |
| `hole_id` | *Mapped via `holes` insert* | Reference to the created hole. |
| `tee_id` | *Mapped via `course_tees` insert* | Reference to the created tee box. |
| `yardage` | `tees.male[j].holes[i].yardage` | Distance in yards from the tee to the green. |

## Important Considerations

- **CORS Compatibility:** The current integration is client-side. The API must support Cross-Origin Resource Sharing (CORS) from the application domain. If CORS issues arise, these calls must be proxied via a Supabase Edge Function.
- **Tee Filters:** Currently, female and senior tees are not imported. This can be expanded in `courseImportService.js` in the future.
- **Location Syncing:** In addition to setting `course_lat` and `course_lng` directly, the RPC `update_course_location` is called to ensure PostGIS geographical columns are appropriately updated.
