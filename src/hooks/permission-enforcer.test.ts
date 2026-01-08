import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createPermissionEnforcerHook } from "./permission-enforcer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("PermissionEnforcerHook", () => {
  let tempDir: string;
  let trustFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "thoth-test-"));
    fs.mkdirSync(path.join(tempDir, "kernel", "state"), { recursive: true });
    trustFilePath = path.join(tempDir, "kernel", "state", "trust.md");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeTrustFile(level: number, overrides: string = "| (none)                 |                 |            |            |") {
    const content = `---
type: state
---

# Trust State

## Current Level: ${level}

## Temporary Overrides

| Scope                  | Permission      | Granted    | Expires    |
|------------------------|-----------------|------------|------------|
${overrides}
`;
    fs.writeFileSync(trustFilePath, content);
  }

  describe("initialization", () => {
    it("should return null when disabled", () => {
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
        enabled: false,
      });
      expect(hook).toBeNull();
    });

    it("should return hook when enabled", () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });
      expect(hook).not.toBeNull();
    });
  });

  describe("always require approval rules", () => {
    it("should block sending email", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { to: "test@example.com", subject: "Test" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_send_gmail_message" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Permission Required");
      expect(output.abort?.reason).toContain("email");
    });

    it("should block posting to Slack", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { channel_id: "C123", payload: "Hello" },
      };

      await hook!["tool.execute.before"](
        { tool: "slack_conversations_add_message" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Slack");
    });

    it("should block destructive bash commands", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { command: "rm -rf /important/folder" },
      };

      await hook!["tool.execute.before"](
        { tool: "bash" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Destructive");
    });

    it("should block git push", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { command: "git push origin main" },
      };

      await hook!["tool.execute.before"](
        { tool: "bash" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("remote repository");
    });

    it("should block modifying system prompts", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/THOTH.md", content: "modified" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("system prompts");
    });

    it("should block file deletion", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { file_id: "abc123" },
      };

      await hook!["tool.execute.before"](
        { tool: "drive-synapsis_delete_file" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Deleting");
    });

    it("should block making files public", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { file_id: "abc123" },
      };

      await hook!["tool.execute.before"](
        { tool: "drive-synapsis_make_file_public" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("public");
    });
  });

  describe("trust level 2 requirements", () => {
    it("should block code modification at level 1", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts", content: "code" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Trust Level 2 Required");
    });

    it("should allow code modification at level 2", async () => {
      writeTrustFile(2);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts", content: "code" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should block git commit at level 1", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { command: "git commit -m 'test'" },
      };

      await hook!["tool.execute.before"](
        { tool: "bash" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Trust Level 2");
    });

    it("should allow git commit at level 2", async () => {
      writeTrustFile(2);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { command: "git commit -m 'test'" },
      };

      await hook!["tool.execute.before"](
        { tool: "bash" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should block build commands at level 1", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { command: "npm run build" },
      };

      await hook!["tool.execute.before"](
        { tool: "bash" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Trust Level 2");
    });
  });

  describe("trust level 3 requirements", () => {
    it("should block calendar creation at level 2", async () => {
      writeTrustFile(2);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { summary: "Meeting", start_time: "2024-01-01T10:00:00Z" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_create_event" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Trust Level 3");
    });

    it("should allow calendar creation at level 3", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { summary: "Meeting", start_time: "2024-01-01T10:00:00Z" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_create_event" },
        output
      );

      expect(output.abort).toBeUndefined();
    });
  });

  describe("temporary overrides", () => {
    it("should allow blocked action with matching override", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const expiresStr = futureDate.toISOString().split("T")[0];
      
      writeTrustFile(1, `| file.ts | write | 2024-01-01 | ${expiresStr} |`);
      
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts", content: "code" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should not apply expired override", async () => {
      writeTrustFile(1, "| file.ts | write | 2024-01-01 | 2024-01-02 |");
      
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts", content: "code" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeDefined();
    });
  });

  describe("allowed operations", () => {
    it("should allow read operations at any level", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts" },
      };

      await hook!["tool.execute.before"](
        { tool: "read" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow glob operations at any level", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { pattern: "**/*.ts" },
      };

      await hook!["tool.execute.before"](
        { tool: "glob" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow grep operations at any level", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { pattern: "function" },
      };

      await hook!["tool.execute.before"](
        { tool: "grep" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow non-destructive bash at level 1", async () => {
      writeTrustFile(1);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { command: "ls -la" },
      };

      await hook!["tool.execute.before"](
        { tool: "bash" },
        output
      );

      expect(output.abort).toBeUndefined();
    });
  });

  describe("wildcard tool matching", () => {
    it("should match stripe_* pattern", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { amount: 1000 },
      };

      await hook!["tool.execute.before"](
        { tool: "stripe_create_payment" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Financial");
    });

    it("should match paypal_* pattern", async () => {
      writeTrustFile(3);
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { amount: 1000 },
      };

      await hook!["tool.execute.before"](
        { tool: "paypal_send_money" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Financial");
    });
  });

  describe("missing trust file", () => {
    it("should default to level 1 when trust file missing", async () => {
      const hook = createPermissionEnforcerHook({
        knowledgeBasePath: tempDir,
      });

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts", content: "code" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeDefined();
      expect(output.abort?.reason).toContain("Trust Level 2");
    });
  });
});
