# Rediseño UX/UI — Fase 2: remediación de brechas

## Contexto

`Plan/nexora-ux-redesign-plan.md` fue implementado parcialmente (branch `rediseno`, cambios sin commitear al momento de esta auditoría, 2026-07-18). Se auditó el resultado contra el plan original y se encontraron brechas de fondo: componentes creados pero sin adoptar, requisitos marcados como obligatorios (tokens tipográficos, grillas responsive, prerequisitos bloqueantes) que no se cumplieron pese a que los archivos que debían resolverlos ya existen.

No repetir el error de esta ronda: un archivo nuevo no es una brecha cerrada. Cada ítem de este plan tiene un criterio de aceptación verificable, no solo "se creó el archivo".

## Estado actual (evidencia de la auditoría)

- 8 componentes en `FrontEnd/Portal/src/components/ui/` creados. `Field.vue` está bien construido; `Select.vue` y `EmptyState.vue` tienen **cero usos** en todo el repo.
- `screens_garage_products.vue`: envuelto en 3 `FormSection` (Identidad, Uso en inventario, Abastecimiento/unidades), pero solo 1 de ~15 campos usa `Field`. Los otros 14 siguen con `<label>`+`<input>` crudo.
- `--nexora-scale` y `--nexora-font-size` (CSS vars nuevas en `App.vue`/`visualConfig.ts`) no tienen consumidores. El tamaño de fuente real lo sigue manejando `root.style.fontSize` en px sin tokens.
- 12 vistas siguen con `<table>` crudo, sin alternativa de tarjetas en mobile.
- `InventoryHomeView.vue`: checklist de "Compra" y "Recepción" hardcodeado en `complete: false`; el CTA "Nueva compra" no está bloqueado por prerequisitos faltantes.
- Ruta `inventory-home` (`router/index.ts`) sin `requiresTransaction` y sin ningún link de navegación real — inalcanzable desde la UI.

Detalle completo de evidencia (file:line) en la memoria de Engram: `project_ux_redesign_codex_gaps` (proyecto Nexora).

## Orden de ejecución

El orden no es arbitrario: los ítems 1 y 6 son los que más se encarecen si se sigue construyendo encima sin resolverlos primero. El resto puede reordenarse según prioridad de negocio, pero no debería ejecutarse en paralelo por un solo agente/dev sin coordinación (tocan los mismos archivos base).

### 1. Sistema de tokens tipográficos real

**Objetivo:** que "tamaño de fuente" sea configurable vía tokens, sin romper zoom/foco/mobile, cumpliendo el requisito explícito del plan original.

**Archivos:** `FrontEnd/Portal/src/style.css`, `FrontEnd/Portal/src/App.vue`, `FrontEnd/Portal/src/stores/visualConfig.ts`, todos los componentes en `components/ui/`.

**Acciones:**
- Definir escala de tokens (`--text-xs` … `--text-3xl` o equivalente) en `style.css`.
- Decidir: o bien `--nexora-scale`/`--nexora-font-size` pasan a multiplicar esa escala de verdad, o se eliminan (son variables muertas hoy).
- Migrar los componentes `ui/*.vue` para consumir esos tokens en vez de clases utilitarias sueltas de Tailwind (`text-xs`, `text-sm`, etc. hardcodeados).
- **No tocar `body` con `transform` ni con overrides que rompan el zoom del navegador.**

**Criterio de aceptación:** cambiar la config de tamaño de fuente en la UI produce un cambio visible y consistente en `ui/*.vue`, verificable a 200% de zoom sin romper layout ni foco. Grep de `var(--nexora-scale)` y `var(--nexora-font-size)` debe devolver consumidores reales.

### 2. Formularios y grillas — cerrar la conversión

**Objetivo:** que `Field`/`Select`/`Checkbox` sean la única forma legal de construir un control de formulario, y que exista una alternativa real a las tablas en mobile.

**Archivos:**
- `screens_garage_products.vue` (terminar los 14 campos restantes).
- Nuevo componente `CardGrid` o `ResponsiveTable` en `components/ui/` (no existe todavía).
- Barrido en los archivos con el mismo anti-patrón de label/input crudo: `treasury/TreasuryPaymentApplicationsScreen.vue`, `garage/screens_garage_work_order_payments.vue`, `garage/screens_garage_service_templates.vue`, `garage/screens_garage_labor_rates.vue`, `garage/screens_garage_catalogs.vue`, `admin/CompanyDetailsView.vue`.
- Barrido de tablas crudas sin alternativa mobile: `admin/UsersView.vue`, `admin/ProfilesView.vue`, `treasury/screens_treasury_settings.vue`, `hr/screens_hr_org_settings.vue`, `dental/screens_dental_appointments.vue` (lista no exhaustiva — grep completo de `<table` en `views/` antes de arrancar).

