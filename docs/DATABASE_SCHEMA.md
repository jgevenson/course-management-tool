# 🗃️ Database Schema Documentation

*Last Updated: 4/29/2026, 12:15:58 PM*

This document is auto-generated. To update descriptions, use `COMMENT ON` in SQL.

---
## 📋 Table: `clubs`
> Personalized club performance data used for calculating dispersion modeling.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this club record. |
| **user_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: profiles | Foreign key to profiles. The owning user's ID, used for RLS filtering. |
| **name** | `text` | **NOT NULL** | Full display name of the club (e.g. "7 Iron", "Driver"). |
| **carry_distance** | `integer` | **NOT NULL** | Average distance the ball travels in the air (yards/meters). |
| **total_distance** | `integer` | **NOT NULL** | Average total distance including roll-out (yards/meters). |
| **miss_long** | `integer` | Default: `0` | Typical distance error beyond the target center. |
| **miss_short** | `integer` | Default: `0` | Typical distance error short of the target center. |
| **miss_left** | `integer` | Default: `0` | Horizontal dispersion bias to the left of the line of play. |
| **miss_right** | `integer` | Default: `0` | Horizontal dispersion bias to the right of the line of play. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `timezone('utc'::text, now())` | Timestamp when the club record was created (UTC). |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag to maintain data integrity. |
| **club_type** | `text` | - | Category of the club (e.g. iron, wood, wedge, putter) used for badge display and grouping. |
| **is_putter** | `boolean` | **NOT NULL**<br>Default: `false` | True if this club is a putter; putters are excluded from dispersion modeling and sorted separately. |
| **short_name** | `text` | - | Abbreviated label shown in compact UI views (e.g. "7i", "Dr", "PT"). |
| **sort_order** | `bigint` | - | User-defined ordering position within the bag list; lower values appear first. |

---
## 📋 Table: `course_tees`
> Definitions for different tee sets (e.g. Championship, White) including rating and slope.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this tee set. |
| **course_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: courses | Foreign key to courses. The course this tee set belongs to. |
| **user_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: auth.users | Foreign key to auth.users. The user who created this tee set. |
| **name** | `text` | **NOT NULL** | Display name of the tee set (e.g. "Championship", "Blue", "White"). |
| **color_label** | `text` | - | Optional color identifier displayed as a subtitle in the yardage matrix and tee set list. |
| **sort_order** | `integer` | **NOT NULL**<br>Default: `0` | Display ordering position; auto-incremented when new tees are added. |
| **rating** | `numeric` | - | USGA Course Rating representing the difficulty for a scratch golfer. |
| **slope** | `integer` | - | USGA Slope Rating representing the relative difficulty for a bogey golfer. |
| **is_default** | `boolean` | **NOT NULL**<br>Default: `false` | When true, this tee set's yardages are synced to the holes.scorecard_yardage column. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag; inactive tee sets are hidden from the UI. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | Timestamp when the tee set was created. |

---
## 📋 Table: `courses`
> Master registry of golf courses serving as the primary spatial anchor.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this course. |
| **user_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: profiles | Foreign key to profiles. The owning user's ID, used for RLS filtering. |
| **name** | `text` | **NOT NULL** | Full display name of the golf course. |
| **course_lat** | `numeric` | **NOT NULL** | Latitude coordinate for initial map centering. |
| **course_lng** | `numeric` | **NOT NULL** | Longitude coordinate for initial map centering. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `timezone('utc'::text, now())` | Timestamp when the course record was created (UTC). |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag to manage course availability. |
| **address_line** | `text` | - | Street address of the golf course. |
| **city** | `text` | - | City where the course is located. |
| **region** | `text` | - | State, province, or region where the course is located. |
| **postal_code** | `text` | - | ZIP or postal code of the course address. |
| **country** | `text` | - | Country where the course is located. |
| **phone** | `text` | - | Contact phone number for the golf course. |
| **website** | `text` | - | URL to the course's website. |
| **notes** | `text` | - | Free-form notes or memo about the course. |

