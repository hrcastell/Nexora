# Nexora Dental Core — Plan de implementación para Codex

## 1. Contexto

Nexora es una app modular compuesta por múltiples cores. Este documento define la propuesta e implementación de un nuevo módulo odontológico llamado `dental-core`, siguiendo el estilo arquitectónico usado en el core de taller y el core de finanzas personales.

El objetivo del módulo es permitir que un odontólogo pueda gestionar de forma integral:

- Pacientes.
- Citas.
- Historia clínica.
- Tratamientos.
- Servicios odontológicos.
- Consultas.
- Cobros.
- Pagos completos y parciales.
- Pagos por cuotas.
- Clientes en mora.
- Dashboard operativo y financiero.

Importante: Nexora ya cuenta con una tabla `customers` dentro de la generación de schema tenant. Por lo tanto, el módulo odontológico debe reutilizar `customers` y no duplicar la entidad paciente.

---

## 2. Nombre del core

Nombre técnico recomendado:

```txt
dental-core
```

Motivo: es corto, claro, escalable y permite incorporar en el futuro odontograma, imágenes, presupuestos, recetas, seguros, consentimiento informado y reportes clínicos.

---

## 3. Objetivo funcional

El módulo debe cubrir el ciclo completo de atención odontológica:

```txt
Paciente → Cita → Consulta → Historia clínica → Servicio/tratamiento → Cobro → Pago/cuotas → Seguimiento
```

Debe entregar trazabilidad clínica y administrativa.

---

## 4. Alcance MVP

El MVP inicial debe incluir:

1. Dashboard odontológico.
2. Gestión de pacientes usando `customers`.
3. Perfil clínico dental complementario.
4. Historia clínica.
5. Configuración de tratamientos.
6. Configuración de servicios odontológicos.
7. Agenda de citas.
8. Consultas/atenciones.
9. Cobros.
10. Pagos parciales.
11. Planes de cuotas.
12. Estado de mora.
13. Notificaciones por correo para citas.

No incluir inicialmente:

- Odontograma visual avanzado.
- Radiografías o adjuntos clínicos.
- Recetas médicas.
- Firma digital.
- Seguros médicos.
- Facturación fiscal avanzada.
- Integración con Google Calendar.
- WhatsApp/SMS.

Estas funcionalidades quedan como mejoras futuras.

---

## 5. Principio arquitectónico

El `dental-core` debe ser dueño de su dominio. Otros cores pueden consultar datos o reaccionar a eventos, pero no deben calcular ni modificar directamente reglas clínicas o administrativas odontológicas.

Correcto:

```txt
Dashboard Core → consume DentalDashboardService
Notification Core → consume DentalAppointmentReminderService
Customers Core → provee customer/patient base
Finance Core → puede recibir eventos de pago
```

Incorrecto:

```txt
Dashboard Core → calcula cuotas pendientes manualmente
Notification Core → consulta tablas clínicas directamente
Otro core → modifica cobros odontológicos sin pasar por DentalBillingService
```

---

## 6. Integración con `customers`

El sistema ya tiene una tabla `customers`. El módulo odontológico debe reutilizarla.

Relaciones recomendadas:

```txt
customers 1 ─── 1 dental_patient_profiles
customers 1 ─── * dental_appointments
customers 1 ─── * dental_consultations
customers 1 ─── * dental_charges
customers 1 ─── * dental_payments
```

`customers` debe conservar datos generales:

- Nombre.
- Documento.
- Teléfono.
- Email.
- Dirección.
- Estado.
- Datos comunes usados por otros cores.

El `dental-core` debe agregar datos clínicos en:

```txt
dental_patient_profiles
```

---

## 7. Estructura sugerida del módulo

Adaptar a la arquitectura real de Nexora, pero usar una estructura similar a:

```txt
src/modules/dental-core/
  domain/
    entities/
    value-objects/
    services/
    events/

  application/
    use-cases/

  infrastructure/
    repositories/
    persistence/
    mappers/

  presentation/
    controllers/
    dto/

  ui/
    pages/
    components/
    hooks/
```

Subdominios internos:

```txt
dashboard/
patients/
clinical-history/
treatments/
services/
appointments/
consultations/
billing/
notifications/
```

---

# 8. Pantallas requeridas

## 8.1 Dashboard

Debe mostrar una vista completa de la gestión diaria y mensual.

Indicadores:

```txt
Citas pautadas para hoy.
Próxima cita.
Pacientes atendidos hoy.
Servicios realizados hoy.
Total cobrado hoy.
Total cobrado en el mes.
Total pendiente por cobrar.
Pacientes en mora.
Cuotas vencidas.
Consultas recientes.
```

Widgets sugeridos:

1. Resumen del día.
2. Agenda próxima.
3. Cobros y mora.
4. Actividad clínica.
5. Alertas.

---

## 8.2 Pacientes

Debe funcionar similar a la gestión de clientes del core de taller, reutilizando `customers`.

