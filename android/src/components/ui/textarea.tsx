import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[90px] w-full rounded-2xl px-4 py-3 text-sm",
      "bg-[hsl(var(--background))]",
      "shadow-[inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)]",
      "text-foreground placeholder:text-muted-foreground",
      "border-0 outline-none resize-none",
      "transition-shadow duration-150",
      "focus:shadow-[inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light),0_0_0_2.5px_hsl(var(--primary)/0.3)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
