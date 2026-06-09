# 🛠️ Open-Yardage Architect: Refactoring & Reorganization Recommendations

This document outlines structural recommendations, styling alignment opportunities, and details about the test suite drift found during the codebase evaluation. Following these recommendations will make the codebase easier to maintain, extend, and debug for upcoming features.

---

## 1. High-Priority: Test Suite Regressions

Over time, several UI updates and structural state refactors occurred without corresponding updates to unit tests, leading to a broken test suite (63 failed assertions). 

### 1.1 Hoisted State vs. Props in `DigitalBagPanel.test.jsx`
- **Finding**: In a previous version, [DigitalBagPanel.jsx](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/features/bag/components/DigitalBagPanel.jsx) loaded clubs inside the component. The hook was refactored up to [Profile.jsx](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/pages/Profile.jsx) to share club inventory with the `DispersionPanel` overlay. 
- **Issue**: The test suite mocked the `useClubs` hook assuming `DigitalBagPanel` still called it, but rendered the component without passing the newly required props (`clubs`, `loading`, callbacks). This caused runtime errors during test runs because functions and values were undefined.
- **Fix**: Update the test's `setup` helper to feed these mock states down as component props.

### 1.2 Table UI to Card UI Drift in `BagClubList.test.jsx`
- **Finding**: The club list was changed from a plain HTML table to a polished, card-based interface styled with modern custom styling elements.
- **Issue**: The test files continued to query for table headers (`#`, `Abbr`, `Name`, `Total`, `Actions`), table rows (`tr`), and specific cells (`td`), causing all rendering tests to fail. Additionally, the label structures lacked connected `id` fields, making `getByLabelText` query calls fail.
- **Fix**: Re-align the test assertions to check for cards, title text elements, and buttons. Add connected `id`/`htmlFor` properties in the component markup.

### 1.3 Commented-out Component Blocks in `CourseDetails.jsx`
- **Finding**: [CourseDetails.jsx](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/features/course/components/CourseDetails.jsx) has `CourseTeeSets` and `CourseYardageMatrix` commented out, leaving only the static scorecard.
- **Issue**: The corresponding test suite expects both components to be rendered and passed props, causing failures. Furthermore, hiding these elements makes it impossible for users to add tees or change yards.
- **Fix**: Uncomment the components. If they were disabled for layout reasons, they should be placed inside collapsible accordion elements to keep the design clean while preserving editing functions.

### 1.4 API Chain Ordering in `courseImportService.test.js`
- **Finding**: In the course import service, the first database call (`courses` table insertion) uses `.insert(...).select().single()`, whereas subsequent insertions for tees and holes use `.insert(...).select()` without `.single()`.
- **Issue**: In `courseImportService.test.js`, the mocks for the `select()` method were overridden sequentially via `mockResolvedValueOnce(...)` in an order that assumed the tee insertion happened first. This caused the course insertion call to get the tee array mock value, throwing an error when attempting to call `.single()` on a returned promise.
- **Fix**: Order the mocked return values to match the exact runtime order of calls to `select()`.

---

## 2. Code Consistency Suggestions

### 2.1 Standardize API Declarations
Currently, api service files are structured using two conflicting patterns:
1. **ES6 Export Constant Object** (e.g. `mapApi`, `courseApi`, `terrainApi`, `clubApi`):
   ```javascript
   export const courseApi = {
     getCourse: async (id) => { ... }
   }
   ```
2. **Individual Named Function Exports** (e.g. `greenElevationApi`, `planningAreaApi`, `golfCourseApiService`):
   ```javascript
   export async function getPlanningAreasForHole(holeId) { ... }
   ```

**Recommendation**: Standardize on **Individual Named Function Exports** across all service files. This enables better tree-shaking support during production compilation and aligns with modern React/Vite development practices.

### 2.2 Reorganize Service Folders
Currently, APIs are split between `src/services` and `src/services/api`:
- `src/services/api/`: Contains Supabase-centric database calls.
- `src/services/`: Contains third-party APIs (USGS, external golf API) and composite business services (import handlers).

**Recommendation**: Clean up `src/services` by creating two subfolders:
- `src/services/supabase/` (rename `api/` to group Supabase database integrations)
- `src/services/external/` (place `golfCourseApiService.js` and other external integrations here)
- Keep composite files (e.g. `courseImportService.js`) directly under `src/services/`.

---

## 3. UI/UX Refinement Opportunities

- **Tee Color Selection Indicator**: In `CourseTeeSets.jsx`, the tee color input is a standard native browser color picker. Replacing this with a custom palette preview box styled with Tailwind/MUI would make it look much more premium.
- **Collapsible Yardage Matrices**: The scorecard and yardage matrix tables contain many cells and can overflow horizontally on smaller screens. Standardizing these layouts into swipeable sheets or wrapping them in collapsible details views would improve mobile responsiveness.
