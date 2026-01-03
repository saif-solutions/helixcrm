// Shared constants
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  VIEWER: "viewer",
} as const;

export const ACTIVITY_TYPES = {
  NOTE: "note",
  CALL: "call",
  EMAIL: "email",
  MEETING: "meeting",
  TASK: "task",
} as const;

export const ACTIVITY_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
