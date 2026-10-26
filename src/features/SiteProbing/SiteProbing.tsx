import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { FormField } from "~/components/ui/FormField"
import { accountQueries } from "~/services/accounts/accountStorage/accountQueries"
import { accountReadModels } from "~/services/accounts/accountStorage/accountReadModels"
import {
  findDefaultSelectableAccountRuntimeKey,
  sortAccountRuntimeKeysActiveFirst,
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
  const [selected, setSelected] = useState<Set<ProbeId>>(new Set(ALL_PROBE_IDS))
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ProbeResult[]>([])
  const [reportAt, setReportAt] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
   * Fills the probe API key with the account's default runtime key, resolving
   * the plaintext from the site when the inventory only exposes a mask.
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
      const runtimeKey = findDefaultSelectableAccountRuntimeKey(runtimeKeys)
      if (!runtimeKey) {
        setNotice(t("status.apiKeyMissing"))
        return
      }
      const resolvedKey = runtimeKey.secret
        ? runtimeKey
        : await resolveDisplayAccountRuntimeKeySecret(
            displayAccount,
            runtimeKey,
          )
      const secret = resolvedKey.secret?.trim() ?? ""
      if (!secret) {
        setNotice(t("status.apiKeyMissing"))
        return
      }
      setApiKey(secret)
      setNotice(t("status.apiKeyFetched"))
    } catch (error) {
      logger.warn("Failed to auto-fetch API key", error)
      setNotice(t("status.apiKeyFetchFailed"))
    } finally {
      setApiKeyLoading(false)
    }
  }, [account, t])

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
    </div>
  )
}
