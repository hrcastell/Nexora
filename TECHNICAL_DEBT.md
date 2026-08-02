# Technical Debt Log

Running log of deferred work, known gaps, and decisions made "for now" that need to be revisited. This is not a wishlist — only log something here when a real shortcut was taken or a real piece of planned work was consciously deferred, with enough context that a future session (or a future you) can pick it up without re-deriving the reasoning.

See `CLAUDE.md`'s "Key architectural rules" for when this file must be checked/updated.

## Format

Each entry:

```
## <short title>
- **Status:** open | in progress | closed (date closed)
- **Area:** which module/domain this touches
- **Opened:** YYYY-MM-DD
- **Context:** what happened, why this was deferred instead of done now
- **Plan/reference:** links to the doc(s) that define the full scope, if any
- **Next step:** the concrete next action, not a vague "finish this later"
```

Keep closed entries in the log (move them to the bottom "Closed" section) instead of deleting — the history of what was deferred and why is worth keeping.

---

## Open

### HR Core — Lote F pendiente (Vacaciones/Ausencias + Dashboards)
- **Status:** open
- **Area:** `human_resources` core
- **Opened:** 2026-08-02
- **Context:** The HR core plan (see reference below) was sliced into lettered batches and implemented through Batch E:
  - **A** — DB migrations (org masters + employees extension)
  - **B** — Backend: org masters + employee extension
  - **C** — Backend: request/approval engine
  - **D1** — Frontend: organization + employees
  - **D2** — Frontend: requests + approvals
  - **E** — Notification preferences + manual acceptance tests

  All of A-E are merged into `develop`. What the master plan describes but was **never started, and never even broken down into a written batch brief**: leave/vacation policies and balances, and the three role-specific dashboards. The branch `feat/hr-core-f-balances-dashboard` was created for this ("Batch F") but ended up being used for unrelated work (cotizaciones, garage products, menu icons) in the session that discovered this gap — zero commits exist anywhere for Batch F itself.
- **Plan/reference:**
  - `Plan/nexora-human-resources-core-plan.md` — the master plan (full domain scope: org, requests, leave/absences, attendance, discipline, payroll, commissions). The "Vacaciones y ausencias" section (`hr_leave_policies`, `hr_leave_policy_rules`, `hr_leave_balances`, `hr_leave_movements`, `hr_absence_incidents`) and the "Dashboard empleado / Dashboard supervisor / Dashboard RRHH" screens are the Batch F scope.
  - `Plan/nexora-human-resources-core-codex-briefs.md` — the batch-by-batch implementation briefs, currently only defines Batch A through E (§29-424ish). No Batch F section exists yet.
  - `Plan/planHR/` — an earlier, more exploratory HR planning folder (ROADMAP.md, wireframes, sitemaps) that predates the current master plan. Worth a skim for ideas but the master plan above is the authoritative current scope.
- **Next step:** Two things, in order:
  1. **Audit first** — compare what Batches A-E actually built (DB schema + backend + frontend, currently: `hr_departments`, `hr_positions`, `hr_cost_centers`, `hr_work_shifts`, `hr_employees`/`hr_employee_profile`, `hr_request_types`/`hr_requests`/`hr_request_approvals`/`hr_request_status_history`, and the 5 frontend screens under `FrontEnd/Portal/src/views/hr/`) against the full master plan, to catch any drift or gaps before building on top of it.
  2. Write the Batch F brief (mirroring the structure of Batches A-E in the codex-briefs doc), then implement DB migration → backend → frontend in that order, same as every prior batch.

### Perfiles/permisos para borrado de catálogos
- **Status:** open
- **Area:** `garage_operations` catalogs (product types, and by extension the vehicle_* catalogs sharing the same generic controller)
- **Opened:** 2026-08-02
- **Context:** When building delete-with-usage-guard for catalog values (starting with `product_types`), the user explicitly deferred profile/permission-based restrictions on *who* can delete a catalog value: "luego tenemos que acondicionar algunas cosas por perfiles esto lo vemos luego." Today's implementation only gates catalog delete behind the existing generic auth + `read_only` check (same as every other catalog write) — there is no finer-grained "which profiles can delete vs. just view/create" control yet.
- **Plan/reference:** none written yet — this was a verbal aside, not a formal plan.
- **Next step:** Design and implement profile-scoped permission checks for catalog mutations (create/delete at minimum), consistent with how `profile_transaction_permissions` already gates other transactions per tenant schema.

---

## Closed

_(none yet)_