Funciones:

```txt
Crear paciente nuevo.
Buscar paciente existente.
Editar datos generales.
Ver ficha del paciente.
Ver historia clínica.
Ver consultas realizadas.
Ver servicios/tratamientos aplicados.
Ver historial de pagos.
Ver deuda pendiente.
Ver cuotas.
Ver citas pasadas y futuras.
```

Al presionar un paciente, mostrar detalle con tabs:

```txt
Resumen
Datos personales
Historia clínica
Consultas
Tratamientos/servicios
Pagos y cuotas
Citas
Notas
```

Información clínica mínima:

```txt
Antecedentes médicos.
Alergias.
Medicamentos actuales.
Enfermedades relevantes.
Observaciones clínicas.
Motivo de consulta inicial.
Diagnóstico general.
Notas odontológicas.
Contacto de emergencia.
```

---

## 8.3 Configuración de tratamientos y servicios

### Tratamientos

Representan procedimientos o categorías clínicas base.

Ejemplos:

```txt
Ortodoncia
Tratamiento de conducto
Limpieza dental
Extracción
Blanqueamiento
Endodoncia
Restauración
Implante
Control
Radiografía
Consulta diagnóstica
```

Campos:

```txt
Nombre.
Descripción.
Categoría.
Duración estimada.
Activo/inactivo.
Requiere seguimiento.
Requiere varias sesiones.
Observaciones.
```

### Servicios

Un servicio es una oferta aplicable en consulta y puede componerse de varios tratamientos.

Ejemplos:

```txt
Consulta + limpieza dental
Inicio de ortodoncia
Control mensual de ortodoncia
Tratamiento de conducto
Extracción simple
```

Campos de costeo:

```txt
Costo de insumos.
Costo de mano de obra.
Impuestos.
Margen/ganancia.
Precio final.
Duración estimada.
Tratamientos incluidos.
```

Fórmula:

```txt
subtotal = supplies_cost + labor_cost
tax_amount = subtotal * tax_rate
profit_amount = subtotal * profit_margin
final_price = subtotal + tax_amount + profit_amount
```

Permitir también precio manual:

```txt
price_mode = calculated | manual
```

---

## 8.4 Consultas

La ventana de consultas es el centro operativo del módulo.

Debe permitir:

```txt
Ver todas las atenciones realizadas.
Crear nuevas consultas.
Asociar paciente nuevo o existente.
Crear perfil clínico si el paciente es nuevo.
Ver historial clínico si el paciente es recurrente.
Añadir nueva evolución clínica.
Asociar servicio.
Asociar tratamientos aplicados.
Registrar diagnóstico.
Registrar observaciones clínicas.
Registrar indicaciones.
Gestionar pago completo o parcial.
Crear cuotas.
Finalizar consulta.
```

Estados clínicos:

```txt
draft
scheduled
in_progress
completed
cancelled
no_show
```

Estados administrativos:

```txt
unpaid
partially_paid
paid
overdue
cancelled
```

Flujo recomendado:

```txt
1. Crear consulta.
2. Seleccionar o crear paciente.
3. Revisar historia clínica.
4. Registrar evolución clínica.
5. Seleccionar servicio.
6. Confirmar tratamientos aplicados.
7. Calcular monto.
8. Registrar pago completo o parcial.
9. Crear cuotas si corresponde.
10. Finalizar consulta.
```

---

## 8.5 Agenda

Debe gestionar citas en calendario.

Vistas:

```txt
Calendario mensual.
Vista diaria por horas.
Lista de citas.
```

Funciones:

```txt
Crear cita.
Editar cita.
Cancelar cita.
Confirmar cita.
Marcar como asistió.
Marcar como no asistió.
Asociar paciente existente.
Crear paciente desde la cita.
Asociar servicio estimado.
Enviar recordatorio por correo.
Convertir cita en consulta.
```

Estados de cita:

```txt
scheduled
confirmed
checked_in
completed
cancelled
no_show
rescheduled
```

Flujo de exportar cita a consulta:

```txt
1. Seleccionar cita.
2. Presionar "Crear consulta desde cita".
3. Crear consulta con paciente, fecha, hora, servicio estimado y notas.
4. Mantener relación appointment_id.
5. Actualizar estado de la cita.
```

Notificaciones:

```txt
Correo al crear cita.
Correo de recordatorio antes de la cita.
Correo al reprogramar.
Correo al cancelar.
```

Configuración futura:

```txt
Recordatorio 24 horas antes.
Recordatorio 2 horas antes.
Activar/desactivar por tenant.
```

---

## 8.6 Finanzas

Debe mostrar trazabilidad de cobros.

Funciones:

