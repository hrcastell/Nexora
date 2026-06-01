# Nexora Financial Core — Plan de integración e implementación

## 1. Contexto

Nexora es una aplicación modular compuesta por múltiples cores/módulos.  
Este documento define la integración de un nuevo módulo llamado **Financial Core** orientado a gestionar el flujo económico mensual de una persona.

El objetivo principal es reemplazar o complementar una planilla mensual de presupuesto con un sistema automatizado, trazable y claro, que permita entender:

- Cuánto dinero entra.
- Cuánto dinero sale.
- Qué estaba previsto.
- Qué ocurrió realmente.
- Qué categorías se desviaron.
- Cuánto queda disponible.
- Qué tan saludable fue el mes financiero.

Este módulo debe integrarse a Nexora respetando la arquitectura existente y evitando acoplamiento innecesario con otros cores.

---

## 2. Nombre del módulo

Nombre recomendado:

```txt
financial-core
```

Nombres alternativos:

```txt
salary-flow
personal-finance
budget-core
```

Se recomienda `financial-core` porque permite escalar más allá del salario hacia cuentas, deudas, metas, importaciones, reportes e inteligencia financiera.

---

## 3. Objetivo funcional

El módulo debe permitir:

1. Crear períodos financieros mensuales.
2. Definir categorías financieras.
3. Crear presupuestos previstos por categoría.
4. Registrar ingresos reales.
5. Registrar gastos reales.
6. Registrar ahorro como categoría especial de tipo `saving`.
7. Calcular resumen mensual.
8. Comparar previsto vs real.
9. Detectar desviaciones.
10. Mostrar trazabilidad de cada monto.
11. Preparar futuras integraciones con dashboard, notificaciones, importación e insights.

---

## 4. Alcance del MVP

### Incluido en MVP 1

- Crear período financiero mensual.
- Crear categorías.
- Crear presupuesto por categoría.
- Registrar transacciones.
- Obtener resumen mensual.
- Obtener desglose por categoría.
- Obtener desviaciones.
- Cerrar período financiero.
- Validar aislamiento de datos por usuario.
- Exponer endpoints REST o equivalentes según arquitectura de Nexora.

### Fuera de MVP 1

- Cuentas bancarias.
- Tarjetas de crédito.
- Sincronización bancaria.
- OCR.
- Importación automática desde bancos.
- IA avanzada.
- Proyecciones complejas.
- Metas financieras.
- Patrimonio neto.
- Transferencias entre cuentas.

---

## 5. Integración con otros cores de Nexora

### Auth/User Core

El Financial Core depende del usuario autenticado.

Todas las entidades deben contener `userId`.

Reglas:

- Un usuario solo puede acceder a sus propios datos financieros.
- Todas las queries deben filtrar por `userId`.
- No debe existir período financiero sin usuario.
- No debe permitirse duplicar un período para el mismo usuario, año y mes.

Ejemplo de restricción:

```sql
UNIQUE(user_id, year, month)
```

---

### Dashboard Core

El dashboard global de Nexora puede consumir datos financieros ya calculados.

El dashboard **no debe calcular** ingresos, gastos, saldos ni desviaciones directamente.

Correcto:

```txt
Dashboard Core -> FinancialSummaryService -> Resultado ya procesado
```

Incorrecto:

```txt
Dashboard Core -> Consulta transactions y calcula totales manualmente
```

Widgets sugeridos:

- Saldo final estimado.
- Ingresos reales.
- Gastos reales.
- Ahorro real.
- Porcentaje de ahorro.
- Categorías excedidas.
- Disponible del mes.
- Comparación previsto vs real.

---

### Notification Core

En MVP 1 no es obligatorio emitir notificaciones, pero el módulo debe quedar preparado para eventos.

Eventos futuros recomendados:

```txt
financial.period.created
financial.transaction.created
financial.budget.exceeded
financial.period.closed
financial.low.available.balance
financial.savings.goal.reached
```

Ejemplo:

```json
{
  "event": "financial.budget.exceeded",
  "userId": "user-123",
  "periodId": "period-456",
  "categoryId": "category-789",
  "categoryName": "Alimentación",
  "plannedAmount": 200000,
  "realAmount": 235000,
  "exceededBy": 35000
}
```

---

### Settings Core

El Financial Core puede consumir configuraciones del usuario:

```json
{
  "currency": "CLP",
  "financialMonthStartDay": 1,
  "salaryPaymentDay": 28,
  "defaultSavingsPercentage": 10
}
```

Para MVP 1, si estas configuraciones no existen, usar valores por defecto:

```txt
currency = CLP
financialMonthStartDay = 1
```

---

## 6. Principios de arquitectura

