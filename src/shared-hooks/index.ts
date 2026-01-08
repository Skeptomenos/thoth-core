// Shared hooks - copied from oh-my-opencode for Thoth plugin
// These are domain-agnostic hooks that work for any agent type

export { createTodoContinuationEnforcer, type TodoContinuationEnforcer } from "./todo-continuation-enforcer"
export { createSessionRecoveryHook, type SessionRecoveryHook, type SessionRecoveryOptions } from "./session-recovery"
export { createContextWindowMonitorHook } from "./context-window-monitor"
export { BackgroundManager } from "./background-agent"
export { createBackgroundNotificationHook } from "./background-notification"

// Re-export utilities
export { log, getLogFilePath } from "./utils/logger"
export { setMainSession, getMainSessionID, subagentSessions } from "./utils/session-state"
