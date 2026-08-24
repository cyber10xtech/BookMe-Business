import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        // Sunken neumorphic field
        "flex h-12 w-full rounded-2xl px-4 py-2 text-sm",
        "bg-[hsl(var(--background))]",
        "shadow-[inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)]",
        "text-foreground placeholder:text-muted-foreground",
        "border-0 outline-none ring-0",
        "transition-shadow duration-150",
        "focus:shadow-[inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light),0_0_0_2.5px_hsl(var(--primary)/0.3)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
