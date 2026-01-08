import { describe, it, expect } from "bun:test";
import { createTemporalAwarenessHook } from "./temporal-awareness";

describe("TemporalAwarenessHook", () => {
  describe("initialization", () => {
    it("should return null when disabled", () => {
      const hook = createTemporalAwarenessHook({ enabled: false });
      expect(hook).toBeNull();
    });

    it("should return hook when enabled", () => {
      const hook = createTemporalAwarenessHook();
      expect(hook).not.toBeNull();
    });
  });

  describe("shouldBlockWork", () => {
    it("should return blocked status based on current time", () => {
      const hook = createTemporalAwarenessHook();
      const result = hook!.shouldBlockWork();
      
      expect(typeof result.blocked).toBe("boolean");
      if (result.blocked) {
        expect(result.reason).toBeDefined();
      }
    });
  });

  describe("getWorkRecommendation", () => {
    it("should return a recommendation string", () => {
      const hook = createTemporalAwarenessHook();
      const recommendation = hook!.getWorkRecommendation();
      
      expect(typeof recommendation).toBe("string");
      expect(recommendation.length).toBeGreaterThan(0);
    });
  });

  describe("getDayModeRecommendation", () => {
    it("should return a recommendation string", () => {
      const hook = createTemporalAwarenessHook();
      const recommendation = hook!.getDayModeRecommendation();
      
      expect(typeof recommendation).toBe("string");
      expect(recommendation.length).toBeGreaterThan(0);
    });
  });

  describe("tool.execute.before", () => {
    it("should not block non-work tools regardless of time", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts" },
      };

      await hook!["tool.execute.before"](
        { tool: "read" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should not block write tool regardless of time", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { filePath: "/path/to/file.ts", content: "code" },
      };

      await hook!["tool.execute.before"](
        { tool: "write" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should not block glob tool regardless of time", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { pattern: "**/*.ts" },
      };

      await hook!["tool.execute.before"](
        { tool: "glob" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow work tools with P0 marker even if blocked", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { to: "test@example.com", subject: "[P0] Critical issue" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_send_gmail_message" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow work tools with emergency marker even if blocked", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { to: "test@example.com", subject: "Emergency: Server down" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_send_gmail_message" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow work tools with urgent marker even if blocked", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { to: "test@example.com", body: "This is urgent!" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_send_gmail_message" },
        output
      );

      expect(output.abort).toBeUndefined();
    });

    it("should allow work tools with critical marker even if blocked", async () => {
      const hook = createTemporalAwarenessHook();

      const output: { args: Record<string, unknown>; abort?: { reason: string } } = {
        args: { to: "test@example.com", subject: "Critical security issue" },
      };

      await hook!["tool.execute.before"](
        { tool: "google-workspace_send_gmail_message" },
        output
      );

      expect(output.abort).toBeUndefined();
    });
  });

  describe("session events", () => {
    it("should handle session.created event", async () => {
      const hook = createTemporalAwarenessHook();
      await hook!.event({ event: { type: "session.created" } });
    });

    it("should handle multiple session.created events", async () => {
      const hook = createTemporalAwarenessHook();
      await hook!.event({ event: { type: "session.created" } });
      await hook!.event({ event: { type: "session.created" } });
    });
  });

  describe("exported functions", () => {
    it("should expose getTemporalContext", () => {
      const hook = createTemporalAwarenessHook();
      
      expect(hook!.getTemporalContext).toBeDefined();
      expect(typeof hook!.getTemporalContext).toBe("function");
      
      const context = hook!.getTemporalContext();
      expect(context.date).toBeDefined();
      expect(context.time).toBeDefined();
      expect(context.dayOfWeek).toBeDefined();
      expect(context.biologicalMode).toBeDefined();
      expect(context.dayMode).toBeDefined();
    });

    it("should expose formatTemporalContext", () => {
      const hook = createTemporalAwarenessHook();
      
      expect(hook!.formatTemporalContext).toBeDefined();
      expect(typeof hook!.formatTemporalContext).toBe("function");
      
      const context = hook!.getTemporalContext();
      const formatted = hook!.formatTemporalContext(context);
      expect(formatted).toContain("temporal_context");
    });
  });
});
