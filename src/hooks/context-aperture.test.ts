import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createContextApertureHook } from "./context-aperture";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("ContextApertureHook", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "thoth-test-"));
    fs.mkdirSync(path.join(tempDir, "kernel", "state"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "work", "people"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "work", "projects"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "life", "areas"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("initialization", () => {
    it("should return null when disabled", () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
        enabled: false,
      });
      expect(hook).toBeNull();
    });

    it("should return hook when enabled", () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });
      expect(hook).not.toBeNull();
    });

    it("should initialize with zero reads", () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const stats = hook!.getContextStats();
      expect(stats.circle1).toBe(0);
      expect(stats.circle2).toBe(0);
      expect(stats.circle3).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe("circle classification", () => {
    it("should classify registry.md as Circle 1", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "kernel", "registry.md");
      const callID = "test-1";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle1).toBe(1);
    });

    it("should classify dashboard.md as Circle 1", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "work", "dashboard.md");
      const callID = "test-2";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle1).toBe(1);
    });

    it("should classify chronicle.md as Circle 1", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "work", "chronicle.md");
      const callID = "test-3";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle1).toBe(1);
    });

    it("should classify _index.md as Circle 1", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "work", "_index.md");
      const callID = "test-4";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle1).toBe(1);
    });

    it("should classify people files as Circle 2", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "work", "people", "john.md");
      const callID = "test-5";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle2).toBe(1);
    });

    it("should classify project files as Circle 2", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "work", "projects", "thoth.md");
      const callID = "test-6";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle2).toBe(1);
    });

    it("should classify identity files as Circle 2", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      fs.mkdirSync(path.join(tempDir, "life", "identity"), { recursive: true });
      const filePath = path.join(tempDir, "life", "identity", "values.md");
      const callID = "test-7";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle2).toBe(1);
    });

    it("should classify state files as Circle 2", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "kernel", "state", "trust.md");
      const callID = "test-8";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle2).toBe(1);
    });

    it("should classify other files as Circle 3", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "life", "areas", "health.md");
      const callID = "test-9";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle3).toBe(1);
    });

    it("should not track files outside knowledge base", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = "/some/other/path/file.md";
      const callID = "test-10";

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID },
        { args: { filePath } }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.total).toBe(0);
    });
  });

  describe("deduplication", () => {
    it("should not count same file twice", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "kernel", "registry.md");

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID: "call-1" },
        { args: { filePath } }
      );
      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID: "call-1" },
        { title: "read", output: "content", metadata: {} }
      );

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID: "call-2" },
        { args: { filePath } }
      );
      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID: "call-2" },
        { title: "read", output: "content", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.circle1).toBe(1);
    });
  });

  describe("context warnings", () => {
    it("should warn when deep diving without orientation", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
        warnOnDeepDive: true,
      });

      for (let i = 0; i < 6; i++) {
        const filePath = path.join(tempDir, "life", "areas", `file${i}.md`);
        const callID = `call-${i}`;

        await hook!["tool.execute.before"](
          { tool: "read", sessionID: "test", callID },
          { args: { filePath } }
        );
        await hook!["tool.execute.after"](
          { tool: "read", sessionID: "test", callID },
          { title: "read", output: "content", metadata: {} }
        );
      }

      const warning = hook!.generateContextWarning();
      expect(warning).not.toBeNull();
      expect(warning).toContain("Deep dive detected");
    });

    it("should not warn when properly oriented", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
        warnOnDeepDive: true,
      });

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID: "call-1" },
        { args: { filePath: path.join(tempDir, "kernel", "registry.md") } }
      );
      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID: "call-1" },
        { title: "read", output: "content", metadata: {} }
      );

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID: "call-2" },
        { args: { filePath: path.join(tempDir, "work", "dashboard.md") } }
      );
      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID: "call-2" },
        { title: "read", output: "content", metadata: {} }
      );

      for (let i = 0; i < 6; i++) {
        const filePath = path.join(tempDir, "life", "areas", `file${i}.md`);
        const callID = `call-deep-${i}`;

        await hook!["tool.execute.before"](
          { tool: "read", sessionID: "test", callID },
          { args: { filePath } }
        );
        await hook!["tool.execute.after"](
          { tool: "read", sessionID: "test", callID },
          { title: "read", output: "content", metadata: {} }
        );
      }

      const warning = hook!.generateContextWarning();
      expect(warning).toBeNull();
    });

    it("should warn on high context load", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      // Use valid Circle 1 file names that match the patterns
      const circle1Files = ["registry.md", "dashboard.md", "chronicle.md", "_index.md", "kernel/_index.md"];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, "kernel", circle1Files[i] || `_index.md`);
        const callID = `call-c1-${i}`;

        await hook!["tool.execute.before"](
          { tool: "read", sessionID: "test", callID },
          { args: { filePath } }
        );
        await hook!["tool.execute.after"](
          { tool: "read", sessionID: "test", callID },
          { title: "read", output: "content", metadata: {} }
        );
      }

      for (let i = 0; i < 8; i++) {
        const filePath = path.join(tempDir, "work", "people", `person${i}.md`);
        const callID = `call-c2-${i}`;

        await hook!["tool.execute.before"](
          { tool: "read", sessionID: "test", callID },
          { args: { filePath } }
        );
        await hook!["tool.execute.after"](
          { tool: "read", sessionID: "test", callID },
          { title: "read", output: "content", metadata: {} }
        );
      }

      for (let i = 0; i < 10; i++) {
        const filePath = path.join(tempDir, "life", "areas", `area${i}.md`);
        const callID = `call-c3-${i}`;

        await hook!["tool.execute.before"](
          { tool: "read", sessionID: "test", callID },
          { args: { filePath } }
        );
        await hook!["tool.execute.after"](
          { tool: "read", sessionID: "test", callID },
          { title: "read", output: "content", metadata: {} }
        );
      }

      const warning = hook!.generateContextWarning();
      expect(warning).not.toBeNull();
      expect(warning).toContain("High context load");
    });
  });

  describe("session reset", () => {
    it("should reset counters on session.created", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      const filePath = path.join(tempDir, "kernel", "registry.md");
      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID: "call-1" },
        { args: { filePath } }
      );
      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID: "call-1" },
        { title: "read", output: "content", metadata: {} }
      );

      expect(hook!.getContextStats().circle1).toBe(1);

      await hook!.event({ event: { type: "session.created" } });

      expect(hook!.getContextStats().circle1).toBe(0);
      expect(hook!.getContextStats().total).toBe(0);
    });
  });

  describe("non-read tools", () => {
    it("should ignore non-read tools", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      await hook!["tool.execute.before"](
        { tool: "write", sessionID: "test", callID: "call-1" },
        { args: { filePath: path.join(tempDir, "kernel", "registry.md") } }
      );
      await hook!["tool.execute.after"](
        { tool: "write", sessionID: "test", callID: "call-1" },
        { title: "write", output: "success", metadata: {} }
      );

      const stats = hook!.getContextStats();
      expect(stats.total).toBe(0);
    });
  });

  describe("session duration tracking", () => {
    it("should track session duration", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const stats = hook!.getContextStats();
      expect(stats.sessionDurationMs).toBeGreaterThan(0);
    });

    it("should reset session duration on session.created", async () => {
      const hook = createContextApertureHook({
        knowledgeBasePath: tempDir,
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      const beforeReset = hook!.getContextStats().sessionDurationMs;

      await hook!.event({ event: { type: "session.created" } });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const afterReset = hook!.getContextStats().sessionDurationMs;

      expect(afterReset).toBeLessThan(beforeReset);
    });
  });
});
