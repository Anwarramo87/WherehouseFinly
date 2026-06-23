/**
 * Permission-Based Access Control System
 * 
 * Permissions come from the backend's /auth/me endpoint via the auth store.
 */

// Types and constants
export * from "./types";

// Hooks for client-side permission checking
export * from "./hooks";

// Most commonly used hooks
export {
  usePermissions,
  useRequiredPermission,
  useRequiredPermissions,
} from "./hooks";

// Most commonly used types
export type {
  Permission,
} from "./types";