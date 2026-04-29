# 🗃️ Database Schema Documentation

*Last Updated: 4/29/2026, 9:40:58 AM*

This document is auto-generated. To update descriptions, use `COMMENT ON` in SQL.

---
## 📋 Table: `clubs`
> Personalized club performance data used for calculating dispersion modeling.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **user_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: profiles | - |
| **name** | `text` | **NOT NULL** | - |
| **carry_distance** | `integer` | **NOT NULL** | Average distance the ball travels in the air (yards/meters). |
| **total_distance** | `integer` | **NOT NULL** | - |
| **miss_long** | `integer` | Default: `0` | Typical distance error beyond the target center. |
| **miss_short** | `integer` | Default: `0` | Typical distance error short of the target center. |
| **miss_left** | `integer` | Default: `0` | Horizontal dispersion bias to the left of the line of play. |
| **miss_right** | `integer` | Default: `0` | Horizontal dispersion bias to the right of the line of play. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `timezone('utc'::text, now())` | - |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag to maintain data integrity. |
| **club_type** | `text` | - | - |
| **is_putter** | `boolean` | **NOT NULL**<br>Default: `false` | - |
| **short_name** | `text` | - | - |
| **sort_order** | `bigint` | - | - |

---
## 📋 Table: `course_tees`
> Definitions for different tee sets (e.g. Championship, White) including rating and slope.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **course_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: courses | - |
| **user_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: auth.users | - |
| **name** | `text` | **NOT NULL** | - |
| **color_label** | `text` | - | - |
| **sort_order** | `integer` | **NOT NULL**<br>Default: `0` | - |
| **rating** | `numeric` | - | USGA Course Rating representing the difficulty for a scratch golfer. |
| **slope** | `integer` | - | USGA Slope Rating representing the relative difficulty for a bogey golfer. |
| **is_default** | `boolean` | **NOT NULL**<br>Default: `false` | - |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | - |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | - |

---
## 📋 Table: `courses`
> Master registry of golf courses serving as the primary spatial anchor.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **user_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: profiles | - |
| **name** | `text` | **NOT NULL** | - |
| **course_lat** | `numeric` | **NOT NULL** | Latitude coordinate for initial map centering. |
| **course_lng** | `numeric` | **NOT NULL** | Longitude coordinate for initial map centering. |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `timezone('utc'::text, now())` | - |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | Soft-delete flag to manage course availability. |
| **address_line** | `text` | - | - |
| **city** | `text` | - | - |
| **region** | `text` | - | - |
| **postal_code** | `text` | - | - |
| **country** | `text` | - | - |
| **phone** | `text` | - | - |
| **website** | `text` | - | - |
| **notes** | `text` | - | - |

---
## 📋 Table: `hole_map_markers`
> Specific map points used for visualization, separate from scorecard data.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **hole_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: holes | - |
| **marker_kind** | `text` | **NOT NULL**<br>⚖️ Check: CHECK ((marker_kind = ANY (ARRAY['green_center'::text, 'tee_back'::text, 'tee_shot_location'::text, 'first_shot_location'::text, 'second_shot_location'::text]))) | Categorization of the point (e.g. green_center, tee_back) for UI rendering. |
| **lat** | `double precision` | **NOT NULL** | - |
| **lng** | `double precision` | **NOT NULL** | - |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | - |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | - |

---
## 📋 Table: `hole_tee_yardages`
> Links specific scorecard yardages to a tee set and hole.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **hole_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: holes | - |
| **tee_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: course_tees | - |
| **yardage** | `integer` | - | - |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | - |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | - |

---
## 📋 Table: `holes`
> Core routing structure for the course; includes par and strategic paths.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **course_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: courses | - |
| **hole_number** | `integer` | **NOT NULL**<br>⚖️ Check: CHECK (((hole_number >= 1) AND (hole_number <= 18))) | - |
| **par** | `integer` | **NOT NULL**<br>⚖️ Check: CHECK (((par >= 3) AND (par <= 6))) | Target strokes for the hole (Standard 3-6). |
| **stroke_index** | `integer` | - | - |
| **scorecard_yardage** | `integer` | - | - |
| **path_sequence** | `jsonb` | - | JSON data defining the strategic routing from tee to green. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | - |

---
## 📋 Table: `profiles`
> User identity and settings; links to authentication layer.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>🔗 Refers to: auth.users | - |
| **username** | `text` | - | - |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `timezone('utc'::text, now())` | - |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | - |

---
## 📋 Table: `terrain_overlay_holes`
> Many-to-many relationship mapping terrain features to specific holes.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **terrain_overlay_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: terrain_overlays | - |
| **hole_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: holes | - |

---
## 📋 Table: `terrain_overlays`
> Geometric shapes (polygons) defining hazards and playing surfaces.

| Column | Type | Constraints / Refs | Description |
| :--- | :--- | :--- | :--- |
| **id** | `uuid` | **NOT NULL**<br>Default: `gen_random_uuid()` | - |
| **course_id** | `uuid` | **NOT NULL**<br>🔗 Refers to: courses | - |
| **terrain_type** | `text` | **NOT NULL** | Classification (e.g. water, bunker, fairway). |
| **risk_tier** | `smallint` | ⚖️ Check: CHECK (((risk_tier IS NULL) OR ((risk_tier >= 1) AND (risk_tier <= 3)))) | Impact level: 1 (Critical), 2 (High), 3 (Moderate). |
| **label** | `text` | - | - |
| **geojson_data** | `jsonb` | **NOT NULL** | GeoJSON Feature defining the physical footprint of the shape. |
| **is_active** | `boolean` | **NOT NULL**<br>Default: `true` | - |
| **created_at** | `timestamp with time zone` | **NOT NULL**<br>Default: `now()` | - |

---
