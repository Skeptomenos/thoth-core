/**
 * Types for Directory Agents Injector
 */

export interface InjectedPathsData {
  sessionID: string;
  injectedPaths: string[];
  updatedAt: number;
}

export interface ToolExecuteInput {
  tool: string;
  sessionID: string;
  callID: string;
}

export interface ToolExecuteOutput {
  title: string;
  output: string;
  metadata: unknown;
}

export interface EventInput {
  event: {
    type: string;
    properties?: unknown;
  };
}
