# Corrección de permisos de agenda

Implementada y verificada localmente el 2026-09-11 para Taller y Dental.

## Reglas aplicadas

| Operación | Permisos necesarios |
| --- | --- |
| Listar, consultar detalle, día, mes y horario visible | Ver en la transacción de agenda |
| Crear cita | Ver + Crear en agenda |
| Editar, confirmar, cancelar, marcar llegada/no asistencia o reagendar | Ver + Editar en agenda |
| Guardar configuración | Ver + Admin en agenda |
| Convertir en OT o consulta | Ver + Editar en agenda, y Ver + Crear en la transacción de destino |

Transacciones: `garage_appointments`, `dental_appointments`; destinos: `garage_work_orders`, `dental_consultations`.

Los usuarios normales necesitan además el módulo habilitado para su empresa. Esta comprobación se aplica en las rutas de agenda incluso si `MODULE_GUARD` está en modo log-only. Configuración quedó incorporada al mapa global de módulos. Se reutiliza la agregación de permisos entre perfiles del middleware existente `requirePermission` y el estado de módulos compartido, con su caché e invalidación existentes.

El superadministrador conserva el acceso de gobierno. El modo solo lectura bloquea las escrituras también para él. Los errores al consultar autorización cierran el acceso. Las comprobaciones se ejecutan después de validar la identidad mediante `authMiddleware`.

## Portal

- Crear y Configuración aparecen únicamente con sus permisos respectivos.
- Los espacios vacíos del calendario no permiten crear sin autorización.
- Una cita puede abrirse para consulta con campos deshabilitados y sin botón Guardar.
- Los cambios de estado y conversiones respetan los permisos del servidor.
- El modo solo lectura oculta las acciones de escritura.

No requiere migración SQL, nuevas dependencias de producción ni cambios en Bluehost. Los permisos se asignan desde la pantalla existente de perfiles. Tener rol `admin` o pertenecer a la empresa no reemplaza la asignación de permisos.

## Verificación

Comando reproducible de pruebas de rutas y middleware:

```bash
docker compose exec -T backend node --test tests/agendaPermissions.test.js
```

Pasaron 12 grupos de casos, 6 por módulo (13 entradas TAP contando el contenedor principal): usuario anónimo/sin perfil, solo Ver, independencia Crear/Editar/Admin, permisos de destino, módulo deshabilitado, superadministrador, solo lectura, contexto de otra empresa y error de autorización. Usan routers reales con identidad, resultados de BD y controladores finales sustituidos; no escriben datos persistentes.

Además se realizaron **30 comprobaciones locales con PostgreSQL y navegador reales**, todas correctas: 22 respuestas HTTP y 8 combinaciones de interfaz (lector/editor/administrador/suspendido × Taller/Dental). Con ambos módulos habilitados, un usuario sin perfil recibe `403`; el lector puede consultar, el editor confirmar y el usuario sin permisos de destino no puede convertir. En la interfaz se comprobaron visibilidad de acciones, campos deshabilitados y ausencia de Guardar. Los controles del lector se verificaron a 1440, 768 y 390 px.

`docker compose exec -T frontend npm run build` pasó incluyendo la comprobación TypeScript. Los datos temporales de usuario, perfil, cliente y citas fueron retirados y la habilitación de módulos fue restituida. Evidencia local adicional: `.codex/agenda-audit/permission-fix-results.json` y capturas `permissions-*-viewer.png`.

## Alcance pendiente

Esta corrección cubre las rutas y controles de agenda. No certifica permisos de otros módulos o de las rutas independientes de OT/consultas, ni aislamiento integral entre empresas reales. Los restantes hallazgos de la [auditoría inicial](agenda-2026-09-11.md), incluidos pérdida de datos, horarios, estados y cupos, siguen pendientes de corrección.