1. El Financial Core debe ser dueño de su lógica de negocio.
2. Otros módulos deben consumir servicios o endpoints del core, no sus tablas directamente.
3. El saldo final debe calcularse, no editarse manualmente.
4. Los montos deben manejarse como enteros para evitar errores decimales.
5. Todo dato financiero debe estar asociado a `userId`.
6. Un período cerrado no debe aceptar nuevas transacciones ni modificaciones críticas.
7. El ahorro se manejará inicialmente como categoría especial de tipo `saving`.
8. El diseño debe permitir evolucionar hacia cuentas y transferencias en una fase posterior.

---

## 7. Estructura sugerida del módulo

Ajustar nombres y convenciones al stack real de Nexora.

```txt
src/
  modules/
    financial-core/
      domain/
        entities/
          financial-period.entity.ts
          financial-category.entity.ts
          budget-plan.entity.ts
          financial-transaction.entity.ts

        value-objects/
          money.vo.ts
          period.vo.ts

        services/
          financial-summary.service.ts
          budget-deviation.service.ts
          cashflow-projection.service.ts

        events/
          transaction-created.event.ts
          budget-exceeded.event.ts
          period-closed.event.ts

      application/
        use-cases/
          create-financial-period.usecase.ts
          get-current-financial-period.usecase.ts
          create-financial-category.usecase.ts
          create-budget-plan.usecase.ts
          register-transaction.usecase.ts
          get-financial-summary.usecase.ts
          get-budget-breakdown.usecase.ts
          get-budget-deviations.usecase.ts
          close-financial-period.usecase.ts

      infrastructure/
        repositories/
          financial-period.repository.ts
          financial-category.repository.ts
          budget-plan.repository.ts
          financial-transaction.repository.ts

        persistence/
          migrations/
          schemas/

        mappers/
          financial-period.mapper.ts
          financial-category.mapper.ts
          budget-plan.mapper.ts
          financial-transaction.mapper.ts

      presentation/
        controllers/
          financial-period.controller.ts
          financial-category.controller.ts
          budget-plan.controller.ts
          financial-transaction.controller.ts
          financial-summary.controller.ts

        dto/
          create-financial-period.dto.ts
          create-financial-category.dto.ts
          create-budget-plan.dto.ts
          create-financial-transaction.dto.ts
```

Si Nexora usa otra estructura, adaptar el módulo manteniendo la separación:

```txt
domain
application
infrastructure
presentation
```

---

## 8. Modelo de dominio

### FinancialPeriod

Representa un mes financiero de un usuario.

```ts
type FinancialPeriodStatus = 'open' | 'closed' | 'archived';

interface FinancialPeriod {
  id: string;
  userId: string;
  year: number;
  month: number;
  initialBalance: number;
  status: FinancialPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

Reglas:

- `month` debe estar entre 1 y 12.
- `year` debe ser válido.
- `initialBalance` debe ser entero.
- No puede haber dos períodos con el mismo `userId`, `year` y `month`.
- Solo períodos `open` admiten transacciones nuevas.

---

### FinancialCategory

Representa una categoría financiera configurable por usuario.

```ts
type FinancialCategoryType = 'income' | 'expense' | 'saving' | 'debt' | 'transfer';

