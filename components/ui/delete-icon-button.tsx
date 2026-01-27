"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

interface DeleteIconButtonProps {
  onClick: (e: React.MouseEvent) => void
  tooltip?: string
  className?: string
}

function DeleteIconButton({
  onClick,
  tooltip = "Radera",
  className,
}: DeleteIconButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(e)
  }

  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={className ?? "h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"}
      onClick={handleClick}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return button
}

export { DeleteIconButton }
export type { DeleteIconButtonProps }
