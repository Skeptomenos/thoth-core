---
type: analysis
hemisphere: kernel
created: 2026-01-11
updated: 2026-01-11
tags: [architecture, knowledge-base, state-machine, analysis]
summary: Comprehensive state machine diagram and analysis of Thoth's knowledge base system
---

# Thoth Knowledge Base System — State Machine Analysis

## Executive Summary

The Thoth knowledge base system is a **prompt-driven, hook-enforced** knowledge management architecture. Unlike traditional code-enforced systems, most knowledge operations are **instructed via system prompt** and **validated via hooks**. The knowledge base itself is a simple file system with semantic structure, not a database.

**Key Insight**: The "knowledge base system" is really **three interacting systems**:
1. **Prompt Instructions** — What Thoth *should* do (soft guidance)
2. **Hook Enforcement** — What Thoth *must* do (hard enforcement)
3. **File Structure** — Where knowledge *lives* (physical organization)

---

## System Component Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          THOTH KNOWLEDGE BASE SYSTEM                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        PROMPT LAYER (Soft Guidance)                          ││
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐             ││
│  │  │ THOTH_KNOWLEDGE_ │ │ Index-First     │ │ Smart Merge     │             ││
│  │  │ MANAGEMENT       │ │ Retrieval       │ │ Protocol        │             ││
│  │  │ (prompt-sections)│ │ (prompt-builder)│ │ (prompt-sections)│             ││
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        HOOK LAYER (Hard Enforcement)                         ││
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────────┐ ││
│  │  │ Permission     │ │ Context        │ │ Frontmatter   │ │ Trust Level   │ ││
│  │  │ Enforcer       │ │ Aperture       │ │ Enforcer      │ │ Tracker       │ ││
│  │  └────────────────┘ └────────────────┘ └────────────────┘ └───────────────┘ ││
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                   ││
│  │  │ Read           │ │ Write          │ │ Directory     │                   ││
│  │  │ Confirmation   │ │ Confirmation   │ │ Agents Inject │                   ││
│  │  └────────────────┘ └────────────────┘ └────────────────┘                   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        FILE LAYER (Physical Structure)                       ││
│  │  ┌──────────────────────────────────────────────────────────────────────┐   ││
│  │  │                    KNOWLEDGE BASE (thoth-kb/)                         │   ││
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   ││
│  │  │  │ kernel/  │  │ work/    │  │ life/    │  │ coding/  │              │   ││
│  │  │  │(system)  │  │(career)  │  │(personal)│  │(projects)│              │   ││
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │   ││
│  │  └──────────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                    SPECIALIZATION LAYER (Context Detection)                  ││
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                   ││
│  │  │ Specialization │ │ Boot Sequence  │ │ Prompt Builder │                   ││
│  │  │ Detector       │ │ Resolver       │ │ (Dynamic)      │                   ││
│  │  └────────────────┘ └────────────────┘ └────────────────┘                   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## State Machine: Knowledge Retrieval Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     KNOWLEDGE RETRIEVAL STATE MACHINE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  USER REQUEST    │
                              │ "What is X?"     │
                              └────────┬─────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │         INTENT GATE              │
                    │ (Phase 0 - prompt-builder.ts)    │
                    │                                  │
                    │  Classify: Information Request   │
                    │  Hemisphere: Detect from keywords│
                    └─────────────┬────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────┐
              │         INDEX-FIRST RETRIEVAL            │
              │   (THOTH_KNOWLEDGE_MANAGEMENT prompt)    │
              └─────────────┬────────────────────────────┘
                            │
           ┌────────────────┴────────────────┐
           ▼                                 ▼
┌────────────────────┐            ┌────────────────────┐
│  LOOKUP QUERY      │            │  SEARCH QUERY      │
│ "Status of X?"     │            │ "What did Y say?"  │
└─────────┬──────────┘            └─────────┬──────────┘
          │                                 │
          ▼                                 ▼
