# Resumen y estados de cita en vista Día

Fecha: 2026-09-11.

## Implementación

Al seleccionar una cita comprometida en la agenda diaria de Taller se abre un resumen antes del formulario de edición. El modal muestra número y estado de la cita, nombre completo, correo, teléfonos disponibles, horario, motivo y vehículo asociado.

El teléfono fijo y el móvil se muestran de forma independiente sólo cuando tienen valor. Ambos habilitan llamada mediante `tel:` y el móvil agrega WhatsApp mediante `wa.me`. El correo utiliza un enlace `mailto:`.

Los usuarios con permiso de edición pueden confirmar la cita, registrar la llegada, marcar que el cliente no se presentó, cancelar o abrir la edición. Las acciones disponibles dependen del estado actual y solicitan confirmación antes de ejecutarse. Los usuarios con permisos sobre órdenes de trabajo también pueden iniciar la conversión desde el resumen.

Se agregó el endpoint de Taller `POST /appointments/:id/no-show`. Solo acepta citas programadas, confirmadas o reagendadas y registra la transición en `appointment_status_history`. Una ausencia deja de consumir cupo diario.

## Verificación

- Información personal, motivo y horario cargados desde el detalle real.
- Enlaces de llamada y WhatsApp generados con el teléfono almacenado.
- Confirmación ejecutada desde el modal y reflejada en pantalla.
- Ausencia registrada como `no_show` y comprobada en el historial.
- Un segundo intento de registrar la misma ausencia fue rechazado con `409`.
- Modal revisado en escritorio y móvil de 390 px.
- Datos sintéticos eliminados al finalizar.
