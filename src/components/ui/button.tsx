import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2",
          {
            "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900":
              variant === "primary",
            "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300":
              variant === "secondary",
            "text-slate-600 hover:bg-slate-100 focus:ring-slate-300":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