```txt
Ver lista de cobros.
Crear cobro nuevo.
Asociar cobro a paciente.
Asociar cobro a consulta.
Asociar cobro a servicio.
Registrar pago completo.
Registrar pago parcial.
Crear plan de cuotas.
Ver cuotas pendientes.
Ver cuotas vencidas.
Ver total cobrado por día.
Ver total cobrado por mes.
Ver deuda total.
Filtrar por paciente, fecha, estado y método de pago.
```

Estados de cobro:

```txt
pending
partially_paid
paid
overdue
cancelled
refunded
```

Métodos de pago:

```txt
cash
card
bank_transfer
mobile_payment
insurance
other
```

---

# 9. Modelo de dominio

Entidades principales:

```txt
DentalPatientProfile
ClinicalHistoryEntry
DentalTreatment
DentalService
DentalServiceTreatment
DentalAppointment
DentalConsultation
DentalConsultationTreatment
DentalCharge
DentalPayment
DentalInstallment
DentalNotification
```

---

## 9.1 DentalPatientProfile

Complementa `customers`.

Campos:

```txt
id
tenant_id
customer_id
medical_background
allergies
current_medications
chronic_conditions
dental_observations
emergency_contact_name
emergency_contact_phone
created_at
updated_at
```

Reglas:

```txt
Un customer puede tener un solo dental_patient_profile.
No duplicar información general del customer.
Puede crearse automáticamente en la primera consulta.
```

---

## 9.2 ClinicalHistoryEntry

Entrada de historia clínica.

Campos:

```txt
id
tenant_id
customer_id
consultation_id
entry_date
type
title
description
diagnosis
clinical_notes
indications
created_by
created_at
updated_at
```

Tipos:

```txt
initial
evolution
diagnosis
procedure_note
follow_up
general_note
```

---

## 9.3 DentalTreatment

Campos:

```txt
id
tenant_id
name
description
category
estimated_duration_minutes
requires_follow_up
requires_multiple_sessions
is_active
created_at
updated_at
```

---

## 9.4 DentalService

Campos:

```txt
id
tenant_id
name
description
price_mode
supplies_cost
labor_cost
tax_rate
profit_margin
manual_price
final_price
estimated_duration_minutes
is_active
created_at
updated_at
```

Reglas:

```txt
Si price_mode = calculated, final_price se calcula.
Si price_mode = manual, final_price usa manual_price.
Un servicio puede contener uno o varios tratamientos.
```

---

## 9.5 DentalAppointment

Campos:

```txt
id
tenant_id
customer_id
service_id
scheduled_start
scheduled_end
status
reason
notes
reminder_email_sent_at
created_at
updated_at
```

Reglas:

```txt
Una cita puede existir sin consulta.
Una cita puede convertirse en consulta.
Una cita debe tener fecha y hora.
Una cita debe asociarse a un customer/paciente.
```

---

## 9.6 DentalConsultation

Campos:

```txt
id
tenant_id
customer_id
appointment_id
service_id
consultation_date
status
administrative_status
reason
diagnosis
clinical_notes
indications
total_amount
created_at
updated_at
```

Reglas:

```txt
Puede venir desde una cita o crearse manualmente.
Debe asociarse a un paciente.
Puede tener uno o varios tratamientos aplicados.
Puede tener un cobro asociado.
Puede crear entradas de historia clínica.
```

---

## 9.7 DentalCharge

Cuenta por cobrar.

Campos:

```txt
id
tenant_id
customer_id
consultation_id
service_id
description
total_amount
paid_amount
pending_amount
status
due_date
created_at
updated_at
```

Reglas:

```txt
pending_amount = total_amount - paid_amount.
Si paid_amount = 0, status = pending.
Si paid_amount > 0 y pending_amount > 0, status = partially_paid.
Si pending_amount = 0, status = paid.
Si due_date vencida y pending_amount > 0, status = overdue.
```

---

## 9.8 DentalPayment

Campos:

```txt
id
tenant_id
customer_id
charge_id
amount
payment_date
payment_method
reference
notes
created_at
updated_at
```

Regla:

```txt
Un cobro puede tener varios pagos.
No permitir que la suma de pagos supere el total del cobro.
```

---

## 9.9 DentalInstallment

Cuotas.

Campos:

```txt
id
tenant_id
charge_id
customer_id
installment_number
amount
due_date
paid_amount
status
paid_at
created_at
updated_at
```

Estados:

```txt
pending
partially_paid
paid
overdue
cancelled
```

Reglas:

```txt
La suma de cuotas debe coincidir con el monto acordado.
Una cuota vencida con saldo pendiente debe marcarse como overdue.
El pago de una cuota debe crear un dental_payment.
```

---

# 10. Tablas sugeridas

```txt
dental_patient_profiles
dental_clinical_history_entries
dental_treatments
dental_services
dental_service_treatments
dental_appointments
dental_consultations
dental_consultation_treatments
dental_charges
dental_payments
dental_installments
dental_notifications
```

---

# 11. SQL conceptual

Adaptar nombres, tipos, schema y convenciones al estándar real de Nexora.

