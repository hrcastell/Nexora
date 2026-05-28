# Agent Synchronization Protocol — ClinicCompera

Este documento describe cómo los agentes especializados están sincronizados entre Claude Code, Codex y Windsurf.

## Arquitectura de Sincronización

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Agent System                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Claude Code  │  │    Codex     │  │  Windsurf    │      │
│  │              │  │              │  │              │      │
│  │ Agent tool → │  │ Agent tool → │  │ .windsurfrules│      │
│  │ .atl/agents/ │  │ .atl/agents/ │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                       │
│                    │  Engram Memory  │                       │
│                    │  (Persistent)   │                       │
│                    └────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Compartidos

### 1. Engram (Memoria Persistente)
- **Qué se sincroniza**: Decisiones, convenciones, bugs resueltos, descubrimientos
- **Comando**: `mem_save`, `mem_search`, `mem_context`
- **Ubicación**: Backend de Engram (no archivos locales)
- **Status**: ✅ Sincronizado actualmente

### 2. SDD (Spec-Driven Development)
- **Qué se sincroniza**: Propuestas, specs, diseños, tareas, progreso de implementación
- **Artifact Store**: Engram (default) o OpenSpec (archivos)
- **Fases**: explore, propose, spec, design, tasks, apply, verify, archive
- **Status**: ✅ Sincronizado actualmente

### 3. Graphify (Knowledge Graphs)
- **Qué se sincroniza**: Grafos de conocimiento del codebase, comunidades, god nodes
- **Ubicación**: `graphify-out/` (local), resultados en Engram
- **Trigger**: `/graphify`
- **Status**: ✅ Sincronizado actualmente

### 4. Agentes Especializados (NUEVO)
- **Qué se sincroniza**: Definiciones de agentes, triggers, capacidades, ejemplos
- **Ubicación**: `.atl/agents/` (skills portados) + `.windsurfrules` (Windsurf) + native Agent tool (Claude/Codex)
- **Registry**: `.atl/skill-registry.md`
- **Status**: 🔄 En proceso de unificación

## Tipos de Agentes

### Nativos de Claude Code / Codex
Se invocan directamente via `Agent` tool con `subagent_type`. NO requieren skill files, pero tenemos wrappers documentales en `.atl/agents/` para referencia.

**Lista de agentes nativos**:
- AI Engineer
- Backend Architect
- Code Reviewer
- Database Optimizer
- DevOps Automator
- Frontend Developer
- Security Engineer
- Senior Developer
- Sprint Prioritizer
- Project Shepherd
- Senior Project Manager
- Evidence Collector
- Reality Checker
- API Tester
- Explore (fast codebase exploration)
- Plan (implementation planning)
- SDD agents (sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify, sdd-archive)

### Portados de Windsurf
Agentes del repositorio `agency-agents` convertidos al formato Claude/Codex con skills en `.atl/agents/`.

**Lista de agentes portados** (en progreso):
- Healthcare Customer Service ✅
- Healthcare Marketing Compliance Specialist (pendiente)
- Compliance Auditor (pendiente)
- Software Architect (pendiente)
- Data Engineer (pendiente)

### Exclusivos de Windsurf
Agentes que permanecen en `.windsurfrules` y solo están disponibles en Windsurf (no portados aún).

## Protocolo de Invocación

### Claude Code / Codex

#### Agentes Nativos
```javascript
// Invocación directa via Agent tool
Agent({
  subagent_type: "Backend Architect",  // Nombre exacto del agente nativo
  model: "sonnet",                      // sonnet, opus, haiku
  description: "Design database schema", // Descripción corta (3-5 palabras)
  prompt: `[Instrucciones detalladas para el agente]`
})
```

#### Agentes Portados (vía general-purpose)
```javascript
// Para agentes portados que no tienen subagent_type nativo
Agent({
  subagent_type: "general-purpose",     // Agente general
  model: "sonnet",
  description: "Patient support workflow",
  prompt: `Using the Healthcare Customer Service agent guidelines from
  .atl/agents/specialized/healthcare-customer-service.md, design a complete
  patient support workflow for...`
})
```

### Windsurf

En Windsurf, los agentes se cargan automáticamente desde `.windsurfrules` y se invocan por nombre en el chat. No requiere código de invocación explícito.

## Resolución de Skills (Skill Resolver Protocol)

Cuando el orchestrator (Claude Code) lanza un sub-agente, DEBE seguir este protocolo:

### Pre-flight (una vez por sesión)
1. `mem_search(query: "skill-registry", project: "cliniccompera")` → Buscar registry en Engram
2. Si no está en Engram: `Read(".atl/skill-registry.md")` → Leer registry local
3. Cachear el índice de skills: nombre, trigger, scope, path
4. Leer la tabla de Model Assignments (una vez) y cachear `phase → model alias`

