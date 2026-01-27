"use client"

import * as React from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
  permanent?: boolean
  details?: React.ReactNode
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  isDeleting = false,
  permanent = false,
  details,
}: DeleteConfirmDialogProps) {
  const isBulk = count > 1

  const title = permanent
    ? "Radera permanent?"
    : isBulk
      ? `Radera ${count} leads?`
      : "Radera lead?"

  const description = permanent
    ? isBulk
      ? <><strong>{count}</strong> leads och alla tillhörande fordon och samtalsloggar raderas permanent. <strong>Detta kan INTE ångras.</strong></>
      : <>Denna lead och alla tillhörande fordon och samtalsloggar raderas permanent. <strong>Detta kan INTE ångras.</strong></>
    : isBulk
      ? <><strong>{count}</strong> leads flyttas till papperskorgen. De raderas permanent efter 30 dagar. Du kan återställa dem från papperskorgen.</>
      : <>Denna lead flyttas till papperskorgen. Den raderas permanent efter 30 dagar. Du kan återställa den från papperskorgen.</>

  const confirmLabel = permanent
    ? "Ja, radera permanent"
    : isBulk
      ? `Ja, radera ${count} leads`
      : "Ja, radera"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground text-sm">
              <p>{description}</p>
              {details}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Raderar...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeleteConfirmDialog }
export type { DeleteConfirmDialogProps }