```sql
CREATE TABLE dental_patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  medical_background TEXT,
  allergies TEXT,
  current_medications TEXT,
  chronic_conditions TEXT,
  dental_observations TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, customer_id)
);

CREATE TABLE dental_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(120),
  estimated_duration_minutes INTEGER,
  requires_follow_up BOOLEAN NOT NULL DEFAULT false,
  requires_multiple_sessions BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE dental_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
  supplies_cost INTEGER NOT NULL DEFAULT 0,
  labor_cost INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  profit_margin NUMERIC(8,4) NOT NULL DEFAULT 0,
  manual_price INTEGER,
  final_price INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (price_mode IN ('manual', 'calculated'))
);

CREATE TABLE dental_service_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES dental_services(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES dental_treatments(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, service_id, treatment_id)
);

CREATE TABLE dental_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_id UUID REFERENCES dental_services(id),
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  reminder_email_sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled'))
);

CREATE TABLE dental_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  appointment_id UUID REFERENCES dental_appointments(id),
  service_id UUID REFERENCES dental_services(id),
  consultation_date TIMESTAMP NOT NULL DEFAULT now(),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  administrative_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  reason TEXT,
  diagnosis TEXT,
  clinical_notes TEXT,
  indications TEXT,
  total_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  CHECK (administrative_status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'))
);

CREATE TABLE dental_consultation_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  consultation_id UUID NOT NULL REFERENCES dental_consultations(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES dental_treatments(id),
  service_id UUID REFERENCES dental_services(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE dental_clinical_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  consultation_id UUID REFERENCES dental_consultations(id),
  entry_date TIMESTAMP NOT NULL DEFAULT now(),
  type VARCHAR(40) NOT NULL DEFAULT 'general_note',
  title VARCHAR(255),
  description TEXT,
  diagnosis TEXT,
  clinical_notes TEXT,
  indications TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (type IN ('initial', 'evolution', 'diagnosis', 'procedure_note', 'follow_up', 'general_note'))
);

CREATE TABLE dental_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  consultation_id UUID REFERENCES dental_consultations(id),
  service_id UUID REFERENCES dental_services(id),
  description TEXT,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  pending_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (total_amount >= 0),
  CHECK (paid_amount >= 0),
  CHECK (pending_amount >= 0),
  CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'))
);

CREATE TABLE dental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  charge_id UUID NOT NULL REFERENCES dental_charges(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT now(),
  payment_method VARCHAR(40) NOT NULL,
  reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (amount > 0),
  CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_payment', 'insurance', 'other'))
);

CREATE TABLE dental_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  charge_id UUID NOT NULL REFERENCES dental_charges(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  installment_number INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (amount > 0),
  CHECK (paid_amount >= 0),
  CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  UNIQUE (tenant_id, charge_id, installment_number)
);

CREATE TABLE dental_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id),
  appointment_id UUID REFERENCES dental_appointments(id),
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (channel IN ('email', 'internal')),
  CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);
```

Índices recomendados:

```sql
CREATE INDEX idx_dental_profiles_tenant_customer ON dental_patient_profiles (tenant_id, customer_id);
CREATE INDEX idx_dental_appointments_tenant_date ON dental_appointments (tenant_id, scheduled_start);
CREATE INDEX idx_dental_appointments_tenant_customer ON dental_appointments (tenant_id, customer_id);
CREATE INDEX idx_dental_consultations_tenant_customer ON dental_consultations (tenant_id, customer_id);
CREATE INDEX idx_dental_consultations_tenant_date ON dental_consultations (tenant_id, consultation_date);
CREATE INDEX idx_dental_charges_tenant_customer ON dental_charges (tenant_id, customer_id);
CREATE INDEX idx_dental_charges_tenant_status ON dental_charges (tenant_id, status);
CREATE INDEX idx_dental_payments_tenant_date ON dental_payments (tenant_id, payment_date);
CREATE INDEX idx_dental_installments_tenant_status_due ON dental_installments (tenant_id, status, due_date);
```

---

# 12. Casos de uso

## Dashboard

```txt
getDentalDashboardSummary
getTodayAppointments
getOverduePatients
getDailyCollections
getMonthlyCollections
getRecentConsultations
```

## Pacientes

```txt
createDentalPatientFromCustomer
ensureDentalPatientProfile
getDentalPatientDetail
getPatientClinicalHistory
getPatientPaymentHistory
getPatientDebtSummary
getPatientConsultations
```

## Tratamientos y servicios

```txt
createDentalTreatment
updateDentalTreatment
deactivateDentalTreatment
createDentalService
updateDentalService
calculateDentalServicePrice
assignTreatmentsToService
```

## Agenda

```txt
createDentalAppointment
updateDentalAppointment
cancelDentalAppointment
confirmDentalAppointment
markAppointmentAsNoShow
getAppointmentsByDay
getAppointmentsByMonth
convertAppointmentToConsultation
sendAppointmentReminder
```

