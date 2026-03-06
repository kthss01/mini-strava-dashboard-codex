import 'leaflet';

declare module 'leaflet' {
  export interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: number]: string };
  }

  export function heatLayer(
    latlngs: Array<[number, number, number?] | [number, number]>,
    options?: HeatLayerOptions,
  ): Layer;
}
