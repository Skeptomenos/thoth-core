import type { Plugin } from "@opencode-ai/plugin";
import { createAgents } from "./agents";
import { createThothAgent } from "./agents/thoth";
import {
  createPermissionEnforcerHook,
  createTrustLevelTrackerHook,
  createContextApertureHook,
  createFrontmatterEnforcerHook,
  createReadConfirmationHook,
  createWriteConfirmationHook,
} from "./hooks";
import { createDirectoryAgentsInjectorHook } from "./hooks/directory-agents-injector";
import {
  createTodoContinuationEnforcer,
  createSessionRecoveryHook,
  createContextWindowMonitorHook,
  BackgroundManager,
  createBackgroundNotificationHook,
  setMainSession,
  log as sharedLog,
} from "./shared-hooks";
import {
  createBackgroundTask,
  createBackgroundOutput,
  createBackgroundCancel,
  createSkillTool,
  createSentinelTools,
} from "./tools";
import { SkillRegistry } from "./services";
import { ThothPluginConfigSchema, type ThothPluginConfig } from "./config";
import { log, deepMerge, getUserConfigDir, expandPath } from "./shared";
import {
  detectSpecialization,
  type Specialization,
} from "./specialization";
import * as fs from "fs";
import * as path from "path";

// Session specialization state - tracks specialization per session for:
// 1. Mid-session context-shift detection (future)
// 2. Reboot command to re-specialize (future)
// 3. Cross-session specialization queries
const sessionSpecializations = new Map<string, Specialization>();

/**
 * Get the specialization for a session (for future use by tools/hooks)
 * NOTE: Do NOT export this function! OpenCode treats all exports as plugin instances.
 */
function getSessionSpecialization(sessionID: string): Specialization | undefined {
  return sessionSpecializations.get(sessionID);
}

function loadConfigFromPath(configPath: string): ThothPluginConfig | null {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const rawConfig = JSON.parse(content);
      const result = ThothPluginConfigSchema.safeParse(rawConfig);

      if (!result.success) {
        log(`Config validation error in ${configPath}:`, result.error.issues);
        return null;
      }

      log(`Config loaded from ${configPath}`);
      return result.data;
    }
  } catch (err) {
    log(`Error loading config from ${configPath}:`, err);
  }
  return null;
}

function mergeConfigs(
  base: ThothPluginConfig,
  override: ThothPluginConfig
): ThothPluginConfig {
  return {
    ...base,
    ...override,
    agents: deepMerge(base.agents ?? {}, override.agents ?? {}),
    hooks: deepMerge(base.hooks ?? {}, override.hooks ?? {}),
    skills: deepMerge(base.skills ?? {}, override.skills ?? {}),
    integrations: deepMerge(base.integrations ?? {}, override.integrations ?? {}),
    user: deepMerge(base.user ?? {}, override.user ?? {}),
  };
}

function loadPluginConfig(directory: string): ThothPluginConfig {
  const userConfigPath = path.join(
    getUserConfigDir(),
    "opencode",
    "thoth-plugin.json"
  );

  const projectConfigPath = path.join(
    directory,
    ".opencode",
    "thoth-plugin.json"
  );

  let config: ThothPluginConfig = loadConfigFromPath(userConfigPath) ?? {};

  const projectConfig = loadConfigFromPath(projectConfigPath);
  if (projectConfig) {
    config = mergeConfigs(config, projectConfig);
  }

  log("Final merged config", config);
  return config;
}

function resolveKnowledgeBasePath(config: ThothPluginConfig, directory: string): string {
  if (config.knowledge_base) {
    return expandPath(config.knowledge_base);
  }

  const commonLocations = [
    path.join(process.env.HOME || "", "Repos", "thoth"),
    path.join(process.env.HOME || "", "repos", "thoth"),
    path.join(process.env.HOME || "", "Projects", "thoth"),
    path.join(process.env.HOME || "", "projects", "thoth"),
    path.join(process.env.HOME || "", "thoth"),
    path.join(directory, "thoth"),
  ];

  for (const location of commonLocations) {
    const kernelPath = path.join(location, "kernel");
    if (fs.existsSync(kernelPath)) {
      log(`Found knowledge base at: ${location}`);
      return location;
    }
  }

  return commonLocations[0];
}

import {
  SentinelService,
  createDeepResearchWorkflow,
  createInboxWatcherWorkflow,
  createCalendarWatcherWorkflow,
  createTaskWatcherWorkflow,
  createSystemWatcherWorkflow,
  createThothClient,
} from "./sdk";

// Global Sentinel instance
let sentinelService: SentinelService | null = null;

