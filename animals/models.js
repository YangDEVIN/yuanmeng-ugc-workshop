/* 乐高动物园 · 模型数据
 * 坐标约定（模型空间）：x 左右，y 向上，z 向前（脸朝 +z）。1 个体素 = 1 块乐高积木。
 * 同一份数据被网页预览和"生成到元梦"共用。
 */
(function (root) {
  'use strict';

  // ---------- 调色板 ----------
  const PAL = {
    white:   { hex: '#F4F4EF', name: '白色' },
    black:   { hex: '#2B2D33', name: '黑色' },
    grey:    { hex: '#9DA6B1', name: '灰色' },
    lgrey:   { hex: '#BCC4CE', name: '浅灰' },
    dgrey:   { hex: '#6F7885', name: '深灰' },
    orange:  { hex: '#F28C28', name: '橙色' },
    dorange: { hex: '#C25E14', name: '深橙' },
    tan:     { hex: '#DBA362', name: '驼色' },
    ltan:    { hex: '#F3D9A8', name: '米色' },
    brown:   { hex: '#7B4B2A', name: '棕色' },
    pink:    { hex: '#F9A9BC', name: '粉色' },
    lpink:   { hex: '#FFCBD8', name: '浅粉' },
    dpink:   { hex: '#EE8FAA', name: '深粉' },
    yellow:  { hex: '#FFD43B', name: '黄色' },
    gold:    { hex: '#E9A800', name: '金黄' },
    red:     { hex: '#E03C31', name: '红色' },
  };

  // ---------- 体素构建 DSL ----------
  function build(W, fn) {
    const map = new Map();
    const key = (x, y, z) => x + ',' + y + ',' + z;
    const box = (x0, y0, z0, x1, y1, z1, c) => {
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++)
          for (let z = z0; z <= z1; z++) {
            if (c == null) map.delete(key(x, y, z));
            else map.set(key(x, y, z), { x, y, z, c });
          }
    };
    // 左右镜像：对称地加一份
    const mbox = (x0, y0, z0, x1, y1, z1, c) => {
      box(x0, y0, z0, x1, y1, z1, c);
      box(W - 1 - x1, y0, z0, W - 1 - x0, y1, z1, c);
    };
    const px = (x, y, z, c) => box(x, y, z, x, y, z, c);
    const mpx = (x, y, z, c) => mbox(x, y, z, x, y, z, c);
    fn({ box, mbox, px, mpx });

    let vox = [...map.values()];
    const minX = Math.min(...vox.map(v => v.x));
    const minY = Math.min(...vox.map(v => v.y));
    const minZ = Math.min(...vox.map(v => v.z));
    vox = vox.map(v => ({ x: v.x - minX, y: v.y - minY, z: v.z - minZ, c: v.c }));
    const w = Math.max(...vox.map(v => v.x)) + 1;
    const h = Math.max(...vox.map(v => v.y)) + 1;
    const d = Math.max(...vox.map(v => v.z)) + 1;
    return { vox, w, h, d };
  }

  // ---------- 贪心合并：同色相邻体素合成大长方体 ----------
  function mergeBoxes(vox) {
    const key = (x, y, z) => x + ',' + y + ',' + z;
    const map = new Map(vox.map(v => [key(v.x, v.y, v.z), v.c]));
    const used = new Set();
    const sorted = [...vox].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
    const out = [];
    for (const v of sorted) {
      if (used.has(key(v.x, v.y, v.z))) continue;
      const c = v.c;
      const free = (x, y, z) => map.get(key(x, y, z)) === c && !used.has(key(x, y, z));
      let dx = 1;
      while (free(v.x + dx, v.y, v.z)) dx++;
      let dz = 1;
      for (;;) {
        let ok = true;
        for (let i = 0; i < dx; i++) if (!free(v.x + i, v.y, v.z + dz)) { ok = false; break; }
        if (!ok) break;
        dz++;
      }
      let dy = 1;
      for (;;) {
        let ok = true;
        for (let i = 0; i < dx && ok; i++)
          for (let k = 0; k < dz; k++) if (!free(v.x + i, v.y + dy, v.z + k)) { ok = false; break; }
        if (!ok) break;
        dy++;
      }
      for (let i = 0; i < dx; i++)
        for (let j = 0; j < dy; j++)
          for (let k = 0; k < dz; k++) used.add(key(v.x + i, v.y + j, v.z + k));
      out.push({ x: v.x, y: v.y, z: v.z, dx, dy, dz, c });
    }
    return out;
  }

  // ---------- 动物们 ----------
  const defs = [];
  const add = (id, name, emoji, tip, W, fn) => defs.push({ id, name, emoji, tip, ...build(W, fn) });

  // 小猫
  add('cat', '小猫', '🐱', '橘色虎斑，尖耳朵，尾巴翘得高高的', 9, ({ box, mbox, px, mpx }) => {
    mbox(2, 0, 0, 3, 1, 1, 'orange'); mbox(2, 0, 3, 3, 1, 4, 'orange');
    mbox(2, 0, 0, 3, 0, 1, 'white');  mbox(2, 0, 3, 3, 0, 4, 'white');
    box(2, 2, 0, 6, 4, 4, 'orange');
    box(3, 4, 1, 5, 4, 1, 'dorange'); box(3, 4, 3, 5, 4, 3, 'dorange');
    mbox(2, 3, 1, 2, 3, 1, 'dorange'); mbox(2, 3, 3, 2, 3, 3, 'dorange');
    box(1, 3, 4, 7, 7, 7, 'orange');
    box(4, 7, 4, 4, 7, 7, 'dorange');
    mbox(1, 8, 4, 2, 8, 5, 'orange'); mbox(1, 9, 4, 1, 9, 5, 'orange');
    mpx(2, 8, 5, 'pink');
    mpx(2, 5, 7, 'black');
    box(3, 3, 7, 5, 4, 7, 'white'); px(4, 4, 7, 'pink');
    mpx(0, 4, 6, 'white');
    box(4, 2, -1, 4, 6, -1, 'orange'); px(4, 4, -1, 'dorange'); px(4, 6, -1, 'white');
  });

  // 小狗
  add('dog', '小狗', '🐶', '垂耳朵、长鼻头，吐着小舌头', 9, ({ box, mbox, px, mpx }) => {
    mbox(2, 0, 0, 3, 1, 1, 'tan'); mbox(2, 0, 3, 3, 1, 4, 'tan');
    mbox(2, 0, 0, 3, 0, 1, 'white'); mbox(2, 0, 3, 3, 0, 4, 'white');
    box(2, 2, 0, 6, 4, 4, 'tan');
    box(3, 4, 1, 5, 4, 2, 'brown');
    box(1, 3, 4, 7, 7, 7, 'tan');
    box(4, 5, 7, 4, 7, 7, 'ltan'); box(4, 7, 4, 4, 7, 6, 'ltan');
    box(3, 3, 8, 5, 4, 8, 'ltan'); px(4, 4, 8, 'black'); px(4, 2, 8, 'pink');
    mbox(0, 4, 4, 0, 7, 6, 'brown'); mbox(0, 3, 5, 0, 3, 6, 'brown');
    mpx(2, 5, 7, 'black');
    box(4, 3, -1, 4, 6, -1, 'tan'); px(4, 6, -1, 'white');
  });

  // 小兔
  add('rabbit', '小兔', '🐰', '长耳朵，毛茸茸的圆尾巴', 7, ({ box, mbox, px, mpx }) => {
    mbox(1, 0, 1, 2, 0, 4, 'white');
    box(1, 1, 0, 5, 4, 4, 'white');
    mbox(2, 0, 5, 2, 1, 5, 'white');
    box(1, 5, 3, 5, 9, 6, 'white');
    mbox(1, 10, 3, 2, 15, 4, 'white');
    mbox(2, 11, 4, 2, 14, 4, 'pink');
    mpx(1, 7, 6, 'black');
    px(3, 6, 6, 'pink');
    mpx(1, 6, 6, 'lpink');
    box(2, 2, -1, 4, 3, -1, 'white');
  });

  // 熊猫
  add('panda', '熊猫', '🐼', '坐着的胖胖熊猫，黑眼圈很显眼', 11, ({ box, mbox, px, mpx }) => {
    box(2, 1, 0, 8, 6, 4, 'white');
    mbox(1, 0, 2, 3, 1, 5, 'black'); mpx(2, 1, 5, 'pink');
    box(2, 5, 0, 8, 6, 4, 'black');
    mbox(0, 3, 1, 1, 6, 3, 'black');
    box(1, 7, 0, 9, 12, 5, 'white');
    mbox(1, 13, 2, 2, 14, 3, 'black');
    mbox(2, 9, 5, 3, 10, 5, 'black'); mpx(3, 10, 5, 'white');
    px(5, 9, 5, 'black'); px(5, 8, 5, 'dpink');
  });

  // 企鹅
  add('penguin', '企鹅', '🐧', '黑背白肚皮，橙色小脚和嘴巴', 9, ({ box, mbox, px, mpx }) => {
    mbox(2, 0, 2, 3, 0, 5, 'orange');
    box(1, 1, 0, 7, 6, 4, 'black');
    box(2, 1, 4, 6, 6, 4, 'white');
    box(1, 7, 0, 7, 10, 4, 'black');
    box(2, 7, 4, 6, 9, 4, 'white');
    mpx(3, 9, 4, 'black');
    box(3, 8, 5, 5, 8, 5, 'orange');
    mpx(2, 8, 4, 'lpink');
    mbox(0, 2, 1, 0, 5, 3, 'black');
  });

  // 小鸭
  add('duck', '小鸭', '🦆', '黄色小鸭子，扁扁的橙色嘴', 7, ({ box, mbox, px, mpx }) => {
    box(1, 1, 0, 5, 4, 5, 'yellow');
    mbox(0, 2, 1, 0, 3, 3, 'gold');
    box(3, 4, -1, 3, 5, -1, 'yellow');
    box(1, 5, 2, 5, 8, 5, 'yellow');
    box(2, 6, 6, 4, 6, 7, 'orange');
    mpx(1, 7, 5, 'black');
    mpx(1, 6, 5, 'dpink');
    px(3, 9, 3, 'yellow'); px(3, 9, 4, 'yellow');
    mbox(1, 0, 2, 2, 0, 4, 'orange');
  });

  // 小猪
  add('pig', '小猪', '🐷', '粉嘟嘟，圆鼻子，卷卷的小尾巴', 9, ({ box, mbox, px, mpx }) => {
    mbox(2, 0, 0, 3, 1, 1, 'dpink'); mbox(2, 0, 3, 3, 1, 4, 'dpink');
    box(2, 2, 0, 6, 5, 4, 'pink');
    box(5, 5, 2, 6, 5, 3, 'dpink'); box(2, 5, 0, 3, 5, 1, 'dpink');
    box(1, 3, 4, 7, 7, 7, 'pink');
    box(3, 4, 8, 5, 5, 9, 'lpink'); mpx(3, 5, 9, 'dpink');
    mpx(2, 6, 7, 'black');
    mpx(1, 5, 7, 'dpink');
    mbox(1, 8, 4, 2, 8, 5, 'dpink'); mbox(0, 7, 4, 0, 8, 5, 'dpink');
    box(4, 4, -1, 4, 5, -1, 'dpink'); px(5, 5, -1, 'dpink'); px(5, 6, -1, 'dpink');
  });

  // 大象
  add('elephant', '大象', '🐘', '大耳朵、长鼻子，还有一对白象牙', 9, ({ box, mbox, px, mpx }) => {
    mbox(1, 0, 0, 2, 2, 1, 'grey'); mbox(1, 0, 6, 2, 2, 7, 'grey');
    mbox(1, 0, 0, 2, 0, 1, 'dgrey'); mbox(1, 0, 6, 2, 0, 7, 'dgrey');
    box(1, 3, 0, 7, 8, 7, 'grey');
    box(2, 5, 8, 6, 10, 11, 'grey');
    mbox(0, 5, 8, 1, 9, 10, 'lgrey');
    box(3, 5, 12, 5, 6, 12, 'grey'); box(4, 2, 12, 4, 4, 12, 'grey'); px(4, 2, 13, 'grey');
    mpx(2, 8, 11, 'black');
    mbox(2, 4, 11, 2, 4, 12, 'white');
    box(4, 5, -1, 4, 7, -1, 'dgrey');
  });

  // 长颈鹿
  add('giraffe', '长颈鹿', '🦒', '长脖子，满身棕色斑块', 7, ({ box, mbox, px, mpx }) => {
    mbox(1, 0, 0, 2, 4, 1, 'yellow'); mbox(1, 0, 5, 2, 4, 6, 'yellow');
    mbox(1, 0, 0, 2, 0, 1, 'brown'); mbox(1, 0, 5, 2, 0, 6, 'brown');
    box(1, 5, 0, 5, 8, 6, 'yellow');
    mbox(1, 6, 1, 1, 7, 2, 'brown'); mbox(1, 5, 4, 1, 6, 5, 'brown');
    box(2, 8, 1, 3, 8, 2, 'brown'); box(4, 8, 4, 4, 8, 5, 'brown');
    mbox(1, 2, 5, 1, 3, 5, 'brown');
    box(2, 9, 4, 4, 14, 5, 'yellow');
    px(2, 10, 5, 'brown'); px(4, 12, 5, 'brown'); px(3, 13, 4, 'brown'); px(3, 10, 4, 'brown');
    box(2, 14, 4, 4, 16, 7, 'yellow');
    box(2, 14, 8, 4, 15, 8, 'ltan'); px(3, 15, 8, 'brown');
    mpx(2, 16, 7, 'black');
    mbox(2, 17, 5, 2, 18, 5, 'brown'); mpx(2, 19, 5, 'black');
    mbox(1, 15, 5, 1, 15, 6, 'yellow');
    box(3, 5, -1, 3, 7, -1, 'yellow'); px(3, 4, -1, 'brown');
  });

  // ---------- 生成到元梦：把模型变成"放置清单" ----------
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const r1 = v => Math.round(v * 10) / 10;

  /* spec: { size: 单块边长cm, x, y, z: 放置点(模型底面中心), yaw: 朝向角, mode: 'merge' | 'single' }
   * 元梦坐标：X 向前(模型 +z)，Y 向右(模型 -x)，Z 向上；方块基础边长 100cm，原点在底面中心。
   */
  function buildPlacement(model, spec) {
    const b = spec.size;
    const boxes = spec.mode === 'single'
      ? model.vox.map(v => ({ x: v.x, y: v.y, z: v.z, dx: 1, dy: 1, dz: 1, c: v.c }))
      : mergeBoxes(model.vox);
    const rad = (spec.yaw || 0) * Math.PI / 180;
    const cs = Math.cos(rad), sn = Math.sin(rad);
    return boxes.map(bx => {
      const mx = bx.x + bx.dx / 2 - model.w / 2;
      const mz = bx.z + bx.dz / 2 - model.d / 2;
      const X = mz * b, Y = -mx * b;
      return {
        transform: {
          location: {
            x: r1(spec.x + X * cs - Y * sn),
            y: r1(spec.y + X * sn + Y * cs),
            z: r1(spec.z + bx.y * b),
          },
          rotation: { pitch: 0, yaw: spec.yaw || 0, roll: 0 },
          scale: { x: r1(bx.dz * b / 100 * 1000) / 1000, y: r1(bx.dx * b / 100 * 1000) / 1000, z: r1(bx.dy * b / 100 * 1000) / 1000 },
        },
        color: hexToRgb(PAL[bx.c].hex),
        _c: bx.c,
      };
    });
  }

  const MODELS = defs.map(m => ({ ...m, merged: mergeBoxes(m.vox) }));
  const api = { PAL, MODELS, mergeBoxes, buildPlacement, hexToRgb };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LegoZoo = api;
})(typeof window !== 'undefined' ? window : globalThis);
