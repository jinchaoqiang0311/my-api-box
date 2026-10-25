export const SITE_BOOKMARKS_TEST_IDS = {
  listView: "bookmarks-list-view",
  addButton: "bookmarks-add-button",
  emptyStateAddButton: "bookmarks-empty-state-add-button",
  dialog: "bookmarks-dialog",
  dialogCancelButton: "bookmarks-dialog-cancel-button",
  dialogSaveButton: "bookmarks-dialog-save-button",
  rowOpenButton: "bookmarks-row-open-button",
  rowCopyUrlButton: "bookmarks-row-copy-url-button",
  rowEditButton: "bookmarks-row-edit-button",
  rowMoreActionsButton: "bookmarks-row-more-actions-button",
  rowPinToggleMenuItem: "bookmarks-row-pin-toggle-menu-item",
  rowDeleteMenuItem: "bookmarks-row-delete-menu-item",
  deleteConfirmButton: "bookmarks-delete-confirm-button",
} as const

/**
 * Returns a stable test id for a rendered bookmark row.
 */
export function getSiteBookmarkListItemTestId(bookmarkId: string) {
  return `bookmarks-list-item-${bookmarkId}`
}
