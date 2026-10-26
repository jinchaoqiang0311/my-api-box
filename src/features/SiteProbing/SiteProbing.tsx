import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { FormField } from "~/components/ui/FormField"
import { Switch } from "~/components/ui/Switch"
import { accountQueries } from "~/services/accounts/accountStorage/accountQueries"
import { accountReadModels } from "~/services/accounts/accountStorage/accountReadModels"
import {
  sortAccountRuntimeKeysActiveFirst,
  type AccountRuntimeKey,
} from "~/services/accounts/keys/accountRuntimeKeys"
import {
  fetchDisplayAccountRuntimeKeys,
  resolveDisplayAccountRuntimeKeySecret,
} from "~/services/accounts/utils/apiServiceRequest"
import {
  ACCOUNT_SITE_ADAPTER_FAMILIES,
  getAccountSiteDefinition,
} from "~/services/accountSiteDefinitions"
import { createNewApiAccountBootstrap } from "~/services/apiAdapters/newApi/account/accountBootstrap"
import { API_ERROR_CODES, ApiError } from "~/services/apiTransport/errors"
import {
  DEFAULT_COMMUNITY_SUBMISSION_SETTINGS,
  type CommunitySubmissionSettings,
} from "~/services/communitySubmission"
import { userPreferences } from "~/services/preferences/userPreferences"
import {
  getProbeHint,
  getProbeLabel,
  getVerdictLabel,
  translateProbeSummary,
} from "~/services/probeSystem/i18n"
import { probeListModels } from "~/services/probeSystem/probes"
import { runProbeSuite } from "~/services/probeSystem/runner"
import {
  ALL_PROBE_IDS,
  type ProbeId,
  type ProbeResult,
  type ProbeVerdict,
} from "~/services/probeSystem/types"
import { AuthTypeEnum, type SiteAccount } from "~/types"
import { createLogger } from "~/utils/core/logger"

const logger = createLogger("SiteProbingPage")

const VERDICT_BADGE_VARIANT: Record<
  ProbeVerdict,
  "success" | "destructive" | "warning" | "outline" | "info"
> = {
  pass: "success",
  fail: "destructive",
  suspect: "warning",
  unknown: "outline",
  skip: "info",
}

