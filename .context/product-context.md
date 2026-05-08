# Product Context

## 🎯 The Vision
We are building a modern, high-performance, browser-based golf course management and strategy tool. It allows golfers to map out unfamiliar courses using high-res satellite imagery, draw risk-tier polygons (hazards, fairways), and overlay their personal club dispersion data to plan the optimal "Path Sequence" for every hole.

## 🎨 UI / UX Guidelines
- **Premium Tactical Feel:** The app should feel like a high-end military/sports planning tool.
- **Colors:** Use `bg-slate-900` for main backgrounds, `bg-slate-800` for cards/panels, and `border-slate-700` for borders. Primary actions and highlights should use `emerald-500` or `emerald-400`. Text should primarily be `slate-300` and `white`.
- **Feedback:** Use subtle hover transitions (`transition-all duration-200`).
- **Layout:** Map views should take up maximum viewport space (h-screen, overflow-hidden), with toolbars/inspectors floating over or docked to the side.

## ✅ Current State of the App
- Supabase project is live, RLS is active, and database is populated with legacy scorecard data.
- User authentication (Sign Up / Log In) is complete and working.
- React Router is configured with a glassmorphism `<Header />`.
- `<Dashboard />` successfully fetches and lists the user's `courses`.
- `<Profile />` page exists with the "Digital Bag" club inputs and dispersion panel.
- `<MapCanvas />` is scaffolded with Leaflet and integrated with Geoman and the Supabase `holes`/`terrain_overlays` tables.
- Implemented Material UI alongside Tailwind CSS using the Grid component for responsive desktop layouts.

## 🚀 Immediate Next Epics (For the AI)
1. **Enhance Material UI Integration:** Continue to migrate from Tailwind utility classes to Material UI components where applicable, while keeping the hybrid approach for now.
2. **Refining the Strategic Planning Engine:** Further integration of club dispersion with map markers.
