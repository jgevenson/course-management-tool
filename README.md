<!-- AI assisted development -->
# Open-Yardage Architect

Browser-based golf course mapping and strategy tooling built with React, Leaflet, and Supabase.

## Features

- **Course dashboard**: Lists active courses for the signed-in user.
- **Hole mapping canvas**: Uses Esri World Imagery in Leaflet to place green-center and back-tee reference points per hole.
- **Manual terrain regions**: Draws, edits, and deletes terrain polygons with Geoman, then saves terrain type, label, and linked holes.
- **Experimental auto draw**: Lets mappers click a seed point, tune color tolerance and max radius, and generate a smoothed draft terrain polygon from nearby matching satellite imagery colors.

## Tech Stack

- React with Vite
- React Router
- Tailwind CSS
- Leaflet, React-Leaflet, Leaflet Rotate, and Geoman
- Supabase for authentication and persistence

## Development

Install dependencies, then run the local Vite server:

```bash
npm install
npm run dev
```

Run verification before shipping changes:

```bash
npm run lint
npm run build
```

## Mapping Notes

The auto draw tool is intentionally isolated as an experiment. It generates normal `terrain_overlays.geojson_data` polygons and reuses the existing region assignment form, so saved regions continue to work if the tool is removed later.
