const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'reference/source/de_dust2.bsp'));
if (source.toString('ascii', 0, 4) !== 'VBSP' || source.readInt32LE(4) !== 21) throw Error('Expected Source BSP 21');
function lump(id) {
  const at = 8 + id * 16;
  const start = source.readInt32LE(at), length = source.readInt32LE(at + 4);
  if (start + length > source.length) throw Error(`Incomplete lump ${id}`);
  return source.subarray(start, start + length);
}
const vertices = lump(3), faces = lump(7), edges = lump(12), surfedges = lump(13);
const texinfo = lump(6), texdata = lump(2), names = lump(43), nameTable = lump(44), models = lump(14);
const dispInfo = lump(26), dispVertices = lump(33), dispTriangles = lump(48);
const planes = lump(1), nodes = lump(5), leaves = lump(10), leafBrushes = lump(17), brushes = lump(18), brushSides = lump(19);
const materialGroups = new Map();
let skippedTools = 0, displacementFaces = 0, deformedFaces = 0;
const readVector = (buffer, at) => [0, 4, 8].map(offset => buffer.readFloatLE(at + offset));
const mix = (a, b, t) => a.map((value, axis) => value + (b[axis] - value) * t);
const round = value => Math.round(value * 1000) / 1000;
const dot = (a,b) => a.reduce((sum,value,i)=>sum+value*b[i],0);

function materialName(index) {
  if(index<0)return '';
  const td=texinfo.readInt32LE(index*72+68);
  const id=texdata.readInt32LE(td*32+12);
  const start=nameTable.readInt32LE(id*4);
  return names.toString('utf8',start,names.indexOf(0,start));
}

function readPlane(index) {
  const at=index*20;
  return {normal:readVector(planes,at),distance:planes.readFloatLE(at+12)};
}

function clipPolygon(polygon,{normal,distance}) {
  const output=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const da=dot(normal,a)-distance,db=dot(normal,b)-distance;
    if(da<=.0001)output.push(a);
    if((da<-.0001&&db>.0001)||(da>.0001&&db<-.0001))output.push(mix(a,b,da/(da-db)));
  }
  return output;
}

