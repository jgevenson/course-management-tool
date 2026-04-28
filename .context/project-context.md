# Project: Open-Yardage Architect (Course Management Tool)

## 🎯 The Vision
We are building a modern, high-performance, browser-based golf course management and strategy tool. It allows golfers to map out unfamiliar courses using high-res satellite imagery, draw risk-tier polygons (hazards, fairways), and overlay their personal club dispersion data to plan the optimal "Path Sequence" for every hole.

## 🛠️ The Tech Stack
- **Frontend Framework:** React 18 (Bootstrapped with Vite)
- **Routing:** react-router-dom
- **Styling:** Tailwind CSS (Dark theme: Slate-900 base, Emerald-500 primary accents, glassmorphism UI)
- **Icons:** lucide-react
- **Map Engine:** Leaflet & react-leaflet (Using Esri World Imagery tiles)
- **Map Drawing Tools:** @geoman-io/leaflet-geoman-free
- **Backend / Auth / Database:** Supabase (PostgreSQL)

## 🗄️ Database Architecture (Supabase)
All tables utilize Row Level Security (RLS) ensuring users only see their own data. All tables use an `is_active` boolean (default true) for soft deletes. Do not use standard SQL DELETE commands; always UPDATE `is_active` to false.

1. `profiles`: id (UUID, ties to auth.users), username, created_at, is_active
2. `clubs` (The Bag): id, user_id, name, carry_distance, total_distance, miss_long, miss_short, miss_left, miss_right, is_active
3. `courses`: id, user_id, name, course_lat, course_lng, is_active
4. `holes`: id, course_id, hole_number, par, stroke_index, scorecard_yardage, path_sequence (JSONB array of lat/lng), green_center_lat, green_center_lng, is_active
5. `terrain_overlays`: id, hole_id, terrain_type, risk_tier (1-3), label, geojson_data, is_active

## ✅ Current State of the App
- Supabase project is live, RLS is active, and database is populated with legacy scorecard data.
- User authentication (Sign Up / Log In) is complete and working.
- React Router is configured with a glassmorphism `<Header />`.
- `<Dashboard />` successfully fetches and lists the user's `courses`.
- `<Profile />` page exists but needs the "Digital Bag" club inputs built.
- `<MapCanvas />` is scaffolded with Leaflet but needs integration with Geoman and the Supabase `holes`/`terrain_overlays` tables.

## 🎨 UI / UX Guidelines
- **Premium Tactical Feel:** The app should feel like a high-end military/sports planning tool.
- **Colors:** Use `bg-slate-900` for main backgrounds, `bg-slate-800` for cards/panels, and `border-slate-700` for borders. Primary actions and highlights should use `emerald-500` or `emerald-400`. Text should primarily be `slate-300` and `white`.
- **Feedback:** Use subtle hover transitions (`transition-all duration-200`).
- **Layout:** Map views should take up maximum viewport space (h-screen, overflow-hidden), with toolbars/inspectors floating over or docked to the side.

## 🚀 Immediate Next Epics (For the AI)
1. **The Digital Bag:** Build out the CRUD interface on the Profile page for users to add/edit their `clubs` and their asymmetric dispersion distances.
2. **The Mapping Canvas:** Wire up the `/course/:id` route to load the Leaflet Map, zoom to the course coordinates, and initialize the `leaflet-geoman` drawing controls so the user can begin drawing terrain overlays.