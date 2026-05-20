# Nexora Garage — Plan Completo Core 1

## Core 1: Operaciones de Taller e Historial Vehicular

**Nombre interno del módulo:** `garage_operations`  
**Nombre visible:** Operaciones de Taller  
**Tipo:** Módulo core funcional SaaS multi-tenant  
**Sistema:** Nexora Garage  
**Arquitectura:** PostgreSQL multi-schema, un schema por tenant

---

## 1. Propósito del Core

El propósito principal de este core es permitir que cada empresa/taller pueda llevar un registro claro, ordenado e histórico de todos los trabajos realizados a cada vehículo.

Una problemática común en talleres es que cuando un cliente vuelve y pregunta:

> ¿Qué se le hizo al vehículo la última vez?

Muchas veces el taller no tiene la información clara, está en papel, depende de la memoria del mecánico o se encuentra dispersa.

Este módulo busca resolver eso mediante un flujo completo:

```txt
Cita / Pre-ingreso
    ↓
Recepción del vehículo
    ↓
Orden de trabajo
    ↓
Servicios realizados
    ↓
Productos usados
    ↓
Mano de obra registrada
    ↓
Cierre de orden
    ↓
Historial técnico del vehículo
```

El resultado final del core no es solo crear órdenes de trabajo, sino construir un historial técnico confiable por vehículo.

---

## 2. Alcance funcional del Core 1

El Core 1 incluye:

```txt
1. Clientes
2. Vehículos
3. Catálogos inteligentes de vehículos
4. Empleados
5. Tempario / tarifas de mano de obra
6. Productos configurables
7. Servicios configurables
8. Agenda / citas / pre-ingreso
9. Conversión de cita a orden de trabajo
10. Órdenes de trabajo
11. Cálculo de servicios, productos y mano de obra
12. Historial técnico del vehículo
```

---

## 3. Principios de diseño

### 3.1 Multi-tenant

Los datos operativos deben vivir dentro del schema de cada tenant.

Ejemplo:

```txt
empresa_a.customers
empresa_a.vehicles
empresa_a.work_orders
empresa_a.appointments
```

El schema `public` se mantiene para gobernanza global:

```txt
public.module_catalog
public.module_transactions
public.company_modules
```

El schema `hernancius` es el tenant maestro y debe mantenerse protegido.

---

### 3.2 Gobernanza por módulo y transacción

El módulo debe registrarse en el catálogo global:

```txt
module_key: garage_operations
module_name: Operaciones de Taller
description: Gestión operativa de taller, agenda, órdenes de trabajo e historial vehicular.
status: active
is_core: true
```

Cada acción relevante debe estar protegida por transacciones/permisos.

---

### 3.3 Historial antes que facturación

Este core no busca iniciar con facturación electrónica ni inventario avanzado.  
El objetivo inicial es trazabilidad operativa e historial técnico.

---

### 3.4 Citas como pre-orden

La cita no debe ser solo un evento de calendario.  
Debe ser una pre-orden de trabajo futura, con datos suficientes para convertirla en una orden real cuando el vehículo llegue.

---

## 4. Clientes

### 4.1 Objetivo

Gestionar los clientes del taller, ya sean personas o empresas.

### 4.2 Funciones

```txt
Crear cliente
Editar cliente
Ver cliente
Activar / desactivar cliente
Buscar cliente
Ver historial asociado
```

### 4.3 Campos sugeridos

```txt
id
name
document_type
document_number
phone
email
address
city
notes
source
status
created_at
updated_at
```

### 4.4 Consideraciones

Un cliente puede ser creado desde:

```txt
Formulario de clientes
Formulario de cita
Formulario de orden de trabajo
```

Si se crea desde una cita, se puede marcar:

```txt
source = appointment
```

---

## 5. Vehículos

### 5.1 Objetivo

Registrar los vehículos asociados a clientes y mantener su historial técnico.

### 5.2 Funciones

```txt
Crear vehículo
Editar vehículo
Ver vehículo
Asignar vehículo a cliente
Ver historial técnico
Activar / desactivar vehículo
```

### 5.3 Campos sugeridos

```txt
id
customer_id
vehicle_type_id
body_type_id
brand_id
model_id
version
plate
year
color_id
transmission_id
fuel_type_id
engine_displacement
vin
engine_number
mileage
notes
status
created_at
updated_at
```

### 5.4 Campos visibles

```txt
Tipo de vehículo: moto, auto, bicicleta, avión, camión, maquinaria, etc.
Carrocería: sedán, deportivo, pickup, hatchback, SUV, etc.
Marca
Modelo
Versión
Placa
Año
Color
Transmisión
Combustible
Cilindrada
VIN
Número de motor
Kilometraje
Notas
Estado
```

### 5.5 Ejemplo

```txt
Tipo: Auto
Carrocería: Deportivo
Marca: Ford
Modelo: Shelby GT 500
Versión: Cobra
Color: Rojo
Transmisión: Manual
Combustible: Gasolina
Cilindrada: 5.2L
```

---

## 6. Catálogos inteligentes de vehículos

### 6.1 Objetivo

Evitar duplicidad en campos frecuentes como marca, modelo, color, transmisión, combustible, tipo de vehículo y carrocería.

### 6.2 Catálogos requeridos

```txt
vehicle_types
vehicle_body_types
vehicle_brands
vehicle_models
vehicle_colors
vehicle_transmissions
vehicle_fuel_types
```

### 6.3 Campos con búsqueda y creación inteligente

Los siguientes campos deben funcionar como combobox con búsqueda:

```txt
Tipo de vehículo
Carrocería
Marca
Modelo
Transmisión
Color
Combustible
```

### 6.4 Comportamiento esperado

```txt
El usuario escribe.
El sistema busca coincidencias.
Si existe, permite seleccionar.
Si no existe, permite crear.
Antes de crear, normaliza el texto.
Valida duplicados por mayúsculas, acentos y espacios.
```

### 6.5 Ejemplos de normalización

