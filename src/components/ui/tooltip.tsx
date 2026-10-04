"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { useUserPreferences } from "@/hooks/use-user-preferences"

const TooltipProvider = TooltipPrimitive.Provider

/**
 * Tooltip root with a global kill-switch (Settings > Preferences > Button Tips).
 *
 * Beta feedback: hover explanations across the app felt intrusive for some
 * users, so one preference turns them all off from a single place. When off,
 * the tooltip is force-closed through a controlled `open` prop - triggers stay
 * fully clickable and keyboard-focusable, the bubble just never renders, so no
 * call site needs to change. The `=== false` check is deliberate: profiles
 * saved before this preference existed resolve to the default (on), and an
 * absent key must not disable tips.
 */
function Tooltip(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  const { preferences } = useUserPreferences()

  if (preferences?.showButtonTips === false) {
    return <TooltipPrimitive.Root {...props} open={false} onOpenChange={() => {}} />
  }

  return <TooltipPrimitive.Root {...props} />
}
Tooltip.displayName = "Tooltip"

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
