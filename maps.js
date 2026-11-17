/* FPS 对战地图 · 数据层
 * 地图空间坐标：X 纵向(长轴)，Y 横向(宽)，Z 向上(高)，单位 cm，原点在地图中心地面(z=0)。
 * 每个构件(part) = 一块可缩放立方体：{x,y,z 底面中心, w 沿X, d 沿Y, h 沿Z, c 颜色键, tag 区域, ry 局部朝向}
 * 同一份数据被网页预览和"生成到元梦"共用。元梦里统一用 立方体·纯色 typeId=1101002001034000（底面中心为原点）。
 */
(function (root) {
  'use strict';

  // ---------- 调色板（所有地图共用） ----------
  const PAL = {
    // 沙漠
    sand:  '#D9BE7E', sandd: '#B8975A', sandw: '#8A6E3C',
    // 小镇古城
    brick: '#A8503C', bstone:'#C9B99A', roof:  '#9C3B2E', plaza: '#D8CBA8',
    // 运输船
    deck:  '#8A9099', water: '#2B6E8F', rail:  '#5A6068',
    cRed:  '#C0392B', cBlue: '#2E6FA8', cGreen:'#3C8C54', cYel: '#E0A82E', cabin:'#E8E6DF',
    // 核危
    metal: '#7E858C', concrete:'#B6B2A8', pipe:'#D4A82E', reactor:'#D8E2E8', reactord:'#6E7A86',
    // 雪地
    snow:  '#EDF2F6', ice:   '#A9D4E6', rock:  '#8C8F96', bunker:'#5E636B',
    // 木/通用
    wood:  '#9A6B3E', woodd: '#6F4A28', dark:  '#3A3D44', grey: '#AEB4BC',
    // 办公
    carpet:'#4A5A7A', wallc: '#E4E6EA', glass: '#BBD3DD', desk: '#8A5A34', door:'#3C6FB0',
    // 功能标识
    spawnT: '#D6873A', spawnCT:'#3A7AC0', siteA:'#D14B3A', siteB:'#3F8ED0', mid:'#8FA05A',
  };
  const PAL_NAME = {
    sand:'沙地', sandd:'深沙', sandw:'沙墙', brick:'红砖', bstone:'石墙', roof:'屋瓦', plaza:'广场石',
    deck:'甲板', water:'海水', rail:'护栏', cRed:'红箱', cBlue:'蓝箱', cGreen:'绿箱', cYel:'黄箱', cabin:'船舱',
    metal:'金属', concrete:'混凝土', pipe:'管道', reactor:'反应堆', reactord:'堆座',
    snow:'积雪', ice:'坚冰', rock:'岩石', bunker:'碉堡', wood:'木料', woodd:'深木', dark:'暗部', grey:'水泥',
    carpet:'地毯', wallc:'白墙', glass:'玻璃', desk:'办公桌', door:'蓝门',
    spawnT:'进攻方出生', spawnCT:'防守方出生', siteA:'A 爆破点', siteB:'B 爆破点', mid:'中路',
  };

  // ---------- 构件 DSL ----------
  function make(id, name, emoji, kind, theme, tip, fn) {
    const parts = [];
    const B = (x, y, z, w, d, h, c, tag, ry) =>
      parts.push({ x, y, z, w, d, h, c, tag: tag || '其他', ry: ry || 0 });
    // 地面：顶面落在 top，向下厚 th
    const FLOOR = (cx, cy, w, d, c, tag, top, th) => B(cx, cy, (top || 0) - (th || 24), w, d, th || 24, c, tag);
    // 四面围墙
    const WALLS = (w, d, h, c, tag, th, z) => {
      th = th || 30; z = z || 0;
      B(0, (d / 2 - th / 2), z, w, th, h, c, tag);
      B(0, -(d / 2 - th / 2), z, w, th, h, c, tag);
      B((w / 2 - th / 2), 0, z, th, d - th * 2, h, c, tag);
      B(-(w / 2 - th / 2), 0, z, th, d - th * 2, h, c, tag);
    };
    const CRATE = (cx, cy, s, c, tag, z) => B(cx, cy, z || 0, s, s, s, c, tag);
    // 街区建筑 blockout：留门洞，侧墙/后墙/屋顶拼出可识别的房屋轮廓
    const HOUSE = (cx, cy, w, d, h, wall, roof, tag) => {
      const t = Math.max(18, Math.round(Math.min(w, d) * 0.075));
      const door = Math.round(w * 0.28), flank = (w - door) / 2;
      B(cx, cy, 0, w, d, 18, wall, tag);
      B(cx - w / 2 + t / 2, cy, 18, t, d, h - 18, wall, tag);
      B(cx + w / 2 - t / 2, cy, 18, t, d, h - 18, wall, tag);
      B(cx, cy + d / 2 - t / 2, 18, w, t, h - 18, wall, tag);
      B(cx - (door + flank) / 2, cy - d / 2 + t / 2, 18, flank, t, h - 18, wall, tag);
      B(cx + (door + flank) / 2, cy - d / 2 + t / 2, 18, flank, t, h - 18, wall, tag);
      B(cx, cy - d / 2 + t / 2, Math.max(90, h * 0.65), door, t, Math.max(18, h * 0.35), wall, tag);
      B(cx, cy, h, w + t, d + t, Math.max(20, t), roof, tag);
      // 外立面窗洞示意（用浅色窄窗条表示，保留 blockout 简洁感）
      const win = Math.max(34, Math.round(w * 0.12));
      B(cx - w * 0.27, cy - d / 2 - 1, h * 0.47, win, 6, Math.max(38, h * 0.18), 'glass', tag);
      B(cx + w * 0.27, cy - d / 2 - 1, h * 0.47, win, 6, Math.max(38, h * 0.18), 'glass', tag);
    };
    // 箱堆：底 s，顶 s*0.72
    const STACK = (cx, cy, s, c, tag) => { CRATE(cx, cy, s, c, tag, 0); CRATE(cx, cy + s * .1, Math.round(s * .72), c, tag, s); };
    // 一排构件
    const ROW = (x0, y0, z, n, gap, w, d, h, c, tag, axis) => {
      for (let i = 0; i < n; i++) {
        const dx = axis === 'y' ? 0 : i * gap, dy = axis === 'y' ? i * gap : 0;
        B(x0 + dx, y0 + dy, z, w, d, h, c, tag);
      }
    };
    // 台阶（dir: +x/-x/+y/-y 上升方向）
    const STAIRS = (x0, y0, w, run, steps, rise, c, tag, dir) => {
      dir = dir || '+x';
      for (let i = 0; i < steps; i++) {
        const z = i * rise, len = run;
        if (dir === '+x') B(x0 + i * run, y0, z, len, w, rise, c, tag);
        else if (dir === '-x') B(x0 - i * run, y0, z, len, w, rise, c, tag);
        else if (dir === '+y') B(x0, y0 + i * run, z, w, len, rise, c, tag);
        else B(x0, y0 - i * run, z, w, len, rise, c, tag);
      }
    };
    // 出生点 / 爆破点标识小平台
    const MARK = (cx, cy, c, tag) => B(cx, cy, 2, 300, 300, 10, c, tag);

    fn({ B, FLOOR, WALLS, CRATE, STACK, ROW, STAIRS, HOUSE, MARK });

    // 包围盒
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const p of parts) {
      minX = Math.min(minX, p.x - p.w / 2); maxX = Math.max(maxX, p.x + p.w / 2);
      minY = Math.min(minY, p.y - p.d / 2); maxY = Math.max(maxY, p.y + p.d / 2);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z + p.h);
    }
    const size = { x: Math.round(maxX - minX), y: Math.round(maxY - minY), z: Math.round(maxZ - minZ) };
    // 所有可生成地图的短边至少 200m；保留地图自身长宽比，允许用户在此基础上放大。
    const layoutScale = Math.max(20000 / size.x, 20000 / size.y, 1);
    // 水平尺度按 200m 起步，垂直单独压缩，避免街区被拉成几十米高墙；细节比例更适合玩家视角。
    const verticalScale = layoutScale * 0.28;
    const worldSize = { x: Math.round(size.x * layoutScale), y: Math.round(size.y * layoutScale), z: Math.round(size.z * verticalScale) };
    // 区域统计
    const tagMap = {};
    for (const p of parts) tagMap[p.tag] = (tagMap[p.tag] || 0) + 1;
    const tags = Object.keys(tagMap).map(t => ({ name: t, count: tagMap[t] }));
    return { id, name, emoji, kind, theme, tip, parts, size, layoutScale, verticalScale, worldSize, tags, bbox: { minX, maxX, minY, maxY, minZ, maxZ } };
  }

  const defs = [];

  // ======================================================= 0) 训练模板（读 template.json，仅预览）
  defs.push({
    id: 'template', name: '训练模板', emoji: '🗺️', kind: 'template',
    theme: { a: '#C9A36B', b: '#8A6E3C' },
    tip: '当前元梦地图的实时快照（1479 个元件）。仅作预览底图，不可直接重建。',
    parts: [], size: { x: 0, y: 0, z: 0 }, tags: [], external: 'template.json',
  });

  // ======================================================= 1) 沙漠·双点（de_dust2 风格）
  defs.push(make('dust2', '沙漠·双点', '🏜️', 'bomb', { a: '#D9BE7E', b: '#8A6E3C' },
    '黄沙小镇，三路爆破结构：南侧 T 出生、中路/长 A/B 隧道，A/B 分列北侧两端。', ({ B, FLOOR, WALLS, CRATE, STACK, ROW, STAIRS, HOUSE, MARK }) => {
      FLOOR(0, 0, 2500, 2000, 'sand', '地面');
      WALLS(2500, 2000, 320, 'sandw', '外墙', 40);
      // 三路拓扑按 Dust II overview/callout 关系整理：T 出生在南，A/B 北侧分列，中路连 CT。
      // 中路：T 出生 → Mid Doors → CT Mid，向东接 Catwalk/Short。
      B(-350, 0, 0, 1050, 120, 45, 'sandd', '中路');
      B(80, 125, 0, 90, 60, 220, 'sandw', '中门'); B(80, -125, 0, 90, 60, 220, 'sandw', '中门');
      B(430, 0, 0, 70, 720, 210, 'sandw', 'CT 中路');
      CRATE(-50, 0, 150, 'wood', 'Xbox');
      // 长 A：从 T 南区绕东侧直达 A，留出长视线与 pit 掩体。
      B(-150, 810, 0, 1450, 60, 250, 'sandw', '长 A');
      B(520, 600, 0, 70, 460, 250, 'sandw', '长 A');
      STACK(-100, 760, 170, 'wood', '长 A'); CRATE(260, 760, 150, 'wood', 'Pit');
      // A Site 在北/东侧，短道从 Catwalk 会合。
      B(780, 590, 0, 500, 500, 60, 'plaza', 'A 点');
      STACK(700, 650, 170, 'wood', 'A 点'); STACK(900, 460, 160, 'wood', 'A 点');
      MARK(780, 590, 'siteA', 'A 点');
      B(300, 330, 0, 560, 55, 170, 'sandw', 'Catwalk'); B(540, 310, 0, 55, 480, 170, 'sandw', 'Catwalk');
      STAIRS(160, 250, 240, 90, 4, 36, 'sandd', 'Catwalk 台阶', '+x');
      // B Site 北/西侧：T 经 Upper/Lower Tunnels 到达；CT 可由北侧 B Doors 回防。
      B(780, -590, 0, 520, 520, 60, 'plaza', 'B 点');
      STACK(740, -650, 170, 'wood', 'B 点'); STACK(930, -470, 150, 'wood', 'B 点');
      MARK(780, -590, 'siteB', 'B 点');
      B(-100, -780, 0, 1450, 65, 230, 'sandw', 'B 隧道'); B(570, -620, 0, 65, 370, 230, 'sandw', 'B 隧道');
      B(90, -650, 0, 65, 310, 190, 'sandw', 'Lower B');
      // 两边出生点
      B(-1030, 0, 0, 220, 640, 45, 'sandd', 'T 出生'); MARK(-1030, 0, 'spawnT', 'T 出生');
      B(1030, 0, 0, 220, 640, 45, 'sandd', 'CT 出生'); MARK(1030, 0, 'spawnCT', 'CT 出生');
      // 小镇街区：外沿低矮房体围出巷道，保持中路、长 A、B 隧道可通行。
      HOUSE(-850, 820, 260, 230, 280, 'sandw', 'sandd', '沙镇·西北');
      HOUSE(-500, 830, 260, 220, 320, 'sandw', 'sandd', '沙镇·西北');
      HOUSE(-850, -820, 260, 230, 280, 'sandw', 'sandd', '沙镇·西南');
      HOUSE(-500, -830, 260, 220, 300, 'sandw', 'sandd', '沙镇·西南');
      HOUSE(170, 980, 260, 200, 300, 'sandw', 'sandd', '沙镇·北街');
      HOUSE(520, 960, 240, 200, 280, 'sandw', 'sandd', '沙镇·北街');
      HOUSE(180, -970, 260, 200, 300, 'sandw', 'sandd', '沙镇·南街');
      HOUSE(520, -960, 240, 200, 280, 'sandw', 'sandd', '沙镇·南街');
      // 中段低层民房与店铺，形成街巷和多方向掩体；主要射击通路留空。
      HOUSE(-650, 370, 240, 200, 280, 'sandw', 'sandd', '沙镇·中西');
      HOUSE(-650, -370, 240, 200, 300, 'sandw', 'sandd', '沙镇·中西');
      HOUSE(-280, 420, 230, 190, 250, 'sandw', 'sandd', '沙镇·市集');
      HOUSE(-280, -420, 230, 190, 270, 'sandw', 'sandd', '沙镇·市集');
      HOUSE(250, 470, 230, 190, 270, 'sandw', 'sandd', '沙镇·中东');
      HOUSE(250, -470, 230, 190, 270, 'sandw', 'sandd', '沙镇·中东');
      HOUSE(900, 920, 220, 180, 250, 'sandw', 'sandd', '沙镇·东门');
      HOUSE(900, -920, 220, 180, 250, 'sandw', 'sandd', '沙镇·南门');
      CRATE(120, 580, 160, 'wood', '掩体'); CRATE(120, -580, 160, 'wood', '掩体');
    }));

  // ======================================================= 2) 小镇·古城（de_inferno 风格）
  defs.push(make('inferno', '小镇·古城', '🏛️', 'bomb', { a: '#A8503C', b: '#C9B99A' },
    '意式砖镇小巷：香蕉道直通 B，中路/公寓分线进 A，出生点与双点按雷达关系布置。', ({ B, FLOOR, WALLS, CRATE, STACK, ROW, HOUSE, MARK }) => {
      FLOOR(0, 0, 2400, 2000, 'plaza', '地面');
      WALLS(2400, 2000, 340, 'bstone', '外墙', 40);
      // 中路连接两侧；拱门与短墙形成视线切分，不封死轮转路线。
      B(0, 0, 0, 1500, 75, 45, 'bstone', '中路');
      B(100, 160, 0, 80, 80, 280, 'brick', '中路拱门'); B(100, -160, 0, 80, 80, 280, 'brick', '中路拱门');
      B(100, 0, 240, 80, 400, 60, 'roof', '中路拱门');
      // A 点位于东南侧，教堂/广场与公寓短道相连。
      B(700, -600, 0, 560, 560, 60, 'plaza', 'A 点');
      B(750, -830, 0, 520, 80, 320, 'brick', '教堂'); B(750, -830, 320, 380, 80, 100, 'roof', '教堂');
      B(750, -830, 420, 180, 80, 100, 'roof', '教堂');
      STACK(590, -590, 170, 'wood', 'A 点'); CRATE(850, -590, 160, 'wood', 'A 点');
      MARK(700, -600, 'siteA', 'A 点');
      B(150, -390, 0, 640, 55, 180, 'brick', '公寓短道'); B(420, -260, 0, 55, 260, 180, 'brick', '公寓短道');
      // B 点位于西北侧，香蕉道由 T 侧连续弯行到 B。
      B(720, 570, 0, 540, 540, 60, 'plaza', 'B 点');
      STACK(690, 600, 170, 'wood', 'B 点'); CRATE(890, 430, 160, 'wood', 'B 点'); MARK(720, 570, 'siteB', 'B 点');
      B(-90, 720, 0, 1450, 65, 270, 'brick', '香蕉道');
      B(610, 545, 0, 65, 350, 270, 'brick', '香蕉道');
      B(-820, 520, 0, 70, 470, 260, 'brick', '香蕉道');
      // T 从西侧进入；CT 在东侧中部快速轮转至 A/B。
      B(-1030, 0, 0, 220, 600, 42, 'brick', 'T 出生'); MARK(-1030, 0, 'spawnT', 'T 出生');
      B(1030, 0, 0, 220, 600, 42, 'bstone', 'CT 出生'); MARK(1030, 0, 'spawnCT', 'CT 出生');
      // 密集意式街区与房屋立面，保持香蕉道/公寓/中路的贯通。
      HOUSE(-850, -820, 250, 230, 300, 'brick', 'roof', '老城·南西');
      HOUSE(-490, -820, 240, 230, 280, 'brick', 'roof', '老城·南西');
      HOUSE(-120, -820, 250, 230, 320, 'brick', 'roof', '老城·南街');
      HOUSE(250, -850, 250, 220, 300, 'brick', 'roof', '老城·南街');
      HOUSE(-850, -300, 250, 220, 290, 'bstone', 'roof', '老城·西巷');
      HOUSE(-500, -280, 250, 220, 330, 'brick', 'roof', '老城·西巷');
      HOUSE(-850, 850, 250, 220, 300, 'brick', 'roof', '老城·北街');
      HOUSE(-500, 850, 250, 220, 280, 'bstone', 'roof', '老城·北街');
      HOUSE(200, 850, 260, 230, 320, 'brick', 'roof', '老城·北东');
      HOUSE(600, 850, 240, 220, 290, 'bstone', 'roof', '老城·北东');
    }));

  // ======================================================= 3) 运输船（穿越火线 风格）
  defs.push(make('cargo', '运输船', '🚢', 'team', { a: '#2E6FA8', b: '#8A9099' },
    '远洋货轮甲板，集装箱迷宫与船桥，海面环绕，两队首尾对冲。', ({ B, FLOOR, WALLS, CRATE, ROW, MARK }) => {
      FLOOR(0, 0, 3000, 2400, 'water', '海面', -40, 30);        // 海面
      B(0, 0, -40, 2000, 1000, 60, 'deck', '甲板');             // 主甲板
      B(1080, 0, -40, 240, 600, 60, 'deck', '船首'); B(1240, 0, -40, 140, 300, 60, 'deck', '船首');
      B(-1080, 0, -40, 240, 700, 60, 'deck', '船尾');
      // 护栏
      B(0, 510, 20, 2000, 20, 120, 'rail', '护栏'); B(0, -510, 20, 2000, 20, 120, 'rail', '护栏');
      // 集装箱区（多色网格）
      const cols = ['cRed', 'cBlue', 'cGreen', 'cYel'];
      let k = 0;
      for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 3; iy++) {
        const x = -360 + ix * 260, y = -300 + iy * 300, c = cols[(k++) % 4];
        B(x, y, 20, 240, 260, 240, c, '集装箱区');
        if ((ix + iy) % 2 === 0) B(x, y, 260, 240, 260, 200, cols[(k) % 4], '集装箱区');
      }
      B(-100, 0, -8, 300, 300, 10, 'cBlue', '中央集装箱区');
      // 船桥（后部多层驾驶楼）
      B(-760, 0, 20, 420, 620, 260, 'cabin', '船桥'); B(-760, 0, 280, 360, 520, 220, 'cabin', '船桥');
      B(-760, 0, 500, 300, 420, 160, 'glass', '船桥');
      B(-760, 0, 25, 300, 300, 10, 'cRed', '船桥制高点');
      // 吊臂
      B(500, 420, 20, 90, 90, 420, 'metal', '吊臂'); B(500, 150, 420, 90, 640, 70, 'metal', '吊臂');
      // 首尾出生
      B(1150, 0, 20, 220, 500, 30, 'deck', '进攻方出生'); MARK(1150, 0, 'spawnT', '进攻方出生');
      ROW(1000, -200, 20, 3, 200, 180, 180, 180, 'cYel', '进攻方出生', 'y');
      B(-1120, 0, 20, 200, 560, 30, 'deck', '防守方出生'); MARK(-1120, 0, 'spawnCT', '防守方出生');
      ROW(-980, -200, 20, 3, 200, 180, 180, 180, 'cBlue', '防守方出生', 'y');
    }));

  // ======================================================= 4) 核危·双层（de_nuke 风格 · 拓展①）
  defs.push(make('nuke', '核危·双层', '☢️', 'bomb', { a: '#7E858C', b: '#D4A82E' },
    '核电站上下两层：顶层大厅 A 点围着反应堆穹顶，地下管道通 B 点。', ({ B, FLOOR, WALLS, CRATE, STACK, STAIRS, MARK }) => {
      FLOOR(0, 0, 2200, 1800, 'concrete', '地下层', 0, 30);      // 下层地面
      B(250, 100, 320, 1000, 1050, 40, 'metal', '顶层大厅');       // 上层楼板只覆盖主大厅，留出下层轮转空间
      WALLS(2200, 1800, 240, 'metal', '外墙', 40);
      // 连接楼梯从下层爬到上层大厅边缘
      STAIRS(-700, -450, 240, 90, 8, 40, 'metal', '连接楼梯', '+x');
      // 反应堆穹顶（上层 A 点，阶梯近似半球）
      const dome = [[760, 760, 60], [600, 600, 120], [440, 440, 170], [280, 280, 200], [140, 140, 220]];
      let z = 360;
      for (const [w, d, h] of dome) { B(640, 300, z, w, d, 60, 'reactor', 'A 点·反应堆'); z += 54; }
      B(640, 300, 360, 200, 200, 240, 'reactord', 'A 点·反应堆');
      MARK(640, 300, 'siteA', 'A 点·反应堆');
      // 上层掩体
      STACK(0, 500, 200, 'wood', '顶层大厅'); CRATE(200, -500, 200, 'metal', '顶层大厅');
      // 下层 B 点（地下管道）
      B(-600, -400, 0, 620, 620, 60, 'concrete', 'B 点·地下');
      B(-600, -40, 0, 90, 90, 300, 'pipe', '管道'); B(-300, -400, 0, 600, 90, 90, 'pipe', '管道');
      STACK(-600, -500, 200, 'wood', 'B 点·地下'); MARK(-600, -400, 'siteB', 'B 点·地下');
      // 出生
      B(620, -300, 320, 220, 400, 40, 'metal', 'CT 出生'); B(620, -300, 362, 220, 400, 20, 'spawnCT', 'CT 出生');
      B(-980, -650, 0, 220, 500, 40, 'concrete', 'T 出生'); MARK(-980, -650, 'spawnT', 'T 出生');
    }));

  // ======================================================= 5) 雪地要塞（拓展②）
  defs.push(make('frost', '雪地要塞', '❄️', 'team', { a: '#A9D4E6', b: '#5E636B' },
    '冰原上的中央碉堡，两侧木屋出生，冰墙与雪丘做天然掩体。', ({ B, FLOOR, WALLS, CRATE, STACK, ROW, MARK }) => {
      FLOOR(0, 0, 2200, 2000, 'snow', '雪原');
      WALLS(2200, 2000, 300, 'ice', '冰墙', 40);
      // 中央碉堡
      B(0, 0, 0, 700, 700, 80, 'bunker', '中央碉堡');
      B(0, 330, 80, 700, 90, 280, 'bunker', '中央碉堡'); B(0, -330, 80, 700, 90, 280, 'bunker', '中央碉堡');
      B(300, 0, 80, 90, 520, 280, 'bunker', '中央碉堡');
      B(-300, 110, 80, 90, 300, 280, 'bunker', '中央碉堡');  // 留门
      B(0, 0, 360, 760, 760, 70, 'bunker', '中央碉堡');
      // 木屋（两侧）
      B(760, 560, 0, 500, 460, 300, 'wood', '东木屋'); B(760, 560, 300, 400, 360, 120, 'woodd', '东木屋');
      B(-760, -560, 0, 500, 460, 300, 'wood', '西木屋'); B(-760, -560, 300, 400, 360, 120, 'woodd', '西木屋');
      B(760, 560, 2, 300, 300, 10, 'siteB', '东木屋战场');
      // 冰墙掩体 + 雪丘 + 围栏
      B(400, -400, 0, 90, 400, 220, 'ice', '冰墙'); B(-400, 400, 0, 90, 400, 220, 'ice', '冰墙');
      STACK(260, 500, 200, 'snow', '雪丘'); STACK(-260, -500, 200, 'snow', '雪丘');
      ROW(-600, 760, 0, 4, 220, 70, 70, 180, 'woodd', '围栏', 'x');
      // 出生
      B(980, -700, 0, 220, 520, 40, 'ice', '甲队出生'); MARK(980, -700, 'spawnCT', '甲队出生');
      B(-980, 700, 0, 220, 520, 40, 'ice', '乙队出生'); MARK(-980, 700, 'spawnT', '乙队出生');
    }));

  // ======================================================= 6) 午夜公司（cs_office 风格 · 拓展③）
  defs.push(make('office', '午夜公司', '🏢', 'team', { a: '#4A5A7A', b: '#E4E6EA' },
    '写字楼室内：中央长廊、成排隔间、玻璃会议室与前台，近身巷战。', ({ B, FLOOR, WALLS, CRATE, ROW, MARK }) => {
      FLOOR(0, 0, 2000, 1600, 'carpet', '地板');
      WALLS(2000, 1600, 280, 'wallc', '外墙', 36);
      // 中央长廊
      B(0, 420, 0, 1700, 36, 240, 'wallc', '长廊'); B(0, -420, 0, 1700, 36, 240, 'wallc', '长廊');
      B(0, 0, 0, 420, 420, 20, 'door', '长廊');   // 走廊地标
      // 隔间区（右侧网格）
      let k = 0;
      for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 2; iy++) {
        const x = 150 + ix * 300, y = 560 + iy * 300;
        B(x, y, 0, 240, 36, 120, 'wallc', '办公区');      // 隔断
        B(x, y - 80, 0, 160, 120, 90, 'desk', '办公区');  // 桌
        k++;
      }
      // 玻璃会议室（左上）
      B(-560, 560, 0, 560, 36, 220, 'glass', '会议室'); B(-560, 780, 0, 560, 36, 220, 'glass', '会议室');
      B(-840, 670, 0, 36, 260, 220, 'glass', '会议室'); B(-280, 670, 0, 36, 260, 220, 'glass', '会议室');
      B(-560, 670, 0, 360, 160, 90, 'desk', '会议室');
      // 前台（下方）
      B(0, -620, 0, 520, 120, 130, 'desk', '前台'); B(0, -620, 130, 520, 120, 36, 'wallc', '前台');
      B(360, -600, 0, 36, 300, 220, 'door', '前台门');
      // 房间掩体
      CRATE(600, -600, 160, 'wood', '仓库'); CRATE(760, -600, 160, 'wood', '仓库'); CRATE(680, -440, 160, 'wood', '仓库');
      // 出生
      B(900, 0, 0, 200, 700, 36, 'carpet', '警方出生'); MARK(900, 0, 'spawnCT', '警方出生');
      B(-900, 0, 0, 200, 700, 36, 'carpet', '匪方出生'); MARK(-900, 0, 'spawnT', '匪方出生');
    }));

  // 公开地图资料作为布局校对来源；模型为本项目原创 blockout，不包含/重制游戏地图资产。
  const SOURCE_INFO = {
    dust2: { label: 'CS2 Dust II radar overview + map guide', url: 'https://cs2.eu?p=3396/', assetUrl: 'https://github.com/MurkyYT/cs2-map-icons', asset: 'reference/de_dust2_radar.png', overview: { pos_x:-2476,pos_y:3239,scale:4.4,rotate:1,TSpawn:[0.39,0.91],CTSpawn:[0.62,0.21],bombA:[0.80,0.16],bombB:[0.21,0.12] }, note: '雷达图来自公开 CS2 游戏文件的第三方镜像（雷达资产归 Valve）；下方保留 overview 坐标与出生/爆点归一化标记；3D结构是依据 T/CT 出生、Mid、Long A、Catwalk、B Tunnels、A/B 点的连接关系制作的原创简化灰盒。' },
  };
  defs.forEach(m => { if (SOURCE_INFO[m.id]) m.source = SOURCE_INFO[m.id]; });
  defs[0].source = { label: '当前元梦地图快照（本地导出）', url: '', asset: '', note: '仅作场景预览，不作为 FPS 灰盒的真实参考或可生成订单。' };

  // ---------- 生成到元梦：把构件变成"放置清单" ----------
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const r1 = v => Math.round(v * 1000) / 1000;
  const TYPE_ID = '1101002001034000';

  /* spec: { scale: 整体缩放倍数(默认1，1×保证短边至少200m), x,y,z: 放置原点(地图中心地面), yaw: 朝向角 }
   * 元梦坐标直接对齐地图空间：地图 X→元梦 X，Y→元梦 Y，Z→元梦 Z。
   * 立方体原点在底面中心；水平基础 layoutScale 把短边扩至≥20000cm，垂直按 verticalScale 控高。
   */
  function buildPlacement(map, spec) {
    const s = (map.layoutScale || 1) * (spec.scale || 1);
    const sz = (map.verticalScale || map.layoutScale || 1) * (spec.scale || 1);
    const rad = (spec.yaw || 0) * Math.PI / 180;
    const cs = Math.cos(rad), sn = Math.sin(rad);
    const parts = map.parts || [];
    return parts.map(p => {
      const lx = p.x * s, ly = p.y * s;                 // 缩放后局部坐标
      const wx = lx * cs - ly * sn, wy = lx * sn + ly * cs; // 绕原点旋转
      return {
        typeId: TYPE_ID,
        transform: {
          location: { x: r1(spec.x + wx), y: r1(spec.y + wy), z: r1(spec.z + p.z * sz) },
          rotation: { pitch: 0, yaw: r1((spec.yaw || 0) + (p.ry || 0)), roll: 0 },
          scale: { x: r1(p.w * s / 100), y: r1(p.d * s / 100), z: r1(p.h * sz / 100) },
        },
        color: hexToRgb(PAL[p.c] || '#9199A3'),
        _c: p.c, _tag: p.tag,
      };
    });
  }

  // Keep only the training snapshot and Dust II in the picker; hide the five retired map presets.
  const visibleMapIds = new Set(['template', 'dust2']);
  const MAPS = defs.filter(map => visibleMapIds.has(map.id));
  const api = { PAL, PAL_NAME, MAPS, buildPlacement, hexToRgb, TYPE_ID };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FpsMaps = api;
})(typeof window !== 'undefined' ? window : globalThis);
