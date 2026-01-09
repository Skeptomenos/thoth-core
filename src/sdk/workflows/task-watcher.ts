import type { WorkflowDefinition } from "../sentinel-service";

export function createTaskWatcherWorkflow(): WorkflowDefinition {
  return {
    name: "task-watcher",
    description: "Monitors for stuck or overdue tasks in Vibe-Kanban",
    triggers: [
      {
        type: "schedule",
        time: "09:30",
        days: ["mon", "tue", "wed", "thu", "fri"],
      },
      {
        type: "schedule",
        time: "14:00",
        days: ["mon", "tue", "wed", "thu", "fri"],
      },
    ],
    quietHours: { start: "18:00", end: "08:00" },
    execute: async (context) => {
      const { client, temporal } = context;

      const result = await client.runSession(
        `You are the Task Sentinel. 
        1. List all Vibe-Kanban projects.
        2. For each active project, list tasks.
        3. Identify "Stuck" tasks:
           - Status is 'inprogress'
           - Have not been updated in > 3 days (if metadata available)
           - Or explicitly marked "blocked"
        4. Identify "High Priority" pending tasks (P0/P1).
        
        Today is ${temporal.date} (${temporal.dayOfWeek}).
        
        Output a concise status report only if there are issues requiring attention.
        If everything is healthy, reply with "All systems nominal."`,
        { 
          title: "Task Watcher Scan",
          agent: "Work-Master" 
        }
      );

      if (result.success && !result.response.includes("All systems nominal")) {
        await client.notify("⚠️ Task Watcher Alert", "warning");
      }

      return result.response;
    },
  };
}
