import type { WorkflowDefinition } from "../sentinel-service";

export function createCalendarWatcherWorkflow(): WorkflowDefinition {
  return {
    name: "calendar-watcher",
    description: "Prepares briefings 10m before meetings",
    triggers: [
      {
        type: "schedule",
        cron: "*/10 * * * *", 
        time: "08:00",
      }
    ],
    execute: async (context) => {
      const { client, temporal } = context;

      const result = await client.runSession(
        `You are the Calendar Sentinel.
        1. List calendar events starting in the next 20 minutes.
        2. For each upcoming meeting:
           - Who are the participants?
           - What is the goal?
           - Do I have context/notes for this?
        
        Current time: ${temporal.time}
        
        If no meetings in 20 mins, reply "Clear".
        If meeting found, generate a "Pre-Flight Briefing":
        - Context
        - Goal
        - Talking Points`,
        { 
          title: "Calendar Watcher Scan",
          agent: "Work-Master"
        }
      );

      if (result.success && result.response !== "Clear") {
        await client.notify("📅 Upcoming Meeting Alert", "info");
      }

      return result.response;
    },
  };
}
