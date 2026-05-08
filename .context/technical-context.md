# Technical Context

## 🗄️ Database Architecture (Supabase)
All tables utilize Row Level Security (RLS) ensuring users only see their own data. All tables use an `is_active` boolean (default true) for soft deletes. Do not use standard SQL DELETE commands; always UPDATE `is_active` to false.

1. `profiles`: id (UUID, ties to auth.users), username, created_at, is_active, is_mapping_admin
2. `clubs` (The Bag): id, user_id, name, carry_distance, total_distance, miss_long, miss_short, miss_left, miss_right, is_active
3. `courses`: id, user_id, name, course_lat, course_lng, is_active
4. `holes`: id, course_id, hole_number, par, stroke_index, scorecard_yardage, path_sequence (JSONB array of lat/lng), green_center_lat, green_center_lng, is_active
5. `terrain_overlays`: id, hole_id, terrain_type, risk_tier (1-3), label, geojson_data, is_active

## 🏗️ Architecture
- **Frontend:** React 18 (Bootstrapped with Vite)
- **Routing:** react-router-dom
- **Data Access:** All read operations use optimized SQL views and write operations use custom Supabase RPCs (`update_course_location`, `add_map_marker`, `add_planning_marker`, `upsert_terrain_overlay`) to ensure correct geographic data handling.