```txt
" Diésel " → "diesel"
"DIESEL" → "diesel"
"diesel" → "diesel"
"Gasolina  Premium" → "gasolina premium"
"TOYOTA" → "toyota"
```

### 6.6 Helper recomendado

Archivo:

```txt
BackEnd/utils/normalizeText.js
```

Función conceptual:

```js
function normalizeCatalogText(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
```

### 6.7 Regla de eliminación

Solo `super_admin` o `company_admin` pueden eliminar/desactivar valores de catálogo.

Recomendación:

```txt
No borrar físicamente si el valor está usado.
Usar status = inactive.
```

---

## 7. Empleados

### 7.1 Objetivo

Registrar a los empleados del taller, especialmente mecánicos, ayudantes y especialistas.

No todos los empleados tienen que ser usuarios del sistema.

### 7.2 Funciones

```txt
Crear empleado
Editar empleado
Ver empleado
Activar / desactivar empleado
Vincular opcionalmente a usuario del sistema
Asignar tarifa de mano de obra
```

### 7.3 Campos sugeridos

```txt
id
user_id
first_name
last_name
document_type
document_number
phone
email
role_name
specialty
status
notes
created_at
updated_at
```

### 7.4 Ejemplos de cargos

```txt
Mecánico ayudante
Mecánico especializado
Electricista automotriz
Pintor
Latonero
Jefe de taller
Recepcionista
```

---

## 8. Tempario / tarifas de mano de obra

### 8.1 Objetivo

Permitir definir tarifas de mano de obra por empleado.

Ejemplo:

```txt
Mecánico ayudante: 5.000 CLP / hora
Mecánico especializado: 50.000 CLP / hora
```

### 8.2 Reglas

```txt
Un empleado puede tener varias tarifas históricas.
Solo una tarifa debe estar activa en un período específico.
Cambiar una tarifa no debe afectar órdenes antiguas.
La orden debe guardar la tarifa usada en el momento.
```

### 8.3 Campos sugeridos

```txt
id
employee_id
rate_name
hourly_rate
currency
valid_from
valid_to
status
created_at
updated_at
```

### 8.4 Ejemplo de cálculo

```txt
Servicio: Mantención básica
Duración real: 3 horas
Mecánico: Mecánico especializado
Tarifa: 50.000 CLP / hora

Mano de obra:
3 x 50.000 = 150.000 CLP
```

---

## 9. Productos configurables

### 9.1 Objetivo

Registrar productos o insumos que se usan en servicios.

Este bloque no es inventario avanzado.  
No maneja stock, compras, proveedores, entradas ni salidas.

Es una configuración de productos referenciales para servicios y órdenes.

### 9.2 Funciones

```txt
Crear producto
Editar producto
Ver producto
Activar / desactivar producto
Asignar precio referencial
Usar producto en servicios configurables
Usar producto en órdenes de trabajo
```

### 9.3 Campos sugeridos

```txt
id
sku
name
normalized_name
description
product_type
unit
reference_price
currency
status
created_at
updated_at
```

### 9.4 Ejemplos

```txt
Aceite 10W40
Filtro de aceite
Bujía NGK
Líquido de frenos
Pastillas de freno
Grasa cadena
Limpiador carburador
```

### 9.5 Tipos sugeridos

```txt
consumable
part
fluid
tooling
other
```

### 9.6 Unidades sugeridas

```txt
unidad
litro
ml
kg
metro
kit
par
```

---

## 10. Servicios configurables

### 10.1 Objetivo

Permitir crear plantillas de servicios para reutilizarlas en citas y órdenes de trabajo.

Un servicio configurable puede incluir:

```txt
Nombre del servicio
Descripción
Productos requeridos
Tiempo estimado
Especialidad sugerida
Tarifa base sugerida
Estado
```

### 10.2 Ejemplo

```txt
Servicio: Mantención básica moto
Tiempo estimado: 3 horas
Especialidad sugerida: Mecánico especializado

Productos:
- Aceite 10W40 x 1 litro
- Filtro de aceite x 1
- Limpiador x 1
```

### 10.3 Campos sugeridos

```txt
id
name
normalized_name
description
estimated_hours
suggested_role
suggested_specialty
base_labor_rate
currency
status
created_at
updated_at
```

### 10.4 Productos por servicio

Tabla relacional:

```txt
service_template_products
```

Campos:

```txt
id
service_template_id
product_id
quantity
unit
reference_unit_price
created_at
```

---

## 11. Agenda / citas / pre-ingreso

### 11.1 Objetivo

Permitir agendar la llegada futura de un cliente y su vehículo al taller, capturando información operativa anticipada.

La cita debe funcionar como una pre-orden de trabajo.

### 11.2 Por qué no debe ser solo calendario

Una cita común solo guarda:

```txt
Fecha
Hora
Cliente
Notas
```

En Nexora Garage, la cita debe guardar:

```txt
Fecha
Hora
Cliente
Vehículo
Problema reportado
Servicios solicitados
Productos estimados
Mecánico sugerido
Tiempo estimado
Notas de recepción anticipadas
```

Así, cuando el cliente llega, se puede convertir la cita en orden de trabajo sin reescribir toda la información.

---

### 11.3 Flujo de agenda

```txt
1. Cliente llama o escribe.
2. Usuario abre Agenda.
3. Selecciona fecha y hora.
4. Busca cliente.
5. Si no existe, lo crea rápidamente.
6. Busca vehículo.
7. Si no existe, lo crea rápidamente.
8. Selecciona servicio solicitado.
9. Agrega problema reportado.
10. Guarda cita.
11. El día de la cita, cliente llega.
12. Usuario abre la cita.
13. Presiona Recepcionar vehículo.
14. Confirma kilometraje y estado del vehículo.
15. Convierte la cita en orden de trabajo.
```

---

### 11.4 Estados de cita

```txt
scheduled
confirmed
arrived
converted_to_work_order
cancelled
no_show
rescheduled
```

En español:

```txt
Agendada
Confirmada
Cliente llegó
Convertida en orden
Cancelada
No asistió
Reagendada
```

### 11.5 Reglas

