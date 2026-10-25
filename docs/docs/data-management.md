# 数据导入导出

> 通过本地 JSON 文件备份账号与偏好，或使用 WebDAV、GitHub Secret Gist 在设备间同步。

## 适用场景

- 新设备同步已有站点账号、密钥与排序偏好。
- 批量迁移至测试环境/团队成员。
- 与其他管理工具（例如 One API Hub 旧版）互相导入导出。

## 手动导入导出

1. 打开插件 → **导入导出** 页面。
2. 在 “本地备份” 卡片中：
   - 点击 **“导出 JSON”**，浏览器自动生成包含账号/偏好的文件。
   - 点击 **“导入 JSON”** 并选择文件，完成后页面会提示成功/失败。
3. JSON 结构包含：
   - `accounts`: 所有站点账号，字段与 `accountStorage` 相同。
   - `pinnedAccountIds`: 置顶账号 ID。
   - `last_updated`: Unix 时间戳，便于判断新旧。
   - `preferences`: 用户偏好（语言、排序、自动刷新等）。

> **提示**：导入时会覆盖当前账号与偏好，建议先导出一次备份。

<a id="webdav-同步"></a>

## 云同步

在 **导入导出 → 云端同步** 选择 WebDAV 或 GitHub Secret Gist，即可手动同步或开启定期同步。同步策略支持合并、仅上传和仅下载，配置步骤见 [云同步](./webdav-sync.md)。

## 与其他工具互通

- **One API Hub**：由于继承其数据结构，可直接导入旧版导出的 JSON。
- **第三方脚本**：只要遵循相同的字段命名，也可以构造 JSON 后导入。
- **CherryStudio / CC Switch**：请使用 [快速导出站点](./quick-export.md) ，可直接推送到目标平台，无需手动编辑 JSON。

## 常见问题

| 问题 | 处理方式 |
|------|----------|
| 导入失败 | JSON 结构可能被编辑器改动，建议使用导出的原始格式；必要时查阅控制台错误信息。 |
| 账号丢失 | 检查备份中 `accounts.length` 是否为 0；若误覆盖，可在 WebDAV 或系统回收站中找到旧文件。 |
| 仅想恢复偏好 | 可手动编辑 JSON，只保留 `preferences` 字段再导入。 |
| 文件包含旧字段 | 系统会自动执行迁移脚本（如 WebDAV config migration）；若仍失败，请附上 JSON 结构反馈。 |

## 相关文档

- [WebDAV 备份与自动同步](./webdav-sync.md)
- [快速导出站点配置](./quick-export.md)
- [自动刷新与实时数据](./auto-refresh.md)
