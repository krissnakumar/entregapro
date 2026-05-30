import L from 'leaflet';

export const createIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const Icons = {
  Driver: createIcon('blue'),
  Customer: createIcon('red'),
  Pending: createIcon('orange'),
  Assigned: createIcon('violet'),
  InTransit: createIcon('gold'),
  Delivered: createIcon('green'),
};
