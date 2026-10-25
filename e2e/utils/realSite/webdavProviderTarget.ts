const DEFAULT_BACKUP_RELATIVE_PATH = "all-api-hub-backup/all-api-hub-1-0.json"

/**
 * Resolve the exact app-owned backup file used by the product for either a
 * directory-style WebDAV setting or an explicit JSON file URL.
 */
export function resolveWebdavProviderTargetUrl(configuredUrl: string) {
  if (/\.json($|\?)/iu.test(configuredUrl)) {
    return configuredUrl
  }

  const separator = configuredUrl.endsWith("/") ? "" : "/"
  return `${configuredUrl}${separator}${DEFAULT_BACKUP_RELATIVE_PATH}`
}
