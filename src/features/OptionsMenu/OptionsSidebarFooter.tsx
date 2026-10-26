import { BookOpen, Heart, Star, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { REPO_URL } from "~/constants/about"
import { useIsStarred } from "~/features/StarPromotion/useStarPromotionActive"
import { cn } from "~/lib/utils"
import { createTab } from "~/utils/browser/tabs"
import { getDocsHomepageUrl } from "~/utils/navigation/docsLinks"

import { SupportCommunityPopover } from "./SupportCommunityPopover"

export interface OptionsSidebarFooterProps {
  isCollapsed?: boolean
}

/**
 * Options sidebar footer providing ecosystem shortcuts. Uses the same icon-
 * only layout whether collapsed or expanded so its visual footprint stays
 * constant and the menu section gets the full vertical budget.
 */
export function OptionsSidebarFooter({
  isCollapsed = false,
}: OptionsSidebarFooterProps) {
  const { t, i18n } = useTranslation(["ui", "about"])
  const isStarred = useIsStarred()

  const handleStarClick = () => {
    void createTab(REPO_URL, true)
  }

  const starTooltip = isStarred
    ? t("ui:starPromotion.actions.alreadyStarred")
    : t("ui:feedback.starOnGithub")
  const docsLabel = t("ui:sidebarFooter.docs")
  const docsTitle = t("about:homepageDesc")
  const sponsorLabel = t("ui:sidebarFooter.sponsor")
  const sponsorTitle = t("ui:feedback.sponsorTitle")
  const communityLabel = t("ui:sidebarFooter.community")
  const communityTitle = t("about:feedbackSection.community.description")

  return (
    <div
      data-testid="options-sidebar-footer"
      className="border-sidebar-border mt-auto flex items-center gap-1.5 border-t py-2.5"
    >
      {/* GitHub / Star */}
      <button
        type="button"
        data-testid="sidebar-footer-github"
        onClick={handleStarClick}
        title={starTooltip}
        aria-label={starTooltip}
        className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-ring group flex size-9 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2"
      >
        {isStarred ? (
          <Star className="fill-star text-star size-4 shrink-0 transition-colors" />
        ) : (
          <Star className="text-sidebar-foreground/70 group-hover:text-star size-4 shrink-0 transition-colors" />
        )}
      </button>

      {/* Documentation */}
      <button
        type="button"
        data-testid="sidebar-footer-docs"
        onClick={() => void createTab(getDocsHomepageUrl(i18n.language), true)}
        title={docsTitle}
        aria-label={docsLabel}
        className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-ring flex size-9 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2"
      >
        <BookOpen className="size-4 shrink-0" />
      </button>

      {/* Sponsor */}
      <SupportCommunityPopover section="sponsors" side="right" align="center">
        <button
          type="button"
          data-testid="sidebar-footer-sponsor"
          title={sponsorTitle}
          aria-label={sponsorLabel}
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-ring flex size-9 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2"
        >
          <Heart className="text-destructive-indicator/80 size-4 shrink-0" />
        </button>
      </SupportCommunityPopover>

      {/* Community */}
      <SupportCommunityPopover section="community" side="right" align="center">
        <button
          type="button"
          data-testid="sidebar-footer-community"
          title={communityTitle}
          aria-label={communityLabel}
          className={cn(
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-ring flex size-9 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2",
            isCollapsed ? undefined : "ml-auto",
          )}
        >
          <Users className="size-4 shrink-0" />
        </button>
      </SupportCommunityPopover>
    </div>
  )
}