const ThothPlugin: Plugin = async (ctx) => {
  const pluginConfig = loadPluginConfig(ctx.directory);

  if (pluginConfig.enabled === false) {
    log("Thoth plugin disabled via config");
    return {};
  }

  const sentinelConfig = pluginConfig.sentinel;
  if (sentinelConfig?.enabled !== false && !sentinelService) {
    try {
      const client = await createThothClient({
        client: ctx.client,
      });

      sentinelService = new SentinelService(client, {
        pollIntervalMs: sentinelConfig?.poll_interval_ms,
        quietHours: sentinelConfig?.quiet_hours,
        enabled: sentinelConfig?.enabled,
      });

      // Morning boot is implemented as an OpenProse skill, not an SDK workflow
      // See: thoth-kb/.opencode/skill/morning-boot/morning-boot.prose
      sentinelService.registerWorkflow(createDeepResearchWorkflow());
      
      sentinelService.registerWorkflow(createInboxWatcherWorkflow());
      sentinelService.registerWorkflow(createCalendarWatcherWorkflow());
      sentinelService.registerWorkflow(createTaskWatcherWorkflow());
      sentinelService.registerWorkflow(createSystemWatcherWorkflow());

      await sentinelService.start();
      log("Sentinel Service initialized and started");
    } catch (err) {
      log("Failed to initialize Sentinel Service:", err);
    }
  }



  // ... rest of the plugin ...


  const knowledgeBasePath = resolveKnowledgeBasePath(pluginConfig, ctx.directory);
  log(`Knowledge base path: ${knowledgeBasePath}`);

  const hooksConfig = pluginConfig.hooks ?? {};

  const permissionEnforcer = hooksConfig["permission-enforcer"] !== false
    ? createPermissionEnforcerHook({ knowledgeBasePath })
    : null;

  const trustLevelTracker = hooksConfig["trust-level-tracker"] !== false
    ? createTrustLevelTrackerHook({ knowledgeBasePath })
    : null;

  const contextAperture = hooksConfig["context-aperture"] !== false
    ? createContextApertureHook({ knowledgeBasePath })
    : null;

  const frontmatterEnforcer = hooksConfig["frontmatter-enforcer"] !== false
    ? createFrontmatterEnforcerHook({ knowledgeBasePath })
    : null;

  // Read/Write confirmation hooks - audit trail and Smart Merge reminders
  const readConfirmation = hooksConfig["read-confirmation"] !== false
    ? createReadConfirmationHook({ knowledgeBasePath })
    : null;

  const writeConfirmation = hooksConfig["write-confirmation"] !== false
    ? createWriteConfirmationHook({ knowledgeBasePath })
    : null;

  const todoContinuationEnforcer = hooksConfig["todo-continuation"] !== false
    ? createTodoContinuationEnforcer(ctx)
    : null;

  const sessionRecoveryHook = hooksConfig["session-recovery"] !== false
    ? createSessionRecoveryHook(ctx, { experimental: { auto_resume: true } })
    : null;

  const contextWindowMonitor = hooksConfig["context-window-monitor"] !== false
    ? createContextWindowMonitorHook(ctx)
    : null;

  // Directory agents injector - injects AGENTS.md content on file reads
  const directoryAgentsInjector = hooksConfig["directory-agents-injector"] !== false
    ? createDirectoryAgentsInjectorHook({
        knowledgeBasePath,
        directory: ctx.directory,
      })
    : null;

  // Detect specialization from current working directory
  const initialSpecialization = detectSpecialization(ctx.directory, knowledgeBasePath);
  log("Detected specialization:", {
    depth: initialSpecialization.depth,
    domain: initialSpecialization.domain,
    category: initialSpecialization.category,
    relativePath: initialSpecialization.relativePath,
    depthSource: initialSpecialization.depthSource,
  });

  const backgroundManager = new BackgroundManager(ctx);
  const backgroundNotificationHook = createBackgroundNotificationHook(backgroundManager);

  const backgroundTask = createBackgroundTask(backgroundManager);
  const backgroundOutput = createBackgroundOutput(backgroundManager, ctx.client);
  const backgroundCancel = createBackgroundCancel(backgroundManager, ctx.client);
  
  const skillRegistry = new SkillRegistry();
  await skillRegistry.loadSkills();
  
  const skillTool = createSkillTool(skillRegistry);
  
  // Create Sentinel tools if enabled
  const sentinelTools = sentinelService 
    ? createSentinelTools(sentinelService)
    : {};

  if (sessionRecoveryHook && todoContinuationEnforcer) {
    sessionRecoveryHook.setOnAbortCallback((sessionID) => {
      todoContinuationEnforcer.markRecovering(sessionID);
    });
    sessionRecoveryHook.setOnRecoveryCompleteCallback((sessionID) => {
      todoContinuationEnforcer.markRecoveryComplete(sessionID);
    });
  }

  return {
    tool: {
      background_task: backgroundTask,
      background_output: backgroundOutput,
      background_cancel: backgroundCancel,
      skill: skillTool,
      ...sentinelTools,
    },

    config: async (config) => {
      const thothAgents = createAgents(pluginConfig);

      // Create specialized Thoth agent based on detected depth/domain
      // Pass cwd and knowledgeBasePath so boot files get pre-loaded into the prompt
      const specializedThoth = createThothAgent(
        initialSpecialization,
        ctx.directory,
        knowledgeBasePath
      );

      config.agent = {
        Thoth: specializedThoth, // Use specialized version instead of default
        "Work-Master": thothAgents["work-master"],
        "Life-Master": thothAgents["life-master"],
        "Code-Master": thothAgents["code-master"],
        // DEPRECATED: archivist and scribe - knowledge operations now handled directly by Thoth
        // archivist: thothAgents.archivist,
        // scribe: thothAgents.scribe,
        coach: thothAgents.coach,
        sentinel: thothAgents.sentinel,
        diplomat: thothAgents.diplomat,
        chronicler: thothAgents.chronicler,
        ...config.agent,
        build: { ...config.agent?.build, mode: "subagent" },
        plan: { ...config.agent?.plan, mode: "subagent" },
      };

      config.permission = {
        ...config.permission,
        webfetch: "allow",
        external_directory: "allow",
      };
    },

    event: async (input) => {
      const { event } = input;
      const props = event.properties as Record<string, unknown> | undefined;

      if (event.type === "session.created") {
        const sessionID = props?.sessionID as string | undefined;
        if (sessionID) {
          setMainSession(sessionID);
          // Store specialization for this session
          sessionSpecializations.set(sessionID, initialSpecialization);
        }
        sharedLog("Thoth session initialized", {
          sessionID,
          depth: initialSpecialization.depth,
          domain: initialSpecialization.domain,
          depthSource: initialSpecialization.depthSource,
        });
      }

      // Handle session cleanup
      if (event.type === "session.deleted") {
        const sessionInfo = props?.info as { id?: string } | undefined;
        if (sessionInfo?.id) {
          sessionSpecializations.delete(sessionInfo.id);
        }
      }

      await trustLevelTracker?.event(input);
      await contextAperture?.event(input);
      await directoryAgentsInjector?.event(input);

      await todoContinuationEnforcer?.handler(input);
      await backgroundNotificationHook.event(input);
      await contextWindowMonitor?.event(input);

      if (event.type === "message.updated") {
        const info = props?.info as { role?: string; error?: unknown; sessionID?: string; id?: string } | undefined;
        if (info?.role === "assistant" && info?.error && sessionRecoveryHook?.isRecoverableError(info.error)) {
          await sessionRecoveryHook.handleSessionRecovery({
            id: info.id,
            role: info.role,
            sessionID: info.sessionID,
            error: info.error,
          });
        }
      }
    },

    "tool.execute.before": async (input, output) => {
      await permissionEnforcer?.["tool.execute.before"]?.(input, output);
      await contextAperture?.["tool.execute.before"]?.(input, output);
      await trustLevelTracker?.["tool.execute.before"]?.(input, output);
      await frontmatterEnforcer?.["tool.execute.before"]?.(input, output);
      await readConfirmation?.["tool.execute.before"]?.(input, output);
      await writeConfirmation?.["tool.execute.before"]?.(input, output);
    },

    "tool.execute.after": async (input, output) => {
      await trustLevelTracker?.["tool.execute.after"]?.(input, output);
      await contextAperture?.["tool.execute.after"]?.(input, output);
      await frontmatterEnforcer?.["tool.execute.after"]?.(input, output);
      await readConfirmation?.["tool.execute.after"]?.(input, output);
      await writeConfirmation?.["tool.execute.after"]?.(input, output);
      await directoryAgentsInjector?.["tool.execute.after"]?.(
        input as { tool: string; sessionID: string; callID: string },
        output as { title: string; output: string; metadata: unknown }
      );
      await contextWindowMonitor?.["tool.execute.after"]?.(input, output as { title: string; output: string; metadata: unknown });
    },
  };
};

export default ThothPlugin;

export type { ThothPluginConfig } from "./config";