┌────────────────────┐            ┌────────────────────┐
│ 1. Read hemisphere │            │ 1. Grep keywords   │
│    _index.md       │            │    across KB       │
│ 2. Find subfolder  │            │ 2. Review results  │
│ 3. Read folder     │            │ 3. Read 1-3 most   │
│    _index.md       │            │    relevant files  │
│ 4. If needed, read │            └─────────┬──────────┘
│    full file       │                      │
└─────────┬──────────┘                      │
          │                                 │
          └────────────────┬────────────────┘
                           ▼
              ┌───────────────────────────┐
              │   CONTEXT APERTURE HOOK   │
              │   (context-aperture.ts)   │
              │                           │
              │ Track: Circle 1/2/3 reads │
              │ Warn: Deep dive without   │
              │       orientation         │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │   HALLUCINATION CHECK     │
              │   (prompt instruction)    │
              │                           │
              │ "Do I have file source    │
              │  for this claim?"         │
              │  YES → Cite and respond   │
              │  NO  → Say "not recorded" │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │      RESPOND TO USER      │
              │   (with source citation)  │
              └───────────────────────────┘
```

### Circle System (Context Aperture Classification)

| Circle | Files | Purpose | When to Read |
|--------|-------|---------|--------------|
| **1 (Map)** | `registry.md`, `dashboard.md`, `chronicle.md`, `_index.md` | Orientation | Always first |
| **2 (Territory)** | Entity files in `/people/`, `/projects/`, `/identity/`, `/state/`, `/config/` | Specific context | When intent targets them |
| **3 (Deep Dive)** | Everything else | Deep exploration | Only when Circle 1-2 fail |

**Hook Enforcement**: The `context-aperture.ts` hook tracks reads by circle and warns if:
- 5+ Circle 3 reads without 2+ Circle 1 reads
- 20+ total files read in a session

---

## State Machine: Knowledge Persistence Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     KNOWLEDGE PERSISTENCE STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │ NEW INFORMATION  │
                              │ EMERGES          │
                              └────────┬─────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │       PERSISTENCE TRIGGER        │
                    │   (prompt-sections.ts triggers)  │
                    │                                  │
                    │  • New person mentioned          │
                    │  • New project started           │
                    │  • Decision made                 │
                    │  • Preference learned            │
                    │  • Status change                 │
                    │  • Significant event             │
                    └─────────────┬────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────────────┐
                    │      DEDUPLICATION CHECK         │
                    │                                  │
                    │  1. Grep for entity name         │
                    │  2. Check if file exists         │
                    │  3. If exists → UPDATE           │
                    │     If similar → ASK Zeus        │
                    │     If new → CREATE              │
                    └─────────────┬────────────────────┘
                                  │
           ┌──────────────────────┴──────────────────────┐
           │                                             │
           ▼                                             ▼
┌────────────────────┐                        ┌────────────────────┐
│   UPDATE PATH      │                        │   CREATE PATH      │
│   (Smart Merge)    │                        │   (New Entity)     │
└─────────┬──────────┘                        └─────────┬──────────┘
          │                                             │
          ▼                                             ▼
┌────────────────────┐                        ┌────────────────────┐
│ 1. READ before     │                        │ 1. Use template    │
│    write           │                        │    from kernel/    │
│ 2. INTEGRATE into  │                        │    templates/      │
│    existing        │                        │ 2. Add frontmatter │
│    sections        │                        │ 3. CREATE file     │
│ 3. COMPARE         │                        └─────────┬──────────┘
│    confidence      │                                  │
│ 4. DEDUPLICATE     │                                  │
│ 5. LOG changes     │                                  │
│    (Progress Log)  │                                  │
└─────────┬──────────┘                                  │
          │                                             │
          └────────────────────┬────────────────────────┘
                               │
                               ▼
              ┌───────────────────────────────┐
              │   FRONTMATTER ENFORCER HOOK   │
              │   (frontmatter-enforcer.ts)   │
              │                               │
              │  Auto-inject if missing:      │
              │  - type, hemisphere, created  │
              │  - updated, tags, summary     │
              └─────────────┬─────────────────┘
                            │
                            ▼
              ┌───────────────────────────────┐
              │   WRITE CONFIRMATION HOOK     │
              │   (write-confirmation.ts)     │
              │                               │
              │  Audit trail, Smart Merge     │
              │  reminder injection           │
              └─────────────┬─────────────────┘
                            │
                            ▼
              ┌───────────────────────────────┐
              │   INDEX-FIRST WRITING         │
              │                               │
              │  1. File created/updated      │
              │  2. Update _index.md          │
              │  3. Add bidirectional links   │
              │  4. Status propagation        │
              └─────────────┬─────────────────┘
                            │
                            ▼
              ┌───────────────────────────────┐
              │   KNOWLEDGE PERSISTED         │
              └───────────────────────────────┘
```

