import type { WorkflowDefinition } from "../sentinel-service";

export function createSystemWatcherWorkflow(): WorkflowDefinition {
  return {
    name: "system-watcher",
    description: "Monitors system health (Disk, CPU, Memory)",
    triggers: [
      {
        type: "schedule",
        cron: "0 * * * *", 
        time: "09:00",
      }
    ],
    execute: async (context) => {
      const { client } = context;

      const result = await client.runSession(
        `You are the System Sentinel.
        1. Check disk space usage (df -h).
        2. Check system load (uptime).
        3. Check memory usage (free -m or vm_stat).
        
        Analyze the output.
        - Alert if any disk partition is > 90% full.
        - Alert if load average > number of cores (estimate).
        
        If healthy, reply "All systems nominal".
        If issues found, summarize them with [ALERT] prefix.`,
        { 
          title: "System Watcher Scan",
          agent: "Code-Master"
        }
      );

      if (result.success && !result.response.includes("All systems nominal")) {
        await client.notify("🖥️ System Health Alert", "warning");
      }

      return result.response;
    },
  };
}
