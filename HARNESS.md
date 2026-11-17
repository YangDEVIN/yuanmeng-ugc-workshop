# 本地地图 Harness

Node.js 22 以上，在仓库目录运行 `node tools/serve.cjs`，打开终端输出的本地地址进入「自定义仓库」。默认端口 18765；冲突时设置环境变量 WORKSHOP_PORT 为其他端口。本服务只监听 127.0.0.1，不启动或重启元梦 MCP。

上传完整地图工程（含 placement）或厘米制放置清单即可打开共享 3D 编辑器。支持浏览、天空盒、剖视、选择删除、目录放置、撤销和导出。仓库存储在当前浏览器 IndexedDB；清除浏览器数据会丢失本地仓库，应导出 JSON 备份。旧版仅含 Source 几何而没有厘米 placement 的 JSON 必须先通过原 FPS 工坊生成放置清单，不能猜测单位。

## Agent 窗口与回传

- Codex CLI、Claude Code CLI、CodeBuddy CLI：检测 PATH 和标准安装目录，用官方交互式初始提示词参数启动新窗口；保持原有登录和授权机制，不跳过权限。
- WorkBuddy：检测标准 Windows 安装位置，打开桌面程序并复制本轮任务，由玩家粘贴发送。官方分享/本地助理 API 需要应用注册、审核和授权；本项目未具备这些凭据，不伪装为自动提交。
- 六个选项均提供本地程序适配设置（WorkBuddy / CodeBuddy / Codex / Claude / Devin / DeepSeek）。自定义 .exe/.ps1 及参数数组支持 `{prompt}`、`{taskFile}`、`{resultFile}`、`{workspace}`。Devin、DeepSeek 未预设不存在的本地官方启动接口，需连接玩家实际安装的适配程序。没有提示词参数的程序使用复制交接。
- 每轮请求使用独立目录 `.workshop-local/jobs/<id>`，包含 task.md、project.json 和 native-assets.js。Agent 写入完整 result.json 后，网页检查数据并显示待应用版本。玩家确认后才替换草稿；不自动修改元梦或已保存的地图。发送后有本地编辑会阻止覆盖。
- “已发起启动”仅表示操作系统接收启动请求；不表示 Agent 已登录、任务已执行或结果完成。关闭 Agent 时网页可能仍等待，可停止等待或重新导入结果。不要在启动参数填入密钥。

## 连接与边界

元梦状态接口只从插件的固定 ai-connection.json 路径读取接入信息，建立自己的短期 Streamable HTTP 会话，只调用 ugc_get_status(probe=true) 和 ugc_get_context。凭据限于 http://127.0.0.1:18000/mcp，不进入浏览器、任务文件、日志或 Git。脚本联动未就绪不等于 MCP 断开。Session not found 只重连一次。

API 校验 Host、Origin 和同源请求标记；不开放 CORS。静态文件服务屏蔽 tools、隐藏目录和运行数据。线上静态网页可以导入、预览、编辑和导出，但需打开本机服务地址才能调用本机 Agent/MCP。仓库同步不等于已完成线上部署。

验证：`node --test tools/test-harness.cjs`。此测试中的 Agent 启动是隔离桩，不调用真实模型或绕过登录。元梦连接仍需浏览器实际查询，地图 JSON 正确不等于游戏内玩法验收通过。

参考：[Codex CLI](https://learn.chatgpt.com/docs/cli/reference)、[Claude Code CLI](https://code.claude.com/docs/en/cli-usage)、[CodeBuddy CLI](https://www.codebuddy.cn/docs/cli/overview)、[WorkBuddy 第三方接入](https://open.workbuddy.cn/docs/third-party-app)。