### Smart Merge Protocol (Detailed)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SMART MERGE PROTOCOL                                    │
│                      (prompt-sections.ts instruction)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────┐
     │ New Information │
     └────────┬────────┘
              │
              ▼
     ┌────────────────────────────────┐
     │ STEP 1: READ BEFORE WRITE      │
     │                                │
     │ Always check existing content  │
     │ Understand current narrative   │
     └────────────────┬───────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │ STEP 2: INTEGRATE, DON'T       │
     │         APPEND                 │
     │                                │
     │ New info merges INTO existing  │
     │ sections. Document reads as    │
     │ current state, not additions.  │
     └────────────────┬───────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │ STEP 3: COMPARE CONFIDENCE     │
     │                                │
     │ New > Existing → Update        │
     │ New < Existing → Don't change  │
     │ Equal → Ask Zeus               │
     └────────────────┬───────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │ STEP 4: DEDUPLICATE            │
     │                                │
     │ One source of truth per fact   │
     │ No duplicate information       │
     └────────────────┬───────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │ STEP 5: LOG SIGNIFICANT        │
     │         CHANGES                │
     │                                │
     │ Progress Log at file bottom:   │
     │ YYYY-MM-DD: [Change] (source)  │
     └────────────────────────────────┘

RESULT: Document body = current truth
        Progress Log = audit trail
```

---

## State Machine: Session Initialization

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SESSION INITIALIZATION STATE MACHINE                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  OPENCODE START  │
                              └────────┬─────────┘
                                       │
                                       ▼
              ┌──────────────────────────────────────────┐
              │        THOTH PLUGIN INITIALIZATION       │
              │               (src/index.ts)             │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │         LOAD PLUGIN CONFIG               │
              │                                          │
              │  1. Check ~/.config/opencode/thoth-      │
              │     plugin.json (user config)            │
              │  2. Check .opencode/thoth-plugin.json    │
              │     (project config)                     │
              │  3. Merge configs (project overrides)    │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │     RESOLVE KNOWLEDGE BASE PATH          │
              │                                          │
              │  Search order:                           │
              │  1. config.knowledge_base (if set)       │
              │  2. ~/Repos/thoth                        │
              │  3. ~/repos/thoth                        │
              │  4. ~/Projects/thoth                     │
              │  5. ~/thoth                              │
              │  6. ./thoth                              │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │       DETECT SPECIALIZATION              │
              │      (specialization/detector.ts)        │
              │                                          │
              │  Based on cwd relative to KB:            │
              │  - Depth 0: Root (/)                     │
              │  - Depth 1: Hemisphere (/work/)          │
              │  - Depth 2: Category (/work/projects/)   │
              │  - Depth 3: Entity (/work/projects/xyz/) │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │          PARSE AGENTS.MD                 │
              │                                          │
              │  Extract frontmatter:                    │
              │  - hemisphere: Domain override           │
              │  - depth: Depth override (0-3)           │
              │  - boot_sequence: Files to pre-load      │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │        RESOLVE BOOT SEQUENCE             │
              │     (specialization/boot-sequences.ts)   │
              │                                          │
              │  If AGENTS.md specifies boot_sequence:   │
              │    → Use that                            │
              │  Else use defaults by depth/domain       │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │        BUILD SYSTEM PROMPT               │
              │      (specialization/prompt-builder.ts)  │
              │                                          │
              │  Assembly order:                         │
              │  1. THOTH_CORE_IDENTITY                  │
              │  2. THOTH_ANTI_PATTERNS                  │
              │  3. THOTH_BEHAVIORAL_GUIDANCE            │
              │  4. THOTH_KNOWLEDGE_MANAGEMENT           │
              │  5. Skill Routing (dynamic)              │
              │  6. Intent Gate                          │
              │  7. Core Capabilities                    │
              │  8. Execution                            │
              │  9. Permission System                    │
              │  10. Temporal Awareness                  │
              │  11. Communication Style                 │
              │  12. Boot Context (dynamic - files)      │
              │  13. Closing                             │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │        CREATE SPECIALIZED AGENT          │
              │          (agents/thoth.ts)               │
              │                                          │
              │  AgentConfig with:                       │
              │  - Dynamic prompt                        │
              │  - Extended thinking enabled             │
              │  - 64K max tokens                        │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │        INITIALIZE HOOKS                  │
              │                                          │
              │  Create (if enabled):                    │
              │  - Permission Enforcer                   │
              │  - Trust Level Tracker                   │
              │  - Context Aperture                      │
              │  - Frontmatter Enforcer                  │
              │  - Read/Write Confirmation               │
              │  - Todo Continuation                     │
              │  - Session Recovery                      │
              │  - Context Window Monitor                │
              │  - Directory Agents Injector             │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │         LOAD SKILLS                      │
              │    (services/skill-registry.ts)          │
              │                                          │
              │  Discovery order (later wins):           │
              │  1. npm defaults (builtin)               │
              │  2. ~/.opencode/skill/ (user)            │
              │  3. .opencode/skill/ (project)           │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │      SESSION READY                       │
              │                                          │
              │  Store specialization in session map     │
              │  Set main session ID                     │
              │  Ready for user interaction              │
              └──────────────────────────────────────────┘
```

