import type { WorkflowDefinition } from "../sentinel-service";

export function createInboxWatcherWorkflow(): WorkflowDefinition {
  return {
    name: "inbox-watcher",
    description: "Scans for P0/Urgent emails",
    triggers: [
      {
        type: "schedule",
        cron: "*/30 * * * *", 
        time: "08:00", 
      }
    ],
    quietHours: { start: "20:00", end: "07:00" },
    execute: async (context) => {
      const { client, temporal } = context;

      const result = await client.runSession(
        `You are the Inbox Sentinel.
        1. Search Gmail for UNREAD emails from the last 60 minutes.
        2. Filter for URGENT items:
           - From: VIPs (manager, executives, direct reports)
           - Subject: "Urgent", "P0", "Blocker", "Immediate"
           - Security alerts or system failures
        
        Today is ${temporal.date} (${temporal.time}).
        
        If NO urgent items found, reply "Clear".
        If urgent items found, summarize them with [ACTION REQUIRED] tags.`,
        { 
          title: "Inbox Watcher Scan",
          agent: "Work-Master"
        }
      );

      if (result.success && result.response !== "Clear") {
        await client.notify("🚨 Urgent Inbox Items Detected!", "error");
      }

      return result.response;
    },
  };
}
