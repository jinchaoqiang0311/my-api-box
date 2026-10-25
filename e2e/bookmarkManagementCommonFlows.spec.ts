import type { Page } from "@playwright/test"

import { OPTIONS_PAGE_PATH } from "~/constants/extensionPages"
import {
  getSiteBookmarkListItemTestId,
  SITE_BOOKMARKS_TEST_IDS,
} from "~/features/SiteBookmarks/testIds"
import { STORAGE_KEYS } from "~/services/core/storageKeys"
import type { SiteBookmark } from "~/types"
import { expect, test } from "~~/e2e/fixtures/extensionTest"
import {
  createStoredBookmark,
  forceExtensionLanguage,
  installExtensionPageGuards,
  seedStoredBookmarks,
  stubLlmMetadataIndex,
} from "~~/e2e/utils/commonUserFlows"
import {
  getPlasmoStorageRawValue,
  getServiceWorker,
} from "~~/e2e/utils/extensionState"
import { waitForExtensionRoot } from "~~/e2e/utils/lazyLoading"

async function readStoredBookmarks(
  serviceWorker: Awaited<ReturnType<typeof getServiceWorker>>,
): Promise<SiteBookmark[]> {
  const raw = await getPlasmoStorageRawValue<unknown>(
    serviceWorker,
    STORAGE_KEYS.ACCOUNTS,
  )

  if (typeof raw !== "string") return []

  try {
    const parsed = JSON.parse(raw) as { bookmarks?: SiteBookmark[] }
    return Array.isArray(parsed.bookmarks) ? parsed.bookmarks : []
  } catch {
    return []
  }
}

async function readStoredBookmarkState(
  serviceWorker: Awaited<ReturnType<typeof getServiceWorker>>,
): Promise<{
  bookmarks: SiteBookmark[]
  pinnedAccountIds: string[]
  orderedAccountIds: string[]
}> {
  const raw = await getPlasmoStorageRawValue<unknown>(
    serviceWorker,
    STORAGE_KEYS.ACCOUNTS,
  )

  if (typeof raw !== "string") {
    return { bookmarks: [], pinnedAccountIds: [], orderedAccountIds: [] }
  }

  try {
    const parsed = JSON.parse(raw) as {
      bookmarks?: SiteBookmark[]
      pinnedAccountIds?: string[]
      orderedAccountIds?: string[]
    }
    return {
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      pinnedAccountIds: Array.isArray(parsed.pinnedAccountIds)
        ? parsed.pinnedAccountIds
        : [],
      orderedAccountIds: Array.isArray(parsed.orderedAccountIds)
        ? parsed.orderedAccountIds
        : [],
    }
  } catch {
    return { bookmarks: [], pinnedAccountIds: [], orderedAccountIds: [] }
  }
}

async function expectBrowserTabOpened(
  serviceWorker: Awaited<ReturnType<typeof getServiceWorker>>,
  url: string,
) {
  await expect
    .poll(async () => {
      return await serviceWorker.evaluate(async (targetUrl) => {
        const chromeApi = (globalThis as any).chrome
        const tabs = await chromeApi.tabs.query({})
        return tabs.some((tab: { url?: string }) => tab.url === targetUrl)
      }, url)
    })
    .toBe(true)
}

function getBookmarkRow(page: Page, name: string) {
  return page
    .getByTestId(new RegExp(`^${getSiteBookmarkListItemTestId("")}`))
    .filter({ hasText: name })
}

async function getBookmarkButtonY(page: Page, name: string) {
  const box = await page.getByRole("button", { name }).first().boundingBox()

  if (!box) {
    throw new Error(`Could not resolve bookmark row for ${name}`)
  }

  return box.y
}

async function openBookmarkActionsMenu(page: Page, name: string) {
  const row = getBookmarkRow(page, name)
  await row.hover()
  await row.getByTestId(SITE_BOOKMARKS_TEST_IDS.rowMoreActionsButton).click()
}

async function dragBookmarkHandle(
  page: Page,
  sourceIndex: number,
  targetIndex: number,
) {
  const handles = page.getByRole("button", { name: "Reorder bookmarks" })
  const sourceHandle = handles.nth(sourceIndex)
  const targetHandle = handles.nth(targetIndex)

  await sourceHandle.scrollIntoViewIfNeeded()
  await targetHandle.scrollIntoViewIfNeeded()

  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()

  if (!sourceBox || !targetBox) {
    throw new Error("Could not resolve bookmark drag handles")
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  )
  await page.mouse.up()
}

