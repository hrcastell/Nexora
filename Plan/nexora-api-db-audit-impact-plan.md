# Nexora API ↔ DB Audit — Impact Analysis and Execution Plan

This plan turns the API/table audit findings into a safe execution path for Nexora while the only available database is production on shared cPanel hosting.

## Scope

**Branch context:** `feature/dental-overhaul-v2` including the current working tree at the time of the audit.

**Goal:** Decide what is missing, legacy, safe-empty, or risky before applying any database or API corrections.

**Non-goals:**
- Do not change production directly from this plan.
- Do not delete tables until data presence and functional impact are proven.
- Do not require local PostgreSQL or Docker for this project right now.

## Current Constraints

| Constraint | Impact |
| --- | --- |
| Production DB lives in cPanel/shared hosting | All DB checks must be manually executable and low-risk. |
| No direct DB access for the agent | Evidence is static from code/migrations unless user executes SQL manually. |
| No local DB/Docker planned now | No integration certification locally; rely on read-only SQL and careful rollout. |
| Recent work is on `feature/dental-overhaul-v2` | Main branch is not the source of truth for this analysis. |

## Audit Summary

The static audit did **not** find APIs clearly pointing to non-existent tables when accounting for dynamic tenant SQL:

- `${schema}.table`
- `%I.table`
- `{schema_name}.table`

The main issue is not missing tables. The risk is split across:

1. Tables that require seed data.
2. Transactional tables that may be empty normally.
3. Tables that appear legacy or optional.
4. One functional gap: `appointment_service_products` has read-path evidence but no writer endpoint was found.

## Impact Findings

### 1. Public seed/config tables

| Table | Expected state | Impact if empty | Priority |
| --- | --- | --- | --- |
| `public.module_catalog` | Must have seed data | Module access/menu/guards can fail or hide features. | High |
| `public.module_transactions` | Must have seed data | Permission assignment may be incomplete. | High |
| `public.subscription_plans` | Must have seed data | Company creation/subscription flow may fail or default incorrectly. | Medium |

**Analysis:** These are not populated by normal user activity. If empty, treat it as migration/seed/setup failure.

### 2. Public transactional tables

| Table | Empty can be normal? | Why |
| --- | --- | --- |
| `public.notifications` | Yes | Depends on notification events. |
| `public.notification_preferences` | Yes | Created/updated when users save preferences. |
| `public.payment_agreements` | Yes | Depends on commercial setup. |
| `public.invoices` | Yes | Depends on billing activity. |
| `public.payments_history` | Yes | Depends on registered payments. |

**Analysis:** Empty rows here are not enough evidence of a bug.

### 3. Functional gap candidate: `{schema}.appointment_service_products`

**Finding:** The table is read during appointment → work order conversion, but no clear API writer was found.

**Potential impact:**
- Products/materials attached to appointment services may never persist.
- Work orders generated from appointments may miss product lines.
- Totals may be undercalculated if products are expected in appointments.

**Risk:** Medium-High if the UI/flow expects appointment-level products; Low if the table is reserved for future functionality.

**Decision needed:** Is appointment-level product/material assignment part of the intended Garage workflow?

### 4. Likely unused or optional tables

| Table | Current interpretation | Impact |
| --- | --- | --- |
| `public.company_module_transactions` | Optional/debt; not used by API current authorization model. | Low unless company-specific transaction toggles are planned. |
| `{schema}.dental_notifications` | Likely unused; notifications use `public.notifications`. | Low-Medium due to future confusion. |

### 5. Legacy/deprecated tables

| Table | Reason |
| --- | --- |
| `{schema}.modules` | Deprecated by public module governance. |
| `{schema}.profile_permissions` | Deprecated by `profile_transaction_permissions`. |
| `{schema}.dental_services` | Renamed/replaced by `dental_treatments` in migration 35. |
| `{schema}.dental_service_treatments` | Old clinical/service join removed by overhaul. |
| `{schema}.dental_consultation_services` | Renamed/replaced by `dental_consultation_treatments`. |

**Rule:** Do not drop these until production row counts and tenant migration state are known.

## Execution Plan

### Phase 1 — Manual read-only production inspection

**Purpose:** Confirm whether the suspicious tables are empty, populated, or missing by tenant.

