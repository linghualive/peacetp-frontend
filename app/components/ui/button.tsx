"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary via-[#7e88ff] to-[#64b4ff] text-primary-foreground shadow-[0_20px_35px_-22px_rgba(90,104,255,0.9)] hover:brightness-105",
        destructive:
          "bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-[0_18px_40px_-24px_rgba(244,63,94,0.7)] hover:brightness-105",
        outline:
          "bg-white/60 text-foreground shadow-[0_12px_30px_-24px_rgba(15,23,42,0.8)] hover:bg-white/80",
        secondary:
          "bg-white/30 text-foreground shadow-[0_12px_32px_-26px_rgba(15,23,42,0.8)] hover:bg-white/50",
        ghost: "hover:bg-white/50 hover:text-foreground text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
