-- Migration to automatically manage the Pole of Inaccessibility for "Green" overlays.
-- Creates two triggers:
-- 1. sync_green_center_from_overlay (handles geometry / type updates)
-- 2. sync_green_center_from_link (handles association / disassociation with a hole)

-- Trigger Function 1: Fired on terrain_overlays
CREATE OR REPLACE FUNCTION sync_green_center_from_overlay()
RETURNS TRIGGER AS $$
DECLARE
    v_hole_id uuid;
    v_center_point geometry;
BEGIN
    -- Get the linked hole_id if it exists
    SELECT hole_id INTO v_hole_id
    FROM terrain_overlay_holes
    WHERE terrain_overlay_id = NEW.id
    LIMIT 1;

    IF v_hole_id IS NOT NULL THEN
        IF NEW.terrain_type = 'green' THEN
            -- Calculate Pole of Inaccessibility
            v_center_point := (ST_MaximumInscribedCircle(NEW.shape)).center;

            -- Upsert the marker using ON CONFLICT matching the UNIQUE (hole_id, marker_kind) constraint
            INSERT INTO hole_map_markers (hole_id, marker_kind, lat, lng, marker_geom, is_active)
            VALUES (
                v_hole_id,
                'green_center',
                ST_Y(v_center_point),
                ST_X(v_center_point),
                v_center_point,
                true
            )
            ON CONFLICT (hole_id, marker_kind)
            DO UPDATE SET
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                marker_geom = EXCLUDED.marker_geom,
                is_active = true;
                
        ELSIF OLD.terrain_type = 'green' AND NEW.terrain_type != 'green' THEN
            -- The terrain changed from a green to something else
            DELETE FROM hole_map_markers
            WHERE hole_id = v_hole_id AND marker_kind = 'green_center';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_green_center_overlay ON terrain_overlays;
CREATE TRIGGER tr_sync_green_center_overlay
AFTER UPDATE OF shape, terrain_type ON terrain_overlays
FOR EACH ROW
WHEN (NEW.terrain_type = 'green' OR OLD.terrain_type = 'green')
EXECUTE FUNCTION sync_green_center_from_overlay();


-- Trigger Function 2: Fired on terrain_overlay_holes
CREATE OR REPLACE FUNCTION sync_green_center_from_link()
RETURNS TRIGGER AS $$
DECLARE
    v_overlay terrain_overlays%ROWTYPE;
    v_center_point geometry;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get the overlay to check if it's a green
        SELECT * INTO v_overlay
        FROM terrain_overlays
        WHERE id = NEW.terrain_overlay_id;

        IF v_overlay.terrain_type = 'green' THEN
            -- Calculate Pole of Inaccessibility
            v_center_point := (ST_MaximumInscribedCircle(v_overlay.shape)).center;

            -- Upsert the marker
            INSERT INTO hole_map_markers (hole_id, marker_kind, lat, lng, marker_geom, is_active)
            VALUES (
                NEW.hole_id,
                'green_center',
                ST_Y(v_center_point),
                ST_X(v_center_point),
                v_center_point,
                true
            )
            ON CONFLICT (hole_id, marker_kind)
            DO UPDATE SET
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                marker_geom = EXCLUDED.marker_geom,
                is_active = true;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Get the overlay to check if it WAS a green
        SELECT * INTO v_overlay
        FROM terrain_overlays
        WHERE id = OLD.terrain_overlay_id;

        IF v_overlay.terrain_type = 'green' THEN
            -- Delete the marker
            DELETE FROM hole_map_markers
            WHERE hole_id = OLD.hole_id AND marker_kind = 'green_center';
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_green_center_link ON terrain_overlay_holes;
CREATE TRIGGER tr_sync_green_center_link
AFTER INSERT OR DELETE ON terrain_overlay_holes
FOR EACH ROW
EXECUTE FUNCTION sync_green_center_from_link();
