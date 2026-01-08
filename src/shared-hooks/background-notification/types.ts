import type { BackgroundTask } from "../background-agent"

export interface BackgroundNotificationHookConfig {
  formatNotification?: (tasks: BackgroundTask[]) => string
}
