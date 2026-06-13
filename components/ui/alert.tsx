import * as React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> { children?: React.ReactNode }

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
Alert.displayName = "Alert";

export const AlertDescription = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, ...props }, ref) => (
    <div className={className} ref={ref} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";