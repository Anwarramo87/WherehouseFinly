import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> { children?: React.ReactNode }

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
Card.displayName = "Card";

export const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardDescription = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

export const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
CardTitle.displayName = "CardTitle";