**Criterio de aceptación:** cero pares `<label>`+`<input>` crudos en los archivos listados; cada tabla tiene su vista de tarjetas en mobile con etiquetas persistentes (no solo columnas ocultas).

### 3. Prerequisitos reales en `InventoryHomeView`

**Objetivo:** que el checklist y los bloqueos reflejen estado real, no valores hardcodeados.

**Archivo:** `FrontEnd/Portal/src/views/inventory/InventoryHomeView.vue`.

**Acciones:**
- Reemplazar `complete: false` hardcodeado en "Compra" y "Recepción" por conteos reales (documentos de compra abiertos, recepciones pendientes).
- Agregar el ítem "Stock" como paso propio del checklist (hoy está fusionado con "Recepción").
- Bloquear/deshabilitar el CTA "Nueva compra" cuando falten productos, proveedores o bodegas — usar `PrerequisiteGate` sobre datos, no solo sobre permiso de menú.

**Criterio de aceptación:** con una empresa nueva sin proveedores/bodegas, el botón "Nueva compra" está deshabilitado y explica qué falta y a dónde ir a resolverlo.

### 4. Navegación real hacia Inventario

**Objetivo:** que la pantalla nueva sea alcanzable por un usuario real, no solo por URL directa.

**Archivos:** `FrontEnd/Portal/src/router/index.ts`, `FrontEnd/Portal/src/layouts/AdminLayout.vue`, tabla de transacciones/menú correspondiente en backend (`routeModuleMap.js` / seed de transacciones si aplica).

**Acciones:**
- Agregar `requiresTransaction` a la ruta `inventory-home`, igual que sus rutas hermanas.
- Dar de alta la transacción correspondiente para que `menuStore` la exponga.
- Hacer que el click en el módulo "Inventario" del sidebar navegue a `inventory-home` en vez de solo desplegar el acordeón.

**Criterio de aceptación:** un usuario con permiso de Inventario puede llegar a la pantalla desde el menú, sin escribir la URL.

### 5. Validar la librería `ui/` en una segunda vista

**Objetivo:** confirmar que los componentes sirven fuera del único caso de uso actual antes de tratarlos como fundación para otros cores.

**Archivo sugerido:** `admin/UsersView.vue` (ya tiene tabla + formulario, buen candidato).

**Acciones:** convertir esa vista completa usando `Field`, `Select`, `EmptyState` y el nuevo `CardGrid`/`ResponsiveTable` del punto 2.

**Criterio de aceptación:** `Select.vue` y `EmptyState.vue` dejan de tener cero usos; la vista pasa la validación obligatoria del plan original (desktop/tablet/mobile, zoom 200%, teclado, lector de pantalla, contraste AA, reduced motion, targets táctiles 44px).

### 6. Decisión de dominio: propiedad del catálogo de Productos

**Objetivo:** resolver, antes de seguir construyendo pantallas de Inventario, si Productos se convierte en capacidad transversal (ruta y permiso propios) o sigue prestado de Garage.

**Nota:** esto es una decisión de producto/arquitectura, no una tarea mecánica. Requiere alineación con el usuario antes de tocar código — ya estaba señalado como pendiente en el plan original (`nexora-ux-redesign-plan.md`, sección "Decisiones de dominio pendientes").

**Criterio de aceptación:** decisión documentada (transversal vs. prestado) antes de agregar la siguiente pantalla de Inventario que dependa del catálogo.

## Validación obligatoria (aplica a cada ítem entregado, no solo al final)

Desktop, tablet, mobile; zoom 200%; teclado y foco visible; lector de pantalla; contraste WCAG AA; `prefers-reduced-motion`; objetivos táctiles de 44px.

## Cómo arrancar la próxima sesión

1. Leer este archivo + memoria Engram `project_ux_redesign_codex_gaps` para contexto completo.
2. Confirmar con el usuario si el ítem 6 (decisión de dominio) se resuelve primero o se pospone explícitamente.
3. Ejecutar los ítems 1 a 5 en orden, uno por vez, verificando el criterio de aceptación antes de pasar al siguiente — no dar por cerrado un ítem solo porque el archivo fue tocado.