## Consultas

```txt
createDentalConsultation
createConsultationFromAppointment
addClinicalHistoryEntry
attachServiceToConsultation
attachTreatmentsToConsultation
completeDentalConsultation
cancelDentalConsultation
getConsultationDetail
```

## Finanzas

```txt
createDentalCharge
createChargeFromConsultation
registerDentalPayment
createInstallmentPlan
payInstallment
getCustomerDebtSummary
getOverdueInstallments
getDentalFinanceSummary
```

---

# 13. Servicios de dominio

## DentalDashboardService

Calcula:

```txt
Citas de hoy.
Pacientes atendidos hoy.
Servicios realizados.
Cobros del día.
Cobros del mes.
Total pendiente.
Clientes en mora.
Cuotas vencidas.
```

## DentalServicePricingService

Calcula precio final de servicios.

```txt
subtotal = supplies_cost + labor_cost
tax_amount = subtotal * tax_rate
profit_amount = subtotal * profit_margin
final_price = subtotal + tax_amount + profit_amount
```

## DentalBillingService

Gestiona:

```txt
Crear cobro.
Registrar pago.
Actualizar saldo pendiente.
Actualizar estado del cobro.
Crear cuotas.
Actualizar cuotas.
Detectar mora.
```

## DentalAppointmentService

Gestiona:

```txt
Crear citas.
Validar horarios.
Confirmar citas.
Reprogramar.
Convertir cita en consulta.
Generar recordatorios.
```

## DentalClinicalHistoryService

Gestiona:

```txt
Crear perfil clínico.
Registrar evolución.
Vincular consulta con historia clínica.
Consultar historial completo del paciente.
```

---

# 14. Endpoints sugeridos

## Dashboard

```http
GET /dental/dashboard
GET /dental/dashboard/today
GET /dental/dashboard/finance
```

## Pacientes

```http
GET /dental/patients
POST /dental/patients
GET /dental/patients/:customerId
PATCH /dental/patients/:customerId/profile
GET /dental/patients/:customerId/clinical-history
GET /dental/patients/:customerId/consultations
GET /dental/patients/:customerId/payments
GET /dental/patients/:customerId/debt
```

## Tratamientos

```http
GET /dental/treatments
POST /dental/treatments
PATCH /dental/treatments/:id
DELETE /dental/treatments/:id
```

## Servicios

```http
GET /dental/services
POST /dental/services
GET /dental/services/:id
PATCH /dental/services/:id
DELETE /dental/services/:id
POST /dental/services/:id/treatments
```

## Agenda

```http
GET /dental/appointments
GET /dental/appointments/day
GET /dental/appointments/month
POST /dental/appointments
PATCH /dental/appointments/:id
POST /dental/appointments/:id/confirm
POST /dental/appointments/:id/cancel
POST /dental/appointments/:id/no-show
POST /dental/appointments/:id/convert-to-consultation
POST /dental/appointments/:id/send-reminder
```

## Consultas

```http
GET /dental/consultations
POST /dental/consultations
GET /dental/consultations/:id
PATCH /dental/consultations/:id
POST /dental/consultations/:id/clinical-history
POST /dental/consultations/:id/treatments
POST /dental/consultations/:id/complete
POST /dental/consultations/:id/cancel
POST /dental/consultations/:id/create-charge
```

## Finanzas

```http
GET /dental/finance/summary
GET /dental/charges
POST /dental/charges
GET /dental/charges/:id
POST /dental/charges/:id/payments
POST /dental/charges/:id/installments
GET /dental/installments/overdue
POST /dental/installments/:id/pay
GET /dental/payments
```

---

# 15. Flujos principales

## Crear cita y convertirla en consulta

```txt
1. Crear cita desde Agenda.
2. Seleccionar paciente existente o crear nuevo.
3. Asociar servicio estimado.
4. Enviar correo de confirmación.
5. Abrir cita el día de atención.
6. Crear consulta desde cita.
7. Registrar evolución clínica.
8. Aplicar servicios/tratamientos.
9. Generar cobro.
10. Registrar pago completo o parcial.
11. Crear cuotas si corresponde.
12. Finalizar consulta.
```

## Crear consulta directa

```txt
1. Entrar en Consultas.
2. Crear nueva consulta.
3. Seleccionar o crear paciente.
4. Crear perfil clínico si no existe.
5. Registrar motivo, diagnóstico y notas.
6. Seleccionar servicio.
7. Aplicar tratamientos.
8. Calcular monto.
9. Registrar pago.
10. Crear historia clínica.
11. Finalizar consulta.
```

## Pago por cuotas

```txt
1. Crear cobro.
2. Registrar pago parcial.
3. Calcular saldo pendiente.
4. Crear plan de cuotas.
5. Cada cuota tiene fecha de vencimiento.
6. Si vence, queda overdue.
7. Al pagar cuota, se registra pago.
8. Al completar monto, el cobro queda paid.
```