```txt
Una cita cancelada no puede convertirse en orden.
Una cita no_show no puede convertirse directamente salvo reactivación.
Una cita convertida no puede convertirse otra vez.
Una cita reagendada debe guardar historial de cambios.
```

---

## 12. Formulario de cita

El formulario debería ser por pasos.

### Paso 1: Fecha y contacto

```txt
Fecha
Hora
Duración estimada
Canal: teléfono, WhatsApp, presencial, web, otro
Prioridad
```

### Paso 2: Cliente

```txt
Buscar cliente existente
Crear cliente nuevo si no existe
Nombre
Teléfono
Email
Documento opcional
```

### Paso 3: Vehículo

```txt
Buscar vehículo existente
Crear vehículo nuevo si no existe
Tipo
Marca
Modelo
Versión
Placa
Color
Combustible
Transmisión
Cilindrada
```

### Paso 4: Servicio solicitado

```txt
Seleccionar servicio configurable
Agregar servicio manual
Motivo de visita
Problema reportado
Tiempo estimado
Mecánico sugerido
```

### Paso 5: Resumen

```txt
Resumen de la cita
Cliente
Vehículo
Servicios
Tiempo estimado
Notas
Confirmar cita
```

---

## 13. Conversión de cita a orden de trabajo

### 13.1 Acción

```txt
Convertir cita en orden de trabajo
```

Endpoint sugerido:

```txt
POST /garage/appointments/:id/convert-to-work-order
```

Cross-company:

```txt
POST /companies/:id/garage/appointments/:id/convert-to-work-order
```

### 13.2 Qué debe hacer

```txt
1. Validar que la cita exista.
2. Validar que la cita no esté cancelada.
3. Validar que la cita no esté en no_show.
4. Validar que no haya sido convertida antes.
5. Validar que exista cliente.
6. Validar que exista vehículo.
7. Crear work_order.
8. Copiar datos principales de la cita.
9. Copiar servicios de appointment_services a work_order_services.
10. Copiar productos estimados a work_order_service_products.
11. Guardar vínculo appointment.converted_work_order_id.
12. Cambiar cita a converted_to_work_order.
13. Registrar historial.
```

### 13.3 Campos copiados a la orden

```txt
customer_id → customer_id
vehicle_id → vehicle_id
suggested_employee_id → assigned_employee_id
reported_issue → reported_issue
preliminary_notes → customer_notes/internal_notes
priority → priority
scheduled_start → appointment_date
```

---

## 14. Recepción del vehículo

Al llegar el cliente, desde la cita se debe poder accionar:

```txt
Recepcionar vehículo
```

Datos adicionales al recepcionar:

```txt
Kilometraje real de ingreso
Nivel de combustible
Estado exterior
Objetos dejados en el vehículo
Notas de recepción
Confirmación de datos
```

Al confirmar:

```txt
La cita pasa a arrived.
Se puede convertir en orden de trabajo.
Se copian datos previamente capturados.
Se redirige al detalle de la orden.
```

---

## 15. Órdenes de trabajo

### 15.1 Objetivo

Registrar el ingreso real del vehículo y los servicios que serán ejecutados.

### 15.2 Funciones

```txt
Crear orden de trabajo
Crear orden desde cita
Editar orden
Asignar cliente
Asignar vehículo
Asignar responsable principal
Agregar servicios
Asignar mecánico por servicio
Registrar diagnóstico
Registrar horas reales
Registrar productos usados
Calcular mano de obra
Calcular productos
Calcular total
Cambiar estado
Cerrar orden
Cancelar orden
Consultar historial
```

### 15.3 Estados sugeridos

```txt
draft
received
diagnosis
approved
in_progress
waiting_parts
completed
delivered
cancelled
```

### 15.4 Flujo sugerido

```txt
draft
  ↓
received
  ↓
diagnosis
  ↓
approved
  ↓
in_progress
  ↓
waiting_parts
  ↓
completed
  ↓
delivered
```

Estado alternativo:

```txt
cancelled
```

### 15.5 Reglas

```txt
Una orden delivered no debería editarse salvo permiso especial.
Una orden cancelled no debería permitir agregar servicios.
Una orden completed puede pasar a delivered.
Una orden waiting_parts puede volver a in_progress.
Todo cambio de estado debe guardarse en historial.
```

---

## 16. Servicios dentro de una orden

### 16.1 Diferencia importante

```txt
Servicio configurable = plantilla reutilizable.
Servicio de orden = copia real aplicada dentro de una orden.
```

Cuando se agrega un servicio configurable a una orden, se deben copiar los datos relevantes para mantener histórico.

### 16.2 Campos sugeridos

```txt
id
work_order_id
service_template_id
assigned_employee_id
service_name
description
status
estimated_hours
actual_hours
hourly_rate
labor_total
products_total
service_total
created_at
updated_at
```

### 16.3 Estados

```txt
pending
in_progress
completed
cancelled
```

---

## 17. Productos usados en una orden

### 17.1 Objetivo

Registrar los productos usados por cada servicio de la orden.

### 17.2 Campos sugeridos

```txt
id
work_order_service_id
product_id
product_name
quantity
unit
unit_price
total_price
created_at
```

### 17.3 Regla

```txt
total_price = quantity * unit_price
```

Los precios deben copiarse a la orden para conservar el valor histórico, aunque el producto cambie después.

---

## 18. Cálculos

### 18.1 Cálculo por servicio

```txt
actual_hours * hourly_rate = labor_total
quantity * unit_price = product_line_total
SUM(product_line_total) = products_total
labor_total + products_total = service_total
```

### 18.2 Cálculo por orden

```txt
SUM(work_order_services.labor_total) = subtotal_labor
SUM(work_order_services.products_total) = subtotal_products
subtotal_labor + subtotal_products = total_amount
```

### 18.3 Ejemplo

```txt
Orden: OT-0001
Vehículo: Moto Kawasaki
Servicio: Mantención básica
Duración real: 3 horas
Mecánico: Mecánico especializado
Tarifa: 50.000 CLP / hora

Mano de obra:
3 x 50.000 = 150.000 CLP

Productos:
Aceite: 20.000 CLP
Filtro: 5.000 CLP

Total productos: 25.000 CLP
Total servicio: 175.000 CLP
```

