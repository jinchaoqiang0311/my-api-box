import type { Page } from "@playwright/test"

import {
  getCompatibleApiRealSiteSkipReason,
  loginToCompatibleApiRealSite,
  resolveCompatibleApiRealSiteConfig,
  type CompatibleApiRealSiteConfig,
  type CompatibleApiRealSiteLoginResult,
} from "./compatibleApi"

const ONE_HUB_ENV_PREFIX = "ONE_HUB"
const ONE_HUB_LABEL = "OneHub"

type RequiredOneHubRealSiteEnvKey =
  | "AAH_E2E_ONE_HUB_BASE_URL"
  | "AAH_E2E_ONE_HUB_USERNAME"
  | "AAH_E2E_ONE_HUB_PASSWORD"

type OneHubRealSiteResolution = {
  config: CompatibleApiRealSiteConfig | null
  missingEnvKeys: RequiredOneHubRealSiteEnvKey[]
}

export function resolveOneHubRealSiteConfig(): OneHubRealSiteResolution {
  return resolveCompatibleApiRealSiteConfig({
    envPrefix: ONE_HUB_ENV_PREFIX,
  }) as OneHubRealSiteResolution
}

export function getOneHubRealSiteSkipReason(
  missingEnvKeys: RequiredOneHubRealSiteEnvKey[],
) {
  return getCompatibleApiRealSiteSkipReason({
    label: ONE_HUB_LABEL,
    missingEnvKeys,
  })
}

export async function loginToRealOneHubSite(
  page: Page,
  config: CompatibleApiRealSiteConfig,
): Promise<CompatibleApiRealSiteLoginResult> {
  return await loginToCompatibleApiRealSite(page, config, {
    label: ONE_HUB_LABEL,
    envPrefix: ONE_HUB_ENV_PREFIX,
  })
}
