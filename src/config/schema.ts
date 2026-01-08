import { z } from "zod";

const AgentOverrideSchema = z.object({
  model: z.string().optional(),
  thinking: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
}).strict();

const HooksConfigSchema = z.object({
  // Thoth-specific hooks
  "permission-enforcer": z.boolean().optional(),
  "trust-level-tracker": z.boolean().optional(),
  "context-aperture": z.boolean().optional(),
  "temporal-awareness": z.boolean().optional(),
  "knowledge-persistence": z.boolean().optional(),
  "directory-agents-injector": z.boolean().optional(),
  // Shared hooks (from oh-my-opencode)
  "todo-continuation": z.boolean().optional(),
  "session-recovery": z.boolean().optional(),
  "context-window-monitor": z.boolean().optional(),
  "background-notification": z.boolean().optional(),
}).strict();

const SkillsConfigSchema = z.object({
  "morning-boot": z.boolean().optional(),
  "evening-close": z.boolean().optional(),
  "thought-router": z.boolean().optional(),
  "post-meeting-drill": z.boolean().optional(),
}).strict();

const IntegrationsConfigSchema = z.object({
  google_workspace: z.boolean().optional(),
  slack: z.boolean().optional(),
  jira: z.boolean().optional(),
  drive_sync: z.boolean().optional(),
}).strict();

export const ThothPluginConfigSchema = z.object({
  enabled: z.boolean().optional(),
  knowledge_base: z.string().optional(),
  agents: z.object({
    thoth: AgentOverrideSchema.optional(),
    "work-master": AgentOverrideSchema.optional(),
    "life-master": AgentOverrideSchema.optional(),
    "code-master": AgentOverrideSchema.optional(),
  }).optional(),
  hooks: HooksConfigSchema.optional(),
  skills: SkillsConfigSchema.optional(),
  integrations: IntegrationsConfigSchema.optional(),
  user: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    timezone: z.string().optional(),
  }).optional(),
}).strict();

export type ThothPluginConfig = z.infer<typeof ThothPluginConfigSchema>;
export type AgentOverride = z.infer<typeof AgentOverrideSchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export type SkillsConfig = z.infer<typeof SkillsConfigSchema>;
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;

export type HookName = keyof NonNullable<ThothPluginConfig["hooks"]>;
export type SkillName = keyof NonNullable<ThothPluginConfig["skills"]>;
export type AgentName = "thoth" | "work-master" | "life-master" | "code-master";