---

## 19. Historial técnico del vehículo

### 19.1 Objetivo

Mostrar toda la historia de trabajos realizados a un vehículo.

Este es el valor principal del core.

### 19.2 Endpoint sugerido

```txt
GET /garage/vehicles/:id/history
```

Cross-company:

```txt
GET /companies/:id/garage/vehicles/:vehicleId/history
```

### 19.3 Información a mostrar

```txt
Fecha de ingreso
Número de orden
Cita relacionada si existe
Kilometraje de ingreso
Problema reportado
Diagnóstico
Servicios realizados
Mecánico responsable
Productos usados
Horas trabajadas
Costo de mano de obra
Costo de productos
Total
Observaciones internas
Observaciones para cliente
Estado final
Fecha de entrega
```

### 19.4 Ejemplo visual

```txt
20/05/2026 — OT-0001 — Mantención básica

Cliente: Juan Pérez
Kilometraje: 15.300 km
Mecánico: Carlos Rojas

Servicios:
- Cambio de aceite
- Ajuste de cadena
- Revisión de frenos

Productos:
- Aceite 10W40 x 1
- Filtro de aceite x 1

Total: 175.000 CLP
```

---

## 20. Pantallas del Core 1

### 20.1 Dashboard de taller

Ruta:

```txt
/garage/dashboard
```

Cards sugeridas:

```txt
Órdenes abiertas
Órdenes en diagnóstico
Órdenes en proceso
Órdenes listas para entregar
Citas de hoy
Clientes activos
Vehículos registrados
```

---

### 20.2 Clientes

Ruta:

```txt
/garage/customers
```

Funciones:

```txt
Buscador
Filtro por estado
Tabla
Nuevo cliente
Ver
Editar
Activar/desactivar
```

---

### 20.3 Vehículos

Ruta:

```txt
/garage/vehicles
```

Funciones:

```txt
Buscador por placa
Filtro por marca
Filtro por cliente
Tabla
Nuevo vehículo
Ver
Editar
Historial
```

---

### 20.4 Detalle del vehículo

Ruta:

```txt
/garage/vehicles/:id
```

Pestañas:

```txt
Información general
Cliente actual
Citas
Órdenes de trabajo
Historial técnico
```

---

### 20.5 Agenda

Ruta:

```txt
/garage/appointments
```

Modos:

```txt
Vista calendario
Vista lista
```

Funciones:

```txt
Crear cita
Confirmar cita
Reagendar cita
Cancelar cita
Marcar no asistió
Recepcionar vehículo
Convertir cita en orden
```

---

### 20.6 Detalle de cita

Ruta:

```txt
/garage/appointments/:id
```

Debe mostrar:

```txt
Fecha y hora
Estado
Cliente
Vehículo
Servicios solicitados
Productos estimados
Mecánico sugerido
Problema reportado
Notas internas
Historial de estados
Botón recepcionar
Botón convertir en orden
```

---

### 20.7 Empleados

Ruta:

```txt
/garage/employees
```

Funciones:

```txt
Crear empleado
Editar empleado
Activar/desactivar
Vincular usuario
Ver tarifas asociadas
```

---

### 20.8 Tempario / tarifas

Ruta:

```txt
/garage/labor-rates
```

Funciones:

```txt
Crear tarifa
Asignar tarifa a empleado
Definir valor por hora
Definir moneda
Definir vigencia
Activar/desactivar
```

---

### 20.9 Configuración de productos

Ruta:

```txt
/garage/products
```

Funciones:

```txt
Crear producto
Editar producto
Precio referencial
Unidad
Tipo
Activar/desactivar
```

---

### 20.10 Configuración de servicios

Ruta:

```txt
/garage/service-templates
```

Funciones:

```txt
Crear servicio configurable
Editar servicio
Asignar productos
Definir tiempo estimado
Definir especialidad sugerida
Activar/desactivar
```

---

### 20.11 Órdenes de trabajo

Ruta:

```txt
/garage/work-orders
```

Funciones:

```txt
Buscador por número, cliente o placa
Filtro por estado
Filtro por prioridad
Filtro por responsable
Nueva orden
Ver detalle
```

Columnas recomendadas:

```txt
Número
Cliente
Vehículo
Placa
Estado
Prioridad
Responsable
Fecha ingreso
Entrega estimada
Acciones
```

---

### 20.12 Detalle de orden

Ruta:

```txt
/garage/work-orders/:id
```

Debe mostrar:

```txt
Datos de cliente
Datos de vehículo
Estado actual
Problema reportado
Diagnóstico
Servicios
Productos usados
Horas trabajadas
Totales
Historial de estados
Notas internas
Notas para cliente
Acciones según permisos
```

Acciones:

```txt
Editar orden
Cambiar estado
Asignar responsable
Agregar servicio
Registrar horas
Agregar productos
Recalcular total
Cerrar orden
Cancelar orden
```

---

## 21. Backend propuesto

### 21.1 Controladores

```txt
BackEnd/controllers/garage/catalogsController.js
BackEnd/controllers/garage/customersController.js
BackEnd/controllers/garage/vehiclesController.js
BackEnd/controllers/garage/employeesController.js
BackEnd/controllers/garage/laborRatesController.js
BackEnd/controllers/garage/productsController.js
BackEnd/controllers/garage/serviceTemplatesController.js
BackEnd/controllers/garage/appointmentsController.js
BackEnd/controllers/garage/workOrdersController.js
BackEnd/controllers/garage/workOrderServicesController.js
BackEnd/controllers/garage/vehicleHistoryController.js
```

### 21.2 Utilidades

```txt
BackEnd/utils/tenantResolver.js
BackEnd/utils/normalizeText.js
BackEnd/utils/calculateWorkOrderTotals.js
```

### 21.3 Helper tenantResolver

Responsabilidad:

