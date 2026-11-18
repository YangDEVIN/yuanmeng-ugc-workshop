(function (root) {
  const typeId = '1101008001011363';
  const batchSize = 20;
  const roundToTenth = value => Math.round(value * 10) / 10;

  function roundVector(vector, minimum = -Infinity) {
    return Object.fromEntries(Object.entries(vector).map(([axis, value]) => [
      axis, Math.max(minimum, roundToTenth(value)),
    ]));
  }

  function fromTemplate(snapshot, maps) {
    return snapshot.items.flatMap(([category, x, y, z, width, depth, height]) => {
      const name = snapshot.cats[category];
      if (name === 'spawn' || name === 'air' || Math.min(width, depth, height) <= 0) return [];
      return [{
        typeId,
        transform: {
          location: { x, y, z },
          rotation: { pitch: 0, yaw: 0, roll: 0 },
          scale: { x: width / 100, y: depth / 100, z: height / 100 },
        },
        color: maps.hexToRgb(snapshot.pal[name]),
      }];
    });
  }

  function build(mapId, snapshot, maps, geometry, surfaceBlocks = root.SurfaceBlocks,
    playerLayout = root.PlayerLayout ?? (typeof module !== 'undefined' ? require('./player-layout') : null)) {
    if (!['template', 'de_dust2'].includes(mapId)) throw Error('该地图尚无积木清单');
    const template = mapId === 'template';
    // 20 source units become 50 cm, an exact multiple of the editor's 10 cm size step.
    const sourceUnitCm = template ? 1 : 2.5;
    const terrain = {};
    const source = template ? fromTemplate(snapshot, maps) : surfaceBlocks.build(geometry, terrain).map(block => {
      const [x, y, z] = block.point;
      const [width, depth, height] = block.size;
      return {
        typeId,
        transform: {
          location: { x: (x + width / 2) * sourceUnitCm, y: (y + depth / 2) * sourceUnitCm, z: z * sourceUnitCm },
          rotation: { pitch: 0, yaw: 0, roll: 0 },
          scale: { x: width * sourceUnitCm / 100, y: depth * sourceUnitCm / 100, z: height * sourceUnitCm / 100 },
        },
        color: maps.hexToRgb(block.color),
        kind: block.kind,
      };
    });
    const items = source.map(({ typeId, transform, color }) => ({
      typeId,
      transform: {
        location: roundVector(transform.location),
        rotation: roundVector(transform.rotation),
        scale: roundVector(transform.scale, 0.1),
      },
      color,
      snapToGround: false,
    }));
    if (!template) items.push(...playerLayout.dustRoute);
    const roofItemIndexes=source.flatMap((item,index)=>item.kind==='roof'?[index]:[]);
    const commands = [];
    for (let offset = 0; offset < items.length; offset += batchSize) {
      commands.push({
        tool: 'ugc_create_entity',
        arguments: { items: items.slice(offset, offset + batchSize) },
      });
    }
    return {
      schema: 'yuanmeng-fps-placement/v1',
      map: mapId,
      fidelity: template ? 'snapshot-bounds' : 'bsp-surface-blocks',
      count: items.length,
      ...(roofItemIndexes.length ? {roofItemIndexes} : {}),
      ...(template ? {} : { terrain: { ...terrain, deformedFaces: geometry.deformedFaces ?? null } }),
      coordinates: { units: 'cm', upAxis: 'Z', pivot: 'bottom-center', positionStepCm: 0.1, scaleStep: 0.1, sourceUnitCm },
      playerLayout: {
        modelBoundsCm: playerLayout.playerCm,
        minimumWalkingClearanceCm: playerLayout.clearanceCm,
        referenceSceneOffsetZCm: template ? 0 : playerLayout.sceneOffsetZCm,
        verifiedRoutes: [],
      },
      excluded: template ? ['空气元件', '出生点及其玩法属性', '原始材质和旋转'] : ['精确斜面和薄边', '道具及贴图', '自定义出生点及其玩法属性'],
      commands,
      verification: {
        matchBy: 'sceneId',
        readTool: 'ugc_get_entity',
        updateTool: 'ugc_update_entity',
        fields: ['location', 'rotation', 'scale', 'color'],
        saveTool: 'ugc_editor_save',
      },
    };
  }
  const api = { build };
  if (typeof module !== 'undefined') module.exports = api;
  else root.MapPlacement = api;
})(globalThis);
