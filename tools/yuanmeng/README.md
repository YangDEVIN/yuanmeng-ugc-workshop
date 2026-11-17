# 🛠️ 元梦编辑器侧辅助工具

这里是**元梦编辑器连接与导入工具**，属于配套源码数据，**不参与网页运行**（`tools/serve.cjs` 不会向外提供 `tools/` 目录）。网页本体在仓库根目录。

## 文件说明

| 文件 | 用途 |
| --- | --- |
| `import_map.py` | 读取工程里的 `placement.commands`，按批次调用 `ugc_create_entity` 导入元梦；写 `import-progress.json` 支持断点续跑 |
| `verify_map.py` | 按 `sceneId` 抽样回读，对比 `location / rotation / scale / color / typeId` |
| `correct_map.py` | 全量回读并校正编辑器 50 cm 网格吸附误差；默认只审计，`--apply` 才写回 |
| `midnight-roll-call-map-project.json` | 归档的《午夜点名》工程源（schema `yuanmeng-story-project/v1`，`campus-night-v3`，200 × 200 m，1636 个 box、84 批共 1674 条放置命令） |
| `map_entities_20261113_1730.json / .csv / .tsv` | 元梦地图元件快照：1479 个元件、69 种类型，字段 `index/name/class/location/rotation/scale`，单位 cm |
| `import-progress.json` | 历史导入进度：84 批全部完成，含每批 `items / ok / sceneIds / elapsedSec`，`saved=false` |
| `import-audit.json` | 历史全量审计：`total=1674 fixes=711 missing=434 maxLocationDelta=25cm`；`missing` 是审计途中编辑器进入试玩态导致的回读失败，**不是元件缺失** |

> ⚠️ 上表两个 `*.json` 状态文件是**历史运行快照**，不代表编辑器当前状态。网页现为 `campus-night-v4`，与本目录归档的 v3 工程不是同一版布局。

## 前置条件

- Python 3（仅标准库，无第三方依赖）。
- 元梦编辑器已启动，且本机存在连接配置：
  `%LOCALAPPDATA%\Yuanmeng\DesktopService\ai-connection.json`
  （Streamable HTTP MCP，`http://127.0.0.1:18000/mcp`，含 `Authorization` 与 `X-Openid`）。
- **凭据只在本机读取，不打印、不写入日志，也绝不入库**（已被 `.gitignore` 排除）。

## 常用命令

在本目录执行：

```bash
python import_map.py --start 0 --end 1   # 试跑第 1 批
python import_map.py --resume            # 断点续跑剩余批次
python import_map.py --verify            # 回读场景概况
python import_map.py --save              # 保存地图（需处于编辑态）
python verify_map.py --samples 16        # 抽样回读校验
python correct_map.py                    # 只审计，写 import-audit.json
python correct_map.py --apply            # 校正 transform 后再回读确认
```

## 注意事项

- `ugc_create_entity` 每批 `items` 顺序执行且非原子；失败时先查 `completed / current` 再回读，**不要重复创建**。
- 编辑器会把坐标吸附到 50 cm 网格（例如 `(-6638,7545) → (-6650,7550)`、`yaw 270 → -90`），因此必须按 `sceneId` 回读并校正。
- `runningMode = Playing` 时回读、更新、保存都会返回 `NOT_IN_EDIT_MODE`，需**先退出试玩**再收尾；不要擅自替使用者停止试玩。