---

## State Machine: Permission & Trust System

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION & TRUST STATE MACHINE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   TOOL REQUEST   │
                              │  (any tool call) │
                              └────────┬─────────┘
                                       │
                                       ▼
              ┌──────────────────────────────────────────┐
              │      PERMISSION ENFORCER HOOK            │
              │      (hooks/permission-enforcer.ts)      │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │       READ TRUST STATE                   │
              │  (kernel/state/trust.md)                 │
              │                                          │
              │  Parse:                                  │
              │  - Current Level (1, 2, or 3)            │
              │  - Temporary Overrides                   │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │   CHECK TEMPORARY OVERRIDES              │
              │                                          │
              │  If tool/scope matches unexpired         │
              │  override → ALLOW                        │
              └─────────────────────┬────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                    Override?           No Override
                          │                   │
                    ▼                   ▼
             ┌──────────┐       ┌──────────────────┐
             │  ALLOW   │       │ CHECK ALWAYS     │
             └──────────┘       │ REQUIRE APPROVAL │
                                │                  │
                                │ • send_gmail     │
                                │ • slack_message  │
                                │ • git push       │
                                │ • delete files   │
                                │ • modify prompts │
                                └────────┬─────────┘
                                         │
                               ┌─────────┴─────────┐
                               │                   │
                         Matches?           No Match
                               │                   │
                         ▼                   ▼
                  ┌──────────┐       ┌──────────────────┐
                  │  BLOCK   │       │ CHECK TRUST      │
                  │ (abort)  │       │ LEVEL GATES      │
                  └──────────┘       │                  │
                                     │ Level 2 gates:  │
                                     │ - Code edits    │
                                     │ - Build/test    │
                                     │ - Git commit    │
                                     │                  │
                                     │ Level 3 gates:  │
                                     │ - Routine email │
                                     │ - Calendar      │
                                     │ - Internal Slack│
                                     └────────┬─────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                              Insufficient?       Sufficient
                                    │                   │
                              ▼                   ▼
                       ┌──────────┐       ┌──────────┐
                       │  BLOCK   │       │  ALLOW   │
                       │ (abort)  │       │          │
                       └──────────┘       └──────────┘


