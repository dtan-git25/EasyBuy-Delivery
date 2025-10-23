/**
 * Calculate distance between two geographic coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate delivery fee based on distance and admin settings
 * @param distance Distance in kilometers
 * @param baseRate Fee for first kilometer
 * @param succeedingRate Fee per kilometer after first
 * @returns Delivery fee amount
 */
export function calculateDeliveryFee(
  distance: number,
  baseRate: number,
  succeedingRate: number
): number {
  const roundedDistance = Math.ceil(distance);
  
  if (roundedDistance <= 1) {
    return baseRate;
  } else {
    return baseRate + ((roundedDistance - 1) * succeedingRate);
  }
}