### Por cada sub-agente launch
1. Identificar la fase (sdd-apply, sdd-verify, etc.) o usar `default` para delegación general
2. Buscar en el índice los skills que matchean por:
   - **Contexto de código**: Extensiones/paths que el sub-agente va a tocar
   - **Contexto de tarea**: Acciones que va a realizar (review, PR, testing, etc.)
3. Copiar los paths exactos de los `SKILL.md` relevantes al prompt del sub-agente bajo `## Skills to load before work`
4. Resolver el alias de modelo desde la tabla y pasarlo via `model: "<alias>"`
5. Instruir al sub-agente a leer esos `SKILL.md` ANTES del trabajo específico de la tarea

### Feedback Loop
Después de cada delegación, revisar el campo `skill_resolution` en el resultado:
- `paths-injected` → Todo bien
- `fallback-registry` / `fallback-path` / `none` → El cache se perdió (compaction), re-leer registry

## Actualización del Registry

Cuando agregas nuevos agentes:

### Opción 1: Manual
1. Agregar el `SKILL.md` en `.atl/agents/<categoria>/`
2. Editar `.atl/skill-registry.md` y agregar entrada en la tabla
3. `mem_save(title: "Nuevo agente agregado", type: "architecture", ...)` para persistir en Engram

### Opción 2: Automática (con gentle-ai)
```bash
gentle-ai skill-registry refresh --force
```

Esto escanea todos los directorios de skills y regenera el registry automáticamente.

## Model Assignments (CRÍTICO)

**Regla obligatoria**: TODO Agent tool call DEBE incluir el parámetro `model`.

| Fase / Contexto | Modelo Default | Razón |
|-----------------|----------------|--------|
| sdd-explore | sonnet | Lectura de código, estructural |
| sdd-propose | opus | Decisiones arquitectónicas |
| sdd-spec | sonnet | Escritura estructurada |
| sdd-design | opus | Decisiones de arquitectura |
| sdd-tasks | sonnet | Desglose mecánico |
| sdd-apply | sonnet | Implementación |
| sdd-verify | sonnet | Validación contra spec |
| sdd-archive | haiku | Copia y cierre |
| default | sonnet | Delegación general no-SDD |
| healthcare-specific | sonnet | Empatía, interacciones con pacientes |

## Estado de Migración

### ✅ Completado
- Estructura `.atl/agents/` creada
- README de agentes unificados
- Agentes nativos documentados: Backend Architect, Security Engineer, API Tester
- Agente portado: Healthcare Customer Service
- Skill registry base creado

### 🔄 En Progreso
- Portar más agentes de healthcare de Windsurf
- Actualizar skill registry con todos los agentes nuevos
- Crear wrappers para todos los agentes nativos relevantes
- Documentar patrones de invocación por categoría

### ⏳ Pendiente
- Portar 169 agentes restantes de Windsurf (priorizando por relevancia)
- Integración con Codex (verificar que todo funciona igual)
- Testing end-to-end de invocación unificada
- Documentación de uso para el equipo

## Validación de Sincronización

Para verificar que todo está sincronizado:

### Engram
```javascript
mem_search({ query: "agentes especializados", project: "cliniccompera" })
// Debe retornar este documento y las decisiones de arquitectura
```

### SDD
```javascript
mem_search({ query: "sdd-init/cliniccompera", project: "cliniccompera" })
// Debe retornar contexto de proyecto, testing capabilities, strict TDD mode
```

### Skill Registry
```bash
cat .atl/skill-registry.md | grep "backend-architect\|security-engineer\|healthcare"
# Debe mostrar las entradas de los nuevos agentes
```

### Windsurf
Abrir Windsurf y verificar que `.windsurfrules` carga correctamente con 173 agentes.

## Troubleshooting

### "Agent not found" en Claude Code
- Verificar que el `subagent_type` sea exacto (case-sensitive)
- Para agentes portados, usar `general-purpose` y referenciar el skill file
- Verificar que el skill existe en `.atl/agents/`

### "Skill resolution: none" en sub-agente
- El registry no se cargó o el cache se perdió
- Re-ejecutar búsqueda de registry en Engram o leer `.atl/skill-registry.md`
- Verificar que los paths en el registry son absolutos y correctos

### Windsurf no carga agentes
- Verificar que `.windsurfrules` está en la raíz del proyecto
- Verificar sintaxis YAML del frontmatter (name, description, emoji, vibe)
- Reiniciar Windsurf después de cambios en `.windsurfrules`

### Desincronización entre AIs
- Todos los cambios arquitectónicos DEBEN guardarse en Engram con `mem_save`
- Skills nuevos DEBEN agregarse al registry
- Artifacts de SDD DEBEN usar artifact_store consistente (engram por default)

---

**Última Actualización**: 2026-05-26
**Proyecto**: ClinicCompera
**AI Systems**: Claude Code, Codex, Windsurf
**Status**: 🔄 En progreso de unificación
