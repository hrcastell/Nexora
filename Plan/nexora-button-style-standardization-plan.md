# Nexora Button Style Standardization Plan

## Summary

Apply the same affirmative-button style used in Agenda Dental and “Nueva Empresa” across all windows: primary affirmative actions use `nxr-btn-primary`, while secondary, destructive, tab, badge, pill, progress, and state visuals remain unchanged.

## Key Changes

- Use this standard for affirmative buttons:
  - `rounded-2xl`
  - `px-5 py-2.5` for main CTAs.
  - `px-4 py-2.5` for form and panel actions.
  - `text-sm font-medium text-white transition nxr-btn-primary`
  - `disabled:opacity-50/60` when applicable.
- Replace legacy affirmative buttons in:
  - `dental`
  - `financial`
  - `garage`
  - `admin/config` screens that still do not use the pattern.
- Do not change:
  - Cancel/secondary buttons.
  - Destructive actions such as reject/delete/cancel.
  - Active tabs, badges, pills, progress bars, or visual states.
  - Buttons that already correctly use `nxr-btn-primary`.

## Implementation Plan

1. Create this official plan at `Plan/nexora-button-style-standardization-plan.md`.
2. Save the same plan in Engram as a project decision/plan.
3. Review files with legacy patterns:
   - `bg-[var(--nexora-primary)]`
   - `hover:opacity-90`
   - inline affirmative button styling.
4. Change only real affirmative actions: create, save, schedule, register, add, confirm, pay, and new entity.
5. Keep the visual result equivalent to the “Nueva Empresa” button.
6. Run a fresh diff review before closing.

## Test Plan

- Run from `FrontEnd/Portal`:
  - `.\node_modules\.bin\vue-tsc.cmd -b`
  - `npm run build` if the environment permits.
- Manually validate:
  - Dental: appointments, patients, consultations, quotes, treatments, finance.
  - Financial: dashboard, periods, categories, period detail.
  - Garage: customers, vehicles, orders, products, rates, catalogs.
  - Admin/config: no visual regression.
- Confirm destructive buttons did not adopt primary styling.

## Assumptions

- “All cores” includes `dental`, `financial`, `garage`, and portal admin/configuration screens.
- The current hotfix has uncommitted changes; implementation must preserve them and never revert them.
- The Vite build may still fail because of local permissions; `vue-tsc` is the minimum required validation.
