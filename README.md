# ◈ 元梦创作工坊（Yuanmeng UGC Workshop）

一套**纯静态、零构建**的网页工具集，用于元梦之星 UGC 地图与积木模型的可视化预览、走查、编辑、工程导入导出，以及生成可直接交给元梦编辑器的放置清单 / 生成口令。

- 技术栈：原生 HTML + CSS + JavaScript，3D 预览使用仓库内置的 three.js（`lib/three.min.js`），无需 `npm install`，无需打包。
- 坐标单位：网页作者层用**米**，导出到元梦的清单一律用**厘米**，Z 轴朝上。
- 工坊版本：2026.11.18
- [打开线上工坊](https://yangdevin.github.io/yuanmeng-ugc-workshop/)

## 使用方式

线上版支持预览已有模型、编辑和导出。导入工程 JSON、使用自定义仓库以及连接自己的 Agent，需要下载完整项目并在本地启动工坊。

在 GitHub 仓库选择 Code → Download ZIP，解压后在项目根目录运行 `node tools/serve.cjs`，打开终端显示的本地地址（默认 http://127.0.0.1:18765/）。使用期间保持终端开启。

## 🗂️ 目录结构

| 路径 | 内容 |
| --- | --- |
| `index.html` / `workshop.css` | 首页，两个顶层页签：地图场景工坊 / 模型工坊 |
| `maps.html` `maps.js` `template.json` `player-layout.js` | FPS 对战地图：数据层、预览、规模与生成口令 |
| `story.html` `campus-*.js` `campus.css` | 剧情图工坊《午夜点名》：平面、场景、材质、渲染、玩法、天空盒、恐怖模组 |
| `parkour.html` | 跑酷图工坊（规划中，仅入口与天空盒预览） |
| `animals/` | 积木模型工坊（原乐高动物园，9 种动物模型、订单 JSON、积木清单） |
| `dust2-source.html` `surface-blocks.js` `map-placement.js` `map-project.js` `map-workspace.js` `spawn-editor.js` `fps-route*.js` | 沙漠双点原图 / BSP 编辑器、体素化、出生点、动线验证、工程导出 |
| `map-edit.html` `map-edit.js` `map-edit.css` `map-draft.js` `draft-store.js` | 共享的临时地图编辑页与草稿存储 |
| `native-assets.js` `campus-assets.js` `editor-skybox-list.js` `campus-skyboxes.js` `campus-sky-view.js` | 元梦内置元件目录与天空盒目录（保留元梦显示 ID） |
| `campus-materials.js` `campus-native-preview.js` | 正式版与编辑页**共用**的材质基线、内置元件拆解表 |
| `map-guidance.js` `map-workspace.css` `animals/lib/` `lib/` | 引导标注、通用样式、内置 three.js |
| `reference/` | 雷达图、Dust II 几何数据（JS / JSON）、元梦模板快照 |
| `de_dust2-playable-placement.json` `dust2-map-project-with-template.json` | 预生成的元梦放置清单与工程数据 |
| `tools/serve.cjs` `tools/extract-dust2.cjs` | 本地静态服务、从原始 BSP 提取几何 |
| `tools/yuanmeng/` | 元梦编辑器侧辅助脚本（Python）与导入数据快照，不参与网页运行 |
| `agent.md` `使用说明.md` `horror-references.md` | 项目规范、使用说明、恐怖游戏视觉参考 |

---

## 🧩 页面与功能总览

| 页面 | 主要功能 | 能否导出到元梦 |
| --- | --- | --- |
| `index.html` 首页 | 两个顶层页签、卡片式入口、键盘焦点与选中态 | — |
| `maps.html` FPS 对战 | 地图选择、three.js 3D 预览（实色 / 线框 / 俯视）、区域细节、布局参考、最短边 ≥ 200 m 的规模设置、整体缩放、生成口令、放置清单、分享深链 | ✅ 生成口令 / 放置清单 JSON |
| `story.html` 剧情图工坊 | 《午夜点名》200 × 200 m 校园夜景；俯视 / 透视 / 线框 / 跟随 / 剖视屋顶；WASD 与方向键走查；5 个剧情站点与巡夜路线；84 件可交互物件；动线验证、出生点设置、天空盒选择；导入 / 导出工程 JSON、导出元梦积木清单、进入临时编辑页 | ✅ 工程 JSON / 积木清单 |
| `parkour.html` 跑酷图工坊 | 规划中，提供入口与天空盒预览 | ❌ 暂不提供 |
| `animals/index.html` 积木模型工坊 | 9 种动物体素模型、单块 / 合并块两种拼法、边长与坐标设置、积木清单预览、生成口令、下载订单 JSON | ✅ 生成口令 / 积木清单 |
| `dust2-source.html` 沙漠双点 | 原图 / BSP 几何编辑器、A/B 引导点、出生点编辑、动线验证、工程与放置清单导出 | ✅ 工程 JSON / 积木清单 |
| `map-edit.html` 临时编辑页 | 初始画面与正式版一致；点选 / 删除 / 放置 / 撤销；元梦内置元件目录；Agent 接口应用修改；运行时元件显示；确认导出工程 JSON | ✅ 由玩家确认后导出 |

**当前地图列表**：`maps.js` 中通过 `visibleMapIds` 只保留「训练模板」和「沙漠·双点」；小镇·古城、运输船、核危·双层、雪地要塞、午夜公司已按需求移除。

---

## 📖 操作指南

### 1️⃣ 生成乐高积木动物

1. 首页切到「模型工坊」→ 打开「积木模型工坊」。
2. 左侧选动物模型，设置**每块边长**（如 30 cm）、坐标 `X/Y/Z`、朝向 `yaw`、拼法（单块 / 合并块）。
3. 右侧查看积木清单与 3D 预览，点击「复制生成口令」或「下载 JSON」。
4. 订单格式示例：

   ```json
   {"animal":"rabbit","size":30,"x":0,"y":0,"z":0,"yaw":0,"mode":"merge"}
   ```

5. 把清单交给元梦编辑器批量放置；方块统一使用 `typeId = 1101002001034000`，基础边长 100 cm，缩放按目标边长换算。

### 2️⃣ 生成 FPS 对战地图

1. 首页 → 「地图场景工坊」→「FPS 对战」。
2. 选地图，用视角按钮（实色 / 线框 / 俯视）检查 3D 预览，查看「区域细节」「布局参考」。
3. 在「地图规模」里确认最短边 ≥ 200 m；用「整体缩放」与坐标 `X/Y/Z`、朝向调整摆放。
4. 在「在元梦里生成」里复制生成口令，或复制 / 下载放置清单 JSON。
5. 「复制分享链接」会带上 `#map=<id>&scale=<n>&x=<n>&y=<n>&z=<n>&yaw=<n>`，对方打开即恢复同一套配置。

> 所有地图的短边会自动扩到至少 200 m（`layoutScale`），垂直高度单独压缩（`verticalScale = layoutScale × 0.28`），实际大小以游戏内游玩体验为准，可自由调整。

### 3️⃣ 试玩与走查《午夜点名》

1. 首页 →「剧情图工坊」，或从 FPS 页的子页签进入 `story.html`。
2. 视角：俯视 / 透视 / 线框 / 跟随；「剖视屋顶」看室内；天空盒下拉切换夜景。
3. 移动：方向键或 `WASD`；底部操作栏右侧「操作」（`E`）与「沿路线移动」。
4. 交互：靠近桌椅、黑板、公告栏、档案架、配电柜、广播台等 84 件物件，按 `E` 或点「操作」，会拉椅子、掀床单、擦粉笔字等；侧栏「场景物件」显示「已查看 n / 84」。
5. 侧栏「动线验证」检查步行路线与净空，「出生点设置」调整出生点；巡夜路线按站点推进剧情与广播台谜题。
6. 需要重置时点「重新入校」。

### 4️⃣ 编辑地图（临时草稿）

1. 在正式版点「编辑地图」，会打开共享的 `map-edit.html`。**打开瞬间的画面与正式版完全一致**（镜头、视角、天空盒、雾、灯光、剖视、站点标签、材质、玩家位置）。
2. 编辑页可：点选元件 → 删除选中；从元梦内置目录放置真实 `typeId`；撤销；用「运行时元件」显示出生点 / 灯光 / 雾效实体；在「Agent 接口」页应用外部返回的修改。
3. 改完点「确认导出 JSON」下载工程。**编辑只作用于临时草稿，不会自动污染正式版**；返回正式版后元件数与交互计数不变。要让正式版变化，必须把导出的工程重新「导入地图工程」。
4. Dust II 原图编辑器没有正式版画面快照，保持原有全图编辑视角。

### 5️⃣ 导出到元梦编辑器

1. 剧情图页 / 沙漠双点页点「导出地图工程 JSON」或「导出元梦积木清单」。
2. 工程 JSON 含 `geometry.pieces`、`placement.commands`（分批的 `ugc_create_entity` 参数）、`gameplay.interactables`、`settings.spawns` 等。
3. `tools/yuanmeng/` 里的 Python 脚本可按 `placement.commands` 批量导入、回读校验并校正编辑器 50 cm 网格吸附误差（见该目录 README）。
4. **重要**：网页里的灯光、雾、天空、剧情事件在元梦里标为 `runtimeBinding: required`，需要另行绑定；静态检查通过 ≠ 游戏内验收通过。

---

## 📐 数据格式与坐标约定

| 项目 | 约定 |
| --- | --- |
| 单位 | 元梦清单用厘米（cm）；网页作者层用米（m），`campus-scene.js` 的 `cm()` 负责换算 |
| 轴向 | 元梦：Z 朝上；网页正式版与编辑页统一为「米，X = 地图 x，Y = 高度，Z = 地图 y」 |
| 构件 | `part = {x,y,z,w,d,h,c,tag,ry}`，`maps.js`；剧情图为 `piece = {id,group,shape,positionCm,sizeCm,yaw,color,collider,material,interactive}` |
| 放置清单 | `typeId / transform.location / transform.rotation / transform.scale / color`，每批 ≤ 20 项 |
| 工程 schema | `yuanmeng-story-project/v1`、`yuanmeng-story-placement/v1`、`yuanmeng-fps-placement/v1` |
| 草稿 | `draft-store.js` 以 IndexedDB 为主、同标签页 `sessionStorage` 镜像兜底；URL 形如 `map-edit.html?sharecode=…#<uuid>` |
| 视图快照 | 正式版把镜头 / 视角 / 天空盒 / 雾 / 剖视 / 玩家位置 / 站点打包成只读 `viewState` 交给编辑页 |

**当前《午夜点名》规模**：2496 件几何构件、2538 条放置命令、127 个批次、84 件交互、17 类材质、4 个场景模组、两页可见实例均为 2552。

---

## ✅ 硬性规范（详见 `agent.md`）

- ● **桌椅板凳必须对齐且可交互**；课桌、桌腿、椅面、椅背、椅腿共用 `campus-plan.js` 的同一份 `seats` 布局，禁止两处各写一套坐标。
- ● 玩家星宝外包尺寸 `120 × 223 × 281 cm`；通行净空下限 `300 cm` 宽 / `320 cm` 高；通行面不得出现意外空洞。
- ● 天花板必须显著高于玩家：主教学楼 860 cm、档案 / 配电 780 cm、广播室 820 cm、模组房 720 cm、连廊 740 cm。
- ● 禁止所有 solid 块共用一个材质；按 `campus-materials.js` 的 17 类程序纹理分组。
- ● 正式版与临时编辑页的**初始画面必须一致**；内置元件拆解必须共用 `campus-native-preview.js`；静态资源引用带 `?vN` 版本号。
- ● 禁止在跨源 iframe 里读写 `window.top.location`；跳转保留 `location.search` 中的分享参数。
- ○ 批量写入后按场景与元件 ID 回读，校正网格吸附；静态检查 / 单人试玩 / 多人验收分级记录，未测路线不得标记通过。

---

## 🧪 验证、打包与部署

| 环节 | 做法 |
| --- | --- |
| 本地静态服务 | `node tools/serve.cjs` → <http://127.0.0.1:18765/>，服务带 `Cache-Control: no-store` |
| 语法检查 | `node --check <文件>.js` |
| 工程往返 | `makeProject()` → `readProject()`，`missing` 必须为 0、ID 唯一 |
| 页面验收 | 同分辨率截取正式版与编辑页 3D 画面，核对镜头 / target、材质分组、站点标签、天空盒一致 |
| ZIP 打包 | 用 UTF-8 文件名标志位打包，避免中文名乱码；`reference/source/*.bsp`（约 325 MB 原始素材）与含第三方统计脚本的抓取页不参与运行、不打包 |
| 线上部署 | 静态站点，入口 `index.html`；部署后建议 `Ctrl+F5` 强制刷新，让带 `?v6` 的 JS/CSS 生效 |

> 推送 main 后由 GitHub Pages 工作流部署。

---

## ❓ 常见问题

| 现象 | 处理 |
| --- | --- |
| 双击 `index.html` 无法导入工程 / 下载文件 | 下载完整项目并运行 `node tools/serve.cjs` |
| 「编辑页载入失败：Failed to read a named property 'assign' from 'Location'」 | 已在 `draft-store.js` 修复：跨源 iframe 只改当前 frame 地址；请确认使用带 `?v6` 的最新脚本并强制刷新 |
| 改了代码但线上看起来没变 | 静态资源带 `?v6` 且页面声明 `no-store`，部署后按 `Ctrl+F5` 刷新 |
| 编辑页出现整块淡紫色大方块 | 内置元件未走 `campus-native-preview.js` 拆解；两页可见实例数应相等（2552） |
| 控制台报 `favicon.ico 404` | 无害，不影响功能 |
| 元梦里的《午夜点名》和网页不一样 | 网页为 `campus-night-v4`，元梦里是更早导入的 v3 布局；需重新导出并放置才会一致 |

---

## ⚠️ 已知限制与待办

- ● 跑酷图工坊仍是规划中页面，不提供生成或导出。
- ● 剧情事件、灯光、雾、天空、交互反馈在游戏内属于 `runtimeBinding: required`，尚未在元梦侧实现，不能称「可玩 / 验收通过」。
- ● 元梦里此前导入的《午夜点名》尚未完成 50 cm 网格吸附校正、补全回读与保存地图；这些操作需在退出试玩、回到编辑态后进行。
- ● 网页静态检查与浏览器截图只能证明页面正确，不能替代游戏内单人试玩与多人验收。
- ○ `tools/yuanmeng/` 中的 `import-progress.json` / `import-audit.json` 是历史运行快照，不代表编辑器当前状态。

---

## 📤 同步到 GitHub

本地仓库已关联到个人账号 **`YangDEVIN`**：

| 项 | 值 |
| --- | --- |
| 本地路径 | `C:\Users\senzhuoyang\WorkBuddy\2026-11-13-16-07-04\yuanmeng-workshop\` |
| 分支 | `main` |
| 远端 `origin` | `https://github.com/YangDEVIN/yuanmeng-ugc-workshop.git` |
| 提交身份 | `YangDEVIN <YangDEVIN@users.noreply.github.com>` |
| 首次提交 | 72 个文件，含全部源码、地图数据、规范与文档 |

**当前状态：✅ 已全部推送到 `YangDEVIN/yuanmeng-ugc-workshop` 的 `main` 分支。**

| 项 | 值 |
| --- | --- |
| 仓库地址 | <https://github.com/YangDEVIN/yuanmeng-ugc-workshop> |
| 默认分支 | `main`，已建立 `origin/main` 上游跟踪 |
| 提交 | 3 个，作者均为 `YangDEVIN <YangDEVIN@users.noreply.github.com>` |
| 文件 | 72 个，含两个约 8.3 MB 的 Dust II 几何数据、4 张雷达图 / 布局图、`tools/yuanmeng/` 导入脚本与地图快照 |
| 未入库 | 约 325 MB 原始 BSP、含第三方统计脚本的抓取页、ZIP 打包产物、`ai-connection.json` 凭据 |

认证过程：WorkBuddy 的 GitHub 连接器确认账号为 `YangDEVIN`，但它使用 GitHub App 安装令牌，**无权在个人账号下新建仓库**（创建接口返回 `403 Resource not accessible by integration`），因此远端空仓库在 GitHub 网页创建；随后用本机 Git Credential Manager 2.9.0 的设备码流程完成一次 YangDEVIN 登录，凭据已缓存。

后续同步改动：

```bash
git add -A && git commit -m "说明本次改动"
git push
```

想换仓库名时先改地址：`git remote set-url origin https://github.com/YangDEVIN/<新名字>.git`。

> ● 默认建议私有仓库；若要公开，网页新建时选 Public，或 `gh repo create` 去掉 `--private`。
> ● 绝不提交 `%LOCALAPPDATA%\Yuanmeng\DesktopService\ai-connection.json` 等凭据文件，`.gitignore` 已排除。
> ● 推送成功后在仓库 Settings → Pages 选择 `GitHub Actions` 即可开启 GitHub Pages，静态站点入口为根目录 `index.html`。
> ● 仓库目录与网站部署目录是分开的：本目录用于 GitHub；`fps-maps/` 用于本地预览与线上发布，改动网站后需把变更文件同步过来再提交。

---

## 📚 文档索引

| 文档 | 用途 |
| --- | --- |
| `README.md` | 本文件：整体功能、目录、操作指南、常见问题 |
| `使用说明.md` | 面向使用者的简明说明与每轮改动摘要 |
| `agent.md` | **项目硬规范**：玩家尺度、净空、家具交互、材质、两页同步、验收顺序；改动地图前先读 |
| `horror-references.md` | 36 款热门 / 经典恐怖游戏视觉参考、8 条改造原则及本图落地位置 |
| `tools/yuanmeng/README.md` | 编辑器侧导入 / 校验 / 校正脚本说明 |

---

## 🙏 参考与说明

- 地图布局参考来自公开雷达图与公开资料，来源记录在 `maps.js` 的 `SOURCE_INFO` 与 `reference/`。
- `reference/dust2-geometry.*` 是从 Source BSP 提取的表面几何数据；原始 BSP 体积约 325 MB，不入库、不参与网页运行。
- 「元梦之星」及相关素材名称仅用于说明本工具的用途与数据格式。
- 本仓库内容为个人创作工具与地图工程数据，仅用于学习与创作；第三方游戏地图、图片与资料的版权归各自权利人所有。

## 积木地图与 2D 小游戏

积木地图工坊保留 FPS 对战、剧情、跑酷和自定义仓库。新建地图的基础方块使用元梦目录中的「立方体 · 积木」，网页用凸点和拼缝预览；原图对照仍展示来源模型。

在首页打开「2D 小游戏 → 俄罗斯方块」。方向键移动和旋转，空格落底，也可使用屏幕按钮。网页可试玩并导出含 UI 布局和 Lua 源文件的 JSON。本地版可打开专用空白 2D 草稿，点击「一键导入元梦」，核对地图名后写入。控件 UID 在导入时回读并写入 Lua 绑定表。当前导入器支持内置俄罗斯方块工程。

### 公主大冒险与本地 Agent

在「2D 小游戏」打开《公主大冒险》，用方向键调整横向位置和速度，空格跳跃，依次抵达十座城堡。玩法参考[任天堂发布的 FC 游戏说明书](https://www.nintendo.co.jp/data/software/manual/man_FC4J_00.pdf)。本作是原创像素画的 HTML 浏览器游戏。

各工坊的生成与验收规则见 [AGENTS.md](AGENTS.md)。下载完整仓库后，在项目根目录打开 Codex 或 Claude Code 即可加载项目规范。通过本地工坊发送地图编辑任务时，服务会自动把同一份规范放进任务目录和任务正文，供支持的 Agent 使用。玩家仍需自行安装并登录所用的 Agent。
