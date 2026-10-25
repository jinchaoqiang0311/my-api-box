const MANAGED_SITE_ADMIN_USER_ID_PATTERN = /^\d+$/

/**
 * Returns true when the managed-site administrator user ID is present and only
 * contains digits after trimming surrounding whitespace.
 */
export function isManagedSiteAdminUserId(
  value: string | null | undefined,
): boolean {
  const trimmedValue = value?.trim()

  return Boolean(
    trimmedValue && MANAGED_SITE_ADMIN_USER_ID_PATTERN.test(trimmedValue),
  )
}

/**
 * Returns true when the managed-site administrator user ID input is either
 * empty or a valid numeric user ID after trimming surrounding whitespace.
 */
export function isManagedSiteAdminUserIdInputValid(
  value: string | null | undefined,
): boolean {
  const trimmedValue = value?.trim() ?? ""

  return (
    trimmedValue === "" || MANAGED_SITE_ADMIN_USER_ID_PATTERN.test(trimmedValue)
  )
}