test.beforeEach(async ({ context, page }) => {
  installExtensionPageGuards(page)
  await forceExtensionLanguage(page, "en")
  await stubLlmMetadataIndex(context)
})

test("adds a bookmark from bookmark management and persists it", async ({
  context,
  extensionId,
  page,
}) => {
  const serviceWorker = await getServiceWorker(context)

  await page.goto(
    `chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}#bookmark`,
  )
  await waitForExtensionRoot(page)

  await page.getByTestId(SITE_BOOKMARKS_TEST_IDS.addButton).click()

  const dialog = page.getByTestId(SITE_BOOKMARKS_TEST_IDS.dialog)
  await expect(dialog.getByPlaceholder("e.g. Admin Console")).toBeVisible()
  await dialog.getByPlaceholder("e.g. Admin Console").fill("Docs Portal")
  await dialog
    .getByPlaceholder("https://example.com/...")
    .fill("https://example.com/portal")
  await dialog
    .getByPlaceholder("Optional notes...")
    .fill("Primary documentation entrypoint")
  await dialog.getByTestId(SITE_BOOKMARKS_TEST_IDS.dialogSaveButton).click()

  await expect(page.getByRole("button", { name: "Docs Portal" })).toBeVisible()

  await expect
    .poll(async () => {
      const bookmarks = await readStoredBookmarks(serviceWorker)
      return (
        bookmarks.find((bookmark) => bookmark.name === "Docs Portal") ?? null
      )
    })
    .toMatchObject({
      name: "Docs Portal",
      url: "https://example.com/portal",
      notes: "Primary documentation entrypoint",
    })
})

test("opens a stored bookmark target from bookmark management", async ({
  context,
  extensionId,
  page,
}) => {
  const serviceWorker = await getServiceWorker(context)
  await seedStoredBookmarks(serviceWorker, [
    createStoredBookmark({
      id: "stored-open-bookmark",
      name: "Managed Docs",
      url: "https://managed-docs.example.com/guide",
    }),
  ])

  await page.goto(
    `chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}#bookmark`,
  )
  await waitForExtensionRoot(page)

  await expect(page.getByRole("button", { name: "Managed Docs" })).toBeVisible()
  const row = getBookmarkRow(page, "Managed Docs")
  await row.hover()
  await row.getByTestId(SITE_BOOKMARKS_TEST_IDS.rowOpenButton).click()

  await expectBrowserTabOpened(
    serviceWorker,
    "https://managed-docs.example.com/guide",
  )
})

test("edits a stored bookmark from bookmark management and persists the change", async ({
  context,
  extensionId,
  page,
}) => {
  const serviceWorker = await getServiceWorker(context)
  await seedStoredBookmarks(serviceWorker, [
    createStoredBookmark({
      id: "stored-bookmark-1",
      name: "Original Bookmark",
      url: "https://example.com/original",
      notes: "Original note",
    }),
  ])

  await page.goto(
    `chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}#bookmark`,
  )
  await waitForExtensionRoot(page)

  const row = getBookmarkRow(page, "Original Bookmark")
  await row.hover()
  await row.getByTestId(SITE_BOOKMARKS_TEST_IDS.rowEditButton).click()

  const dialog = page.getByTestId(SITE_BOOKMARKS_TEST_IDS.dialog)
  await expect(dialog.getByPlaceholder("e.g. Admin Console")).toBeVisible()

  await dialog.getByPlaceholder("e.g. Admin Console").fill("Updated Bookmark")
  await dialog
    .getByPlaceholder("https://example.com/...")
    .fill("https://example.com/updated")
  await dialog.getByPlaceholder("Optional notes...").fill("Updated note")
  await dialog.getByTestId(SITE_BOOKMARKS_TEST_IDS.dialogSaveButton).click()

  await expect(
    page.getByRole("button", { name: "Updated Bookmark" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "https://example.com/updated" }),
  ).toBeVisible()

  await expect
    .poll(async () => {
      const bookmarks = await readStoredBookmarks(serviceWorker)
      return (
        bookmarks.find((bookmark) => bookmark.id === "stored-bookmark-1") ??
        null
      )
    })
    .toMatchObject({
      id: "stored-bookmark-1",
      name: "Updated Bookmark",
      url: "https://example.com/updated",
      notes: "Updated note",
    })
})

