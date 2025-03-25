import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION } from "@/lib/animation";

const cardVariants = cva(
  "rounded-xl border bg-white shadow-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-neutral-200",
        primary: "border-primary-100 bg-primary-50",
        secondary: "border-secondary-100 bg-secondary-50",
        accent: "border-accent-100 bg-accent-50",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "hover:shadow-md transition-shadow duration-200 cursor-pointer",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
    }
  }
);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary" | "secondary" | "accent";
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  animate?: boolean;
}

export function Card({
  className,
  variant,
  size,
  interactive,
  animate = false,
  ...props
}: CardProps) {
  const Comp = animate ? motion.div : "div";
  
  return (
    <Comp
      className={cn(cardVariants({ variant, size, interactive }), className)}
      {...(animate ? { 
        initial: "hidden",
        animate: "visible",
        variants: FADE_IN_ANIMATION
      } : {})}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold text-xl leading-none tracking-tight", className)} {...props} />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-neutral-500", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center pt-4", className)} {...props} />
  );
} 
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION } from "@/lib/animation";

const cardVariants = cva(
  "rounded-xl border bg-white shadow-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-neutral-200",
        primary: "border-primary-100 bg-primary-50",
        secondary: "border-secondary-100 bg-secondary-50",
        accent: "border-accent-100 bg-accent-50",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "hover:shadow-md transition-shadow duration-200 cursor-pointer",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
    }
  }
);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary" | "secondary" | "accent";
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  animate?: boolean;
}

export function Card({
  className,
  variant,
  size,
  interactive,
  animate = false,
  ...props
}: CardProps) {
  const Comp = animate ? motion.div : "div";
  
  return (
    <Comp
      className={cn(cardVariants({ variant, size, interactive }), className)}
      {...(animate ? { 
        initial: "hidden",
        animate: "visible",
        variants: FADE_IN_ANIMATION
      } : {})}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold text-xl leading-none tracking-tight", className)} {...props} />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-neutral-500", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center pt-4", className)} {...props} />
  );
} 