import type { Page } from "@playwright/test"

import {
  getCompatibleApiRealSiteSkipReason,
  loginToCompatibleApiRealSite,
  resolveCompatibleApiRealSiteConfig,
  type CompatibleApiRealSiteConfig,
  type CompatibleApiRealSiteLoginResult,
} from "./compatibleApi"

const DONE_HUB_ENV_PREFIX = "DONE_HUB"
const DONE_HUB_LABEL = "DoneHub"

type RequiredDoneHubRealSiteEnvKey =
  | "AAH_E2E_DONE_HUB_BASE_URL"
  | "AAH_E2E_DONE_HUB_USERNAME"
  | "AAH_E2E_DONE_HUB_PASSWORD"

type DoneHubRealSiteResolution = {
  config: CompatibleApiRealSiteConfig | null
  missingEnvKeys: RequiredDoneHubRealSiteEnvKey[]
}

export function resolveDoneHubRealSiteConfig(): DoneHubRealSiteResolution {
  return resolveCompatibleApiRealSiteConfig({
    envPrefix: DONE_HUB_ENV_PREFIX,
  }) as DoneHubRealSiteResolution
}

export function getDoneHubRealSiteSkipReason(
  missingEnvKeys: RequiredDoneHubRealSiteEnvKey[],
) {
  return getCompatibleApiRealSiteSkipReason({
    label: DONE_HUB_LABEL,
    missingEnvKeys,
  })
}

export async function loginToRealDoneHubSite(
  page: Page,
  config: CompatibleApiRealSiteConfig,
): Promise<CompatibleApiRealSiteLoginResult> {
  return await loginToCompatibleApiRealSite(page, config, {
    label: DONE_HUB_LABEL,
    envPrefix: DONE_HUB_ENV_PREFIX,
  })
}
