export default { MercatorCoordinate: { fromLngLat: (ll, z) => ({ x: 0.3 + ll[0] * 1e-3, y: 0.4 - ll[1] * 1e-3, z: (z || 0) * 1e-7, meterInMercatorCoordinateUnits: () => 1e-7 }) } };
