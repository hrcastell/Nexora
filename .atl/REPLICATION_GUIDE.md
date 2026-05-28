# Guía de Replicación — Sistema de Agentes Unificado

Esta guía explica cómo replicar el sistema de agentes unificado en otros proyectos.

## 📋 Opciones de Replicación

### Opción 1: Copia Completa (Proyectos Similares)

Para proyectos del mismo dominio (healthcare, SaaS empresarial, etc.):

#### Paso 1: Copiar estructura
```bash
# Desde la raíz del NUEVO proyecto
cp -r /path/to/ClinicCompera/.atl .atl

# O en Windows
xcopy "C:\Users\Hernan Ricardo\Documents\GitHub\ClinicCompera\.atl" ".atl" /E /I
```

#### Paso 2: Actualizar referencias de proyecto
Editar estos archivos y reemplazar `ClinicCompera` / `cliniccompera` con el nuevo nombre:

```bash
# Archivos a actualizar:
.atl/README.md
.atl/AGENT_SYNC.md
.atl/skill-registry.md
.atl/agents/README.md
```

Buscar y reemplazar:
- `ClinicCompera` → `NuevoProyecto`
- `cliniccompare` → `nuevoproyecto`
- Paths absolutos → actualizar al nuevo proyecto

#### Paso 3: Filtrar agentes irrelevantes
Si el nuevo proyecto NO es healthcare:
```bash
# Opcional: Eliminar agentes específicos de healthcare
rm .atl/agents/specialized/healthcare-customer-service.md

# Actualizar skill-registry.md quitando la entrada correspondiente
```

#### Paso 4: Inicializar Engram para el nuevo proyecto
```javascript
// En Claude Code del nuevo proyecto
mem_save({
  title: "Sistema de agentes unificado inicializado",
  type: "architecture",
  scope: "project",
  content: `**What**: Inicializado sistema de agentes unificado portado desde ClinicCompera.

**Why**: Estandarizar uso de agentes especializados en todos los proyectos.

**Where**: .atl/agents/ con [X] agentes en [categorías]

**Learned**: Sistema probado en ClinicCompera, adaptado para [dominio del nuevo proyecto]`
})

// Verificar detección de proyecto
mem_current_project()
```

#### Paso 5: Validar
```bash
# Verificar que el registry apunta a paths correctos
cat .atl/skill-registry.md | grep "Documents/GitHub"

# Si encuentras paths de ClinicCompera, actualízalos
```

---

### Opción 2: Agentes Globales + Project-Specific (Más Limpio)

Para mantener agentes reutilizables globales y solo project-specific por proyecto:

#### Estructura Recomendada

```
# User-level (global) — ~/.claude/skills/, ~/.codex/skills/
├── engineering/
│   ├── backend-architect.md
│   ├── frontend-developer.md
│   ├── database-optimizer.md
│   └── ...
├── design/
├── testing/
└── marketing/

# Project-level — cada-proyecto/.atl/agents/
├── specialized/
│   └── domain-specific-agent.md     # Solo agentes específicos del dominio
└── overrides/
    └── custom-backend-architect.md  # Variantes personalizadas si necesitas
```

#### Paso 1: Mover agentes generales a user-level
```bash
# Crear estructura global si no existe
mkdir -p ~/.claude/agents/{engineering,design,testing,marketing,management}
mkdir -p ~/.codex/agents/{engineering,design,testing,marketing,management}

# Copiar agentes GENERALES (no healthcare-specific)
cp .atl/agents/engineering/*.md ~/.claude/agents/engineering/
cp .atl/agents/design/*.md ~/.claude/agents/design/
cp .atl/agents/testing/*.md ~/.claude/agents/testing/
cp .atl/agents/marketing/*.md ~/.claude/agents/marketing/
cp .atl/agents/management/*.md ~/.claude/agents/management/

# Mismo para Codex
cp -r ~/.claude/agents/* ~/.codex/agents/
```

#### Paso 2: Mantener solo agentes project-specific en .atl/
```bash
# En el proyecto original (ClinicCompera)
# Mover agentes generales a global, dejar solo healthcare
mkdir -p .atl/agents/specialized
mv .atl/agents/specialized/healthcare-*.md .atl/agents/specialized/
rm -rf .atl/agents/{engineering,design,testing,marketing,management}
```

#### Paso 3: En cada nuevo proyecto, crear solo lo necesario
```bash
# Proyecto nuevo
mkdir -p .atl/agents/specialized

# Solo agregar agentes específicos del dominio
# Ejemplo: E-commerce
touch .atl/agents/specialized/e-commerce-product-manager.md
touch .atl/agents/specialized/inventory-specialist.md

# Ejemplo: Fintech
touch .atl/agents/specialized/compliance-officer.md
touch .atl/agents/specialized/fraud-detection-specialist.md
```

#### Paso 4: Registry híbrido
Actualizar `.atl/skill-registry.md` en cada proyecto para referenciar:
- Agentes globales (desde `~/.claude/agents/`)
- Agentes project-specific (desde `.atl/agents/`)

