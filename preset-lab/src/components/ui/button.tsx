import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,transform,border-color] duration-300 ease-[var(--ease-lab)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        signal: "bg-signal text-signal-ink hover:bg-signal-hover",
        bone: "bg-bone text-ink hover:bg-white",
        outline: "border border-bone/25 text-bone hover:border-bone hover:bg-bone/5",
        ghost: "text-bone/80 hover:bg-bone/8 hover:text-bone",
        ink: "bg-ink text-bone hover:bg-graphite-2",
        danger: "border border-danger/40 text-danger hover:bg-danger/10",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-sm",
        md: "h-11 rounded-full px-6 text-sm",
        lg: "h-14 rounded-full px-8 text-base",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "signal", size: "md" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
