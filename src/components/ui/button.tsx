import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold",
    "transition-all duration-150 select-none",
    "-webkit-tap-highlight-color: transparent",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Navy raised pill — embossed neumorphic
        default: [
          "neu-primary rounded-2xl text-white tracking-wide",
          "active:scale-[0.97]",
        ].join(" "),

        // Sunken ghost on the background surface
        secondary: [
          "bg-[hsl(var(--card))] text-foreground rounded-2xl",
          "shadow-[var(--shadow-flat)]",
          "active:shadow-[var(--shadow-pressed)] active:scale-[0.97]",
        ].join(" "),

        // Destructive
        destructive: [
          "bg-destructive text-destructive-foreground rounded-2xl",
          "shadow-[4px_4px_10px_rgba(239,68,68,0.3),-4px_-4px_10px_var(--neu-light)]",
          "active:scale-[0.97]",
        ].join(" "),

        // Ghost — just text, no surface
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-xl active:scale-95",

        // Outline — raised ring
        outline: [
          "bg-[hsl(var(--card))] text-foreground rounded-2xl",
          "ring-2 ring-border",
          "shadow-[var(--shadow-flat)]",
          "active:shadow-[var(--shadow-pressed)] active:scale-[0.97]",
        ].join(" "),

        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm:      "h-9  px-4 text-xs rounded-xl",
        lg:      "h-14 px-8 text-base",
        icon:    "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
