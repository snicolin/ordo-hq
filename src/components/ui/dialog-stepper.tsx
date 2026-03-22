"use client"

import { useState, Children, isValidElement } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DialogBody, DialogFooter } from "@/components/ui/dialog"

function DialogStep({
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return <div data-slot="dialog-step" className={cn("space-y-4", className)}>{children}</div>
}

function DialogStepper({
  children,
  onComplete,
  onCancel,
  completeLabel = "Save",
}: {
  children: React.ReactNode
  onComplete: () => void
  onCancel: () => void
  completeLabel?: string
}) {
  const [step, setStep] = useState(0)

  const steps = Children.toArray(children).filter(isValidElement)

  const total = steps.length
  const isFirst = step === 0
  const isLast = step === total - 1
  const currentStep = steps[step]
  const label = isValidElement(currentStep) ? currentStep.props.label : ""

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0 mt-3">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-foreground" : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 mb-1 shrink-0">
        Step {step + 1} of {total} &mdash; {label}
      </p>

      <DialogBody>{currentStep}</DialogBody>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={isFirst ? onCancel : () => setStep((s) => s - 1)}
          className="cursor-pointer"
        >
          {isFirst ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
          className="cursor-pointer"
        >
          {isLast ? completeLabel : "Next"}
        </Button>
      </DialogFooter>
    </>
  )
}

export { DialogStepper, DialogStep }
