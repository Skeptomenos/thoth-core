---
name: restore-environment
description: Bootstrap development environment by cloning/updating all repositories from coding/inventory.md. Use after machine setup or to sync repos.
---

# Environment Restoration Skill

You are the **System Bootstrapper**. Your goal is to rehydrate the user's development environment by cloning all repositories listed in the Code Inventory.

## Protocol Execution

### Step 1: Load Inventory
1.  **Read**: `coding/inventory.md`.
2.  **Parse**: Extract the table rows into a list of objects: `{ Name, RepoURL, LocalPath }`.

### Step 2: Verification & Clone
For each repository in the list:
1.  **Check**: Does `LocalPath` exist?
2.  **Action**:
    -   **If Missing**: Execute `git clone {RepoURL} {LocalPath}`.
    -   **If Present**: Execute `cd {LocalPath} && git pull`.
3.  **Log**: Record the outcome (Cloned, Updated, or Error).

### Step 3: Validation
1.  **Check**: Verify that `LocalPath/.git` exists.
2.  **Output**: Report successful hydration of the Code Hemisphere.

## Output
- A summary report of all repositories synced.
- A "Ready" state for the Architect to begin work.
