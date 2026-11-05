/**
 * Earth radius in metres (mean radius WGS-84 / IUGG).
 */
const EARTH_RADIUS_METRES = 6371000

/**
 * Normalises an input coordinate object or primitive values into numeric { lat, lng }.
 * Accepts { latitude, longitude }, { lat, lng }, or coordinate objects with string/numeric values.
 *
 * @param {Object} coord
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseCoordinates(coord) {
  if (!coord || typeof coord !== 'object') {
    return null
  }

  const latRaw = coord.latitude !== undefined ? coord.latitude : coord.lat
  const lngRaw = coord.longitude !== undefined ? coord.longitude : coord.lng

  if (latRaw === null || latRaw === undefined || latRaw === '' ||
      lngRaw === null || lngRaw === undefined || lngRaw === '') {
    return null
  }

  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(latRaw)
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(lngRaw)

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null
  }

  // Latitude must be [-90, 90], Longitude must be [-180, 180]
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}

/**
 * Converts degrees to radians.
 *
 * @param {number} deg
 * @returns {number}
 */
function toRadians(deg) {
  return (deg * Math.PI) / 180
}

/**
 * Calculates the great-circle distance between two geographical points using the Haversine formula.
 *
 * @param {Object} coord1 - First coordinate ({ latitude, longitude } or { lat, lng })
 * @param {Object} coord2 - Second coordinate ({ latitude, longitude } or { lat, lng })
 * @returns {number | null} Distance in metres, or null if either coordinate is invalid
 */
export function haversineDistance(coord1, coord2) {
  const p1 = parseCoordinates(coord1)
  const p2 = parseCoordinates(coord2)

  if (!p1 || !p2) {
    return null
  }

  const lat1Rad = toRadians(p1.lat)
  const lat2Rad = toRadians(p2.lat)
  const deltaLat = toRadians(p2.lat - p1.lat)
  const deltaLng = toRadians(p2.lng - p1.lng)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  // Clamp to [0, 1] to prevent floating point inaccuracies from producing NaN in Math.sqrt / Math.atan2
  const clampedA = Math.max(0, Math.min(1, a))
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA))

  return EARTH_RADIUS_METRES * c
}

/**
 * Finds and returns all complaints within the specified radius (in metres),
 * sorted by proximity (nearest first).
 *
 * @param {Object} targetCoord - Target coordinate
 * @param {Array<Object>} complaints - List of complaint objects
 * @param {number} [radiusMeters=50] - Proximity threshold in metres
 * @returns {Array<Object>} Array of matching complaints with an attached `distanceMeters` property (rounded to 1 decimal place)
 */
export function findNearbyComplaints(targetCoord, complaints, radiusMeters = 50) {
  const target = parseCoordinates(targetCoord)
  if (!target || !Array.isArray(complaints)) {
    return []
  }

  const results = []

  for (const complaint of complaints) {
    if (!complaint) continue

    const distance = haversineDistance(target, complaint)
    if (distance !== null && distance <= radiusMeters) {
      results.push({
        ...complaint,
        distanceMeters: Math.round(distance * 10) / 10,
      })
    }
  }

  return results.sort((a, b) => a.distanceMeters - b.distanceMeters)
}

