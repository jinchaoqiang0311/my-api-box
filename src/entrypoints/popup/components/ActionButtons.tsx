import {
  CalendarCheck2,
  CircleDollarSign,
  Cpu,
  KeyRound,
  Plus,
} from "lucide-react"
import type { MouseEvent } from "react"
import { useTranslation } from "react-i18next"

import { Button, OverflowMenu } from "~/components/ui"
import { COLORS } from "~/constants/designTokens"
import { ProductAnalyticsScope } from "~/contexts/ProductAnalyticsScopeContext"
import { useAccountActionsContext } from "~/features/AccountManagement/actions/AccountActionsContext"
import { useAccountDataContext } from "~/features/AccountManagement/data/AccountDataContext"
import {
  PRODUCT_ANALYTICS_ACTION_IDS,
  PRODUCT_ANALYTICS_ENTRYPOINTS,
  PRODUCT_ANALYTICS_FEATURE_IDS,
  PRODUCT_ANALYTICS_SURFACE_IDS,
  type ProductAnalyticsActionId,
  type ProductAnalyticsFeatureId,
} from "~/services/productAnalytics/contracts"
import { isExtensionSidePanel } from "~/utils/browser"
import { getExternalCheckInOpenOptions } from "~/utils/core/shortcutKeys"
import {
  openAutoCheckinPage,
  openKeysPage,
  openModelsPage,
} from "~/utils/navigation"

interface ActionButtonsProps {
  showAccountActions?: boolean
  primaryActionLabel: string
  onPrimaryAction: () => void
  primaryActionTestId?: string
  primaryAnalyticsAction?: {
    featureId: ProductAnalyticsFeatureId
    actionId: ProductAnalyticsActionId
  }
}

/**
 * Renders quick action buttons in popup header for the active view and navigation.
 * Uses a shared button group where only the primary CTA label/handler varies by view.
 */
export default function ActionButtons({
  primaryActionLabel,
  onPrimaryAction,
  primaryActionTestId,
  primaryAnalyticsAction,
  showAccountActions = true,
}: ActionButtonsProps) {
  const { t } = useTranslation("ui")
  const { displayData } = useAccountDataContext()
  const { handleOpenExternalCheckIns } = useAccountActionsContext()
  const inSidePanel = isExtensionSidePanel()
  const entrypoint = inSidePanel
    ? PRODUCT_ANALYTICS_ENTRYPOINTS.Sidepanel
    : PRODUCT_ANALYTICS_ENTRYPOINTS.Popup
  const actionBarSurface = inSidePanel
    ? PRODUCT_ANALYTICS_SURFACE_IDS.SidepanelActionBar
    : PRODUCT_ANALYTICS_SURFACE_IDS.PopupActionBar

  // Only enable the external check-in shortcut when at least one account has a custom URL.
  const externalCheckInAccounts = displayData.filter((account) => {
    const customUrl = account.checkIn?.customCheckIn?.url
    return typeof customUrl === "string" && customUrl.trim() !== ""
  })
  const canOpenExternalCheckIns = externalCheckInAccounts.length > 0

  const handleOpenKeysPageClick = () => {
    openKeysPage()
  }

  const handleOpenModelsPageClick = () => {
    openModelsPage()
  }

  const handleQuickCheckinClick = () => {
    openAutoCheckinPage({ runNow: "true" })
  }

  const handleOpenExternalCheckInsClick = async (
    options:
      | MouseEvent<HTMLButtonElement>
      | { openAll: boolean; openInNewWindow: boolean },
  ) => {
    const { openAll, openInNewWindow } =
      "openAll" in options ? options : getExternalCheckInOpenOptions(options)
    await handleOpenExternalCheckIns(externalCheckInAccounts, {
      openAll,
      openInNewWindow,
      analyticsContext: {
        featureId: PRODUCT_ANALYTICS_FEATURE_IDS.AutoCheckin,
        actionId: PRODUCT_ANALYTICS_ACTION_IDS.OpenPopupExternalCheckIns,
        surfaceId: actionBarSurface,
        entrypoint,
      },
    })
  }

  return (
    <section
      className={`py-density-2 sm:py-density-3 px-3 sm:px-5 ${COLORS.background.secondary} ${COLORS.border.default} border-b`}
    >
      <ProductAnalyticsScope
        entrypoint={entrypoint}
        surfaceId={actionBarSurface}
      >
        <div className="gap-y-density-1-5 sm:gap-y-density-2 flex gap-x-1.5 sm:gap-x-2">
          <Button
            onClick={onPrimaryAction}
            data-testid={primaryActionTestId}
            className="flex-1 touch-manipulation"
            size="default"
            leftIcon={<Plus className="h-4 w-4" />}
            analyticsAction={primaryAnalyticsAction}
          >
            {primaryActionLabel}
          </Button>

          {showAccountActions && (
            <OverflowMenu
              triggerLabel={t("common:labels.moreActions")}
              triggerTooltip={t("common:labels.moreActions")}
              items={[
                {
                  label: t("ui:navigation.keys"),
                  icon: KeyRound,
                  onSelect: handleOpenKeysPageClick,
                },
                {
                  label: t("ui:navigation.models"),
                  icon: Cpu,
                  onSelect: handleOpenModelsPageClick,
                },
                {
                  label: t("ui:navigation.autoCheckinRunNow"),
                  icon: CalendarCheck2,
                  onSelect: handleQuickCheckinClick,
                },
                {
                  label: t("ui:navigation.externalCheckinAll"),
                  icon: CircleDollarSign,
                  onSelect: () => {
                    void handleOpenExternalCheckInsClick({
                      openAll: true,
                      openInNewWindow: false,
                    })
                  },
                  disabled: !canOpenExternalCheckIns,
                },
              ]}
            />
          )}
        </div>
      </ProductAnalyticsScope>
    </section>
  )
}