```txt
Detectar si es super_admin.
Leer companyId desde params cuando aplique.
Validar que la empresa exista.
Validar que no esté suspendida.
Obtener schema_name.
Retornar schema seguro para queries.
```

---

## 22. Endpoints sugeridos

### 22.1 Catálogos

```txt
GET    /garage/catalogs/:type
POST   /garage/catalogs/:type
PUT    /garage/catalogs/:type/:id
PATCH  /garage/catalogs/:type/:id/status
DELETE /garage/catalogs/:type/:id
```

### 22.2 Clientes

```txt
GET    /garage/customers
POST   /garage/customers
GET    /garage/customers/:id
PUT    /garage/customers/:id
PATCH  /garage/customers/:id/status
```

### 22.3 Vehículos

```txt
GET    /garage/vehicles
POST   /garage/vehicles
GET    /garage/vehicles/:id
PUT    /garage/vehicles/:id
PATCH  /garage/vehicles/:id/status
GET    /garage/vehicles/:id/history
GET    /garage/customers/:id/vehicles
```

### 22.4 Empleados

```txt
GET    /garage/employees
POST   /garage/employees
GET    /garage/employees/:id
PUT    /garage/employees/:id
PATCH  /garage/employees/:id/status
```

### 22.5 Tarifas

```txt
GET    /garage/labor-rates
POST   /garage/labor-rates
PUT    /garage/labor-rates/:id
PATCH  /garage/labor-rates/:id/status
```

### 22.6 Productos

```txt
GET    /garage/products
POST   /garage/products
PUT    /garage/products/:id
PATCH  /garage/products/:id/status
```

### 22.7 Servicios configurables

```txt
GET    /garage/service-templates
POST   /garage/service-templates
GET    /garage/service-templates/:id
PUT    /garage/service-templates/:id
PATCH  /garage/service-templates/:id/status
POST   /garage/service-templates/:id/products
DELETE /garage/service-templates/:id/products/:productId
```

### 22.8 Agenda

```txt
GET    /garage/appointments
POST   /garage/appointments
GET    /garage/appointments/:id
PUT    /garage/appointments/:id
PATCH  /garage/appointments/:id/status
POST   /garage/appointments/:id/reschedule
POST   /garage/appointments/:id/confirm
POST   /garage/appointments/:id/mark-arrived
POST   /garage/appointments/:id/convert-to-work-order
POST   /garage/appointments/:id/cancel
```

### 22.9 Órdenes

```txt
GET    /garage/work-orders
POST   /garage/work-orders
GET    /garage/work-orders/:id
PUT    /garage/work-orders/:id
PATCH  /garage/work-orders/:id/status
PATCH  /garage/work-orders/:id/assign
POST   /garage/work-orders/:id/close
POST   /garage/work-orders/:id/cancel
```

### 22.10 Servicios de orden

```txt
GET    /garage/work-orders/:id/services
POST   /garage/work-orders/:id/services
PUT    /garage/work-orders/:id/services/:serviceId
DELETE /garage/work-orders/:id/services/:serviceId
PATCH  /garage/work-orders/:id/services/:serviceId/status
```

---

## 23. Rutas cross-company para super_admin

Seguir el patrón ya implementado:

```txt
/companies/:id/garage/*
```

Ejemplos:

```txt
GET  /companies/:id/garage/appointments
POST /companies/:id/garage/appointments/:appointmentId/convert-to-work-order
GET  /companies/:id/garage/vehicles/:vehicleId/history
GET  /companies/:id/garage/work-orders
```

---

## 24. Permisos / transacciones

### 24.1 Catálogos

```txt
garage.catalogs.view
garage.catalogs.create
garage.catalogs.update
garage.catalogs.delete
garage.catalogs.status
```

### 24.2 Clientes

```txt
garage.customers.view
garage.customers.create
garage.customers.update
garage.customers.delete
garage.customers.status
```

### 24.3 Vehículos

```txt
garage.vehicles.view
garage.vehicles.create
garage.vehicles.update
garage.vehicles.delete
garage.vehicles.status
```

### 24.4 Empleados

```txt
garage.employees.view
garage.employees.create
garage.employees.update
garage.employees.delete
garage.employees.status
```

### 24.5 Tarifas

```txt
garage.labor_rates.view
garage.labor_rates.create
garage.labor_rates.update
garage.labor_rates.delete
garage.labor_rates.status
```

### 24.6 Productos

```txt
garage.products.view
garage.products.create
garage.products.update
garage.products.delete
garage.products.status
```

### 24.7 Servicios configurables

```txt
garage.service_templates.view
garage.service_templates.create
garage.service_templates.update
garage.service_templates.delete
garage.service_templates.status
garage.service_templates.assign_products
```

### 24.8 Agenda

```txt
garage.appointments.view
garage.appointments.create
garage.appointments.update
garage.appointments.delete
garage.appointments.status
garage.appointments.reschedule
garage.appointments.confirm
garage.appointments.cancel
garage.appointments.mark_arrived
garage.appointments.convert_to_work_order
```

### 24.9 Órdenes

```txt
garage.work_orders.view
garage.work_orders.create
garage.work_orders.update
garage.work_orders.change_status
garage.work_orders.assign_user
garage.work_orders.assign_employee
garage.work_orders.close
garage.work_orders.cancel
garage.work_orders.calculate_labor
garage.work_orders.calculate_products
garage.work_orders.recalculate_total
```

### 24.10 Servicios de orden

```txt
garage.services.view
garage.services.create
garage.services.update
garage.services.delete
garage.services.complete
```

### 24.11 Historial

```txt
garage.vehicle_history.view
```

Futuro:

```txt
garage.vehicle_history.export
garage.vehicle_history.print
```

---

## 25. Modelo de datos sugerido

### 25.1 customers

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  document_type VARCHAR(50),
  document_number VARCHAR(80),
  phone VARCHAR(50),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  notes TEXT,
  source VARCHAR(50),
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.2 vehicle_types

```sql
CREATE TABLE vehicle_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.3 vehicle_body_types

```sql
CREATE TABLE vehicle_body_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.4 vehicle_brands

