# 依赖验证记录

2026-10-03：使用 npm 注册表确认 Taro 4.3.0 与 wx-server-sdk 4.0.2 为当前稳定版本，项目锁定这两个版本并提交 package-lock.json。

本地编译与应用测试通过不代表第三方依赖没有漏洞。安装时 npm audit 报告根项目的 Taro 工具/H5 依赖链及云函数依赖存在告警。云函数报告 6 项（5 high、1 moderate），涉及 SDK 下的 axios、lodash.set、lodash.unset。已尝试兼容范围内的 `npm audit fix`，SDK 的固定依赖仍有报告；npm 建议的 force 修复会降级 wx-server-sdk 到 2.5.3，因此未盲目采用。

服务端不接受用户提供的 URL、数据库字段路径或 OpenID，且校验昵称、请帖 ID、游标和分页参数。不过这些约束并不构成对 SDK 依赖漏洞的完整消除。正式部署前应复核最新官方 SDK、审计结果及实际可达性；本项目未部署公网服务或创建云资源。

复查命令：

```sh
npm audit
npm audit --prefix cloudfunctions/wedding
```

不要在没有编译和云端回归验证的情况下直接执行 `npm audit fix --force`。前端 build 还有 Webpack 的推荐体积告警，示例音频约 500 KiB，照片版封面约 239 KiB、完整海报约 284 KiB；旧插画已移到 artifacts 存档，不打包；微信端总输出约 1.4 MiB。换入真实照片后应复核小程序包大小，较大媒体建议托管到自己的 HTTPS 存储。
