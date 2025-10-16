export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  lotHouseNo: string;
  street: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
}

export async function geocodeAddress(address: Address): Promise<Coordinates | null> {
  try {
    const query = `${address.lotHouseNo} ${address.street}, ${address.barangay}, ${address.cityMunicipality}, ${address.province}, Philippines`;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&limit=1` +
        `&countrycodes=ph`,
      {
        headers: {
          'User-Agent': 'FoodDeliveryApp/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    console.error('No geocoding results found for:', query);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function getCoordinatesOrGeocode(
  providedCoordinates: { latitude?: string; longitude?: string },
  address: Address
): Promise<Coordinates | null> {
  if (providedCoordinates.latitude && providedCoordinates.longitude) {
    return {
      latitude: parseFloat(providedCoordinates.latitude),
      longitude: parseFloat(providedCoordinates.longitude),
    };
  }

  return await geocodeAddress(address);
}