**Tasks:**
- [ ] Run read-only count SQL for public seed/config tables.
- [ ] Run read-only count SQL for public transactional tables.
- [ ] Run read-only count SQL for `appointment_service_products` by tenant.
- [ ] Run read-only count SQL for `dental_notifications` by tenant.
- [ ] Run read-only count SQL for legacy tables by tenant.

**Acceptance criteria:**
- We know which tables exist in production.
- We know which tables have rows.
- No data was modified.

### Phase 2 — Classify each table

**Purpose:** Avoid destructive cleanup based on assumptions.

| Classification | Meaning | Action |
| --- | --- | --- |
| Required seed missing | Table should have baseline rows but has none. | Prepare seed repair script. |
| Safe-empty transactional | Empty because no user activity yet. | Document; no action. |
| Feature gap | Table exists but API cannot populate expected data. | Design API/UI fix. |
| Legacy with data | Old table still contains rows. | Plan migration/archive before cleanup. |
| Legacy empty | Old table has no rows and no API usage. | Candidate for future cleanup, not immediate. |

**Acceptance criteria:**
- Every audited table has one classification.
- Corrections are separated from cleanup.

### Phase 3 — Impact decision for `appointment_service_products`

**Purpose:** Decide if this is a real Garage functional bug.

**Tasks:**
- [ ] Inspect UI flow for appointment services/products.
- [ ] Confirm whether appointment services should support product/material lines.
- [ ] If yes, define missing API writer and UI integration.
- [ ] If no, document the table as reserved/future and remove it from active expectations.

**Acceptance criteria:**
- Clear decision: implement writer or mark as reserved.
- No ambiguous “maybe used later” behavior remains undocumented.

### Phase 4 — Notification architecture decision

**Purpose:** Avoid two competing notification models.

**Tasks:**
- [ ] Confirm whether all notifications should live in `public.notifications`.
- [ ] If yes, mark `{schema}.dental_notifications` as legacy/deprecated.
- [ ] If no, define dental-specific notification responsibility and required API writers/readers.

**Recommended decision:** Keep `public.notifications` as the single active notification table unless there is a strong tenant-isolation reason.

**Acceptance criteria:**
- One active notification architecture is documented.

### Phase 5 — Seed repair plan, if needed

**Purpose:** Repair public config only if production inspection proves missing seed data.

**Candidate tables:**
- `public.module_catalog`
- `public.module_transactions`
- `public.subscription_plans`

**Tasks:**
- [ ] Compare production rows with migration seed expectations.
- [ ] Prepare idempotent INSERT/UPSERT script.
- [ ] Review script manually before execution.
- [ ] Execute in production only after backup.

**Acceptance criteria:**
- Missing seeds are restored without duplicating rows.
- Existing custom values are not overwritten unexpectedly.

### Phase 6 — Cleanup backlog, not immediate execution

**Purpose:** Track legacy objects without rushing destructive changes.

**Candidate cleanup items:**
- `public.company_module_transactions`
- `{schema}.dental_notifications`
- `{schema}.modules`
- `{schema}.profile_permissions`
- `{schema}.dental_services`
- `{schema}.dental_service_treatments`
- `{schema}.dental_consultation_services`

**Tasks:**
- [ ] Confirm row counts.
- [ ] Confirm no API/controller references.
- [ ] Confirm no frontend assumptions.
- [ ] Confirm no reporting/export/manual business usage.
- [ ] Only then draft cleanup migration.

**Acceptance criteria:**
- Cleanup candidates are proven safe or deferred with reason.

## Production Safety Checklist

Before any production SQL change:

- [ ] Export/backup the production DB from cPanel.
- [ ] Run read-only count/inspection SQL first.
- [ ] Save output/screenshots of results.
- [ ] Prepare idempotent SQL only.
- [ ] Avoid DROP/DELETE in first correction pass.
- [ ] Execute one logical change at a time.
- [ ] Verify application behavior immediately after each change.

## Recommended Next Step

Prepare a read-only SQL inspection script for cPanel that reports:

1. Public seed/config table counts.
2. Public transactional table counts.
3. Tenant schema list.
4. Per-tenant existence/counts for suspicious tables.
5. Per-tenant legacy table row counts.

This should be the next artifact before any implementation or cleanup.
