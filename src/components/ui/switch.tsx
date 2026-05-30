import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
      // Track — inset when off, raised tint when on
      "shadow-[inset_2px_2px_6px_var(--neu-dark),inset_-2px_-2px_6px_var(--neu-light)]",
      "data-[state=checked]:shadow-[inset_2px_2px_6px_hsl(var(--primary)/0.5),inset_-1px_-1px_4px_hsl(var(--primary)/0.2)]",
      "data-[state=checked]:bg-primary/20",
      "data-[state=unchecked]:bg-transparent",
      "transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full",
        // Thumb — raised pill
        "bg-[hsl(var(--card))]",
        "shadow-[3px_3px_7px_var(--neu-dark),-2px_-2px_5px_var(--neu-light)]",
        "data-[state=checked]:bg-primary data-[state=checked]:shadow-[2px_2px_6px_hsl(220_100%_6%),-1px_-1px_4px_hsl(220_70%_30%)]",
        "transition-all duration-200",
        "data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[4px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
