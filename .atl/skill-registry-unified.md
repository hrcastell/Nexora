# Skill Registry — Nexora (Unified)

<!-- Unified registry: Windsurf skills + Claude/Codex agents + Project-specific -->

Last updated: 2026-05-26 (Agent System Unification)

## Sources Scanned

### Global (User-Level)
- `~/.codeium/windsurf/skills/` — Windsurf skills (workflow)
- `~/.claude/skills/` — Claude skills (workflow)
- `~/.codex/skills/` — Codex skills (workflow)
- `~/.claude/agents/` — **Claude global agents (NEW - 38 agentes)**
- `~/.codex/agents/` — **Codex global agents (NEW - 38 agentes)**

### Project-Specific
- `.atl/agents/` — Nexora domain-specific agents

---

## 🛠️ Workflow Skills (User-Level)

| Skill | Trigger | Path |
|-------|---------|------|
| `branch-pr` | Creating PRs | `~/.codeium/windsurf/skills/branch-pr/SKILL.md` |
| `chained-pr` | Large PRs (>400 lines) | `~/.codeium/windsurf/skills/chained-pr/SKILL.md` |
| `cognitive-doc-design` | Documentation, READMEs | `~/.codeium/windsurf/skills/cognitive-doc-design/SKILL.md` |
| `comment-writer` | PR feedback, reviews | `~/.codeium/windsurf/skills/comment-writer/SKILL.md` |
| `go-testing` | Go testing | `~/.codeium/windsurf/skills/go-testing/SKILL.md` |
| `graphify` | Knowledge graphs | `~/.claude/skills/graphify/SKILL.md` |
| `issue-creation` | GitHub issues | `~/.codeium/windsurf/skills/issue-creation/SKILL.md` |
| `judgment-day` | Dual review | `~/.codeium/windsurf/skills/judgment-day/SKILL.md` |
| `skill-creator` | Create skills | `~/.codeium/windsurf/skills/skill-creator/SKILL.md` |
| `skill-improver` | Audit skills | `~/.codeium/windsurf/skills/skill-improver/SKILL.md` |
| `skill-registry` | Update registry | `~/.codeium/windsurf/skills/skill-registry/SKILL.md` |
| `work-unit-commits` | Commit planning | `~/.codeium/windsurf/skills/work-unit-commits/SKILL.md` |
| `sdd-apply` | Implementation | `~/.codeium/windsurf/skills/sdd-apply/SKILL.md` |
| `sdd-archive` | Archive changes | `~/.codeium/windsurf/skills/sdd-archive/SKILL.md` |
| `sdd-design` | Technical design | `~/.codeium/windsurf/skills/sdd-design/SKILL.md` |
| `sdd-explore` | Codebase exploration | `~/.codeium/windsurf/skills/sdd-explore/SKILL.md` |
| `sdd-init` | Initialize SDD | `~/.codeium/windsurf/skills/sdd-init/SKILL.md` |
| `sdd-onboard` | SDD onboarding | `~/.codeium/windsurf/skills/sdd-onboard/SKILL.md` |
| `sdd-propose` | Change proposals | `~/.codeium/windsurf/skills/sdd-propose/SKILL.md` |
| `sdd-spec` | Specifications | `~/.codeium/windsurf/skills/sdd-spec/SKILL.md` |
| `sdd-tasks` | Task breakdown | `~/.codeium/windsurf/skills/sdd-tasks/SKILL.md` |
| `sdd-verify` | Validation | `~/.codeium/windsurf/skills/sdd-verify/SKILL.md` |

---

## 🤖 Global Agents (38 agentes)

### 👨‍💻 Engineering
- `agent-backend-architect` — System design, databases, APIs
- `agent-code-reviewer` — Code quality, best practices
- `agent-database-optimizer` — Query tuning, indexing
- `agent-frontend-developer` — Vue/React, UI
- `agent-mobile-app-builder` — iOS/Android
- `agent-software-architect` — Design patterns

### 🔒 Security
- `agent-security-engineer` — Security review, threat modeling

### 🧪 Testing
- `agent-api-tester` — API testing
- `agent-reality-checker` — Production readiness

### 🎨 Design
- `agent-brand-guardian` — Brand consistency
- `agent-inclusive-visuals` — Accessibility
- `agent-ui-designer` — Component design
- `agent-ux-architect` — UX research

### 📱 Marketing
- `agent-content-creator` — Content strategy
- `agent-instagram-curator` — Social media

### 📋 Management
- `agent-project-manager` — Sprint planning

**Path**: `~/.claude/agents/<category>/<agent-name>.md`

---

## 🏗️ Project-Specific Agents

Agentes específicos para Nexora (gestión de talleres).

**Ubicación**: `.atl/agents/specialized/`

| Agent | Trigger | Path |
|-------|---------|------|
| _Agregar según necesidad_ | | |

---

## 🎯 Agentes Nativos Claude Code

- AI Engineer, Backend Architect, Frontend Developer, Senior Developer
- Database Optimizer, DevOps Automator
- Sprint Prioritizer, Project Shepherd, Senior Project Manager
- Evidence Collector, Reality Checker, API Tester
- Explore, Plan

**Invocación**: `Agent({ subagent_type: "Backend Architect", model: "sonnet", ... })`

---

## 📖 Invocation Guide

### Global Agents
```javascript
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",
  description: "Design Vue component",
  prompt: `Using ~/.claude/agents/engineering/engineering-frontend-developer.md,
  design a reusable dashboard component for Nexora...`
})
```

### Native Agents
```javascript
Agent({
  subagent_type: "Backend Architect",
  model: "sonnet",
  prompt: "Design REST API for garage management..."
})
```

---

**Project**: Nexora (Workshop Management SaaS)
**Stack**: Vue 3, FastAPI, PostgreSQL