TRUST LEVELS:
┌───────┬─────────────┬────────────────────────────────────────────────┐
│ Level │ Name        │ Autonomous Actions                             │
├───────┼─────────────┼────────────────────────────────────────────────┤
│   1   │ New         │ Read only, all actions require approval        │
├───────┼─────────────┼────────────────────────────────────────────────┤
│   2   │ Established │ Code edits with evidence, knowledge updates    │
├───────┼─────────────┼────────────────────────────────────────────────┤
│   3   │ Trusted     │ Routine communications, calendar changes       │
└───────┴─────────────┴────────────────────────────────────────────────┘
```

---

## State Machine: Skill Invocation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SKILL INVOCATION STATE MACHINE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  USER REQUEST    │
                              │ "Run morning     │
                              │  boot"           │
                              └────────┬─────────┘
                                       │
                                       ▼
              ┌──────────────────────────────────────────┐
              │         INTENT GATE (Phase 0)            │
              │                                          │
              │  Step 0: CHECK SKILL TRIGGERS            │
              │                                          │
              │  Compare user intent against             │
              │  <Skill_Routing> section triggers:       │
              │  "Run morning boot" matches              │
              │  → skill({ skill: "morning-boot" })      │
              └─────────────────────┬────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                    Match Found         No Match
                          │                   │
                    ▼                   ▼
              ┌──────────────┐    ┌──────────────┐
              │ INVOKE SKILL │    │ Continue to  │
              │ IMMEDIATELY  │    │ normal flow  │
              └──────┬───────┘    └──────────────┘
                     │
                     ▼
              ┌──────────────────────────────────────────┐
              │         SKILL TOOL EXECUTION             │
              │       (tools/skill/tools.ts)             │
              │                                          │
              │  1. Refresh skill registry               │
              │  2. Find matching skill by name/query    │
              │  3. Load SKILL.md content                │
              │  4. Load references/ files               │
              │  5. Return formatted skill prompt        │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │         SKILL PROMPT EXPANSION           │
              │                                          │
              │  Output includes:                        │
              │  - Base directory for skill              │
              │  - SKILL.md content (instructions)       │
              │  - Loaded references (if any)            │
              │  - "Launched skill: {name}" marker       │
              └─────────────────────┬────────────────────┘
                                    │
                                    ▼
              ┌──────────────────────────────────────────┐
              │         AGENT EXECUTES SKILL             │
              │                                          │
              │  Agent follows skill instructions        │
              │  (e.g., morning-boot.prose workflow)     │
              └──────────────────────────────────────────┘
```

---

## File Structure: Knowledge Base Hemispheres

```
thoth-kb/                              # Knowledge base root
├── kernel/                            # HEMISPHERE: System/meta (Depth 1)
│   ├── AGENTS.md                      # Context for kernel mode
│   ├── registry.md                    # System index
│   ├── config/                        # Configuration (Depth 2)
│   │   ├── _index.md                  # Config index
│   │   ├── permissions.md             # Permission rules
│   │   ├── integrations.md            # Connected services
│   │   └── preferences.md             # User preferences
│   ├── state/                         # Runtime state (Depth 2)
│   │   ├── _index.md
│   │   ├── trust.md                   # Trust level state
│   │   ├── active-threads.md          # Current tasks
│   │   └── session-memory.md          # Cross-session memory
│   ├── memory/                        # Persistent memory (Depth 2)
│   │   ├── decisions.md               # Decision log
│   │   ├── learnings.md               # What Thoth learned
│   │   └── patterns.md                # Observed patterns
│   ├── templates/                     # File templates
│   │   ├── person.md
│   │   ├── project.md
│   │   └── daily-log.md
│   └── paths.json                     # File location index
│
├── work/                              # HEMISPHERE: Professional (Depth 1)
│   ├── AGENTS.md                      # Context for work mode
│   ├── registry.md                    # Work index
│   ├── dashboard.md                   # Work priorities
│   ├── identity/                      # Professional identity
│   │   ├── role.md
│   │   └── goals.md
│   ├── people/                        # Work relationships (Depth 2)
│   │   ├── _index.md
│   │   └── [name].md                  # Individual files (Depth 3)
│   ├── projects/                      # Projects (Depth 2)
│   │   ├── _index.md
│   │   ├── dashboard.md
│   │   └── [project]/                 # Project capsules (Depth 3)
│   │       ├── CONTEXT.md
│   │       ├── overview.md
│   │       └── decisions.md
│   ├── operations/
│   │   ├── chronicle.md               # Running history
│   │   └── daily-log/                 # Daily logs
│   └── inbox/
│
├── life/                              # HEMISPHERE: Personal (Depth 1)
│   ├── AGENTS.md
│   ├── registry.md
│   ├── identity/
│   ├── people/                        # Personal relationships
│   ├── health/
│   ├── finance/
│   └── inbox/
│
└── coding/                            # HEMISPHERE: Technical (Depth 1)
    ├── AGENTS.md
    ├── registry.md
    ├── projects/                      # Coding projects
    ├── knowledge/
    └── inbox/
```

### Depth Model

| Depth | Path Pattern | Example | Specialization |
|-------|--------------|---------|----------------|
| 0 | `/` | Root | Pure Chief of Staff |
| 1 | `/{hemisphere}/` | `/work/` | Hemisphere voice (Executive COS) |
| 2 | `/{hemisphere}/{category}/` | `/work/projects/` | Category expertise |
| 3 | `/{hemisphere}/{category}/{entity}/` | `/work/projects/thoth/` | Deep expert mode |