---
## 📋 Table: `hole_map_markers`
> Specific map points used for visualization, separate from scorecard data.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this marker. |
| **hole_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: holes | Foreign key to holes. The hole this marker is associated with. |
| **marker_kind** | `text` | **NOT NULL**<br>⚖️ Check: CHECK ((marker_kind = ANY (ARRAY['green_center'::text, 'tee_back'::text, 'tee_shot_location'::text, 'first_shot_location'::text, 'second_shot_location'::text]))) | Categorization of the point (e.g. green_center, tee_back) for UI rendering. |
| **lat** | `double precision` | **NOT NULL** | Latitude coordinate of the marker on the map. |
| **lng** | `double precision` | **NOT NULL** | Longitude coordinate of the marker on the map. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag; planning markers are deactivated rather than deleted. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | Timestamp when the marker was created. |

---
## 📋 Table: `hole_planning_markers`
> This table stores the user's specific intent. Records are hard-deleted rather than soft-deleted to keep the tactical state clean.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary Key. |
| **hole_id** | `uuid` | 🔗 Refers to: holes | FK to the holes table |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | - |
| **user_id** | `uuid` | 🔗 Refers to: profiles | Foreign key to profiles for RLS filtering. |
| **marker_type** | `text` | - | tee_shot_location, landing_area, or pin_location |
| **sequence_order** | `integer` | - | 0 for Tee, 1...N for Landing Areas, 99 for Pin. |
| **lat** | `double precision` | - | Geographic (latitude) coordinates for map placement. |
| **long** | `double precision` | - | Geographic (longitude) coordinates for map placement. |

---
## 📋 Table: `hole_tee_yardages`
> Links specific scorecard yardages to a tee set and hole.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this yardage record. |
| **hole_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: holes | Foreign key to holes. The hole this yardage applies to. |
| **tee_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: course_tees | Foreign key to course_tees. The tee set this yardage belongs to. |
| **yardage** | `integer` | - | Distance in yards from the tee to the green for this hole/tee combination. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag; deactivated when the parent tee set is removed. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | Timestamp when the yardage record was created. |

---
## 📋 Table: `holes`
> Core routing structure for the course; includes par and strategic paths.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this hole. |
| **course_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: courses | Foreign key to courses. The course this hole belongs to. |
| **hole_number** | `integer` | **NOT NULL**<br>⚖️ Check: CHECK (((hole_number >= 1) AND (hole_number <= 18))) | The hole number on the course (1–18). |
| **par** | `integer` | **NOT NULL**<br>⚖️ Check: CHECK (((par >= 3) AND (par <= 6))) | Target strokes for the hole (Standard 3-6). |
| **stroke_index** | `integer` | - | Handicap stroke index indicating which holes receive strokes first. |
| **scorecard_yardage** | `integer` | - | Default tee yardage displayed on the scorecard; synced from the default tee set. |
| **path_sequence** | `jsonb` | - | JSON data defining the strategic routing from tee to green. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag for the hole record. |

---
## 📋 Table: `profiles`
> User identity and settings; links to authentication layer.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>🔗 Refers to: auth.users | Primary key; matches auth.users.id to link the profile to authentication. |
| **username** | `text` | - | Optional display name chosen by the user. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `timezone('utc'::text, now())` | Timestamp when the user profile was created (UTC). |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag for the user profile. |

---
## 📋 Table: `terrain_overlay_holes`
> Many-to-many relationship mapping terrain features to specific holes.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **terrain_overlay_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: terrain_overlays | Foreign key to terrain_overlays. The overlay in the many-to-many link. |
| **hole_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: holes | Foreign key to holes. The hole this overlay is visible on. |

---
## 📋 Table: `terrain_overlays`
> Geometric shapes (polygons) defining hazards and playing surfaces.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | Primary key; auto-generated UUID for this terrain overlay. |
| **course_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: courses | Foreign key to courses. The course this overlay belongs to. |
| **terrain_type** | `text` | **NOT NULL** | Classification (e.g. water, bunker, fairway). |
| **risk_tier** | `smallint` | ⚖️ Check: CHECK (((risk_tier IS NULL) OR ((risk_tier >= 1) AND (risk_tier <= 3)))) | Impact level: 1 (Critical), 2 (High), 3 (Moderate). |
| **label** | `text` | - | Optional human-readable name for the terrain feature (e.g. "Pond by 5th green"). |
| **geojson_data** | `jsonb` | **NOT NULL** | GeoJSON Feature defining the physical footprint of the shape. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag for the terrain overlay. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | Timestamp when the terrain overlay was created. |

---
