# Estandarización de agenda dental

## Alcance aplicado

La vista diaria de Dental utiliza ahora el mismo patrón operativo que Taller: seleccionar una hora comprometida abre un resumen de la cita y la vista mensual conserva la edición directa. Antes de mostrar o editar, el portal consulta el detalle vigente para evitar trabajar con datos parciales de la grilla.

El resumen dental presenta paciente, correo, teléfono fijo, móvil, horario, tratamiento, motivo y notas. Los teléfonos se muestran sólo cuando tienen valor; ambos permiten llamadas y el móvil habilita WhatsApp. El formulario rápido de paciente también permite registrar ambos números.

## Acciones y seguridad

Las acciones disponibles dependen del estado y los permisos: confirmar, registrar llegada, marcar inasistencia, cancelar, editar e iniciar consulta. Cada cambio solicita confirmación y muestra el resultado mediante toast. Confirmar e indicar inasistencia validan la transición también en el backend; una repetición o un estado incompatible devuelve `409`.

## Límite de esta etapa

Los formularios de Taller y Dental permanecen separados porque sus campos de negocio difieren. El patrón visual y de interacción ya está alineado, lo que permite evaluar después una ventana compartida con una sección común y campos configurables por módulo.
