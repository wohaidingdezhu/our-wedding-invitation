# 喜 · 相逢 — 微信婚礼请帖

React 18 + TypeScript + Taro 4.3。照片为主的奶油白与黑金请帖，包含婚礼海报、AI 生成的婚纱摄影示例封面、原创示例音乐、地点导航、微信分享、点赞/取消点赞、分页昵称名单。没有打赏或支付功能。底部常驻送祝福、海报、分享入口；快捷导航可跳到邀请、时间地点或宾客祝福，下滑后可通过悬浮按钮控制音乐。

送出祝福后显示感谢卡片。点击“已祝福”可重新查看卡片和名单；点击卡片中的“取消我的祝福”才撤回昵称记录。昵称提交前须主动同意公开展示，并校验 1–24 个字符。

H5 使用浏览器剪贴板复制预览链接；复制失败会显示可长按复制的链接面板。`127.0.0.1` 的预览链接仅能在本机打开，正式宾客分享使用微信端的分享按钮。

## 本地运行

需要 Node.js 20.19+（推荐 22 LTS）及微信开发者工具。

```sh
npm install
npm run dev:weapp
```

在微信开发者工具中导入**本项目根目录**，`project.config.json` 已指定 `dist/` 为小程序目录。游客 AppID 可查看界面；真实云开发与分享请填自己的 AppID。基础库建议使用当前稳定版，昵称填写最低要求 2.21.2。

浏览器预览：

```sh
npm run dev:h5
# http://127.0.0.1:10086
```

```sh
npm run typecheck
npm test
npm run build:weapp
npm run build:h5
```

## 换成你们的请帖

修改 `src/config/wedding.ts`：新人姓名、英文名、婚期、日期文案、当天安排 `agenda`、地点、经纬度、邀请文字、婚纱照、完整海报和背景音乐。示例地址与坐标仅用于演示，请一并替换。所有日期必须保持一致。

- `heroImage`：首页婚纱照/插画，建议竖图。
- `posterImage`：可预览的完整海报，建议使用 PNG/JPG 高分辨率图片，宾客在微信预览里可长按保存。
- `musicUrl`：包内音频或有使用权的 HTTPS 音频。HTTPS 地址需按微信要求配置合法域名。音乐由宾客点击开启，页面隐藏时暂停，离开后销毁，不自动强制播放。
- `src/assets/wedding-cover-v2.jpg` 为 AI 生成的虚构新人照片，`poster-v2.jpg` 为对应的完整海报；正式请帖请替换成你们的婚纱照。生成来源与提示词见 `artifacts/IMAGEGEN-PROMPT.md`。`wedding.wav` 为脚本合成的原创示例旋律，可随项目使用。
- 替换封面或修改姓名/婚期后可运行 `node scripts/generate-poster.cjs` 重新生成照片版 JPG 海报（封面须为 `src/assets` 内本地文件）；`python3 scripts/generate-music.py` 重新生成音频。正式照片海报也可直接替换 `posterImage` 指向的文件。

## 点赞名单与“微信名字”接口

微信没有供开发者通过 OpenID 随意查询用户昵称的接口。新项目不要依赖 `wx.getUserProfile` / `wx.getUserInfo` 返回真实微信昵称。采用官方的**头像昵称填写能力**：`<Input type="nickname" />`，由用户主动选择微信昵称或者填写自定义昵称，明确确认展示后提交。这里的昵称是用户提交的展示名，不能保证一定是其当前微信昵称，更不是微信号。

本项目只收集昵称，不收集头像。用户不提供昵称也能浏览请帖和听音乐。首次点赞需要主动确认“昵称将展示在祝福名单”，取消点赞会删除记录。

普通自建后端的登录链路是 `wx.login` → 服务端 `code2Session` → OpenID；本项目采用微信云开发，云函数通过 `cloud.getWXContext().OPENID` 识别访客，不需要前端获取 OpenID 或保存 AppSecret。点赞是本项目自建业务接口，微信没有现成的婚礼点赞 API。

参考：

- [微信头像昵称填写能力](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/userProfile.html)
- [Taro Input：nickname 与昵称审核事件](https://docs.taro.zone/docs/components/forms/input)
- [微信登录](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html)
- [微信云开发 getWXContext](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/utils/Cloud.getWXContext.html)
- [背景音乐 InnerAudioContext](https://developers.weixin.qq.com/miniprogram/dev/api/media/audio/wx.createInnerAudioContext.html)

## 启用真实微信点赞

默认 `demo: true`：可立即体验，**点赞仅保存在本设备**，界面有演示标识。H5 始终使用本设备演示数据，不模拟微信身份。真实多人点赞只在微信端接入云开发后使用。

1. 将 `project.config.json` 的 `appid` 换成自己的小程序 AppID，开通微信云开发环境。
2. 修改 `src/config/wedding.ts`，填写 `cloudEnv`，设置 `demo: false`，保持请帖 `id` 与后端允许名单一致。
3. 在云开发数据库创建集合 `wedding_likes`。自定义安全规则使用 `cloudfunctions/database.rules.json`：客户端读写均禁止，所有操作经云函数完成。
4. 为 `wedding_likes` 创建组合索引：`weddingId` 升序、`createdAt` 降序、`_id` 降序。使用开发者工具提示的索引链接也可创建。
5. 右键 `cloudfunctions/wedding`，选择“上传并部署：云端安装依赖”。云函数运行时使用支持 Node.js 18+ 的版本。`config.json` 声明了 `security.msgSecCheck` 权限，昵称在服务端审核通过才保存。
6. 云函数环境变量 `WEDDING_IDS=lin-and-chen`（默认值相同；多份请帖用英文逗号分隔）。若修改前端 id，必须同步修改环境变量。生产默认开启审核；只有 `APP_ENV=development` 且 `SEC_CHECK_ENABLED=false` 时可在开发环境跳过审核，不应在正式环境使用。
7. 重新编译，使用两台微信设备真机验证点赞、昵称填写、取消、分页、音乐、地图和分享。这里没有替你创建云资源或发布小程序。

发布前在小程序管理后台完善隐私保护说明，说明昵称用于向其他访问者展示祝福名单。保留用户可取消点赞删除昵称的入口。需要长期使用的照片与音频请上传你自己的稳定存储，并配置微信合法域名。

## 云函数接口

统一通过 `Taro.cloud.callFunction({ name: 'wedding', data: ... })` 调用：

| action | 参数 | 用途 |
| --- | --- | --- |
| `list` | `weddingId`、可选 `cursor`、`limit` | 获取名单、总数和当前用户状态 |
| `like` | `weddingId`、`nickname`、`consent: true` | 提交昵称并点赞 |
| `unlike` | `weddingId` | 取消当前用户点赞，删除记录 |

成功返回 `{ ok: true, data: { total, liked, items, nextCursor } }`；每个 item 只有 `{ id, nickname, createdAt }`，不返回 OpenID。失败返回 `{ ok: false, error: { code, message } }`。默认及最大每页 20 条。昵称限制 1–24 个 Unicode 字符。服务端身份来自微信上下文，忽略传入的 `openid`；同一用户同一请帖使用确定性文档 ID，重复提交不会增加数量。`like/unlike` 成功后返回第一屏名单。

项目附带后端测试，覆盖重复请求、伪造身份、昵称校验、公开展示确认、审核失败、同时间戳分页及数据库错误。云端 SDK、权限、索引与微信真机能力仍须部署后验证。

第三方依赖仍有 npm audit 告警，详见 [依赖验证记录](DEPENDENCY-NOTES.md)，正式部署前需要复核。
