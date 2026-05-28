# Unified Agent System — ClinicCompera

Este directorio contiene agentes especializados unificados para Claude Code, Codex y Windsurf.

## Estructura

```
.atl/agents/
  ├── engineering/      # Agentes de ingeniería y desarrollo
  ├── design/           # Agentes de diseño UI/UX
  ├── testing/          # Agentes de testing y QA
  ├── management/       # Agentes de gestión de proyectos
  ├── security/         # Agentes de seguridad
  ├── data/             # Agentes de datos y analytics
  └── README.md         # Este archivo
```

## Protocolo de Invocación

### Para Claude Code / Codex
Los agentes se invocan mediante el `Agent` tool con `subagent_type`:

```javascript
Agent({
  subagent_type: "Backend Architect",
  description: "Design database schema",
  prompt: "Design a scalable schema for patient records with HIPAA compliance"
})
```

### Para Windsurf
Los agentes se cargan automáticamente desde `.windsurfrules` y se invocan por nombre.

## Agentes Nativos de Claude Code

Estos agentes están embebidos en Claude Code y se invocan vía `Agent` tool:

### Engineering
- **AI Engineer** — ML/AI development, model deployment, RAG systems
- **Backend Architect** — Scalable system design, database architecture, API development
- **Frontend Developer** — React/Vue/Angular, UI implementation, performance
- **Senior Developer** — Laravel/Livewire/FluxUI, advanced CSS, Three.js
- **Database Optimizer** — Schema design, query optimization, indexing

### Security
- **Security Engineer** — Threat modeling, vulnerability assessment, security architecture

### DevOps
- **DevOps Automator** — Infrastructure automation, CI/CD pipelines, cloud operations

### Management
- **Sprint Prioritizer** — Agile planning, feature prioritization, velocity optimization
- **Project Shepherd** — Cross-functional coordination, timeline management, stakeholder alignment
- **Senior Project Manager** — Spec to tasks conversion, realistic scope, exact requirements

### Testing & QA
- **Evidence Collector** — Screenshot-obsessed QA specialist, visual proof required
- **Reality Checker** — Evidence-based certification, production readiness validation
- **API Tester** — Comprehensive API validation, performance testing

### Research & Analysis
- **Explore** — Fast codebase exploration, pattern finding, architecture analysis
- **Plan** — Implementation planning, architectural trade-offs, critical files identification

### SDD Specialized
- **sdd-explore** — Codebase investigation for SDD changes
- **sdd-propose** — Change proposal creation
- **sdd-spec** — Requirements specification writing
- **sdd-design** — Technical design documentation
- **sdd-tasks** — Task breakdown and implementation planning
- **sdd-apply** — Implementation execution following specs
- **sdd-verify** — Validation against specs and design
- **sdd-archive** — Change archival and persistence

## Agentes de Windsurf Portados

Los agentes de Windsurf se están portando progresivamente al formato Claude/Codex.
Cada agente portado incluye:

1. Trigger conditions (cuándo usarlo)
2. Parámetros de invocación
3. Ejemplos de uso
4. Referencia al agente original (si aplica)

## Sincronización

Este sistema se mantiene sincronizado con:
- **Engram** — Memoria persistente compartida
- **SDD** — Spec-Driven Development workflow
- **Graphify** — Knowledge graph generation
- **Skill Registry** — `.atl/skill-registry.md`

## Actualización

Para actualizar el registry después de agregar nuevos agentes:

```bash
# Con gentle-ai (recomendado)
gentle-ai skill-registry refresh --force

# O manualmente
# 1. Agregar el SKILL.md en la carpeta correspondiente
# 2. Actualizar .atl/skill-registry.md
# 3. Guardar en Engram con mem_save
```

## Estado de Migración

- ✅ Estructura base creada
- 🔄 Agentes de Windsurf siendo convertidos
- 🔄 Wrappers para agentes nativos en progreso
- ⏳ Registry completo pendiente

---

**Última actualización**: 2026-05-26
**Proyecto**: ClinicCompera (Healthcare SaaS)
**AI Systems**: Claude Code, Codex, Windsurf
