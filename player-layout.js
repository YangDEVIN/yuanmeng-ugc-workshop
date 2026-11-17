(function (root) {
  const playerCm = { x: 120, y: 223, z: 281 };
  const clearanceCm = { width: 300, height: 320 };
  const sceneOffsetZCm = 2000;
  const floorColor = { r: 190, g: 153, b: 91 };

  // Local height uses the same origin as the BSP placement export.
  function floor(x, y, width, length, z = 310, color = floorColor) {
    return {
      typeId: '1101002001034000',
      transform: {
        location: { x, y, z },
        rotation: { pitch: 0, roll: 0, yaw: 0 },
        scale: { x: width / 100, y: length / 100, z: 0.5 },
      },
      color,
      snapToGround: false,
    };
  }

  function arrow(x, y, z, yaw) {
    return {
      typeId: '1102011001001018',
      transform: {
        location: { x, y, z },
        rotation: { pitch: 0, roll: 0, yaw },
        scale: { x: 0.6, y: 0.6, z: 0.3 },
      },
      snapToGround: false,
    };
  }

  const dustRoute = [
    floor(3700, 8150, 300, 2000),
    floor(4100, 9000, 500, 300),
    arrow(3700, 7891, 360, -90),
    arrow(3700, 8391, 360, -90),
    floor(-2300, -1950, 1600, 500, 300, { r: 217, g: 196, b: 147 }),
    arrow(2900, 6250, 250, 90),
    arrow(-4050, 6400, 50, 90),
  ];

  const api = { playerCm, clearanceCm, sceneOffsetZCm, dustRoute };
  if (typeof module !== 'undefined') module.exports = api;
  else root.PlayerLayout = api;
})(globalThis);