/** Keeps just enough of a key for the user to recognise it in a picker. */
const maskRuntimeKeySecret = (secret: string) => {
  const trimmed = secret.trim()
  if (trimmed.length <= 8) return "••••••••"
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

/**
 * Site Probing options page: run the seven integrity probes against one
 * account+model and review the verdict report.
 */
export default function SiteProbing() {
  const { t } = useTranslation("siteProbing")

  const [accounts, setAccounts] = useState<SiteAccount[]>([])
  const [accountId, setAccountId] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [remoteUserId, setRemoteUserId] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState("")
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [apiKeyChoices, setApiKeyChoices] = useState<AccountRuntimeKey[]>([])
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [apiKeyChoiceId, setApiKeyChoiceId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<ProbeId>>(new Set(ALL_PROBE_IDS))
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ProbeResult[]>([])
  const [reportAt, setReportAt] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [communitySettings, setCommunitySettings] =
    useState<CommunitySubmissionSettings>(DEFAULT_COMMUNITY_SUBMISSION_SETTINGS)
  const [communitySaving, setCommunitySaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    userPreferences
      .getPreferences()
      .then((preferences) => {
        if (!cancelled) {
          setCommunitySettings({
            ...DEFAULT_COMMUNITY_SUBMISSION_SETTINGS,
            ...preferences.communitySubmission,
          })
        }
      })
      .catch((error: unknown) =>
        logger.warn("Failed to load community submission settings", error),
      )
    return () => {
      cancelled = true
    }
  }, [])

  const saveCommunitySettings = useCallback(
    async (updates: Partial<CommunitySubmissionSettings>) => {
      const next = { ...communitySettings, ...updates }
      setCommunitySettings(next)
      setCommunitySaving(true)
      try {
        const result = await userPreferences.updateCommunitySubmission(next)
        if (!result.ok) setNotice(t("community.saveFailed"))
      } catch (error) {
        logger.warn("Failed to save community submission settings", error)
        setNotice(t("community.saveFailed"))
      } finally {
        setCommunitySaving(false)
      }
    },
    [communitySettings, t],
  )

  useEffect(() => {
    let cancelled = false
    accountQueries
      .getAllAccounts()
      .then((all) => {
        if (!cancelled) setAccounts(all)
      })
      .catch((error: unknown) => logger.warn("Failed to load accounts", error))
    return () => {
      cancelled = true
    }
  }, [])

  const account = useMemo(
    () => accounts.find((item) => item.id === accountId) ?? null,
    [accounts, accountId],
  )

  const billingSelected = selected.has("billing")
  const passCount = results.filter((item) => item.verdict === "pass").length
  const warnCount = results.filter(
    (item) => item.verdict === "fail" || item.verdict === "suspect",
  ).length

  const handleLoadModels = useCallback(async () => {
    if (!account || !apiKey) {
      setNotice(t("status.needKey"))
      return
    }
    setModelsLoading(true)
    setModelsError(null)
    try {
      const list = await probeListModels({
        baseUrl: account.site_url,
        apiKey,
        model,
      })
      setModels(list)
      if (list.length > 0 && !list.includes(model)) {
        setModel(list[0] ?? "")
      }
    } catch (error) {
      setModels([])
      setModelsError(String(error))
    } finally {
      setModelsLoading(false)
    }
  }, [account, apiKey, model, t])

  /**
   * Resolves the plaintext of a runtime key, asking the site for it when the
   * inventory only exposes a mask.
   */
  const resolveRuntimeKeySecret = useCallback(
    async (runtimeKey: AccountRuntimeKey) => {
      if (!account) return ""
      const displayAccount = await accountReadModels.getDisplayDataById(
        account.id,
      )
      if (!displayAccount) return ""
      const resolvedKey = runtimeKey.secret
        ? runtimeKey
        : await resolveDisplayAccountRuntimeKeySecret(
            displayAccount,
            runtimeKey,
          )
      return resolvedKey.secret?.trim() ?? ""
    },
    [account],
  )

  /** Writes one runtime key into the probe field and reports the outcome. */
  const applyRuntimeKey = useCallback(
    async (runtimeKey: AccountRuntimeKey) => {
      const secret = await resolveRuntimeKeySecret(runtimeKey)
      if (!secret) {
        setNotice(t("status.apiKeyMissing"))
        return false
      }
      setApiKey(secret)
      setNotice(t("status.apiKeyFetched"))
      return true
    },
    [resolveRuntimeKeySecret, t],
  )

  /**
   * Fills the probe API key from the account's runtime keys, letting the user
   * pick one when the account owns several.
   */
  const handleAutoFetchApiKey = useCallback(async () => {
    if (!account) {
      setNotice(t("status.autoFetchNoAccount"))
      return
    }
    setApiKeyLoading(true)
    setNotice(null)
    try {
      const displayAccount = await accountReadModels.getDisplayDataById(
        account.id,
      )
      if (!displayAccount) {
        setNotice(t("status.apiKeyFetchFailed"))
        return
      }
      const runtimeKeys = sortAccountRuntimeKeysActiveFirst(
        await fetchDisplayAccountRuntimeKeys(displayAccount),
      )
      if (runtimeKeys.length === 0) {
        setNotice(t("status.apiKeyMissing"))
        return
      }
      const singleKey = runtimeKeys[0]
      if (runtimeKeys.length === 1 && singleKey) {
        await applyRuntimeKey(singleKey)
        return
      }
      setApiKeyChoices(runtimeKeys)
      setApiKeyDialogOpen(true)
    } catch (error) {
      logger.warn("Failed to auto-fetch API key", error)
      setNotice(t("status.apiKeyFetchFailed"))
    } finally {
      setApiKeyLoading(false)
    }
  }, [account, applyRuntimeKey, t])

  /** Applies the runtime key chosen from the multi-key dialog. */
  const handleSelectApiKey = useCallback(
    async (runtimeKey: AccountRuntimeKey) => {
      setApiKeyChoiceId(runtimeKey.id)
      try {
        if (await applyRuntimeKey(runtimeKey)) {
          setApiKeyDialogOpen(false)
        }
      } catch (error) {
        logger.warn("Failed to resolve the selected API key", error)
        setNotice(t("status.apiKeyFetchFailed"))
      } finally {
        setApiKeyChoiceId(null)
      }
    },
    [applyRuntimeKey, t],
  )

  /**
   * Fills the billing access token and user id from the site's own browser
   * session, reusing the cookie-auth `/api/user/self` read that the account
   * dialog uses during auto-detection.
   */
  const handleAutoFetchCredentials = useCallback(async () => {
    if (!account) {
      setNotice(t("status.autoFetchNoAccount"))
      return
    }
    if (
      getAccountSiteDefinition(account.site_type)?.adapterFamily !==
      ACCOUNT_SITE_ADAPTER_FAMILIES.NewApiFamily
    ) {
      setNotice(t("status.autoFetchUnsupported"))
      return
    }
    // Accounts that already own an access token keep it in the account record,
    // which is the only copy some deployments can recover. Prefer it over a
    // network round-trip that may not be allowed to expose or mint the token.
    const storedAccessToken = account.account_info.access_token?.trim()
    if (storedAccessToken) {
      setAccessToken(storedAccessToken)
      setRemoteUserId(account.account_info.id)
      setNotice(t("status.autoFetchDone"))
      return
    }
    setCredentialsLoading(true)
    setNotice(null)
    try {
      const bootstrap = createNewApiAccountBootstrap(account.site_type, {
        expectedUserId: account.account_info.id,
      })
      const request = {
        baseUrl: account.site_url,
        auth: {
          authType: AuthTypeEnum.Cookie,
          userId: account.account_info.id,
        },
      }
      const userInfo = await bootstrap.fetchUserInfo(request)
      setRemoteUserId(userInfo.id)
      // `/api/user/self` omits the access token on accounts that never
      // generated one, so mint it the same way the account dialog does.
      const accessToken =
        userInfo.access_token ||
        (await bootstrap.getOrCreateAccessToken(request)).access_token
      if (accessToken) {
        setAccessToken(accessToken)
        setNotice(t("status.autoFetchDone"))
      } else {
        setNotice(t("status.autoFetchNoToken"))
      }
    } catch (error) {
      logger.warn("Failed to auto-fetch billing credentials", error)
      if (
        error instanceof ApiError &&
        error.code === API_ERROR_CODES.ACCOUNT_IDENTITY_MISMATCH
      ) {
        setNotice(t("status.autoFetchIdentityMismatch"))
      } else if (error instanceof ApiError && error.statusCode === 401) {
        setNotice(t("status.autoFetchLoginRequired"))
      } else {
        setNotice(t("status.autoFetchFailed"))
      }
    } finally {
      setCredentialsLoading(false)
    }
  }, [account, t])

  const toggleProbe = useCallback((probeId: ProbeId, enabled: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (enabled) {
        next.add(probeId)
      } else {
        next.delete(probeId)
      }
      return next
    })
  }, [])

  const handleRun = useCallback(async () => {
    if (!account || !apiKey || !model || selected.size === 0) {
      setNotice(t("status.needKey"))
      return
    }
    setNotice(null)
    setRunning(true)
    setResults([])
    try {
      const report = await runProbeSuite({
        accountId: account.id,
        credentials: {
          baseUrl: account.site_url,
          apiKey,
          model,
          accessToken: accessToken.trim() || undefined,
          remoteUserId: remoteUserId.trim() || undefined,
        },
        selected: [...selected],
        onResult: (partial) => {
          setResults((previous) => [...previous, partial])
        },
      })
      setReportAt(report.at)
    } catch (error) {
      logger.warn("Probe suite failed", error)
      setNotice(String(error))
    } finally {
      setRunning(false)
    }
  }, [account, apiKey, accessToken, model, remoteUserId, selected, t])

  const handleCopyReport = useCallback(async () => {
    if (results.length === 0) return
    const payload = JSON.stringify(
      {
        origin: account?.site_url ?? "",
        model,
        at: reportAt ?? Date.now(),
        results,
      },
      null,
      2,
    )
    await navigator.clipboard.writeText(payload)
    setNotice(t("status.copied"))
  }, [account, model, reportAt, results, t])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </header>

      <section className="space-y-3 rounded-md border p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("community.title")}</h2>
            <p className="text-muted-foreground text-xs">
              {t("community.description")}
            </p>
          </div>
          <Switch
            checked={communitySettings.enabled}
            disabled={communitySaving}
            aria-label={t("community.enabled")}
            onChange={(checked) =>
              void saveCommunitySettings({ enabled: checked })
            }
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {t("community.privacy")}
        </p>
        {communitySettings.enabled ? (
          <>
            <FormField
              label={t("community.endpoint")}
              description={t("community.endpointHint")}
              htmlFor="community-submission-endpoint"
            >
              <input
                id="community-submission-endpoint"
                type="url"
                inputMode="url"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                placeholder="https://ratings.example.com/api/v1"
                value={communitySettings.endpoint}
                disabled={communitySaving}
                onChange={(event) =>
                  setCommunitySettings((previous) => ({
                    ...previous,
                    endpoint: event.target.value,
                  }))
                }
                onBlur={() =>
                  void saveCommunitySettings({
                    endpoint: communitySettings.endpoint.trim(),
                  })
                }
              />
            </FormField>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={communitySettings.hashStationUrl}
                disabled={communitySaving}
                onChange={(event) =>
                  void saveCommunitySettings({
                    hashStationUrl: event.target.checked,
                  })
                }
              />
              <span>
                <span className="block">{t("community.hashUrl")}</span>
                <span className="text-muted-foreground block text-xs">
                  {t("community.hashUrlHint")}
                </span>
              </span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={communitySettings.autoSubmitAfterProbe}
                  disabled={communitySaving}
                  onChange={(event) =>
                    void saveCommunitySettings({
                      autoSubmitAfterProbe: event.target.checked,
                    })
                  }
                />
                <span>{t("community.afterProbe")}</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={communitySettings.autoSubmitAfterCatalog}
                  disabled={communitySaving}
                  onChange={(event) =>
                    void saveCommunitySettings({
                      autoSubmitAfterCatalog: event.target.checked,
                    })
                  }
                />
                <span>{t("community.afterCatalog")}</span>
              </label>
            </div>
          </>
        ) : null}
      </section>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("status.noAccounts")}
        </p>
      ) : (
        <>
          <section className="space-y-4">
            <FormField
              label={t("labels.account")}
              htmlFor="site-probing-account"
            >
              <select
                id="site-probing-account"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value)
                  setModels([])
                  setModel("")
                }}
              >
                <option value="">{t("labels.accountPlaceholder")}</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.site_name} ({item.site_url})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={t("labels.apiKey")}
              description={t("labels.apiKeyHint")}
              htmlFor="site-probing-key"
            >
              <div className="flex items-center gap-2">
                <input
                  id="site-probing-key"
                  type="password"
                  className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleAutoFetchApiKey()}
                  disabled={!account || apiKeyLoading}
                >
                  {apiKeyLoading
                    ? t("labels.autoFetchLoading")
                    : t("labels.autoFetch")}
                </Button>
              </div>
            </FormField>

            <div className="flex items-end gap-2">
              <FormField label={t("labels.model")} htmlFor="site-probing-model">
                <select
                  id="site-probing-model"
                  className="w-full min-w-56 rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={model}
                  disabled={models.length === 0}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {models.length === 0 ? (
                    <option value="">{t("labels.modelPlaceholder")}</option>
                  ) : (
                    models.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))
                  )}
                </select>
              </FormField>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleLoadModels()}
                disabled={!account || !apiKey || modelsLoading}
              >
                {modelsLoading
                  ? t("labels.modelLoading")
                  : t("labels.loadModels")}
              </Button>
            </div>
            {modelsError ? (
              <p className="text-muted-foreground text-sm">
                {t("status.modelsError", { error: modelsError })}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{t("probes.title")}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_PROBE_IDS.map((probeId) => (
                <label
                  key={probeId}
                  className="flex cursor-pointer items-start gap-2 rounded-md border p-2"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(probeId)}
                    onChange={(event) =>
                      toggleProbe(probeId, event.target.checked)
                    }
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">
                      {getProbeLabel(t, probeId)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {getProbeHint(t, probeId)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {billingSelected ? (
            <section className="space-y-4 rounded-md border border-dashed p-3">
              <p className="text-muted-foreground text-xs">
                {t("labels.billingNote")}
              </p>
              <FormField
                label={t("labels.accessToken")}
                description={t("labels.accessTokenHint")}
                htmlFor="site-probing-access-token"
              >
                <div className="flex items-center gap-2">
                  <input
                    id="site-probing-access-token"
                    type="password"
                    className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                    value={accessToken}
                    onChange={(event) => setAccessToken(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleAutoFetchCredentials()}
                    disabled={!account || credentialsLoading}
                  >
                    {credentialsLoading
                      ? t("labels.autoFetchLoading")
                      : t("labels.autoFetch")}
                  </Button>
                </div>
              </FormField>
              <FormField
                label={t("labels.userId")}
                description={t("labels.userIdHint")}
                htmlFor="site-probing-user-id"
              >
                <div className="flex items-center gap-2">
                  <input
                    id="site-probing-user-id"
                    className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                    value={remoteUserId}
                    onChange={(event) => setRemoteUserId(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleAutoFetchCredentials()}
                    disabled={!account || credentialsLoading}
                  >
                    {credentialsLoading
                      ? t("labels.autoFetchLoading")
                      : t("labels.autoFetch")}
                  </Button>
                </div>
              </FormField>
            </section>
          ) : null}

          <section className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void handleRun()}
              disabled={
                running || !account || !apiKey || !model || selected.size === 0
              }
            >
              {running ? t("status.running") : t("labels.run")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopyReport()}
              disabled={results.length === 0 || running}
            >
              {t("labels.exportJson")}
            </Button>
            {results.length > 0 && !running ? (
              <Badge variant={warnCount > 0 ? "warning" : "success"}>
                {t("status.summary", {
                  pass: passCount,
                  total: results.length,
                })}
              </Badge>
            ) : null}
          </section>

          {notice ? (
            <p className="text-muted-foreground text-sm">{notice}</p>
          ) : null}

          {results.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">{t("results.title")}</h2>
              <div className="divide-y rounded-md border">
                {results.map((item) => (
                  <div
                    key={`${item.probeId}-${item.at}`}
                    className="flex items-center justify-between gap-3 p-2"
                  >
                    <span className="text-sm font-medium">
                      {getProbeLabel(t, item.probeId)}
                    </span>
                    <span className="text-muted-foreground flex-1 truncate text-xs">
                      {translateProbeSummary(t, item)}
                    </span>
                    <Badge variant={VERDICT_BADGE_VARIANT[item.verdict]}>
                      {getVerdictLabel(t, item.verdict)}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialog.apiKeyTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialog.apiKeyDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {apiKeyChoices.map((runtimeKey) => (
              <div
                key={runtimeKey.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {runtimeKey.label}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {runtimeKey.secret
                      ? maskRuntimeKeySecret(runtimeKey.secret)
                      : t("dialog.apiKeyUnavailable")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={apiKeyChoiceId === runtimeKey.id}
                  disabled={apiKeyChoiceId !== null}
                  onClick={() => void handleSelectApiKey(runtimeKey)}
                >
                  {t("dialog.apiKeyUse")}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
