import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { createTrustLevelTrackerHook } from "./trust-level-tracker";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("TrustLevelTrackerHook", () => {
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

  describe("initialization", () => {
    it("should return null when disabled", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
        enabled: false,
      });
      expect(hook).toBeNull();
    });

    it("should create trust file if it does not exist", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      expect(hook).not.toBeNull();
      hook!.getTrustState();
      
      expect(fs.existsSync(trustFilePath)).toBe(true);
    });

    it("should initialize with level 1", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      const state = hook!.getTrustState();
      expect(state.level).toBe(1);
    });

    it("should initialize criteria to zero", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      const state = hook!.getTrustState();
      expect(state.criteria.successfulTasks).toBe(0);
      expect(state.criteria.permissionViolations).toBe(0);
    });
  });

  describe("incrementSuccessfulTasks", () => {
    it("should increment successful tasks count", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.incrementSuccessfulTasks();
      const state = hook!.getTrustState();
      
      expect(state.criteria.successfulTasks).toBe(1);
    });

    it("should persist increments across reads", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.incrementSuccessfulTasks();
      hook!.incrementSuccessfulTasks();
      hook!.incrementSuccessfulTasks();
      
      const state = hook!.getTrustState();
      expect(state.criteria.successfulTasks).toBe(3);
    });
  });



  describe("recordPermissionViolation", () => {
    it("should increment violation count", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.recordPermissionViolation("Test violation");
      const state = hook!.getTrustState();
      
      expect(state.criteria.permissionViolations).toBe(1);
    });

    it("should record violation date", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.recordPermissionViolation("Test violation");
      const state = hook!.getTrustState();
      
      expect(state.criteria.lastViolationDate).toBeDefined();
    });

    it("should add entry to history", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.recordPermissionViolation("Test violation");
      const state = hook!.getTrustState();
      
      const violationEntry = state.history.find(h => h.change === "Downgrade");
      expect(violationEntry).toBeDefined();
      expect(violationEntry?.reason).toContain("Test violation");
    });
  });

  describe("trust level upgrade", () => {
    it("should upgrade to level 2 when criteria met", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      for (let i = 0; i < 10; i++) {
        hook!.incrementSuccessfulTasks();
      }

      const state = hook!.getTrustState();
      expect(state.level).toBe(2);
    });

    it("should not upgrade if violations exist", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.recordPermissionViolation("Test violation");
      
      for (let i = 0; i < 10; i++) {
        hook!.incrementSuccessfulTasks();
      }

      const state = hook!.getTrustState();
      expect(state.level).toBe(1);
    });

    it("should not upgrade if tasks insufficient", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      for (let i = 0; i < 9; i++) {
        hook!.incrementSuccessfulTasks();
      }

      const state = hook!.getTrustState();
      expect(state.level).toBe(1);
    });

    it("should add upgrade entry to history", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      for (let i = 0; i < 10; i++) {
        hook!.incrementSuccessfulTasks();
      }

      const state = hook!.getTrustState();
      const upgradeEntry = state.history.find(h => h.change === "Upgrade");
      expect(upgradeEntry).toBeDefined();
      expect(upgradeEntry?.level).toBe(2);
    });
  });

  describe("temporary overrides", () => {
    it("should add temporary override", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.addTemporaryOverride("email", "send", 7);
      const state = hook!.getTrustState();
      
      expect(state.temporaryOverrides.length).toBe(1);
      expect(state.temporaryOverrides[0].scope).toBe("email");
      expect(state.temporaryOverrides[0].permission).toBe("send");
    });

    it("should set expiration date when provided", () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      hook!.addTemporaryOverride("email", "send", 7);
      const state = hook!.getTrustState();
      
      expect(state.temporaryOverrides[0].expires).toBeDefined();
    });
  });

  describe("todowrite tracking", () => {
    it("should track todo completions via tool.execute.before and after", async () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      const callID = "test-call-1";
      const sessionID = "test-session";

      await hook!["tool.execute.before"](
        { tool: "todowrite", sessionID, callID },
        { args: { todos: [{ id: "1", status: "pending" }] } }
      );

      await hook!["tool.execute.after"](
        { tool: "todowrite", sessionID, callID },
        { 
          title: "todowrite",
          output: JSON.stringify([{ id: "1", status: "completed" }]),
          metadata: {}
        }
      );

      const state = hook!.getTrustState();
      expect(state.criteria.successfulTasks).toBe(1);
    });

    it("should not increment for already completed todos", async () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      const callID = "test-call-2";
      const sessionID = "test-session";

      await hook!["tool.execute.before"](
        { tool: "todowrite", sessionID, callID },
        { args: { todos: [{ id: "1", status: "completed" }] } }
      );

      await hook!["tool.execute.after"](
        { tool: "todowrite", sessionID, callID },
        { 
          title: "todowrite",
          output: JSON.stringify([{ id: "1", status: "completed" }]),
          metadata: {}
        }
      );

      const state = hook!.getTrustState();
      expect(state.criteria.successfulTasks).toBe(0);
    });

    it("should count multiple newly completed todos", async () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      const callID = "test-call-3";
      const sessionID = "test-session";

      await hook!["tool.execute.before"](
        { tool: "todowrite", sessionID, callID },
        { args: { todos: [
          { id: "1", status: "pending" },
          { id: "2", status: "pending" },
          { id: "3", status: "pending" }
        ] } }
      );

      await hook!["tool.execute.after"](
        { tool: "todowrite", sessionID, callID },
        { 
          title: "todowrite",
          output: JSON.stringify([
            { id: "1", status: "completed" },
            { id: "2", status: "completed" },
            { id: "3", status: "pending" }
          ]),
          metadata: {}
        }
      );

      const state = hook!.getTrustState();
      expect(state.criteria.successfulTasks).toBe(2);
    });

    it("should ignore non-todowrite tools", async () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      await hook!["tool.execute.before"](
        { tool: "read", sessionID: "test", callID: "test" },
        { args: {} }
      );

      await hook!["tool.execute.after"](
        { tool: "read", sessionID: "test", callID: "test" },
        { title: "read", output: "content", metadata: {} }
      );

      const state = hook!.getTrustState();
      expect(state.criteria.successfulTasks).toBe(0);
    });
  });

  describe("session events", () => {
    it("should ensure trust file exists on session.created", async () => {
      const hook = createTrustLevelTrackerHook({
        knowledgeBasePath: tempDir,
      });

      await hook!.event({ event: { type: "session.created" } });
      
      expect(fs.existsSync(trustFilePath)).toBe(true);
    });
  });
});
