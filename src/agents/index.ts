import type { AgentConfig } from "@opencode-ai/sdk";
import { thothAgent } from "./thoth";
import { workMasterAgent } from "./work-master";
import { lifeMasterAgent } from "./life-master";
import { codeMasterAgent } from "./code-master";
// DEPRECATED: archivist and scribe are now core capabilities in Thoth's main prompt
// Knowledge retrieval and persistence require session context, so they cannot be sub-agents
// See: src/agents/thoth.ts <Core_Capabilities> section
// import { archivistAgent } from "./archivist";
// import { scribeAgent } from "./scribe";
import { coachAgent } from "./coach";
import { sentinelAgent } from "./sentinel";
import { diplomatAgent } from "./diplomat";
import { chroniclerAgent } from "./chronicler";
import type { ThothPluginConfig, AgentOverride } from "../config";

export const builtinAgents: Record<string, AgentConfig> = {
  Thoth: thothAgent,
  "work-master": workMasterAgent,
  "life-master": lifeMasterAgent,
  "code-master": codeMasterAgent,
  // DEPRECATED: Knowledge operations now handled directly by Thoth
  // archivist: archivistAgent,
  // scribe: scribeAgent,
  coach: coachAgent,
  sentinel: sentinelAgent,
  diplomat: diplomatAgent,
  chronicler: chroniclerAgent,
};

export function createAgents(
  config: ThothPluginConfig
): Record<string, AgentConfig> {
  const agents: Record<string, AgentConfig> = {};

  for (const [name, baseAgent] of Object.entries(builtinAgents)) {
    const override = config.agents?.[name as keyof typeof config.agents];
    agents[name] = applyOverride(baseAgent, override);
  }

  return agents;
}

function applyOverride(
  base: AgentConfig,
  override: AgentOverride | undefined
): AgentConfig {
  if (!override) return base;

  return {
    ...base,
    ...(override.model && { model: override.model }),
    ...(override.temperature !== undefined && { temperature: override.temperature }),
    ...(override.maxTokens !== undefined && { maxTokens: override.maxTokens }),
    ...(override.thinking !== undefined && {
      thinking: override.thinking
        ? { type: "enabled" as const, budgetTokens: 32000 }
        : undefined,
    }),
  };
}

export { thothAgent } from "./thoth";
export { workMasterAgent } from "./work-master";
export { lifeMasterAgent } from "./life-master";
export { codeMasterAgent } from "./code-master";
// DEPRECATED: archivist and scribe - see note above
// export { archivistAgent } from "./archivist";
// export { scribeAgent } from "./scribe";
export { coachAgent } from "./coach";
export { sentinelAgent } from "./sentinel";
export { diplomatAgent } from "./diplomat";
export { chroniclerAgent } from "./chronicler";