---

# 16. Reglas de negocio

## Pacientes

```txt
Un paciente es un customer con perfil dental opcional.
No duplicar customers si el paciente ya existe.
Un customer puede tener un solo dental_patient_profile.
```

## Historia clínica

```txt
Toda consulta completada debe poder generar una entrada clínica.
La historia clínica no debe eliminarse físicamente.
Editar entradas clínicas debe ser controlado.
Se recomienda auditoría futura.
```

## Tratamientos y servicios

```txt
Un servicio puede componerse de varios tratamientos.
Un tratamiento puede estar en varios servicios.
Un servicio inactivo no debe seleccionarse en nuevas consultas.
Un tratamiento inactivo no debe agregarse a nuevos servicios.
```

## Citas

```txt
Una cita debe tener paciente, fecha y hora.
Una cita cancelada no debe convertirse en consulta.
Una cita convertida debe mantener referencia a la consulta.
Una cita puede ser reprogramada.
```

## Consultas

```txt
Una consulta debe tener paciente.
Puede tener servicio o tratamientos manuales.
Una consulta completada debe tener estado completed.
Una consulta con deuda debe reflejar estado administrativo unpaid o partially_paid.
```

## Cobros

```txt
Un cobro puede existir sin consulta si se crea desde Finanzas.
Un cobro asociado a consulta debe mantener trazabilidad.
Los montos se manejan como enteros.
No usar float para dinero.
pending_amount debe actualizarse con cada pago.
```

## Cuotas

```txt
La suma de cuotas no debe exceder el total acordado.
Una cuota vencida con saldo pendiente debe quedar overdue.
El pago de una cuota debe crear un dental_payment.
```

## Multi-tenant

```txt
Todas las tablas deben incluir tenant_id si Nexora trabaja con aislamiento por tenant.
Todas las consultas deben filtrar por tenant_id.
No exponer datos entre tenants.
```

---

# 17. Mejoras futuras

1. Odontograma visual.
2. Presupuestos odontológicos.
3. Planes de tratamiento por fases.
4. Adjuntos clínicos: radiografías, fotos, documentos.
5. Consentimiento informado.
6. Recetas e indicaciones.
7. WhatsApp/SMS para recordatorios.
8. Integración con financial-core mediante eventos.
9. Auditoría clínica.
10. Roles y permisos: admin, dentist, assistant, receptionist, finance.
11. Reportes de productividad.
12. Seguimiento post-tratamiento.

---

# 18. Navegación UI

```txt
Dental
├── Dashboard
├── Pacientes
├── Consultas
├── Agenda
├── Finanzas
└── Configuración
    ├── Tratamientos
    └── Servicios
```

---

# 19. Criterios de aceptación

## Dashboard

```txt
Debe mostrar citas del día.
Debe mostrar total cobrado del día.
Debe mostrar total cobrado del mes.
Debe mostrar pacientes con cuotas vencidas.
Debe mostrar total pendiente por cobrar.
```

## Pacientes

```txt
Debe reutilizar customers.
Debe crear perfil dental si no existe.
Debe mostrar historia clínica completa.
Debe mostrar historial de pagos.
Debe mostrar deuda total.
Debe mostrar tratamientos/servicios realizados.
```

## Configuración

```txt
Debe crear tratamientos.
Debe crear servicios.
Debe asociar tratamientos a servicios.
Debe calcular precio final por costos, impuestos y ganancia.
Debe permitir precio manual.
```

## Consultas

```txt
Debe crear consulta con paciente nuevo o existente.
Debe mostrar historial clínico antes de añadir evolución.
Debe asociar servicio.
Debe asociar tratamientos.
Debe generar cobro.
Debe permitir pago completo o parcial.
Debe permitir crear cuotas.
```

## Agenda

```txt
Debe permitir vista mensual.
Debe permitir vista diaria por horas.
Debe crear y editar citas.
Debe confirmar, cancelar y marcar no asistió.
Debe convertir cita en consulta.
Debe enviar correo de recordatorio.
```

## Finanzas

```txt
Debe listar cobros.
Debe crear cobro manual.
Debe registrar pagos.
Debe gestionar cuotas.
Debe mostrar cobros diarios y mensuales.
Debe mostrar pacientes con deuda.
```

---

# 20. Plan de implementación por fases

## Fase 1 — Auditoría de Nexora

```txt
Revisar core de taller.
Revisar financial-core.
Detectar estructura de carpetas.
Detectar rutas/controllers.
Detectar services/use cases.
Detectar repositories.
Detectar manejo de tenants.
Detectar integración con customers.
Detectar sistema de notificaciones/email.
```

Entrega:

```txt
Ubicación exacta de dental-core dentro de Nexora.
```

## Fase 2 — Base de datos

```txt
Crear migraciones dental_*.
Relacionar con customers.
Agregar índices.
Agregar constraints.
Crear seeds iniciales.
Validar rollback.
```

