# External Systems Context

## 1. Material UI (MUI) & Tailwind CSS (Hybrid Approach)
- **MUI (`@mui/material` v6):** Used primarily for structural layout components (like `Grid` and `Box`), typography, and interactive elements. The app is actively migrating towards MUI components. Note: Ensure imports use `@mui/material/Grid` as `Grid2` is now the default `Grid` in MUI v6.
- **Tailwind CSS:** Used for legacy styling utility classes. The app uses a dark theme (Slate-900 base, Emerald-500 primary accents, glassmorphism UI). While the ultimate goal is to phase out Tailwind in favor of MUI, the hybrid approach is currently maintained.
- **Theme:** An MUI theme is configured in `src/theme.js` to match the existing Tailwind aesthetic seamlessly.

## 2. Leaflet & React-Leaflet
- **Map Engine:** Leaflet is the core map rendering engine, wrapped by `react-leaflet`.
- **Tiles:** We use Esri World Imagery tiles for high-res satellite imagery to map the courses.
- **Drawing Tools:** `@geoman-io/leaflet-geoman-free` is integrated for drawing and editing risk-tier polygons (hazards, fairways) and other map overlays directly on the canvas.

## 3. Supabase
- **Backend / Auth / Database:** Supabase provides our PostgreSQL database, authentication (Sign Up/Log In), and Row Level Security (RLS) policies.
- **PostGIS:** The database leverages PostGIS for advanced geographic data handling (e.g., map markers, terrain overlays).
- **Data Flow:** The application relies on Supabase for real-time data access and uses custom Supabase RPCs for spatial writes to ensure integrity.
