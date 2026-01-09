import { tool } from "@opencode-ai/plugin";
import type { SentinelService } from "../../sdk/sentinel-service";

export function createSentinelTools(sentinelService: SentinelService): Record<string, ReturnType<typeof tool>> {
  return {
    trigger_workflow: tool({
      description: "Trigger a registered Sentinel workflow (e.g., morning-boot, deep-research). Use this to start complex, multi-step automated processes.",
      args: {
        workflow: tool.schema
          .string()
          .describe("The name of the workflow to trigger (e.g., 'morning-boot', 'deep-research')"),
        data: tool.schema
          .string()
          .optional()
          .describe("Optional input data for the workflow"),
      },
      execute: async ({ workflow, data }) => {
        const result = await sentinelService.triggerWorkflow(workflow, "manual", data);
        
        if (!result) {
          return `Error: Workflow "${workflow}" not found.`;
        }

        if (result.success) {
          return `Workflow "${workflow}" completed successfully.\n\nResult:\n${result.response}`;
        } else {
          return `Workflow "${workflow}" failed.\n\nError: ${result.error}`;
        }
      },
    }),
    
    list_workflows: tool({
      description: "List all available Sentinel workflows.",
      args: {},
      execute: async () => {
        const workflows = sentinelService.listWorkflows();
        if (workflows.length === 0) {
          return "No workflows registered.";
        }
        
        return workflows
          .map((w) => `- **${w.name}**: ${w.description || "No description"}`)
          .join("\n");
      },
    }),
  };
}