interface FinancialCategory {
  id: string;
  userId: string;
  name: string;
  type: FinancialCategoryType;
  parentId?: string | null;
  isFixed: boolean;
  isEssential: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Reglas:

- Toda categoría pertenece a un usuario.
- Una categoría inactiva no debe usarse en nuevas transacciones.
- `saving` se usará en MVP como ahorro planificado o real.
- `transfer` queda reservado para fases futuras.

---

### BudgetPlan

Representa el presupuesto previsto de una categoría dentro de un período.

```ts
interface BudgetPlan {
  id: string;
  userId: string;
  periodId: string;
  categoryId: string;
  plannedAmount: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Reglas:

- `plannedAmount` debe ser entero.
- No debe haber dos planes para la misma combinación `userId`, `periodId`, `categoryId`.
- Puede existir categoría sin presupuesto; en reportes debe aparecer como `no_plan`.

---

### FinancialTransaction

Representa un movimiento real de dinero.

```ts
type FinancialTransactionType = 'income' | 'expense' | 'saving' | 'transfer';

interface FinancialTransaction {
  id: string;
  userId: string;
  periodId: string;
  categoryId: string;
  type: FinancialTransactionType;
  amount: number;
  date: Date;
  description?: string | null;
  paymentMethod?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Reglas:

- Toda transacción debe tener `userId`.
- Toda transacción debe pertenecer a un período.
- Toda transacción debe tener categoría.
- `amount` debe ser entero y mayor que cero.
- `income` suma al flujo.
- `expense` resta al flujo.
- `saving` se trata como salida de dinero disponible, pero se identifica como ahorro.
- No se permiten transacciones en períodos cerrados.

---

## 9. Modelo de base de datos sugerido

> Adaptar sintaxis a ORM/migration system usado por Nexora.

### financial_periods

```sql
CREATE TABLE financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  initial_balance INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_financial_period_month CHECK (month >= 1 AND month <= 12),
  CONSTRAINT chk_financial_period_status CHECK (status IN ('open', 'closed', 'archived')),
  CONSTRAINT uq_financial_period_user_year_month UNIQUE (user_id, year, month)
);
```

---

### financial_categories

```sql
CREATE TABLE financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL,
  parent_id UUID NULL,
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  is_essential BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_financial_category_type CHECK (type IN ('income', 'expense', 'saving', 'debt', 'transfer')),
  CONSTRAINT fk_financial_category_parent FOREIGN KEY (parent_id) REFERENCES financial_categories(id)
);
```

---

### budget_plans

```sql
CREATE TABLE budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_id UUID NOT NULL,
  category_id UUID NOT NULL,
  planned_amount INTEGER NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_budget_plan_amount CHECK (planned_amount >= 0),
  CONSTRAINT fk_budget_plan_period FOREIGN KEY (period_id) REFERENCES financial_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_budget_plan_category FOREIGN KEY (category_id) REFERENCES financial_categories(id),
  CONSTRAINT uq_budget_plan_user_period_category UNIQUE (user_id, period_id, category_id)
);
```

---

### financial_transactions

```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_id UUID NOT NULL,
  category_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  date DATE NOT NULL,
  description TEXT NULL,
  payment_method VARCHAR(80) NULL,
  source VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_financial_transaction_type CHECK (type IN ('income', 'expense', 'saving', 'transfer')),
  CONSTRAINT chk_financial_transaction_amount CHECK (amount > 0),
  CONSTRAINT fk_financial_transaction_period FOREIGN KEY (period_id) REFERENCES financial_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_financial_transaction_category FOREIGN KEY (category_id) REFERENCES financial_categories(id)
);
```

---

### Índices recomendados

```sql
CREATE INDEX idx_financial_periods_user ON financial_periods(user_id);
CREATE INDEX idx_financial_periods_user_status ON financial_periods(user_id, status);

CREATE INDEX idx_financial_categories_user ON financial_categories(user_id);
CREATE INDEX idx_financial_categories_user_type ON financial_categories(user_id, type);

CREATE INDEX idx_budget_plans_user_period ON budget_plans(user_id, period_id);
CREATE INDEX idx_budget_plans_category ON budget_plans(category_id);

CREATE INDEX idx_financial_transactions_user_period ON financial_transactions(user_id, period_id);
CREATE INDEX idx_financial_transactions_user_period_type ON financial_transactions(user_id, period_id, type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(date);
```

> Si existe tabla `users`, agregar foreign keys hacia `users(id)` según convención real del proyecto.

---

## 10. Servicios de dominio

### FinancialSummaryService

Responsable de calcular el resumen financiero del período.

Entrada:

```ts
interface BuildSummaryInput {
  period: FinancialPeriod;
  categories: FinancialCategory[];
  budgetPlans: BudgetPlan[];
  transactions: FinancialTransaction[];
}
```

Salida:

```ts
interface FinancialSummary {
  periodId: string;
  initialBalance: number;

  plannedIncome: number;
  realIncome: number;
  incomeDifference: number;

  plannedExpenses: number;
  realExpenses: number;
  expenseDifference: number;

  plannedSavings: number;
  realSavings: number;
  savingsDifference: number;

  netCashflow: number;
  finalBalance: number;

  savingsRate: number;
  expenseExecutionRate: number;

  categoryBreakdown: CategoryBreakdown[];
}
```

Reglas de cálculo:

```txt
plannedIncome = suma plannedAmount de categorías tipo income
realIncome = suma transactions tipo income

plannedExpenses = suma plannedAmount de categorías tipo expense + saving + debt
realExpenses = suma transactions tipo expense + saving + debt

plannedSavings = suma plannedAmount de categorías tipo saving
realSavings = suma transactions tipo saving

incomeDifference = realIncome - plannedIncome
expenseDifference = plannedExpenses - realExpenses
savingsDifference = realSavings - plannedSavings

netCashflow = realIncome - realExpenses
finalBalance = initialBalance + netCashflow

savingsRate = realSavings / realIncome * 100
expenseExecutionRate = realExpenses / plannedExpenses * 100
```

Consideraciones:

- Si `realIncome` es cero, `savingsRate` debe ser cero.
- Si `plannedExpenses` es cero, `expenseExecutionRate` debe ser cero.
- Redondear porcentajes a 2 decimales.
- No usar floats para dinero; los porcentajes sí pueden ser number/decimal.

---

### BudgetDeviationService

Responsable de detectar desviaciones por categoría.

Salida por categoría:

```ts
type BudgetStatus = 'under_budget' | 'on_track' | 'over_budget' | 'no_plan';

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryType: FinancialCategoryType;
  plannedAmount: number;
  realAmount: number;
  difference: number;
  status: BudgetStatus;
}
```

Reglas:

Para categorías de gasto, ahorro y deuda:

```txt
difference = plannedAmount - realAmount
```

- Si no hay presupuesto: `no_plan`.
- Si `realAmount > plannedAmount`: `over_budget`.
- Si `realAmount === plannedAmount`: `on_track`.
- Si `realAmount < plannedAmount`: `under_budget`.

Para categorías de ingreso:

```txt
difference = realAmount - plannedAmount
```

- Si no hay presupuesto: `no_plan`.
- Si `realAmount >= plannedAmount`: `on_track`.
- Si `realAmount < plannedAmount`: `under_budget`.

---

## 11. Casos de uso

### createFinancialPeriod

Debe:

1. Recibir `userId`, `year`, `month`, `initialBalance`.
2. Validar mes entre 1 y 12.
3. Validar que no exista período para mismo usuario/año/mes.
4. Crear período con estado `open`.

Payload ejemplo:

```json
{
  "year": 2025,
  "month": 4,
  "initialBalance": 0
}
```

---

### getCurrentFinancialPeriod

Debe:

1. Obtener período actual del usuario.
2. Determinar año/mes según fecha actual o configuración del usuario.
3. Retornar período si existe.
4. Si no existe, retornar `null` o error controlado según convención del proyecto.

---

### createFinancialCategory

Debe:

1. Recibir `userId`, `name`, `type`, `isFixed`, `isEssential`.
2. Validar tipo permitido.
3. Crear categoría activa.

Payload ejemplo:

```json
{
  "name": "Alquiler",
  "type": "expense",
  "isFixed": true,
  "isEssential": true
}
```

---

### createBudgetPlan

Debe:

1. Recibir `periodId`, `categoryId`, `plannedAmount`.
2. Validar que período pertenezca al usuario.
3. Validar que categoría pertenezca al usuario.
4. Validar que período esté abierto.
5. Evitar duplicados por período y categoría.
6. Crear presupuesto.

Payload ejemplo:

```json
{
  "categoryId": "uuid",
  "plannedAmount": 330000,
  "notes": "Arriendo mensual"
}
```

---

### registerTransaction

Debe:

1. Recibir `periodId`, `categoryId`, `type`, `amount`, `date`, `description`.
2. Validar usuario.
3. Validar período abierto.
4. Validar categoría activa.
5. Validar monto mayor a cero.
6. Crear transacción.
7. Opcional: emitir evento `financial.transaction.created`.
8. Opcional: evaluar si categoría excedió presupuesto.

Payload ejemplo:

```json
{
  "categoryId": "uuid",
  "type": "expense",
  "amount": 340000,
  "date": "2025-04-28",
  "description": "Pago alquiler abril",
  "paymentMethod": "transferencia",
  "source": "manual"
}
```

---

### getFinancialSummary

Debe:

1. Validar que el período pertenezca al usuario.
2. Obtener período.
3. Obtener categorías del usuario.
4. Obtener presupuestos del período.
5. Obtener transacciones del período.
6. Calcular resumen con `FinancialSummaryService`.
7. Retornar resultado.

---

### getBudgetBreakdown

Debe retornar lista de categorías con:

- Previsto.
- Real.
- Diferencia.
- Estado.
- Tipo.
- Si es fija.
- Si es esencial.

---

### getBudgetDeviations

Debe retornar solo categorías con desviaciones relevantes:

- `over_budget`
- `under_budget`
- `no_plan`

Se puede ordenar por magnitud de diferencia absoluta descendente.

---

### closeFinancialPeriod

Debe:

1. Validar que el período pertenezca al usuario.
2. Validar que esté abierto.
3. Calcular resumen final.
4. Cambiar estado a `closed`.
5. Opcional: emitir evento `financial.period.closed`.

Regla:

- Un período cerrado no debe permitir nuevas transacciones ni modificaciones de presupuesto.

---

## 12. API sugerida

Adaptar a la convención de rutas real de Nexora.

### Períodos

```http
POST /financial-periods
GET /financial-periods
GET /financial-periods/current
GET /financial-periods/:periodId
POST /financial-periods/:periodId/close
```

### Categorías

```http
POST /financial-categories
GET /financial-categories
PATCH /financial-categories/:categoryId
DELETE /financial-categories/:categoryId
```

### Presupuesto

```http
POST /financial-periods/:periodId/budget-plans
GET /financial-periods/:periodId/budget-plans
PATCH /budget-plans/:budgetPlanId
DELETE /budget-plans/:budgetPlanId
```

### Transacciones

```http
POST /financial-periods/:periodId/transactions
GET /financial-periods/:periodId/transactions
GET /transactions/:transactionId
PATCH /transactions/:transactionId
DELETE /transactions/:transactionId
```

### Resúmenes

```http
GET /financial-periods/:periodId/summary
GET /financial-periods/:periodId/breakdown
GET /financial-periods/:periodId/deviations
GET /financial-periods/:periodId/projection
```

---

## 13. Respuestas JSON sugeridas

### GET /financial-periods/:periodId/summary

```json
{
  "period": {
    "id": "uuid",
    "year": 2025,
    "month": 4,
    "status": "open",
    "initialBalance": 0
  },
  "summary": {
    "plannedIncome": 1200000,
    "realIncome": 1358114,
    "incomeDifference": 158114,
    "plannedExpenses": 1228000,
    "realExpenses": 1012079,
    "expenseDifference": 215921,
    "plannedSavings": 100000,
    "realSavings": 100000,
    "savingsDifference": 0,
    "netCashflow": 346035,
    "finalBalance": 346035,
    "savingsRate": 7.36,
    "expenseExecutionRate": 82.42
  }
}
```

---

### GET /financial-periods/:periodId/breakdown

```json
{
  "items": [
    {
      "categoryId": "uuid",
      "categoryName": "Alquiler",
      "categoryType": "expense",
      "plannedAmount": 330000,
      "realAmount": 340000,
      "difference": -10000,
      "status": "over_budget",
      "isFixed": true,
      "isEssential": true
    },
    {
      "categoryId": "uuid",
      "categoryName": "Streaming",
      "categoryType": "expense",
      "plannedAmount": 85000,
      "realAmount": 69969,
      "difference": 15031,
      "status": "under_budget",
      "isFixed": true,
      "isEssential": false
    }
  ]
}
```

---

## 14. Estados y errores esperados

Usar códigos y formato de error según convención de Nexora.

Errores recomendados:

```txt
FINANCIAL_PERIOD_ALREADY_EXISTS
FINANCIAL_PERIOD_NOT_FOUND
FINANCIAL_PERIOD_CLOSED
FINANCIAL_CATEGORY_NOT_FOUND
FINANCIAL_CATEGORY_INACTIVE
BUDGET_PLAN_ALREADY_EXISTS
TRANSACTION_NOT_FOUND
INVALID_AMOUNT
INVALID_MONTH
UNAUTHORIZED_FINANCIAL_ACCESS
```

Ejemplo:

```json
{
  "code": "FINANCIAL_PERIOD_CLOSED",
  "message": "No se pueden registrar transacciones en un período financiero cerrado."
}
```

---

## 15. Seeds iniciales recomendados

Crear categorías por defecto cuando el usuario active el módulo.

### Ingresos

```json
[
  { "name": "Sueldo", "type": "income", "isFixed": true, "isEssential": true },
  { "name": "Sodexo", "type": "income", "isFixed": false, "isEssential": false },
  { "name": "Bonificaciones", "type": "income", "isFixed": false, "isEssential": false },
  { "name": "Intereses", "type": "income", "isFixed": false, "isEssential": false },
  { "name": "Otros ingresos", "type": "income", "isFixed": false, "isEssential": false }
]
```

### Gastos y ahorro

```json
[
  { "name": "Ahorro - me pago a mí primero", "type": "saving", "isFixed": true, "isEssential": true },
  { "name": "Alquiler", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Préstamos", "type": "debt", "isFixed": true, "isEssential": true },
  { "name": "Plataformas de Streaming", "type": "expense", "isFixed": true, "isEssential": false },
  { "name": "Aporte familiar", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Alimentación", "type": "expense", "isFixed": false, "isEssential": true },
  { "name": "Gasolina", "type": "expense", "isFixed": false, "isEssential": true },
  { "name": "Flujo de efectivo", "type": "expense", "isFixed": false, "isEssential": false },
  { "name": "Peajes", "type": "expense", "isFixed": false, "isEssential": false },
  { "name": "Internet", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Agua", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Luz", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Gas", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Condominio", "type": "expense", "isFixed": true, "isEssential": true },
  { "name": "Estacionamiento", "type": "expense", "isFixed": true, "isEssential": false }
]
```

---

## 16. Datos de prueba inspirados en la planilla actual

Periodo:

```json
{
  "year": 2025,
  "month": 4,
  "initialBalance": 0
}
```

Presupuesto de ingresos:

```json
[
  { "category": "Sueldo", "plannedAmount": 1200000 },
  { "category": "Sodexo", "plannedAmount": 0 },
  { "category": "Bonificaciones", "plannedAmount": 0 },
  { "category": "Intereses", "plannedAmount": 0 },
  { "category": "Otros ingresos", "plannedAmount": 0 }
]
```

Presupuesto de gastos:

```json
[
  { "category": "Ahorro - me pago a mí primero", "plannedAmount": 100000 },
  { "category": "Alquiler", "plannedAmount": 330000 },
  { "category": "Préstamos", "plannedAmount": 185000 },
  { "category": "Plataformas de Streaming", "plannedAmount": 85000 },
  { "category": "Aporte familiar", "plannedAmount": 50000 },
  { "category": "Alimentación", "plannedAmount": 200000 },
  { "category": "Gasolina", "plannedAmount": 28000 },
  { "category": "Flujo de efectivo", "plannedAmount": 20000 },
  { "category": "Peajes", "plannedAmount": 15000 },
  { "category": "Internet", "plannedAmount": 35000 },
  { "category": "Agua", "plannedAmount": 20000 },
  { "category": "Luz", "plannedAmount": 40000 },
  { "category": "Gas", "plannedAmount": 30000 },
  { "category": "Condominio", "plannedAmount": 45000 },
  { "category": "Estacionamiento", "plannedAmount": 30000 }
]
```

Transacciones de ejemplo:

```json
[
  {
    "type": "income",
    "category": "Sueldo",
    "amount": 1358114,
    "date": "2025-04-28",
    "description": "Sueldo abril"
  },
  {
    "type": "saving",
    "category": "Ahorro - me pago a mí primero",
    "amount": 100000,
    "date": "2025-04-28",
    "description": "Ahorro mensual"
  },
  {
    "type": "expense",
    "category": "Alquiler",
    "amount": 340000,
    "date": "2025-04-28",
    "description": "Pago alquiler"
  },
  {
    "type": "debt",
    "category": "Préstamos",
    "amount": 186122,
    "date": "2025-04-28",
    "description": "Pago préstamo"
  },
  {
    "type": "expense",
    "category": "Plataformas de Streaming",
    "amount": 69969,
    "date": "2025-04-28",
    "description": "Suscripciones"
  },
  {
    "type": "expense",
    "category": "Alimentación",
    "amount": 200000,
    "date": "2025-04-28",
    "description": "Presupuesto alimentación"
  },
  {
    "type": "expense",
    "category": "Internet",
    "amount": 18988,
    "date": "2025-04-28",
    "description": "Internet hogar"
  }
]
```

---

## 17. Pantallas recomendadas

### Dashboard financiero mensual

Debe mostrar:

- Saldo inicial.
- Ingresos reales.
- Gastos reales.
- Ahorro real.
- Saldo final estimado.
- Tasa de ahorro.
- Ejecución del gasto.
- Alertas rápidas.

---

### Presupuesto

Tabla:

```txt
Categoría | Previsto | Real | Diferencia | Estado
```

Estados:

```txt
over_budget
under_budget
on_track
no_plan
```

---

### Transacciones

Filtros:

- Fecha.
- Categoría.
- Tipo.
- Monto.
- Método de pago.
- Fuente.
- Descripción.

---

### Insights básicos

Ejemplos:

```txt
Tus ingresos reales superaron lo previsto en 158.114.
Tus gastos reales fueron 215.921 menores a lo previsto.
Tu tasa de ahorro fue 7.36%.
Alquiler superó el presupuesto en 10.000.
```

---

## 18. Criterios de aceptación

### Períodos

- [ ] Se puede crear un período financiero.
- [ ] No se puede crear un período duplicado para mismo usuario/año/mes.
- [ ] Se puede listar períodos del usuario autenticado.
- [ ] No se pueden ver períodos de otro usuario.
- [ ] Se puede cerrar un período abierto.
- [ ] No se puede modificar críticamente un período cerrado.

### Categorías

- [ ] Se puede crear categoría.
- [ ] Se puede listar categorías del usuario.
- [ ] No se puede usar categoría inactiva en nuevas transacciones.
- [ ] Las categorías pertenecen al usuario autenticado.

### Presupuestos

- [ ] Se puede crear presupuesto por categoría.
- [ ] No se puede duplicar presupuesto para misma categoría y período.
- [ ] Se puede obtener presupuesto del período.
- [ ] Categorías sin presupuesto aparecen como `no_plan`.

### Transacciones

- [ ] Se puede registrar ingreso.
- [ ] Se puede registrar gasto.
- [ ] Se puede registrar ahorro.
- [ ] No se puede registrar monto menor o igual a cero.
- [ ] No se puede registrar transacción sin categoría.
- [ ] No se puede registrar transacción en período cerrado.
- [ ] No se puede registrar transacción en período de otro usuario.

### Resumen

- [ ] Calcula ingresos previstos.
- [ ] Calcula ingresos reales.
- [ ] Calcula gastos previstos.
- [ ] Calcula gastos reales.
- [ ] Calcula ahorro previsto.
- [ ] Calcula ahorro real.
- [ ] Calcula flujo neto.
- [ ] Calcula saldo final.
- [ ] Calcula tasa de ahorro.
- [ ] Calcula ejecución del gasto.
- [ ] Calcula diferencias previsto vs real.

### Seguridad multiusuario

- [ ] Todas las queries filtran por `userId`.
- [ ] No hay acceso cruzado entre usuarios.
- [ ] Los IDs en path/body se validan contra el usuario autenticado.

---

## 19. Tests recomendados

### Unit tests

- `FinancialSummaryService`
- `BudgetDeviationService`
- validación de `Money`
- validación de período
- cálculo de porcentajes
- categorías sin presupuesto
- transacciones sin presupuesto
- ingresos sin presupuesto

### Integration tests

- Crear período.
- Crear categoría.
- Crear presupuesto.
- Registrar ingreso.
- Registrar gasto.
- Obtener resumen.
- Cerrar período.
- Intentar registrar transacción en período cerrado.
- Intentar acceder a datos de otro usuario.

### Casos borde

- Ingreso real cero.
- Presupuesto de gastos cero.
- Categoría sin presupuesto.
- Presupuesto sin transacciones.
- Transacciones sin presupuesto.
- Período cerrado.
- Monto inválido.
- Mes inválido.
- Usuario intentando acceder a datos ajenos.

---

## 20. Plan de implementación para Codex

Ejecutar en este orden.

### Paso 1: Inspeccionar arquitectura existente

Antes de crear archivos, analizar:

- Stack.
- Estructura de carpetas.
- Convención de módulos.
- Sistema de rutas/controllers.
- ORM o capa de persistencia.
- Sistema de migraciones.
- Manejo de autenticación.
- Forma de obtener `userId`.
- Convenciones de errores.
- Convenciones de tests.

No introducir una arquitectura incompatible si Nexora ya tiene una convención establecida.

---

### Paso 2: Crear migraciones/modelos

Crear las tablas:

- `financial_periods`
- `financial_categories`
- `budget_plans`
- `financial_transactions`

Agregar constraints e índices.

Si el proyecto usa ORM, crear entidades/modelos equivalentes.

---

### Paso 3: Crear capa de dominio

Crear entidades, tipos y servicios de dominio:

- `FinancialPeriod`
- `FinancialCategory`
- `BudgetPlan`
- `FinancialTransaction`
- `FinancialSummaryService`
- `BudgetDeviationService`

---

### Paso 4: Crear repositories

Crear repositories siguiendo las convenciones de Nexora:

- `FinancialPeriodRepository`
- `FinancialCategoryRepository`
- `BudgetPlanRepository`
- `FinancialTransactionRepository`

Todos los métodos deben recibir o validar `userId`.

---

### Paso 5: Crear casos de uso

Implementar:

- `createFinancialPeriod`
- `getCurrentFinancialPeriod`
- `createFinancialCategory`
- `createBudgetPlan`
- `registerTransaction`
- `getFinancialSummary`
- `getBudgetBreakdown`
- `getBudgetDeviations`
- `closeFinancialPeriod`

---

### Paso 6: Crear API/controllers/routes

Exponer endpoints equivalentes a:

```http
POST /financial-periods
GET /financial-periods
GET /financial-periods/current
GET /financial-periods/:periodId
POST /financial-periods/:periodId/close

POST /financial-categories
GET /financial-categories
PATCH /financial-categories/:categoryId
DELETE /financial-categories/:categoryId

POST /financial-periods/:periodId/budget-plans
GET /financial-periods/:periodId/budget-plans

POST /financial-periods/:periodId/transactions
GET /financial-periods/:periodId/transactions

GET /financial-periods/:periodId/summary
GET /financial-periods/:periodId/breakdown
GET /financial-periods/:periodId/deviations
```

---

### Paso 7: Crear seeds opcionales

Crear categorías por defecto para nuevos usuarios o para activación del módulo.

---

### Paso 8: Crear tests

Crear pruebas unitarias e integración.

Prioridad:

1. Resumen financiero.
2. Desviaciones.
3. Seguridad multiusuario.
4. Período cerrado.
5. Validaciones de monto/categoría/período.

---

### Paso 9: Integrar dashboard

Exponer una función/endpoint que el dashboard pueda consumir:

```http
GET /financial-periods/current/summary
```

Debe retornar datos listos para pintar, no datos crudos.

---

### Paso 10: Documentar

Actualizar README o documentación interna con:

- Entidades.
- Endpoints.
- Reglas de negocio.
- Ejemplos de payload.
- Errores.
- Tests.

---

## 21. Prompt principal para Codex

Usar este prompt dentro del proyecto Nexora:

```txt
Implementa un nuevo módulo llamado financial-core dentro de Nexora.

Primero inspecciona la arquitectura existente del proyecto y adapta la implementación a sus convenciones actuales. No impongas una arquitectura incompatible.

Objetivo:
Crear un core financiero para gestionar flujo económico mensual personal, incluyendo períodos financieros, categorías, presupuestos, transacciones, resumen mensual y desviaciones entre previsto vs real.

Requisitos funcionales:
1. Crear períodos financieros mensuales por usuario.
2. Evitar períodos duplicados para el mismo usuario, año y mes.
3. Crear categorías financieras por usuario.
4. Soportar tipos de categoría/transacción: income, expense, saving, debt, transfer.
5. Crear presupuesto previsto por período y categoría.
6. Registrar transacciones reales.
7. No permitir transacciones en períodos cerrados.
8. Calcular resumen financiero del período.
9. Calcular desglose por categoría.
10. Calcular desviaciones previsto vs real.
11. Cerrar período financiero.
12. Aislar estrictamente datos por userId.

Reglas de negocio:
- Los montos se manejan como enteros.
- income suma al flujo.
- expense, saving y debt restan al flujo disponible.
- saving se trata como ahorro en MVP.
- finalBalance = initialBalance + realIncome - realExpenses.
- Categorías sin presupuesto deben aparecer como no_plan.
- El dashboard no debe calcular datos financieros; debe consumir el summary del financial-core.
- Un período cerrado no permite nuevas transacciones ni modificaciones críticas.

Modelo sugerido:
- financial_periods
- financial_categories
- budget_plans
- financial_transactions

Casos de uso:
- createFinancialPeriod
- getCurrentFinancialPeriod
- createFinancialCategory
- createBudgetPlan
- registerTransaction
- getFinancialSummary
- getBudgetBreakdown
- getBudgetDeviations
- closeFinancialPeriod

Endpoints sugeridos:
- POST /financial-periods
- GET /financial-periods
- GET /financial-periods/current
- GET /financial-periods/:periodId
- POST /financial-periods/:periodId/close
- POST /financial-categories
- GET /financial-categories
- PATCH /financial-categories/:categoryId
- DELETE /financial-categories/:categoryId
- POST /financial-periods/:periodId/budget-plans
- GET /financial-periods/:periodId/budget-plans
- POST /financial-periods/:periodId/transactions
- GET /financial-periods/:periodId/transactions
- GET /financial-periods/:periodId/summary
- GET /financial-periods/:periodId/breakdown
- GET /financial-periods/:periodId/deviations

Entrega esperada:
1. Migraciones/modelos.
2. Entidades o schemas.
3. Repositories.
4. Servicios de dominio.
5. Casos de uso.
6. Controllers/routes.
7. DTOs/validaciones.
8. Errores controlados.
9. Tests unitarios.
10. Tests de integración básicos.
11. Documentación breve de uso.

Criterios técnicos:
- Respetar stack y patrones actuales de Nexora.
- No romper módulos existentes.
- Mantener bajo acoplamiento.
- Todas las queries sensibles deben filtrar por userId.
- Usar nombres claros y consistentes.
- Agregar tests antes de considerar el módulo terminado.
```

---

## 22. Prompt de revisión para Codex después de implementar

```txt
Revisa la implementación del módulo financial-core.

Valida:
1. Que respeta la arquitectura existente de Nexora.
2. Que no hay acceso cruzado entre usuarios.
3. Que todos los endpoints validan userId.
4. Que el período cerrado bloquea transacciones nuevas.
5. Que los cálculos financieros son correctos.
6. Que los montos usan enteros.
7. Que las categorías sin presupuesto aparecen como no_plan.
8. Que el dashboard consume summary y no calcula manualmente.
9. Que existen tests unitarios e integración.
10. Que las migraciones tienen constraints e índices adecuados.

Corrige cualquier problema encontrado y documenta los cambios.
```

---

## 23. Checklist final de implementación

- [ ] Módulo creado siguiendo convenciones de Nexora.
- [ ] Migraciones creadas.
- [ ] Modelos/entities creados.
- [ ] Repositories creados.
- [ ] Servicios de dominio creados.
- [ ] Casos de uso creados.
- [ ] Endpoints creados.
- [ ] Validaciones implementadas.
- [ ] Errores controlados implementados.
- [ ] Tests unitarios implementados.
- [ ] Tests de integración implementados.
- [ ] Seguridad multiusuario validada.
- [ ] Dashboard puede consumir summary.
- [ ] Documentación actualizada.
- [ ] No se rompieron tests existentes.

---

## 24. Notas de diseño importantes

### Sobre el ahorro

En MVP 1, el ahorro se modela como categoría de tipo `saving`.

Esto permite:

- Comparar ahorro previsto vs ahorro real.
- Mostrar tasa de ahorro.
- Mantener el modelo simple.
- Evolucionar después hacia transferencias entre cuentas.

En una fase futura, `saving` puede convertirse en transferencia hacia una cuenta de ahorro.

---

### Sobre el saldo final

El saldo final no debe guardarse manualmente.

Debe calcularse así:

```txt
finalBalance = initialBalance + realIncome - realExpenses
```

Donde:

```txt
realExpenses = expense + saving + debt
```

---

### Sobre la trazabilidad

Todo número mostrado en el resumen debe poder rastrearse hacia:

```txt
summary -> category breakdown -> transactions
```

Ejemplo:

```txt
Gastos reales: 1.012.079
  -> Alquiler: 340.000
    -> Transacción: Pago alquiler abril
```

---

### Sobre el crecimiento futuro

El diseño debe permitir agregar después:

- Cuentas.
- Transferencias.
- Tarjetas.
- Gastos recurrentes.
- Importación desde Excel/CSV.
- Alertas.
- Metas financieras.
- Reportes históricos.
- Insights automáticos.
