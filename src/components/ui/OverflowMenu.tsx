import { Ellipsis, EllipsisVertical } from "lucide-react"
import type { ComponentType } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { IconButton } from "./IconButton"

/**
 * Action entry rendered inside the overflow menu. Hidden items are filtered out.
 * Set `danger: true` to visually mark destructive actions.
 */
export interface OverflowMenuItem {
  label: string
  icon?: ComponentType<{ className?: string }>
  onSelect?: () => void | Promise<void>
  disabled?: boolean
  danger?: boolean
  hidden?: boolean
  testId?: string
  /** Optional analytics metadata for the menu item click. */
  analyticsAction?: {
    featureId?: unknown
    actionId?: unknown
  }
}

export interface OverflowMenuProps {
  /** Visible items; `hidden` items are filtered out at render time. */
  items: OverflowMenuItem[]
  /** Accessible label for the kebab trigger button. */
  triggerLabel: string
  /** Visual hint shown on hover; falls back to `triggerLabel`. */
  triggerTooltip?: string
  /** Controls the trigger icon orientation: horizontal (default) or vertical. */
  vertical?: boolean
  /** Dropdown alignment on the popover surface. */
  align?: "start" | "center" | "end"
  /** Size of the kebab trigger button. */
  size?: "sm" | "default"
  /** Button variant for the kebab trigger. */
  variant?: "outline" | "ghost"
  /** Optional `className` for the trigger button. */
  className?: string
  /** Optional `data-testid` on the trigger button. */
  triggerTestId?: string
}

/**
 * Shared kebab-style overflow menu used by the popup header, popup action bar,
 * and any other surface that needs to collapse low-frequency actions behind a
 * single icon button. Filters out hidden items and groups destructive items
 * visually when present.
 */
export function OverflowMenu({
  items,
  triggerLabel,
  triggerTooltip,
  vertical = false,
  align = "end",
  size = "sm",
  variant = "outline",
  className,
  triggerTestId,
}: OverflowMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden)
  if (visibleItems.length === 0) return null

  const Icon = vertical ? EllipsisVertical : Ellipsis

  const dangerousItems = visibleItems.filter((item) => item.danger)
  const safeItems = visibleItems.filter((item) => !item.danger)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label={triggerLabel}
          title={triggerTooltip ?? triggerLabel}
          size={size}
          variant={variant}
          className={className}
          data-testid={triggerTestId}
        >
          <Icon className="h-4 w-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {safeItems.map((item, index) => {
          const ItemIcon = item.icon
          return (
            <DropdownMenuItem
              key={`${item.label}-${index}`}
              disabled={item.disabled}
              data-testid={item.testId}
              onSelect={item.onSelect}
              className={
                item.danger
                  ? "text-destructive focus:text-destructive focus:bg-destructive/10"
                  : undefined
              }
            >
              {ItemIcon ? <ItemIcon className="h-4 w-4" /> : null}
              {item.label}
            </DropdownMenuItem>
          )
        })}
        {dangerousItems.length > 0 && safeItems.length > 0 ? (
          <DropdownMenuSeparator />
        ) : null}
        {dangerousItems.map((item, index) => {
          const ItemIcon = item.icon
          return (
            <DropdownMenuItem
              key={`danger-${item.label}-${index}`}
              disabled={item.disabled}
              data-testid={item.testId}
              onSelect={item.onSelect}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              {ItemIcon ? <ItemIcon className="h-4 w-4" /> : null}
              {item.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