```markdown
## Sources scanned

- C:\Users\Hernan Ricardo\.claude\agents (global)
- C:\Users\Hernan Ricardo\.codex\agents (global)
- C:\Users\Hernan Ricardo\Documents\GitHub\NuevoProyecto\.atl\agents (project)

## Skills

| Skill | Trigger | Scope | Path |
| --- | --- | --- | --- |
| `agent-backend-architect` | ... | user | `C:\Users\...\\.claude\agents\engineering\...` |
| `agent-domain-specialist` | ... | project | `...\NuevoProyecto\.atl\agents\specialized\...` |
```

---

## 🎯 Recomendación por Tipo de Proyecto

### Healthcare / Regulated Industries
**Opción 1 (Copia Completa)** — Mantener agentes especializados con cada proyecto

Ventajas:
- Compliance y contexto específico del dominio
- Cada proyecto puede evolucionar independientemente
- Agentes adaptados a regulaciones específicas (HIPAA, GDPR, etc.)

### Software General / SaaS / Startups
**Opción 2 (Global + Specific)** — Agentes generales globales, solo specific por proyecto

Ventajas:
- No duplicar agentes comunes
- Actualizaciones centralizadas
- Menos mantenimiento

---

## 📦 Template "Starter Kit"

Puedes crear un template base para nuevos proyectos:

```bash
# Crear template
mkdir -p ~/agent-system-template/.atl/agents/{specialized,overrides}
cp ClinicCompera/.atl/{README.md,AGENT_SYNC.md,REPLICATION_GUIDE.md} ~/agent-system-template/.atl/
cp ClinicCompera/.atl/skill-registry.md ~/agent-system-template/.atl/skill-registry.template.md

# Usar template en proyecto nuevo
cp -r ~/agent-system-template/.atl /path/to/nuevo-proyecto/
cd /path/to/nuevo-proyecto
# Buscar y reemplazar nombres de proyecto
```

---

## 🔧 Script de Inicialización Automática

Para automatizar, crea un script:

```bash
#!/bin/bash
# init-agent-system.sh

PROJECT_NAME=$1
PROJECT_PATH=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$PROJECT_PATH" ]; then
  echo "Usage: ./init-agent-system.sh <project-name> <project-path>"
  exit 1
fi

echo "Initializing agent system for $PROJECT_NAME..."

# Copiar estructura
mkdir -p "$PROJECT_PATH/.atl/agents/specialized"
cp -r ~/agent-system-template/.atl/* "$PROJECT_PATH/.atl/"

# Reemplazar nombres
cd "$PROJECT_PATH/.atl"
find . -type f -name "*.md" -exec sed -i "s/ClinicCompera/$PROJECT_NAME/g" {} \;
find . -type f -name "*.md" -exec sed -i "s/cliniccompare/${PROJECT_NAME,,}/g" {} \;

# Copiar registry template
mv skill-registry.template.md skill-registry.md
sed -i "s/PROJECT_PATH_PLACEHOLDER/$PROJECT_PATH/g" skill-registry.md

echo "✅ Agent system initialized for $PROJECT_NAME"
echo "Next steps:"
echo "1. cd $PROJECT_PATH"
echo "2. Add project-specific agents to .atl/agents/specialized/"
echo "3. Update .atl/skill-registry.md with new agents"
echo "4. Initialize Engram: mem_save(...)"
```

Uso:
```bash
chmod +x init-agent-system.sh
./init-agent-system.sh MiNuevoProyecto ~/projects/mi-nuevo-proyecto
```

---

## ✅ Checklist de Replicación

Después de replicar, verificar:

- [ ] `.atl/agents/` existe con agentes necesarios
- [ ] `.atl/skill-registry.md` apunta a paths correctos del nuevo proyecto
- [ ] `.atl/AGENT_SYNC.md` tiene referencias actualizadas
- [ ] Nombres de proyecto actualizados en todos los archivos
- [ ] Engram inicializado para el nuevo proyecto (`mem_current_project()`)
- [ ] Agentes irrelevantes eliminados (ej: healthcare en proyecto fintech)
- [ ] Registry actualizado con solo agentes presentes
- [ ] Windsurf `.windsurfrules` copiado si usas Windsurf en ese proyecto

---

## 🔄 Sincronización entre Proyectos

Si usas **Opción 2 (Global + Specific)**, actualizar agentes globales:

```bash
# Actualizar agente global
vim ~/.claude/agents/engineering/backend-architect.md

# Los cambios se reflejan automáticamente en TODOS los proyectos
# que referencien ese agente en su skill-registry
```

Si usas **Opción 1 (Copia Completa)**, actualizar por proyecto:

```bash
# Actualizar en cada proyecto individualmente
vim ~/project-A/.atl/agents/engineering/backend-architect.md
vim ~/project-B/.atl/agents/engineering/backend-architect.md
```

---

## 💾 Backup de Configuración

Recomendado: versionar `.atl/` en git:

```bash
# .gitignore — NO ignorar .atl/
# .atl/

# Commitear la configuración
git add .atl/
git commit -m "feat: add unified agent system"

# Ahora otros devs del team también tienen los agentes
```

---

## 📚 Recursos

- **Template**: `~/agent-system-template/` (crear después de esta guía)
- **Agentes Globales**: `~/.claude/agents/`, `~/.codex/agents/`
- **Documentación**: `.atl/AGENT_SYNC.md` en cada proyecto
- **Registry**: `.atl/skill-registry.md` mantiene el índice

---

**Última Actualización**: 2026-05-26
**Proyecto Base**: ClinicCompera
**Version**: 1.0