## Fase 3 — Configuración

```txt
CRUD de tratamientos.
CRUD de servicios.
Asociación servicio-tratamientos.
Cálculo de precio.
Validaciones.
Tests.
```

## Fase 4 — Pacientes e historia clínica

```txt
Integrar con customers.
Crear dental_patient_profile.
Obtener detalle de paciente.
Crear entradas de historia clínica.
Obtener historial clínico.
Obtener historial administrativo.
```

## Fase 5 — Agenda

```txt
Crear citas.
Editar citas.
Confirmar/cancelar/no-show.
Consultar por día.
Consultar por mes.
Convertir cita en consulta.
Preparar notificaciones por correo.
```

## Fase 6 — Consultas

```txt
Crear consulta.
Crear consulta desde cita.
Asociar paciente.
Asociar servicio.
Asociar tratamientos.
Registrar evolución clínica.
Completar consulta.
Generar cobro desde consulta.
```

## Fase 7 — Finanzas

```txt
Crear cobro.
Registrar pago.
Soportar pago parcial.
Crear plan de cuotas.
Pagar cuota.
Actualizar estados.
Detectar mora.
Crear resumen financiero.
```

## Fase 8 — Dashboard

```txt
Endpoint de dashboard.
Citas del día.
Cobros del día.
Cobros del mes.
Pendientes.
Mora.
Servicios atendidos.
Consultas recientes.
```

## Fase 9 — Frontend/UI

```txt
Crear navegación Dental.
Dashboard dental.
Pacientes.
Detalle de paciente con tabs.
Configuración de tratamientos.
Configuración de servicios.
Consultas.
Agenda calendario.
Finanzas.
Estados loading/error/empty.
```

## Fase 10 — Notificaciones

```txt
Enviar correo al crear cita.
Enviar recordatorio.
Registrar dental_notifications.
Manejar errores.
Evitar duplicados.
Permitir configuración por tenant.
```

## Fase 11 — Testing

```txt
Tests de pricing.
Tests de billing.
Tests de cuotas.
Tests de mora.
Tests de creación de consulta.
Tests de cita a consulta.
Tests de aislamiento tenant.
Tests de permisos si aplica.
```

---

# 21. Prompt principal para Codex

```txt
Actúa como Software Architect y Fullstack Developer senior.

Necesito implementar un nuevo módulo/core llamado dental-core dentro de la app Nexora.

Contexto:
Nexora es una app modular con múltiples cores. El nuevo core debe implementarse siguiendo la misma arquitectura, convenciones y estilo de implementación que ya usan el core de taller y el core de finanzas personales.

Objetivo:
Permitir que un odontólogo gestione pacientes, citas, historia clínica, tratamientos, servicios, consultas, cobros, pagos parciales, cuotas y mora.

Importante:
- El sistema ya tiene una tabla customers en el schema tenant.
- No debes duplicar customers.
- Los pacientes odontológicos deben reutilizar customers y agregar datos clínicos mediante dental_patient_profiles.
- Todas las tablas deben respetar tenant_id o el mecanismo multi-tenant existente en Nexora.
- Los montos deben manejarse como enteros.
- El módulo debe mantener trazabilidad clínica y administrativa.
- La UI debe seguir el patrón visual y funcional de Nexora.
- Implementar tal como están implementados el core de taller y el core de finanzas personales.

Primera tarea:
1. Analiza la estructura actual de Nexora.
2. Revisa cómo están implementados el core de taller y el core de finanzas personales.
3. Identifica convenciones de carpetas, nombres, rutas, servicios, repositorios, modelos, migraciones, hooks y componentes.
4. Propón la ubicación exacta del dental-core.
5. Luego implementa el MVP por fases.

Alcance MVP:
- Dashboard dental.
- Pacientes usando customers.
- Perfil clínico dental.
- Historia clínica.
- Tratamientos.
- Servicios.
- Agenda de citas.
- Consultas.
- Cobros.
- Pagos parciales.
- Cuotas.
- Mora.
- Notificaciones por correo para citas.

Entidades principales:
- dental_patient_profiles
- dental_clinical_history_entries
- dental_treatments
- dental_services
- dental_service_treatments
- dental_appointments
- dental_consultations
- dental_consultation_treatments
- dental_charges
- dental_payments
- dental_installments
- dental_notifications

Pantallas:
- Dashboard.
- Pacientes.
- Detalle de paciente.
- Historia clínica.
- Configuración de tratamientos.
- Configuración de servicios.
- Consultas.
- Agenda.
- Finanzas.

Reglas de negocio:
- Un customer puede tener un solo dental_patient_profile.
- Una cita puede convertirse en consulta.
- Una consulta puede generar historia clínica.
- Una consulta puede generar un cobro.
- Un cobro puede pagarse completo o parcial.
- Un cobro parcial puede generar cuotas.
- Una cuota vencida con saldo pendiente debe marcarse como overdue.
- El dashboard debe mostrar citas del día, cobros, mora, cuotas pendientes y servicios atendidos.
- No usar floats para dinero.
- No exponer datos entre tenants.

Entrega:
1. Migraciones.
2. Modelos/entidades.
3. DTOs/schemas.
4. Repositories.
5. Services/use cases.
6. Controllers/routes.
7. Componentes/páginas frontend.
8. Validaciones.
9. Tests.
10. Seeds iniciales.
11. Documentación breve de uso.
```

