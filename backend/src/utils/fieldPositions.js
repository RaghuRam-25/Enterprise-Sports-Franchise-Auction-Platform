/**
 * Canonical field-map coordinates for football position codes.
 *
 * Coordinates are PERCENTAGES (0–100) of a pitch rendered with the attacking
 * direction pointing RIGHT:
 *   - fieldX: 0 = own goal line (left), 100 = opponent goal line (right)
 *   - fieldY: 0 = top touchline,        100 = bottom touchline
 *
 * These are used as sensible defaults when seeding Positions and as a fallback
 * in GET /api/players/field-position for Position documents created before the
 * fieldX/fieldY schema fields existed (they'd otherwise default to 50/50).
 *
 * Keep this list a superset of the seeded position codes; unknown codes fall
 * back to midfield-center (50/50) via DEFAULT_FIELD_COORDS.
 */
export const DEFAULT_FIELD_COORDS = { fieldX: 50, fieldY: 50 };

export const FIELD_COORDS = {
  GK: { fieldX: 6, fieldY: 50 },   // Goalkeeper — deep center
  CB: { fieldX: 22, fieldY: 50 },  // Center Back
  LB: { fieldX: 28, fieldY: 16 },  // Left Back
  RB: { fieldX: 28, fieldY: 84 },  // Right Back
  CDM: { fieldX: 40, fieldY: 50 }, // Defensive Midfielder
  CMF: { fieldX: 52, fieldY: 50 }, // Central Midfielder
  CM: { fieldX: 52, fieldY: 50 },  // Central Midfielder (legacy code)
  CAM: { fieldX: 64, fieldY: 50 }, // Attacking Midfielder
  LM: { fieldX: 55, fieldY: 18 },  // Left Midfielder
  RM: { fieldX: 55, fieldY: 82 },  // Right Midfielder
  LW: { fieldX: 78, fieldY: 18 },  // Left Winger
  RW: { fieldX: 78, fieldY: 82 },  // Right Winger
  SS: { fieldX: 80, fieldY: 50 },  // Second Striker
  ST: { fieldX: 88, fieldY: 50 },  // Striker
  CF: { fieldX: 86, fieldY: 50 },  // Center Forward
};

/**
 * Resolve field coordinates for a position code, preferring an explicit
 * value on the Position document, then the canonical map, then center.
 */
export function resolveFieldCoords(code, positionDoc) {
  if (
    positionDoc &&
    Number.isFinite(positionDoc.fieldX) &&
    Number.isFinite(positionDoc.fieldY) &&
    // Treat the schema default (50/50) as "unset" only when the code has a
    // known, more-specific home — otherwise honor whatever the admin stored.
    !(positionDoc.fieldX === 50 && positionDoc.fieldY === 50 && FIELD_COORDS[code])
  ) {
    return { fieldX: positionDoc.fieldX, fieldY: positionDoc.fieldY };
  }
  return FIELD_COORDS[code] || DEFAULT_FIELD_COORDS;
}
