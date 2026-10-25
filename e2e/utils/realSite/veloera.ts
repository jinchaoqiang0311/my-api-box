import type { Page } from "@playwright/test"

import {
  getCompatibleApiRealSiteSkipReason,
  loginToCompatibleApiRealSite,
  resolveCompatibleApiRealSiteConfig,
  type CompatibleApiRealSiteConfig,
  type CompatibleApiRealSiteLoginResult,
} from "./compatibleApi"

const VELOERA_ENV_PREFIX = "VELOERA"
const VELOERA_LABEL = "Veloera"

type RequiredVeloeraRealSiteEnvKey =
  | "AAH_E2E_VELOERA_BASE_URL"
  | "AAH_E2E_VELOERA_USERNAME"
  | "AAH_E2E_VELOERA_PASSWORD"

type VeloeraRealSiteResolution = {
  config: CompatibleApiRealSiteConfig | null
  missingEnvKeys: RequiredVeloeraRealSiteEnvKey[]
}

export function resolveVeloeraRealSiteConfig(): VeloeraRealSiteResolution {
  return resolveCompatibleApiRealSiteConfig({
    envPrefix: VELOERA_ENV_PREFIX,
  }) as VeloeraRealSiteResolution
}

export function getVeloeraRealSiteSkipReason(
  missingEnvKeys: RequiredVeloeraRealSiteEnvKey[],
) {
  return getCompatibleApiRealSiteSkipReason({
    label: VELOERA_LABEL,
    missingEnvKeys,
  })
}

export async function loginToRealVeloeraSite(
  page: Page,
  config: CompatibleApiRealSiteConfig,
): Promise<CompatibleApiRealSiteLoginResult> {
  return await loginToCompatibleApiRealSite(page, config, {
    label: VELOERA_LABEL,
    envPrefix: VELOERA_ENV_PREFIX,
  })
}