---

## Frontmatter System (Detailed)

Frontmatter is YAML metadata at the top of markdown files, enclosed between `---` delimiters. It provides structured metadata that enables indexing, filtering, and audit trails.

### Frontmatter Structure

```yaml
---
type: document                    # File type (document, person, project, state, etc.)
hemisphere: work                  # Domain (work, life, coding, kernel)
created: 2026-01-11              # Creation date (auto-set by hook)
updated: 2026-01-11              # Last update date (auto-set by hook)
tags: [architecture, analysis]    # Searchable tags
summary: Brief description        # One-line summary for index files
---

# Document content starts here...
```

### How Frontmatter is Enforced (Hook Enforcement)

The **Frontmatter Enforcer Hook** (`src/hooks/frontmatter-enforcer.ts`) provides **deterministic enforcement** of frontmatter metadata:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      FRONTMATTER ENFORCER STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │   WRITE/EDIT TOOL CALL  │
                    │   (markdown file in KB) │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  IS KB MARKDOWN FILE?   │
                    │  (path in knowledge     │
                    │   base, ends with .md)  │
                    └───────────┬─────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                NO                          YES
                  │                           │
                  ▼                           ▼
            ┌──────────┐          ┌─────────────────────────┐
            │ PASS     │          │ TOOL TYPE?              │
            │ THROUGH  │          └───────────┬─────────────┘
            └──────────┘                      │
                              ┌───────────────┴───────────────┐
                              │                               │
                           WRITE                           EDIT
                              │                               │
                              ▼                               ▼
              ┌─────────────────────────┐   ┌─────────────────────────┐
              │ BEFORE EXECUTION:       │   │ AFTER EXECUTION:        │
              │                         │   │                         │
              │ 1. Read existing file   │   │ 1. Read updated file    │
              │    (if exists)          │   │ 2. Parse frontmatter    │
              │ 2. Get `created` date   │   │ 3. Update `updated`     │
              │    from existing, or    │   │    to today's date      │
              │    use today            │   │ 4. Write back file      │
              │ 3. Set `updated` to     │   │                         │
              │    today                │   │                         │
              │ 4. Inject/update        │   │                         │
              │    frontmatter          │   │                         │
              └─────────────────────────┘   └─────────────────────────┘
```

### Frontmatter Parsing Logic

From `frontmatter-enforcer.ts`:

```typescript
// Regex to match frontmatter block
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// If no frontmatter exists, create minimal frontmatter
if (!parsed.hasFrontmatter) {
  return reconstructMarkdown({ created, updated }, content);
}

// If frontmatter exists but missing `created`, add it
if (!parsed.frontmatter.created) {
  parsed.frontmatter.created = created;
}

// Always update `updated` timestamp
parsed.frontmatter.updated = updated;
```

### What Gets Auto-Enforced vs Prompt-Instructed

| Field | Enforcement Method | Notes |
|-------|-------------------|-------|
| `created` | **Hook** (auto-injected) | Set once when file created, never changed |
| `updated` | **Hook** (auto-updated) | Updated on every write/edit |
| `type` | **Prompt** (instructed) | Agent should set based on content type |
| `hemisphere` | **Prompt** (instructed) | Agent should set based on location |
| `tags` | **Prompt** (instructed) | Agent should add relevant tags |
| `summary` | **Prompt** (instructed) | Agent should write brief description |

---

## Index Files System (Detailed)

Index files (`_index.md` and `registry.md`) are the **retrieval backbone** of the knowledge base. They enable efficient navigation without reading every file.

### Index File Types

| File | Scope | Purpose |
|------|-------|---------|
| `registry.md` | Hemisphere-level | Top-level index for entire hemisphere |
| `_index.md` | Folder-level | Lists direct children of a folder |
| `dashboard.md` | Priority view | Current priorities and status (not a true index) |

### Index-First Retrieval Pattern

The **Index-First Retrieval** pattern is a **prompt instruction** (not hook-enforced) that guides efficient knowledge access:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      INDEX-FIRST RETRIEVAL STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │  QUERY: "Who is Sarah?" │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  STEP 1: READ HEMISPHERE│
                    │  _index.md              │
                    │                         │
                    │  work/_index.md shows:  │
                    │  - people/ → "Work      │
                    │    relationships"       │
                    │  - projects/ → ...      │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  STEP 2: READ FOLDER    │
                    │  _index.md              │
                    │                         │
                    │  work/people/_index.md: │
                    │  | Name  | File    | Summary         | Status |
                    │  |-------|---------|-----------------|--------|
                    │  | Sarah | sarah.md| Engineering lead| active |
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  STEP 3: SUFFICIENT?    │
                    │                         │
                    │  Can _index.md entry    │
                    │  answer the question?   │
                    └───────────┬─────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                YES                          NO
                  │                           │
                  ▼                           ▼
            ┌──────────┐          ┌─────────────────────────┐
            │ RESPOND  │          │  STEP 4: READ FULL FILE │
            │ from     │          │                         │
            │ _index   │          │  work/people/sarah.md   │
            └──────────┘          │  for detailed info      │
                                  └───────────┬─────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────────┐
                                  │  RESPOND with details   │
                                  │  (cite source file)     │
                                  └─────────────────────────┘
```

