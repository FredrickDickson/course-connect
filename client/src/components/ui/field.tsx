import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
  )
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn("text-sm font-medium", className)} {...props} />
));
FieldLabel.displayName = "FieldLabel";

export { Field, FieldLabel };