# Data Import and Export

> Back up accounts and preferences with local JSON files, or sync across devices using WebDAV or GitHub Secret Gist.

## Applicable Scenarios

- Synchronize existing site accounts, keys, and sorting preferences on new devices.
- Batch migration to test environments/team members.
- Mutual import and export with other management tools (e.g., One API Hub old version).

## Manual Import and Export

1. Open the plugin → **Import/Export** page.
2. In the "Local Backup" card:
   - Click **"Export JSON"**, and the browser will automatically generate a file containing accounts/preferences.
   - Click **"Import JSON"** and select the file. The page will prompt success/failure upon completion.
3. The JSON structure includes:
   - `accounts`: All site accounts, fields are the same as `accountStorage`.
   - `pinnedAccountIds`: Pinned account IDs.
   - `last_updated`: Unix timestamp, for easy determination of newness/oldness.
   - `preferences`: User preferences (language, sorting, auto-refresh, etc.).

> **Tip**: Importing will overwrite current accounts and preferences. It is recommended to export a backup first.

<a id="webdav-synchronization"></a>

## Cloud Sync

Choose WebDAV or GitHub Secret Gist under **Import/Export → Cloud Sync** to sync manually or on a schedule. Available strategies are merge, upload only, and download only. See [Cloud Sync](./webdav-sync.md) for setup.

## Interoperability with Other Tools

- **One API Hub**: Due to inheriting its data structure, JSON exported from the old version can be directly imported.
- **Third-party scripts**: As long as they follow the same field naming, JSON can also be constructed and then imported.
- **CherryStudio / CC Switch**: Please use [Quick Export Site](./quick-export.md) to directly push to the target platform, without the need for manual JSON editing.

## Common Issues

| Issue | Solution |
|------|----------|
| Import failed | The JSON structure might have been altered by an editor; it is recommended to use the original exported format. Consult console error messages if necessary. |
| Accounts lost | Check if `accounts.length` in the backup is 0; if accidentally overwritten, old files can be found in WebDAV or the system recycle bin. |
| Only want to restore preferences | You can manually edit the JSON, keeping only the `preferences` field, and then import. |
| File contains old fields | The system will automatically execute migration scripts (e.g., WebDAV config migration); if it still fails, please provide feedback with the JSON structure. |

## Related Documentation

- [WebDAV Backup and Automatic Synchronization](./webdav-sync.md)
- [Quick Export Site Configuration](./quick-export.md)
- [Auto-refresh and Real-time Data](./auto-refresh.md)