test("reorders bookmarks with the drag handle and persists the manual order", async ({
  context,
  extensionId,
  page,
}) => {
  const serviceWorker = await getServiceWorker(context)
  await seedStoredBookmarks(serviceWorker, [
    createStoredBookmark({
      id: "stored-bookmark-1",
      name: "Alpha Bookmark",
      url: "https://example.com/alpha",
    }),
    createStoredBookmark({
      id: "stored-bookmark-2",
      name: "Beta Bookmark",
      url: "https://example.com/beta",
    }),
    createStoredBookmark({
      id: "stored-bookmark-3",
      name: "Gamma Bookmark",
      url: "https://example.com/gamma",
    }),
  ])

  await page.goto(
    `chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}#bookmark`,
  )
  await waitForExtensionRoot(page)

  expect(await getBookmarkButtonY(page, "Alpha Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Beta Bookmark"),
  )
  expect(await getBookmarkButtonY(page, "Beta Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Gamma Bookmark"),
  )

  await dragBookmarkHandle(page, 2, 0)

  await expect
    .poll(async () => {
      const config = await readStoredBookmarkState(serviceWorker)
      return [...config.orderedAccountIds]
    })
    .toEqual(["stored-bookmark-3", "stored-bookmark-1", "stored-bookmark-2"])

  expect(await getBookmarkButtonY(page, "Gamma Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Alpha Bookmark"),
  )
  expect(await getBookmarkButtonY(page, "Alpha Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Beta Bookmark"),
  )
})

test("pins and unpins a stored bookmark while persisting pinned order", async ({
  context,
  extensionId,
  page,
}) => {
  const serviceWorker = await getServiceWorker(context)
  await seedStoredBookmarks(serviceWorker, [
    createStoredBookmark({
      id: "stored-bookmark-1",
      name: "Alpha Bookmark",
      url: "https://example.com/alpha",
    }),
    createStoredBookmark({
      id: "stored-bookmark-2",
      name: "Zulu Bookmark",
      url: "https://example.com/zulu",
    }),
  ])

  await page.goto(
    `chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}#bookmark`,
  )
  await waitForExtensionRoot(page)

  await expect(
    page.getByRole("button", { name: "Alpha Bookmark" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Zulu Bookmark" }),
  ).toBeVisible()

  expect(await getBookmarkButtonY(page, "Alpha Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Zulu Bookmark"),
  )

  await openBookmarkActionsMenu(page, "Zulu Bookmark")
  await page.getByTestId(SITE_BOOKMARKS_TEST_IDS.rowPinToggleMenuItem).click()

  await expect
    .poll(async () => {
      const config = await readStoredBookmarkState(serviceWorker)
      return [...config.pinnedAccountIds]
    })
    .toEqual(["stored-bookmark-2"])

  expect(await getBookmarkButtonY(page, "Zulu Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Alpha Bookmark"),
  )

  await openBookmarkActionsMenu(page, "Zulu Bookmark")
  await page.getByTestId(SITE_BOOKMARKS_TEST_IDS.rowPinToggleMenuItem).click()

  await expect
    .poll(async () => {
      const config = await readStoredBookmarkState(serviceWorker)
      return [...config.pinnedAccountIds]
    })
    .toEqual([])

  expect(await getBookmarkButtonY(page, "Alpha Bookmark")).toBeLessThan(
    await getBookmarkButtonY(page, "Zulu Bookmark"),
  )
})

test("deletes a stored bookmark from bookmark management and removes it from storage", async ({
  context,
  extensionId,
  page,
}) => {
  const serviceWorker = await getServiceWorker(context)
  await seedStoredBookmarks(serviceWorker, [
    createStoredBookmark({
      id: "stored-bookmark-1",
      name: "Delete Bookmark",
      url: "https://example.com/delete",
    }),
  ])

  await page.goto(
    `chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}#bookmark`,
  )
  await waitForExtensionRoot(page)

  await expect(
    page.getByRole("button", { name: "Delete Bookmark" }),
  ).toBeVisible()

  await openBookmarkActionsMenu(page, "Delete Bookmark")
  await page.getByTestId(SITE_BOOKMARKS_TEST_IDS.rowDeleteMenuItem).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Delete bookmark?")).toBeVisible()
  await dialog.getByTestId(SITE_BOOKMARKS_TEST_IDS.deleteConfirmButton).click()

  await expect(
    page.getByRole("button", { name: "Delete Bookmark" }),
  ).toHaveCount(0)

  await expect
    .poll(async () => {
      const bookmarks = await readStoredBookmarks(serviceWorker)
      return bookmarks.some((bookmark) => bookmark.id === "stored-bookmark-1")
    })
    .toBe(false)
})