### _index.md Format

From `prompt-sections.ts`:

```markdown
| Name | File | Summary | Status | Tags |
|------|------|---------|--------|------|
| Golden Ticket | golden-ticket.md | Q1 API redesign initiative | active | api, q1 |
| Platform Migration | platform-migration.md | Infrastructure modernization | paused | infra |
```

### Index-First Writing Pattern

When **creating** files, the index must also be updated. This is **prompt-instructed** with a **hook reminder**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      INDEX-FIRST WRITING STATE MACHINE                           │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │  CREATE NEW FILE        │
                    │  work/people/bob.md     │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  STEP 1: CREATE FILE    │
                    │  with appropriate       │
                    │  template & frontmatter │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  WRITE CONFIRMATION     │
                    │  HOOK FIRES             │
                    │                         │
                    │  [Created: bob.md]      │
                    │  Reminder: Update       │
                    │  _index.md if this is   │
                    │  a new file. Check      │
                    │  bidirectional links.   │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  STEP 2: UPDATE         │
                    │  _index.md              │
                    │                         │
                    │  Add entry:             │
                    │  | Bob | bob.md | ... | │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  STEP 3: BIDIRECTIONAL  │
                    │  LINKS                  │
                    │                         │
                    │  If Bob's file refs     │
                    │  Project X, update      │
                    │  Project X to ref Bob   │
                    └─────────────────────────┘
