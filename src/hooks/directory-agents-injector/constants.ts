/**
 * Constants for Directory Agents Injector
 */

import { join } from "node:path";

// Use XDG data directory or fallback
const xdgData = process.env.XDG_DATA_HOME || join(process.env.HOME || "", ".local", "share");

export const OPENCODE_STORAGE = join(xdgData, "opencode", "storage");
export const AGENTS_INJECTOR_STORAGE = join(OPENCODE_STORAGE, "thoth-directory-agents");
export const AGENTS_FILENAME = "AGENTS.md";