```sql
CREATE TABLE vehicle_brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.5 vehicle_models

```sql
CREATE TABLE vehicle_models (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES vehicle_brands(id),
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (brand_id, normalized_name)
);
```

### 25.6 vehicle_colors

```sql
CREATE TABLE vehicle_colors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL UNIQUE,
  hex_color VARCHAR(20),
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.7 vehicle_transmissions

```sql
CREATE TABLE vehicle_transmissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.8 vehicle_fuel_types

```sql
CREATE TABLE vehicle_fuel_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.9 vehicles

```sql
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_type_id INTEGER REFERENCES vehicle_types(id),
  body_type_id INTEGER REFERENCES vehicle_body_types(id),
  brand_id INTEGER REFERENCES vehicle_brands(id),
  model_id INTEGER REFERENCES vehicle_models(id),
  version VARCHAR(120),
  plate VARCHAR(30),
  year INTEGER,
  color_id INTEGER REFERENCES vehicle_colors(id),
  transmission_id INTEGER REFERENCES vehicle_transmissions(id),
  fuel_type_id INTEGER REFERENCES vehicle_fuel_types(id),
  engine_displacement VARCHAR(50),
  vin VARCHAR(100),
  engine_number VARCHAR(100),
  mileage INTEGER DEFAULT 0,
  notes TEXT,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Índice recomendado:

```sql
CREATE UNIQUE INDEX idx_vehicles_plate ON vehicles(plate)
WHERE plate IS NOT NULL AND plate <> '';
```

### 25.10 employees

```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  document_type VARCHAR(50),
  document_number VARCHAR(80),
  phone VARCHAR(50),
  email VARCHAR(150),
  role_name VARCHAR(120),
  specialty VARCHAR(150),
  status VARCHAR(30) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.11 employee_labor_rates

```sql
CREATE TABLE employee_labor_rates (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rate_name VARCHAR(120) NOT NULL,
  hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CLP',
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_to DATE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.12 products

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(80),
  name VARCHAR(150) NOT NULL,
  normalized_name VARCHAR(180) NOT NULL,
  description TEXT,
  product_type VARCHAR(50) DEFAULT 'consumable',
  unit VARCHAR(30) DEFAULT 'unidad',
  reference_price NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CLP',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (normalized_name)
);
```

### 25.13 service_templates