---

# 22. Prompt de revisión para Codex

```txt
Revisa la implementación del dental-core en Nexora.

Verifica:
1. Que reutilice customers correctamente.
2. Que no duplique datos generales del paciente.
3. Que todas las tablas respeten tenant_id o el mecanismo tenant existente.
4. Que los cobros y pagos mantengan consistencia.
5. Que los pagos parciales actualicen pending_amount.
6. Que las cuotas se creen y paguen correctamente.
7. Que las cuotas vencidas puedan marcarse como overdue.
8. Que una cita pueda convertirse en consulta.
9. Que una consulta pueda generar historia clínica y cobro.
10. Que el dashboard no calcule lógica financiera directamente en UI.
11. Que existan tests de pricing, billing, cuotas y agenda.
12. Que la UI siga las convenciones de Nexora.
13. Que no haya acoplamiento innecesario con otros cores.

Entrega:
- Problemas encontrados.
- Riesgos.
- Refactors recomendados.
- Cambios concretos a aplicar.
```

---

# 23. Seeds iniciales

## Tratamientos

```txt
Consulta diagnóstica
Limpieza dental
Extracción simple
Restauración dental
Tratamiento de conducto
Ortodoncia
Control de ortodoncia
Blanqueamiento dental
Radiografía
Implante dental
```

## Servicios

```txt
Consulta odontológica
Consulta + limpieza
Extracción simple
Restauración dental básica
Inicio de ortodoncia
Control mensual de ortodoncia
Tratamiento de conducto
Blanqueamiento dental
```

---

# 24. Riesgos técnicos

## Riesgo 1: Mezclar customer con paciente clínico

Solución:

```txt
customers = datos generales
dental_patient_profiles = datos clínicos
```

## Riesgo 2: Cobros inconsistentes

Solución:

```txt
Centralizar pagos en DentalBillingService.
No actualizar paid_amount manualmente desde UI.
```

## Riesgo 3: Exponer datos entre tenants

Solución:

```txt
Todas las consultas deben filtrar por tenant_id.
```

## Riesgo 4: MVP demasiado grande

Solución:

```txt
Primero resolver pacientes, citas, consultas, servicios y pagos.
Dejar odontograma, recetas, documentos y seguros para fases futuras.
```

## Riesgo 5: Notificaciones duplicadas

Solución:

```txt
Registrar dental_notifications.
Guardar status, sent_at y error_message.
Evitar enviar correos duplicados.
```

## Riesgo 6: Historia clínica sin auditoría

Solución:

```txt
No eliminar físicamente entradas clínicas.
Agregar auditoría futura.
Restringir edición según rol.
```

---

# 25. Checklist final

## Backend

```txt
[ ] Migraciones dental_* creadas.
[ ] Relación con customers implementada.
[ ] Tratamientos CRUD.
[ ] Servicios CRUD.
[ ] Pricing service.
[ ] Perfil dental de paciente.
[ ] Historia clínica.
[ ] Agenda.
[ ] Conversión cita → consulta.
[ ] Consultas.
[ ] Cobros.
[ ] Pagos parciales.
[ ] Cuotas.
[ ] Mora.
[ ] Dashboard.
[ ] Notificaciones por correo.
```

## Frontend

```txt
[ ] Navegación Dental.
[ ] Dashboard dental.
[ ] Pacientes.
[ ] Detalle de paciente.
[ ] Historia clínica.
[ ] Configuración tratamientos.
[ ] Configuración servicios.
[ ] Agenda calendario.
[ ] Consultas.
[ ] Finanzas.
[ ] Modales de pago.
[ ] Estados loading/error/empty.
```

## Calidad

```txt
[ ] Tests de pricing.
[ ] Tests de billing.
[ ] Tests de cuotas.
[ ] Tests de citas.
[ ] Tests de consultas.
[ ] Tests de tenant isolation.
[ ] Validaciones de formularios.
[ ] Manejo de errores.
[ ] Seeds iniciales.
[ ] Documentación.
```

---

# 26. Flujo recomendado para validar el MVP

Implementar primero este flujo completo:

```txt
Configurar tratamiento
→ Configurar servicio
→ Crear paciente
→ Crear cita
→ Convertir cita en consulta
→ Aplicar servicio
→ Generar cobro
→ Registrar pago/cuotas
→ Ver dashboard
```

Este flujo valida el corazón funcional del módulo odontológico.
