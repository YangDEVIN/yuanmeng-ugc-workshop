(function (root) {
  // Rasterize the visible BSP shell onto a shared cubic grid.
  const cellSize = 20;

  function playableGroups(geometry) {
    const bounds = geometry.worldBounds;
    if (!bounds?.min || !bounds?.max) return geometry.groups;
    return geometry.groups.map(group => {
      const positions = [];
      for (let offset = 0; offset < group.positions.length; offset += 9) {
        const triangle = group.positions.slice(offset, offset + 9);
        const outside = bounds.min.some((min, axis) => {
          const values = [triangle[axis], triangle[axis + 3], triangle[axis + 6]];
          return Math.max(...values) < min || Math.min(...values) > bounds.max[axis];
        });
        if (!outside) positions.push(...triangle);
      }
      return { ...group, positions };
    }).filter(group => group.positions.length);
  }

  function colorFor(material) {
    if (material === 'restored/roof') return '#bb986a';
    if (/metal|door/i.test(material)) return '#87735d';
    if (/stone|concrete/i.test(material)) return '#c1b59d';
    if (/floor|sand/i.test(material)) return '#d9c493';
    return '#c9ad79';
  }

  function rasterize(geometry, dimensions, roofOnly=false) {
    const cells = new Map();
    for (const { material, positions } of playableGroups(geometry)) {
      const color = colorFor(material);
      for (let start = 0; start < positions.length; start += 9) {
        const a = positions.slice(start, start + 3).map((value,i) => value / dimensions[i]);
        const b = positions.slice(start + 3, start + 6).map((value, i) => value / dimensions[i] - a[i]);
        const c = positions.slice(start + 6, start + 9).map((value, i) => value / dimensions[i] - a[i]);
        const normal = [b[1]*c[2]-b[2]*c[1], b[2]*c[0]-b[0]*c[2], b[0]*c[1]-b[1]*c[0]];
        const depth = roofOnly ? 2 : normal.reduce((best, value, i) => Math.abs(value) > Math.abs(normal[best]) ? i : best, 0);
        if (Math.abs(normal[depth]) < 1e-8) continue;
        const u = (depth + 1) % 3;
        const v = (depth + 2) % 3;
        const point = [0, 0, 0];
        const minU = Math.floor(a[u] + Math.min(0, b[u], c[u]));
        const maxU = Math.floor(a[u] + Math.max(0, b[u], c[u]));
        const minV = Math.floor(a[v] + Math.min(0, b[v], c[v]));
        const maxV = Math.floor(a[v] + Math.max(0, b[v], c[v]));
        // Avoid an unbounded raster request from imported geometry.
        if ((maxU - minU + 1) * (maxV - minV + 1) > 1e6) throw Error('单个地图面超出可转换范围');
        for (let j = minV; j <= maxV; j++) {
          for (let i = minU; i <= maxU; i++) {
            const du = i + 0.5 - a[u];
            const dv = j + 0.5 - a[v];
            const s = (du * c[v] - dv * c[u]) / normal[depth];
            const t = (b[u] * dv - b[v] * du) / normal[depth];
            if (s < -1e-7 || t < -1e-7 || s + t > 1 + 1e-7) continue;
            point[u] = i;
            point[v] = j;
            const elevation = a[depth] + s*b[depth] + t*c[depth];
            // BSP faces use clockwise winding. A floor belongs below its walkable surface.
            const isFloor = depth === 2 && normal[2] < 0;
            point[depth] = roofOnly ? Math.ceil(elevation - 1e-7) - 1 : isFloor ? Math.round(elevation) - 1
              : Math.floor(elevation + Math.sign(normal[depth])*1e-6);
            if (geometry.worldBounds && point.some((n, axis) =>
              (n + 1) * dimensions[axis] < geometry.worldBounds.min[axis] ||
              n * dimensions[axis] > geometry.worldBounds.max[axis])) continue;
            const key = point.join(',');
            const existing = cells.get(key);
            if (!existing || (isFloor && !existing.isFloor)) {
              cells.set(key, { point: [...point], color, depth, isFloor });
            }
            if (cells.size > 500000) throw Error('地图表面超过积木转换容量');
          }
        }
      }
    }
    return cells;
  }

  function stitchFloors(cells) {
    const repairs = new Map();
    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const cell of cells.values()) {
      if (!cell.isFloor) continue;
      const [x, y, z] = cell.point;
      for (const [dx, dy] of neighbors) {
        const point = [x + dx, y + dy, z];
        const key = point.join(',');
        if (cells.has(key) || repairs.has(key)) continue;
        const [px, py] = point;
        // Fill only an isolated missing floor cell surrounded at the same height.
        if (!neighbors.every(([i, j]) => cells.get([px + i, py + j, z].join(','))?.isFloor)) continue;
        if (cells.has([px, py, z + 1].join(',')) || cells.has([px, py, z - 1].join(','))) continue;
        repairs.set(key, { ...cell, point });
      }
    }
    for (const [key, cell] of repairs) cells.set(key, cell);
    return repairs.size;
  }

  function pack(cells,dimensions) {
    const blocks = [];
    const ordered = [...cells.values()].sort((a, b) =>
      a.point[2] - b.point[2] || a.point[1] - b.point[1] || a.point[0] - b.point[0]);
    for (const { point, color, depth } of ordered) {
      const u = (depth + 1) % 3;
      const v = (depth + 2) % 3;
      const probe = [...point];
      function key(i, j) {
        probe[u] = point[u] + i;
        probe[v] = point[v] + j;
        return probe.join(',');
      }
      function matches(i, j) {
        const cell = cells.get(key(i, j));
        return cell?.color === color && cell.depth === depth;
      }
      if (!matches(0, 0)) continue;
      let width = 1, height = 1;
      while (matches(width, 0)) width++;
      while (Array.from({ length: width }, (_, i) => matches(i, height)).every(Boolean)) height++;
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) cells.delete(key(i, j));
      }
      const size = [1, 1, 1];
      size[u] = width;
      size[v] = height;
      blocks.push({ point: point.map((n,i) => n * dimensions[i]), size: size.map((n,i) => n * dimensions[i]), color });
    }
    return blocks;
  }
  function build(geometry, summary) {
    const dimensions=[cellSize,cellSize,cellSize];
    const cells=rasterize({...geometry,groups:geometry.groups.filter(group=>group.kind!=='roof')},dimensions);
    const repairedFloorCells=stitchFloors(cells);
    const roofDimensions=[cellSize,cellSize,4];
    const roofCells=rasterize({...geometry,groups:geometry.groups.filter(group=>group.kind==='roof')},roofDimensions,true);
    const roofs=pack(roofCells,roofDimensions).map(block=>({...block,kind:'roof'}));
    if(summary) Object.assign(summary,{repairedFloorCells,roofBlocks:roofs.length,restoredRoofFaces:geometry.restoredRoofFaces??0});
    return pack(cells,dimensions).concat(roofs);
  }
  const api = { build, colorFor, cellSize, playableGroups };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SurfaceBlocks = api;
})(globalThis);