function extractRoofFaces(bounds) {
  const head=models.readInt32LE(36), ids=new Set(), stack=[head];
  while(stack.length){
    const node=stack.pop();
    if(node>=0){stack.push(nodes.readInt32LE(node*32+4),nodes.readInt32LE(node*32+8));continue;}
    // BSP v21 leaf lump v1 uses a 32-byte leaf record.
    const at=(~node)*32,first=leaves.readUInt16LE(at+24),count=leaves.readUInt16LE(at+26);
    for(let i=first;i<first+count;i++)ids.add(leafBrushes.readUInt16LE(i*2));
  }
  function isWorldSolid(point) {
    let node=head;
    while(node>=0){
      const at=node*32,plane=readPlane(nodes.readInt32LE(at));
      node=nodes.readInt32LE(at+(dot(point,plane.normal)>=plane.distance?4:8));
    }
    return Boolean(leaves.readInt32LE((~node)*32)&1);
  }
  const positions=[];
  let count=0;
  for(const id of [...ids].sort((a,b)=>a-b)){
    const at=id*12;
    if(!(brushes.readInt32LE(at+8)&1))continue;
    const start=brushes.readInt32LE(at),size=brushes.readInt32LE(at+4),sides=[];
    for(let i=start;i<start+size;i++){
      const offset=i*8;
      if(brushSides.readUInt8(offset+6))continue;
      sides.push({...readPlane(brushSides.readUInt16LE(offset)),material:materialName(brushSides.readInt16LE(offset+2)).toLowerCase()});
    }
    // Recover solid upward caps skipped by the render-face export. Sky, clip volumes
    // and brushes made solely of tool materials cannot become building roofs.
    if(sides.some(s=>s.material.includes('toolssky'))||!sides.some(s=>s.material&&!s.material.startsWith('tools/')))continue;
    for(const cap of sides.filter(s=>s.normal[2]>.7 && s.material==='tools/toolsnodraw')){
      const [minX,minY]=bounds.min,[maxX,maxY]=bounds.max;
      let polygon=[[minX,minY],[minX,maxY],[maxX,maxY],[maxX,minY]].map(([x,y])=>[x,y,(cap.distance-cap.normal[0]*x-cap.normal[1]*y)/cap.normal[2]]);
      for(const side of sides)if(side!==cap&&polygon.length>=3)polygon=clipPolygon(polygon,side);
      if(polygon.length<3)continue;
      const area=Math.abs(polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
      if(area<2500||Math.min(...polygon.map(p=>p[2]))<96||Math.max(...polygon.map(p=>p[2]))>bounds.max[2])continue;
      const center=polygon[0].map((_,axis)=>polygon.reduce((sum,p)=>sum+p[axis],0)/polygon.length);
      if(isWorldSolid([center[0],center[1],center[2]+2]))continue;
      for(let i=1;i+1<polygon.length;i++)positions.push(...[polygon[0],polygon[i],polygon[i+1]].flat().map(round));
      count++;
    }
  }
  return {count,positions};
}

function appendDisplacement(output, polygon, index) {
  const at = index * 176;
  const vertexStart = dispInfo.readInt32LE(at + 12);
  const triangleStart = dispInfo.readInt32LE(at + 16);
  const power = dispInfo.readInt32LE(at + 20);
  if (polygon.length !== 4 || power < 2 || power > 4) throw Error(`Invalid displacement ${index}`);
  const steps = 2 ** power;
  const stride = steps + 1;
  const startPosition = readVector(dispInfo, at);
  const corner = polygon.findIndex(point => Math.hypot(...point.map((value, axis) => value - startPosition[axis])) < 0.1);
  if (corner === -1) throw Error(`Displacement ${index} is missing its start corner`);
  const corners = polygon.map((_, i) => polygon[(corner + i) % 4]);
  const points = [];
  let deformed = false;
  for (let row = 0; row <= steps; row++) {
    const left = mix(corners[0], corners[1], row / steps);
    const right = mix(corners[3], corners[2], row / steps);
    for (let col = 0; col <= steps; col++) {
      const offset = (vertexStart + row * stride + col) * 20;
      const dist = dispVertices.readFloatLE(offset + 12);
      deformed ||= Math.abs(dist) > 0.001;
      const direction = readVector(dispVertices, offset);
      points.push(mix(left, right, col / steps).map((value, axis) => round(value + direction[axis] * dist)));
    }
  }
  let hasRemoved = false;
  for (let i = 0; i < steps * steps * 2; i++) hasRemoved ||= Boolean(dispTriangles.readUInt16LE((triangleStart + i) * 2) & 32);
  if (!deformed && !hasRemoved) return false;
  for (let row = 0; row < steps; row++) {
    for (let col = 0; col < steps; col++) {
      const a = row * stride + col, b = a + stride, c = b + 1, d = a + 1;
      const triangles = a % 2 === 0 ? [[a, b, c], [a, c, d]] : [[a, b, d], [d, b, c]];
      const tagIndex = triangleStart + 2 * (row * steps + col);
      for (let i = 0; i < triangles.length; i++) {
        if (dispTriangles.readUInt16LE((tagIndex + i) * 2) & 32) continue;
        for (const vertex of triangles[i]) output.push(...points[vertex]);
      }
    }
  }
  return true;
}
const first = models.readInt32LE(40), count = models.readInt32LE(44);
for (let i = first; i < first + count; i++) {
  const face = i * 56;
  const ti = faces.readInt16LE(face + 10);
  if (ti < 0) continue;
  const material = materialName(ti);
  if (material.toLowerCase().startsWith('tools/')) { skippedTools++; continue; }
  const displacement = faces.readInt16LE(face + 12);
  if (displacement >= 0) displacementFaces++;
  const polygon = [];
  const edgeStart = faces.readInt32LE(face + 4), edgeCount = faces.readInt16LE(face + 8);
  for (let j = 0; j < edgeCount; j++) {
    const se = surfedges.readInt32LE((edgeStart + j) * 4);
    const vi = edges.readUInt16LE(Math.abs(se) * 4 + (se < 0 ? 2 : 0));
    polygon.push([0, 4, 8].map(offset => vertices.readFloatLE(vi * 12 + offset)));
  }
  const triangles = materialGroups.get(material) || [];
  if (displacement >= 0 && appendDisplacement(triangles, polygon, displacement)) {
    deformedFaces++;
  } else {
    for (let j = 1; j + 1 < polygon.length; j++) triangles.push(...polygon[0], ...polygon[j], ...polygon[j + 1]);
  }
  materialGroups.set(material, triangles);
}
const entities = lump(0).toString('utf8');
const landmarks = [];
const sites = [];
let worldBounds;
for (const block of entities.matchAll(/\{([^{}]*)\}/g)) {
  const data = Object.fromEntries([...block[1].matchAll(/"([^"]+)"\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
  if (data.classname === 'worldspawn' && data.world_mins && data.world_maxs) {
    worldBounds = { min: data.world_mins.split(/\s+/).map(Number), max: data.world_maxs.split(/\s+/).map(Number) };
  }
  if (/^info_player_(terrorist|counterterrorist)$/.test(data.classname || '') && data.origin) {
    landmarks.push({
      type: data.classname,
      position: data.origin.split(/\s+/).map(Number),
      yaw: Number(data.angles?.split(/\s+/)[1] ?? 0),
    });
  }
  if (data.classname === 'func_bomb_target' && /^\*\d+$/.test(data.model || '')) {
    const modelIndex = Number(data.model.slice(1));
    const name = { 26: 'A', 27: 'B' }[modelIndex];
    if (!name) throw Error(`Unmapped Dust II bomb target model ${modelIndex}`);
    const model = modelIndex * 48;
    const origin = data.origin ? data.origin.split(/\s+/).map(Number) : [0, 0, 0];
    const min = readVector(models, model).map((value, axis) => value + origin[axis]);
    const max = readVector(models, model + 12).map((value, axis) => value + origin[axis]);
    sites.push({ id: name, position: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, min[2]], bounds: { min, max } });
  }
}
if (sites.length !== 2 || new Set(sites.map(site => site.id)).size !== 2) throw Error('Expected unique A/B sites');
const roofs=extractRoofFaces(worldBounds);
const result = {
  sourceUrl:'https://fastdl.clan-rmg.com/csgo/maps/de_dust2.bsp',
  bspVersion:21, mapRevision:source.readInt32LE(1032), units:'Source units',
  status:'World brush and displacement surfaces; static props and textures pending',
  skippedTools, displacementFaces, deformedFaces, landmarks, sites, worldBounds, restoredRoofFaces:roofs.count,
  groups:[...materialGroups].map(([material, positions]) => ({material, positions})).concat({material:'restored/roof',kind:'roof',positions:roofs.positions})
};
fs.writeFileSync(path.join(root, 'reference/dust2-geometry.json'), JSON.stringify(result));
fs.writeFileSync(path.join(root, 'reference/dust2-geometry.js'), 'window.Dust2Geometry = ' + JSON.stringify(result) + ';\n');
console.log(JSON.stringify({groups:result.groups.length,triangles:result.groups.reduce((n,g)=>n+g.positions.length/9,0),landmarks:landmarks.length,skippedTools,displacementFaces,deformedFaces,restoredRoofFaces:roofs.count}));