```

### Write Confirmation Hook

From `write-confirmation.ts`:

```typescript
// For new markdown files (except index files themselves)
if (isNewFile && isMarkdownFile && !isIndexFile) {
  message += "\nReminder: Update _index.md if this is a new file. Check bidirectional links.";
}
```

This hook provides a **soft reminder** after every file write. It does NOT enforce index updates — that remains the agent's responsibility via prompt instructions.

### Boot Sequence Index Files

At session start, the specialization system automatically loads relevant index files based on depth:

From `boot-sequences.ts`:

| Depth | Domain | Boot Files |
|-------|--------|------------|
| 0 | (root) | `kernel/registry.md` |
| 1 | work | `work/registry.md`, `work/dashboard.md` |
| 1 | life | `life/registry.md`, `life/dashboard.md` |
| 2 | work | `_index.md`, `dashboard.md` (relative to cwd) |
| 2 | life | `_index.md`, `dashboard.md` |
| 3 | any | `CONTEXT.md`, `overview.md`, `decisions.md` |

### Context Aperture and Index Files

The Context Aperture hook classifies `_index.md` files as **Circle 1** (always allowed first):

From `context-aperture.ts`:

```typescript
const CIRCLE_1_PATTERNS = [
  /registry\.md$/,
  /dashboard\.md$/,
  /chronicle\.md$/,
  /_index\.md$/,       // ← Index files are Circle 1
];
```

This means reading index files does NOT trigger "deep dive without orientation" warnings.

---

## Key Observations

### 1. Prompt-First, Hook-Enforced

The knowledge management "system" is primarily **instructions in the system prompt**, not code:

| Aspect | Implementation | Reliability |
|--------|----------------|-------------|
| Smart Merge Protocol | Prompt instruction (THOTH_KNOWLEDGE_MANAGEMENT) | ~80% |
| Index-First Retrieval | Prompt instruction | ~80% |
| Index-First Writing | Prompt instruction + hook reminder | ~85% |
| Bidirectional Linking | Prompt instruction | ~80% |
| Source Attribution | Prompt instruction | ~80% |
| Hallucination Check | Prompt instruction | ~80% |
| `created`/`updated` dates | **Hook enforcement** (frontmatter-enforcer.ts) | 100% |
| Circle 1-2-3 Tracking | **Hook enforcement** (context-aperture.ts) | 100% |
| Permission Blocking | **Hook enforcement** (permission-enforcer.ts) | 100% |
| Write Reminders | **Hook enforcement** (write-confirmation.ts) | 100% |

**Key Insight**: Hooks enforce MUST-DO behaviors with 100% reliability. Prompt instructions guide SHOULD-DO behaviors with ~80% reliability (agent may deviate). The combination provides layered enforcement.

### 2. Frontmatter and Index Files — The Dual System

The knowledge base uses two complementary metadata systems:

| System | Purpose | Enforcement |
|--------|---------|-------------|
| **Frontmatter** | Per-file metadata (type, dates, tags) | Hook (created/updated), Prompt (other fields) |
| **Index Files** | Folder navigation and summaries | Prompt only + write reminder |

**Why both?**
- Frontmatter is **self-contained** — each file carries its own metadata
- Index files are **navigational** — enable efficient folder-level queries
- Together they enable both bottom-up (grep) and top-down (index) retrieval

### 3. Dynamic Prompt Assembly

The system prompt is not static — it's assembled at session start based on:
- **Current working directory** → Specialization detection
- **AGENTS.md files** → Depth override, boot sequence
- **Available skills** → Trigger routing injection
- **Boot sequence files** → Pre-loaded context

### 3. Trust as Configuration, Not Code

Trust levels are stored in a markdown file (`kernel/state/trust.md`) and parsed at runtime by the permission enforcer hook. The trust system is configurable without code changes.

### 4. Skills as Expandable Prompts

Skills are not code — they're markdown files with frontmatter that get injected into the conversation when triggered. The skill tool simply reads and formats the skill content; the agent follows the instructions.

---

## Source File Map

| File | Purpose |
|------|---------|
| `src/specialization/prompt-sections.ts` | Static prompt sections (identity, knowledge management, index instructions) |
| `src/specialization/prompt-builder.ts` | Dynamic prompt assembly, skill routing, boot content |
| `src/specialization/detector.ts` | CWD-based specialization detection |
| `src/specialization/boot-sequences.ts` | Boot file resolution by depth/domain (includes `_index.md` loading) |
| `src/agents/thoth.ts` | Agent configuration, prompt injection |
| `src/hooks/permission-enforcer.ts` | Trust-based permission blocking |
| `src/hooks/context-aperture.ts` | Circle system tracking (classifies `_index.md` as Circle 1) |
| `src/hooks/frontmatter-enforcer.ts` | Auto-inject `created`/`updated` dates in frontmatter |
| `src/hooks/write-confirmation.ts` | Audit trail + `_index.md` update reminders |
| `src/hooks/trust-level-tracker.ts` | Trust level reading and updates |
| `src/tools/skill/tools.ts` | Skill discovery and invocation |
| `src/services/skill-registry.ts` | Skill loading from multiple locations |
| `src/index.ts` | Plugin initialization, hook wiring |

---

## Summary: Frontmatter and Index Files

### Frontmatter
- **What**: YAML metadata block at file top (`---` delimited)
- **Required fields**: `type`, `hemisphere`, `created`, `updated`, `tags`, `summary`
- **Hook-enforced**: `created` (set once), `updated` (auto-updated on every write/edit)
- **Prompt-instructed**: `type`, `hemisphere`, `tags`, `summary`
- **Source**: `src/hooks/frontmatter-enforcer.ts`

### Index Files
- **What**: `_index.md` files that list folder contents in table format
- **Purpose**: Enable Index-First Retrieval (navigate without reading all files)
- **Format**: `| Name | File | Summary | Status | Tags |` table
- **Prompt-instructed**: Agent must update `_index.md` when creating/updating files
- **Hook-reminded**: Write confirmation hook reminds about `_index.md` updates
- **Circle 1**: Context Aperture classifies index files as "always read first"
- **Source**: `src/specialization/prompt-sections.ts` (instructions), `src/hooks/write-confirmation.ts` (reminders)

---

*Analysis generated: 2026-01-11*
