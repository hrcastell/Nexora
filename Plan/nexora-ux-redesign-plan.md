# Rediseño UX/UI integral — reevaluado

## Alcance y orden de implementación

Este rediseño parte de una revisión de accesibilidad, navegación y dependencias reales entre cores. La primera entrega aplica la fundación reutilizable y el vertical slice de Inventario. No modifica los maestros ni el esquema de datos sin una decisión de dominio explícita.

### Decisiones de dominio pendientes

- **Productos:** Inventario consume hoy el catálogo de Productos/Repuestos de Garage. El catálogo debe evolucionar a una capacidad transversal, con ruta y permiso propios, antes de que Inventario pueda funcionar de manera autónoma.
- **Empleados:** RRHH y Garage mantienen maestros distintos. No se unifican hasta definir propiedad del maestro, extensión técnica y una migración compatible.

## Fase 0 — descubrimiento

- Auditar tareas por super administrador SaaS, administrador de empresa y operador.
- Mantener una matriz de autonomía por core: requisito, ruta, permiso e integración.
- Validar los cambios con una empresa nueva y un perfil restringido.

## Fundación UX/UI

- Componentes comunes: `PageHeader`, `SetupChecklist`, `PrerequisiteGate`, `EmptyState`, `Field`, `Select`, `Checkbox` y `FormSection`.
- Todo control debe tener etiqueta semánticamente asociada, ayuda, estado requerido/error y foco visible. Los iconos accionables requieren nombre accesible.
- La configuración de tamaño aplica tokens tipográficos; no escala el `body`, porque rompe el zoom, el foco y la respuesta móvil.
- La navegación debe exponer el propósito de cada transacción y usar acordeones accesibles.

## Primer vertical slice: Inventario

1. Inicio de Inventario con propósito, progreso y secuencia: Productos → Proveedores → Bodegas → Compra → Recepción → Stock.
2. Requisitos bloqueantes explican qué falta, por qué importa y llevan al alta correspondiente.
3. Productos/Repuestos conserva el contrato actual, pero su formulario se organiza en Identidad, Uso en inventario y Abastecimiento/unidades; las opciones avanzadas aparecen sólo cuando aplican.
4. Las grillas deben tener alternativas en tarjetas con etiquetas persistentes en móvil.

## Validación obligatoria

- Desktop, tablet y móvil; 200% zoom; teclado y foco visible; lector de pantalla; contraste WCAG AA; reduced motion y objetivos táctiles de 44px.
- Medir, cuando exista plataforma de analítica, abandonos de formulario, errores de validación y bloqueos por requisitos.

## Backlog posterior

- Convertir Productos en catálogo transversal y retirar la dependencia de ruta/permisos Garage.
- Resolver la propiedad y migración del maestro Empleados.
- Replicar el patrón de página inicial y prerequisitos a cada core.
