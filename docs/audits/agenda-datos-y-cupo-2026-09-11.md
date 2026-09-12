# Corrección de datos y cupo diario de agenda

Fecha: 2026-09-11.

## Alcance

Se corrigió la pérdida de información al editar una cita de Taller desde la pestaña **Todas**. Esa vista recibía un resumen parcial y lo enviaba como si fuera el registro completo, reemplazando notas, diagnóstico y duración por valores vacíos. Ahora el portal carga el detalle antes de abrir el formulario y el backend conserva cualquier campo omitido en un `PUT`.

También se incorporó un control explícito de **cantidad de citas permitidas por día** en la configuración de las agendas de Taller y Dental. Permite elegir entre “Sin límite” y un entero positivo. El servidor rechaza cero, negativos, decimales y texto; la base de datos agrega la misma restricción mediante la migración idempotente `69_appointment_daily_limit_constraint.sql`.

El cupo cuenta citas activas y excluye cancelaciones y ausencias. En Taller se aplica al crear, editar y reagendar. Cuando el día está lleno, la API responde `409` y no modifica la cita.

## Verificación

- Guardar sin cambios desde **Todas** preservó resumen, notas y duración.
- Un `PUT` parcial conservó los campos omitidos.
- El portal guardó correctamente un máximo diario de 2.
- La tercera cita del día fue rechazada con `409`.
- Mover una cita hacia un día completo fue rechazado con `409` y mantuvo su fecha original.
- Taller y Dental aceptaron `null` como ilimitado y rechazaron límites inválidos.
- 15 pruebas automatizadas de límites y permisos: aprobadas.
- Build de producción Vue/TypeScript: aprobado.
- Revisión visual del control en escritorio y móvil de 390 px: aprobada.

Los datos sintéticos y la configuración usados durante la prueba fueron eliminados al finalizar.
