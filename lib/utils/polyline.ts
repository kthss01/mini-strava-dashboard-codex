import { ActivityCoordinates } from '@/lib/types/activity';

export const decodePolyline = (encoded: string): ActivityCoordinates[] => {
  const coordinates: ActivityCoordinates[] = [];

  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let byteValue: number;

    do {
      byteValue = encoded.charCodeAt(index++) - 63 - 1;
      result += byteValue << shift;
      shift += 5;
    } while (byteValue >= 0x1f);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;

    do {
      byteValue = encoded.charCodeAt(index++) - 63 - 1;
      result += byteValue << shift;
      shift += 5;
    } while (byteValue >= 0x1f);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      lat: lat * 1e-5,
      lng: lng * 1e-5,
    });
  }

  return coordinates;
};