```sql
CREATE TABLE service_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  normalized_name VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  estimated_hours NUMERIC(8,2) DEFAULT 0,
  suggested_role VARCHAR(120),
  suggested_specialty VARCHAR(150),
  base_labor_rate NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'CLP',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.14 service_template_products

```sql
CREATE TABLE service_template_products (
  id SERIAL PRIMARY KEY,
  service_template_id INTEGER NOT NULL REFERENCES service_templates(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(30),
  reference_unit_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.15 appointments

```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  appointment_number VARCHAR(50) NOT NULL UNIQUE,

  customer_id INTEGER REFERENCES customers(id),
  vehicle_id INTEGER REFERENCES vehicles(id),

  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP,
  estimated_duration_hours NUMERIC(8,2) DEFAULT 0,

  status VARCHAR(40) DEFAULT 'scheduled',
  channel VARCHAR(50),

  requested_service_summary TEXT,
  reported_issue TEXT,
  preliminary_notes TEXT,
  internal_notes TEXT,

  priority VARCHAR(30) DEFAULT 'normal',

  suggested_employee_id INTEGER REFERENCES employees(id),
  reception_user_id INTEGER,

  converted_work_order_id INTEGER,
  converted_at TIMESTAMP,

  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.16 appointment_services

```sql
CREATE TABLE appointment_services (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_template_id INTEGER REFERENCES service_templates(id),
  service_name VARCHAR(150) NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(8,2) DEFAULT 0,
  suggested_employee_id INTEGER REFERENCES employees(id),
  estimated_labor_total NUMERIC(12,2) DEFAULT 0,
  estimated_products_total NUMERIC(12,2) DEFAULT 0,
  estimated_service_total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.17 appointment_service_products

```sql
CREATE TABLE appointment_service_products (
  id SERIAL PRIMARY KEY,
  appointment_service_id INTEGER NOT NULL REFERENCES appointment_services(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(150) NOT NULL,
  quantity NUMERIC(12,2) DEFAULT 1,
  unit VARCHAR(30),
  estimated_unit_price NUMERIC(12,2) DEFAULT 0,
  estimated_total_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.18 appointment_status_history

```sql
CREATE TABLE appointment_status_history (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  previous_status VARCHAR(40),
  new_status VARCHAR(40) NOT NULL,
  changed_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.19 appointment_reschedules

```sql
CREATE TABLE appointment_reschedules (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  previous_start TIMESTAMP NOT NULL,
  previous_end TIMESTAMP,
  new_start TIMESTAMP NOT NULL,
  new_end TIMESTAMP,
  reason TEXT,
  changed_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.20 work_orders

```sql
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,

  appointment_id INTEGER REFERENCES appointments(id),
  appointment_date TIMESTAMP,

  customer_id INTEGER NOT NULL REFERENCES customers(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),

  assigned_employee_id INTEGER REFERENCES employees(id),
  assigned_user_id INTEGER,

  status VARCHAR(40) DEFAULT 'draft',
  priority VARCHAR(30) DEFAULT 'normal',

  entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_delivery_date TIMESTAMP,
  delivery_date TIMESTAMP,

  reported_issue TEXT,
  diagnosis TEXT,
  reception_notes TEXT,
  fuel_level VARCHAR(50),
  vehicle_condition_notes TEXT,
  internal_notes TEXT,
  customer_notes TEXT,

  mileage_in INTEGER,
  mileage_out INTEGER,

  subtotal_labor NUMERIC(12,2) DEFAULT 0,
  subtotal_products NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CLP',

  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.21 work_order_services

```sql
CREATE TABLE work_order_services (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  service_template_id INTEGER REFERENCES service_templates(id),
  assigned_employee_id INTEGER REFERENCES employees(id),

  service_name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(40) DEFAULT 'pending',

  estimated_hours NUMERIC(8,2) DEFAULT 0,
  actual_hours NUMERIC(8,2) DEFAULT 0,
  hourly_rate NUMERIC(12,2) DEFAULT 0,

  labor_total NUMERIC(12,2) DEFAULT 0,
  products_total NUMERIC(12,2) DEFAULT 0,
  service_total NUMERIC(12,2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.22 work_order_service_products

```sql
CREATE TABLE work_order_service_products (
  id SERIAL PRIMARY KEY,
  work_order_service_id INTEGER NOT NULL REFERENCES work_order_services(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(150) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(30),
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25.23 work_order_status_history

```sql
CREATE TABLE work_order_status_history (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(40),
  new_status VARCHAR(40) NOT NULL,
  changed_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 26. Frontend propuesto

### 26.1 Vistas

```txt
FrontEnd/Portal/src/views/garage/DashboardView.vue
FrontEnd/Portal/src/views/garage/CustomersView.vue
FrontEnd/Portal/src/views/garage/VehiclesView.vue
FrontEnd/Portal/src/views/garage/VehicleDetailView.vue
FrontEnd/Portal/src/views/garage/VehicleHistoryView.vue
FrontEnd/Portal/src/views/garage/EmployeesView.vue
FrontEnd/Portal/src/views/garage/LaborRatesView.vue
FrontEnd/Portal/src/views/garage/ProductsConfigView.vue
FrontEnd/Portal/src/views/garage/ServicesConfigView.vue
FrontEnd/Portal/src/views/garage/AppointmentsView.vue
FrontEnd/Portal/src/views/garage/AppointmentDetailView.vue
FrontEnd/Portal/src/views/garage/WorkOrdersView.vue
FrontEnd/Portal/src/views/garage/WorkOrderDetailView.vue
```

### 26.2 Componentes

```txt
FrontEnd/Portal/src/components/garage/CatalogCombobox.vue
FrontEnd/Portal/src/components/garage/CustomerFormModal.vue
FrontEnd/Portal/src/components/garage/VehicleFormModal.vue
FrontEnd/Portal/src/components/garage/CustomerVehicleSelector.vue
FrontEnd/Portal/src/components/garage/EmployeeFormModal.vue
FrontEnd/Portal/src/components/garage/LaborRateFormModal.vue
FrontEnd/Portal/src/components/garage/ProductFormModal.vue
FrontEnd/Portal/src/components/garage/ServiceTemplateFormModal.vue
FrontEnd/Portal/src/components/garage/ServiceTemplateProductsEditor.vue
FrontEnd/Portal/src/components/garage/AppointmentCalendar.vue
FrontEnd/Portal/src/components/garage/AppointmentList.vue
FrontEnd/Portal/src/components/garage/AppointmentFormModal.vue
FrontEnd/Portal/src/components/garage/AppointmentCustomerStep.vue
FrontEnd/Portal/src/components/garage/AppointmentVehicleStep.vue
FrontEnd/Portal/src/components/garage/AppointmentServiceStep.vue
FrontEnd/Portal/src/components/garage/AppointmentSummaryStep.vue
FrontEnd/Portal/src/components/garage/ConvertAppointmentModal.vue
FrontEnd/Portal/src/components/garage/WorkOrderFormModal.vue
FrontEnd/Portal/src/components/garage/WorkOrderStatusBadge.vue
FrontEnd/Portal/src/components/garage/ServiceLineEditor.vue
FrontEnd/Portal/src/components/garage/WorkOrderLaborCalculator.vue
FrontEnd/Portal/src/components/garage/WorkOrderProductsEditor.vue
FrontEnd/Portal/src/components/garage/VehicleHistoryTimeline.vue
FrontEnd/Portal/src/components/garage/VehicleHistoryCard.vue
```

### 26.3 Stores Pinia

```txt
FrontEnd/Portal/src/stores/garageCatalogs.ts
FrontEnd/Portal/src/stores/garageCustomers.ts
FrontEnd/Portal/src/stores/garageVehicles.ts
FrontEnd/Portal/src/stores/garageEmployees.ts
FrontEnd/Portal/src/stores/garageLaborRates.ts
FrontEnd/Portal/src/stores/garageProducts.ts
FrontEnd/Portal/src/stores/garageServiceTemplates.ts
FrontEnd/Portal/src/stores/garageAppointments.ts
FrontEnd/Portal/src/stores/garageWorkOrders.ts
```

### 26.4 Servicios API

```txt
FrontEnd/Portal/src/services/garageCatalogsService.ts
FrontEnd/Portal/src/services/garageCustomersService.ts
FrontEnd/Portal/src/services/garageVehiclesService.ts
FrontEnd/Portal/src/services/garageEmployeesService.ts
FrontEnd/Portal/src/services/garageLaborRatesService.ts
FrontEnd/Portal/src/services/garageProductsService.ts
FrontEnd/Portal/src/services/garageServiceTemplatesService.ts
FrontEnd/Portal/src/services/garageAppointmentsService.ts
FrontEnd/Portal/src/services/garageWorkOrdersService.ts
FrontEnd/Portal/src/services/garageVehicleHistoryService.ts
```

---

## 27. Roles y permisos sugeridos

### 27.1 super_admin

```txt
Control total.
Acceso cross-company.
Puede usar CompanySelector.
Puede ver y operar en empresas distintas.
Puede gestionar catálogos y configuraciones.
```

### 27.2 company_admin

```txt
Control total dentro de su empresa.
Puede gestionar empleados, tarifas, productos, servicios, citas y órdenes.
Puede desactivar valores de catálogo.
```

### 27.3 user técnico

```txt
Puede ver órdenes.
Puede actualizar diagnóstico.
Puede actualizar servicios asignados.
Puede registrar horas.
Puede cambiar estados operativos si tiene permiso.
No debería eliminar catálogos.
No debería cancelar órdenes salvo permiso.
```

### 27.4 recepcionista

```txt
Puede gestionar clientes.
Puede gestionar vehículos.
Puede crear citas.
Puede confirmar citas.
Puede recepcionar vehículos.
Puede convertir citas en órdenes si tiene permiso.
```

### 27.5 viewer

```txt
Solo lectura.
Puede ver clientes, vehículos, citas, órdenes e historial si tiene permiso.
```

---

## 28. Migraciones sugeridas

### 28.1 Paso cero obligatorio

Ejecutar primero:

```txt
Database/04_migrations/07_company_master_flag.sql
```

### 28.2 Nueva migración

Archivo sugerido:

```txt
Database/04_migrations/08_garage_operations_module.sql
```

Debe incluir:

```txt
Registro del módulo garage_operations en public.module_catalog.
Registro de transacciones en public.module_transactions.
Creación de tablas tenant para el módulo.
Actualización del proceso de creación de empresa para incluir tablas del core.
Seeds iniciales opcionales para catálogos.
Protecciones para schema hernancius.
```

---

## 29. Sprints recomendados

### Sprint 0 — Preparación

```txt
Ejecutar 07_company_master_flag.sql.
Validar staging.
Actualizar README con arquitectura governance.
Revisar routeModuleMap actual.
```

### Sprint 1 — Base del módulo y catálogos

```txt
Crear 08_garage_operations_module.sql.
Registrar módulo garage_operations.
Registrar transacciones.
Crear catálogos de vehículo.
Crear customers.
Crear vehicles.
Crear normalización.
Crear CatalogCombobox.
```

### Sprint 2 — Empleados, tempario, productos y servicios

```txt
Crear employees.
Crear employee_labor_rates.
Crear products.
Crear service_templates.
Crear service_template_products.
Crear pantallas de configuración.
```

### Sprint 3 — Agenda / pre-ingreso

```txt
Crear appointments.
Crear appointment_services.
Crear appointment_service_products.
Crear appointment_status_history.
Crear appointment_reschedules.
Crear formulario de cita.
Crear calendario.
Crear lista de citas.
```

### Sprint 4 — Conversión cita → orden

```txt
Crear endpoint convert-to-work-order.
Copiar datos de cliente.
Copiar datos de vehículo.
Copiar servicios.
Copiar productos.
Marcar cita como convertida.
Crear vínculo appointment_id en work_orders.
Validar conversión única.
```

### Sprint 5 — Órdenes de trabajo

```txt
Crear work_orders.
Crear work_order_services.
Crear work_order_service_products.
Crear work_order_status_history.
Asignar empleado.
Registrar horas reales.
Calcular mano de obra.
Calcular productos.
Calcular total.
Cerrar orden.
Cancelar orden.
```

### Sprint 6 — Historial del vehículo

```txt
Crear endpoint vehicle history.
Crear VehicleHistoryTimeline.
Mostrar órdenes previas.
Mostrar servicios realizados.
Mostrar productos usados.
Mostrar mecánico.
Mostrar costos.
Mostrar kilometraje.
Mostrar fechas.
```

### Sprint 7 — QA multi-tenant y permisos

```txt
Validar separación por schema.
Validar permisos por perfil.
Validar super_admin cross-company.
Validar CompanySelector.
Validar citas canceladas.
Validar no_show.
Validar conversión única de cita.
Validar cálculo de mano de obra.
Validar que cambios de tarifa no afecten órdenes antiguas.
Validar TypeScript 0 errores.
```

---

## 30. Riesgos y mitigaciones

### Riesgo 1: crecimiento excesivo del alcance

Mitigación:

```txt
No incluir inventario avanzado.
No incluir facturación electrónica.
No incluir compras a proveedores.
No incluir pagos.
No incluir app móvil.
```

### Riesgo 2: duplicidad en catálogos

Mitigación:

```txt
Normalización por backend.
Campo normalized_name.
Índices únicos.
Combobox con búsqueda.
Validación por acentos, espacios y mayúsculas.
```

### Riesgo 3: pérdida de histórico por cambios de tarifas

Mitigación:

```txt
Guardar hourly_rate directamente en work_order_services.
No depender únicamente de employee_labor_rates para órdenes antiguas.
```

### Riesgo 4: cita convertida dos veces

Mitigación:

```txt
Campo converted_work_order_id.
Validación transaccional.
Bloqueo si ya existe orden asociada.
```

### Riesgo 5: mezcla de datos entre tenants

Mitigación:

```txt
Usar tenantResolver centralizado.
No concatenar schemas sin validación.
Validar companyId en rutas cross-company.
Probar separación con tenants distintos.
```

### Riesgo 6: borrar catálogos usados

Mitigación:

```txt
Usar status inactive.
No borrar físicamente si existen referencias.
```

---

## 31. Definición de terminado

El Core 1 se considera completo cuando:

```txt
Un usuario puede crear cliente.
Un usuario puede crear vehículo.
Un usuario puede agendar una cita.
Una cita puede funcionar como pre-ingreso.
Una cita puede convertirse en orden de trabajo.
Una orden puede tener servicios.
Un servicio puede tener productos.
Un servicio puede asignarse a un mecánico.
Un mecánico tiene tarifa horaria.
Las horas reales calculan mano de obra.
Los productos calculan subtotal de productos.
La orden calcula total.
La orden puede cerrarse.
El historial del vehículo muestra trabajos previos.
Los datos no se mezclan entre tenants.
El super_admin puede operar cross-company.
Los permisos por transacción funcionan.
TypeScript compila con 0 errores.
```

---

## 32. Resumen final

El Core 1 de Nexora Garage será:

```txt
Operaciones de Taller e Historial Vehicular
```

Su valor principal:

```txt
Permitir que cada taller sepa exactamente qué se le hizo a cada vehículo, cuándo, quién lo hizo, qué productos se usaron, cuántas horas tomó, cuánto costó y qué observaciones quedaron registradas.
```

La agenda se incorpora como una pieza estratégica:

```txt
La cita es una pre-orden de trabajo.
La orden es la ejecución real.
El historial es el resultado final.
```

Este diseño convierte a Nexora Garage en una plataforma operativa real, no solo administrativa.
