# Corrección de la vista Día de agenda

Fecha: 2026-09-11.

## Cambios

- Las fechas de citas se interpretan como horas locales del tenant, de acuerdo con las columnas PostgreSQL `TIMESTAMP WITHOUT TIME ZONE`. La hora ya no se desplaza por la zona horaria del navegador.
- Cada cita de la vista Día presenta una acción visible **Editar** o **Ver**, según los permisos del usuario.
- Las franjas muestran marcas para `:00` y `:30`, líneas divisorias más claras y tarjetas con mayor contraste.
- El formulario identifica explícitamente si se está creando o editando una cita.
- La acción principal cambia entre **Crear cita** y **Guardar cambios**, e informa **Creando...** o **Actualizando...** durante la solicitud.
- Taller ahora muestra toast de éxito o error al guardar y al cargar una cita.

## Verificación

La prueba se ejecutó con Edge mediante Playwright, en la zona `America/Santiago`, contra los servicios Docker:

- Una cita almacenada a las `10:00` se mostró a las `10:00`.
- El formulario de edición conservó `10:00`.
- Pulsar la franja `14:30` abrió una cita nueva con `14:30`.
- Se verificaron la acción Editar, los estados Crear/Editar y el toast de actualización.
- La vista no produjo desplazamiento horizontal a 390 px.
- El build Vue/TypeScript y las regresiones de pérdida de datos y cupo diario finalizaron correctamente.

Los registros sintéticos fueron eliminados al terminar.
