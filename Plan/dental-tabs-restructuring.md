# Plan: Reestructuración de Tabs — Consulta Dental

## Context

The dental consultation detail screen (`screens_dental_consultation_detail.vue`) currently has 8 tabs in an order that doesn't follow the clinical workflow. The user provided two comprehensive clinical flowcharts:

1. **Clinical History Structure** — Historia clinica as a container with sub-sections: resumen medico, anamnesis, alertas, odontodiagrama, diagnosticos, plan de tratamiento, evoluciones, archivos clinicos, prescripciones, informe final
2. **Odontogram Workflow** — tooth selection → surface → finding → observation/treatment suggestion → update odontogram → auto-generate clinical summary

The current tab order (summary → treatments → sessions → photos → history → payments → attachments → documents) doesn't match this clinical flow and scatters related concerns.

**Chosen approach**: Hybrid — Phase 1 converts Historia into a sub-tab container (with Resumen medico + Archivos), keeps Tratamiento as separate tab (most complex, will migrate in Phase 2 when odontogram generates treatment plans). Total: 5 tabs down from 8.

## Phase 1: Tab Reorder + Historia as Sub-Tab Container

### New Tab Order (5 tabs, down from 8)

| # | Key | Label | Icon | Content |
|---|-----|-------|------|---------|
| 1 | `summary` | Resumen | ClipboardList | Current summary + **payment summary card** (moved from Pagos tab) |
| 2 | `history` | Historia | BookOpen | **Sub-tab container** with internal navigation |
| 3 | `photos` | Fotos | Camera | Photo gallery (unchanged) |
| 4 | `treatments` | Tratamiento | Stethoscope | **Merged**: treatment line items + session timeline |
| 5 | `quotes` | Presupuesto | Receipt | **New**: quotes linked to this consultation |

### Historia Sub-Tabs (Phase 1 — 2 active, rest as placeholders)

| # | SubKey | Label | Icon | Status |
|---|--------|-------|------|--------|
| 1 | `medical-summary` | Resumen medico | Heart | **ACTIVE** — current ConsultationHistoryTab content |
| 2 | `files` | Archivos clinicos | FolderOpen | **ACTIVE** — merged ConsultationDocumentsSection + ConsultationAttachmentsTab |
| 3 | `anamnesis` | Anamnesis | ClipboardCheck | Phase 2A placeholder |
| 4 | `alerts` | Alertas clinicas | AlertTriangle | Phase 2A placeholder |
| 5 | `odontogram` | Odontodiagrama | Grid3x3 | Phase 3 placeholder |
| 6 | `diagnoses` | Diagnosticos | Search | Phase 4 placeholder |
| 7 | `treatment-plan` | Plan de tratamiento | ListChecks | Phase 4 placeholder (migrates from top-level Tratamiento tab) |
| 8 | `evolutions` | Evoluciones | TrendingUp | Phase 4 placeholder (migrates from top-level Sessions) |
| 9 | `prescriptions` | Prescripciones | Pill | Phase 2B placeholder |
| 10 | `final-report` | Informe final | FileCheck | Phase 4 placeholder |

**Phase 1 implementation**: Only sub-tabs 1 and 2 render content. Sub-tabs 3-10 are defined in the sub-tab array but hidden (not rendered in Phase 1 navigation). They exist in the type system and component structure so Phase 2+ just adds content without restructuring.

### What Changes

1. **Pagos tab → absorbed into Resumen**: Compact financial card in summary showing total/paid/pending + button to trigger existing payment slide panels. `ConsultationPaymentsTab.vue` no longer rendered as standalone tab.

2. **Historia → sub-tab container**: New `ConsultationClinicalHistoryTab.vue` wraps a horizontal sub-tab bar + content area. Phase 1 renders two sub-sections:
   - **Resumen medico**: renders existing `ConsultationHistoryTab` (unchanged)
   - **Archivos clinicos**: renders new `ConsultationFilesSection.vue` (wrapper for ConsultationDocumentsSection + ConsultationAttachmentsTab)

3. **Adjuntos + Documentos → merged into Historia > Archivos**: `ConsultationFilesSection.vue` renders both in a single scrollable view with section headers.

4. **Tratamiento + Sesiones → merged into Tratamiento**: New wrapper `ConsultationTreatmentPlanTab.vue` renders `ConsultationTreatmentsTab` above `ConsultationSessionsTab`.

5. **Presupuesto → new tab**: Shows quotes linked to this consultation via `consultation_id` FK.

### Files to Create (4 files)

1. **`FrontEnd/Portal/src/components/dental/ConsultationClinicalHistoryTab.vue`** — NEW
   - Sub-tab container with horizontal pill navigation (like main tabs but smaller)
   - `HistorySubKey` type for sub-tab routing
   - Phase 1: renders `medical-summary` and `files` sub-tabs
   - Props: receives `consultation`, `medicalHistory`, `fmtDate`, `consultationId`, `customerId`, `readOnly`
   - Emits: `add-record` (forwarded from medical summary sub-section)
   - Sub-tab state managed internally (default: `medical-summary`)

2. **`FrontEnd/Portal/src/components/dental/ConsultationFilesSection.vue`** — NEW
   - Thin wrapper: section header "Documentos medicos" + `ConsultationDocumentsSection`, section header "Archivos adjuntos" + `ConsultationAttachmentsTab`
   - Props: `consultationId`, `customerId`, `readOnly`
   - No events to emit (both children are self-contained)

3. **`FrontEnd/Portal/src/components/dental/ConsultationTreatmentPlanTab.vue`** — NEW
   - Thin wrapper: renders `ConsultationTreatmentsTab` + divider + `ConsultationSessionsTab`
   - Props forwarded from parent (treatments, sessions, all handlers)
   - Emits forwarded: all treatment + session events

4. **`FrontEnd/Portal/src/components/dental/ConsultationQuotesTab.vue`** — NEW
   - Calls `GET /api/dental/consultations/:id/quotes`
   - Shows linked quotes as cards (number, date, status, total)
   - Links to quote detail page; empty state if none
   - Button to create new quote for this patient

### Files to Modify (4 files)

5. **`FrontEnd/Portal/src/views/dental/screens_dental_consultation_detail.vue`** — MODIFY
   - Update `TabKey` type: `'summary' | 'history' | 'photos' | 'treatments' | 'quotes'`
   - Update `tabs` array: 5 tabs in new order with icons
   - Update `selectTab`: remove `payments` case, keep `history` case (still loads medical history)
   - Move `loadCharge()` call to `onMounted` (charge data needed in summary)
   - Add payment summary card in summary tab section
   - Remove separate `attachments` and `documents` tab blocks
   - Replace `history` tab block with `ConsultationClinicalHistoryTab` (passing consultation, medicalHistory, consultationId, customerId, readOnly)
   - Replace `treatments` + `sessions` tab blocks with single `treatments` → `ConsultationTreatmentPlanTab`
   - Add `quotes` tab block → `ConsultationQuotesTab`
   - Update imports

6. **`FrontEnd/Portal/src/services/dentalQuotesService.ts`** — MODIFY
   - Add method: `getForConsultation(consultationId: number)`

7. **`BackEnd/controllers/dental/quotesController.js`** — MODIFY
   - Add handler: `getForConsultation` — `SELECT * FROM ${schema}.dental_quotes WHERE consultation_id = $1 ORDER BY created_at DESC`

8. **`BackEnd/routes/dental/dentalRoutes.js`** — MODIFY
   - Register: `GET /dental/consultations/:consultationId/quotes` → `quotesCtrl.getForConsultation`

### Implementation Order

1. `ConsultationFilesSection.vue` (wrapper — no backend, no logic)
2. `ConsultationClinicalHistoryTab.vue` (sub-tab container with medical-summary + files)
3. `ConsultationTreatmentPlanTab.vue` (wrapper — no backend)
4. Backend endpoint `GET /dental/consultations/:id/quotes`
5. `dentalQuotesService.ts` — add `getForConsultation`
6. `ConsultationQuotesTab.vue`
7. `screens_dental_consultation_detail.vue` (tab reorder, all integrations, payment card)

### What Does NOT Change

- `ConsultationSummaryTab.vue` — internal content unchanged (payment card added in PARENT)
- `ConsultationTreatmentsTab.vue` — unchanged, just wrapped
- `ConsultationSessionsTab.vue` — unchanged, just wrapped
- `ConsultationAttachmentsTab.vue` — unchanged, rendered inside FilesSection
- `ConsultationDocumentsSection.vue` — unchanged, rendered inside FilesSection
- `ConsultationHistoryTab.vue` — unchanged, rendered inside ClinicalHistoryTab
- `WidgetsDentalPhotoGallery.vue` — unchanged
- `ConsultationPaymentsTab.vue` — file kept (useful elsewhere), not rendered as tab
- All payment slide panels — behavior unchanged, triggered from summary card
- Consultation status state machine — untouched

---

## Phase 2+ Roadmap (documented, NOT implemented in Phase 1)

### Clinical History Sub-Tab Flowchart (target architecture)

```
Tab Historia clinica
  ├── Resumen medico          (Phase 1 ✓)
  ├── Anamnesis               (Phase 2A)
  ├── Alertas clinicas        (Phase 2A)
  ├── Odontodiagrama          (Phase 3)
  ├── Diagnosticos            (Phase 4)
  ├── Plan de tratamiento     (Phase 4 — migrates from top-level tab)
  ├── Evoluciones             (Phase 4 — migrates from Sessions)
  ├── Archivos clinicos       (Phase 1 ✓)
  ├── Prescripciones          (Phase 2B)
  └── Informe final           (Phase 4)
```

### Phase 2A: Structured Anamnesis + Clinical Alerts

**Anamnesis sub-tab:**
- New `dental_anamnesis` table with structured boolean/enum fields
- Accordion/form sections: personal history, allergies, medications, dental history, habits
- API: `GET/POST/PUT /api/dental/consultations/:id/anamnesis`
- Renders inside `ConsultationClinicalHistoryTab` as sub-key `anamnesis`

**Clinical Alerts sub-tab:**
- Derived from anamnesis data (allergies, drug interactions, medical conditions)
- Auto-generated alert cards with severity levels
- Persistent banner visible across all sub-tabs when critical alerts exist

### Phase 2B: Prescriptions

- New `dental_prescriptions` table (medication, dosage, frequency, duration, notes)
- Form to create prescription from treatment context
- PDF generation for print
- API: `GET/POST /api/dental/consultations/:id/prescriptions`

### Phase 3: Odontogram

**Odontogram interaction flow:**
```
Select dentition type → Render dental pieces → User selects tooth
  → Open tooth side panel (FDI number, piece name, arch)
    → Select dental surface
    → Select clinical finding
    → Add clinical observation
    → Attach photo/radiograph (optional)
    → Finding requires treatment?
      ├── No → Save as clinical observation → Update odontogram
      └── Yes → Associate suggested procedure → Set priority
              → Send to treatment plan → Update odontogram
  → Add another finding? → loop or save complete odontogram
  → Generate automatic clinical summary
  → Update patient clinical history
```

**Database:**
- New `dental_odontogram_entries` table (tooth_number FDI, surface, finding_type, finding_status, priority, observation, procedure_suggestion_id)
- New `dental_odontogram_attachments` table (entry_id FK, file reference)

**Component:**
- Interactive SVG tooth chart (permanent 32 / deciduous 20 / mixed dentition)
- Per-tooth click → slide panel with surface selector → finding type dropdown
- Color-coded teeth based on findings (healthy/caries/restoration/extraction/etc.)

**API:**
- `GET /api/dental/patients/:id/odontogram` — latest odontogram state
- `POST /api/dental/consultations/:id/odontogram` — save/update entries
- `GET /api/dental/consultations/:id/odontogram` — entries for this consultation

### Phase 4: Diagnosis + Treatment Plan Generation + Evolutions + Final Report

**Diagnosticos sub-tab:**
- From odontogram findings, auto-detect diagnostic patterns
- CIE-10 dental diagnosis codes (optional)
- Manual diagnosis entry with finding references

**Plan de tratamiento (migrates from top-level Tratamiento tab):**
```
Treatment plan generation:
  Odontogram findings → Map to treatments from catalog
    → Auto-generate dental_consultation_treatments with tooth references
    → Single session or Multi-session plan
      ├── Single session → direct execution
      └── Multi-session → Session 1, Session 2, ... Session N
          └── Each session → Evolution record
```
- When Phase 4 activates, top-level "Tratamiento" tab is removed
- Treatment plan + sessions become sub-tabs inside Historia
- API: `POST /api/dental/consultations/:id/generate-treatment-plan`

**Evoluciones sub-tab (replaces top-level Sessions):**
- Session records become "clinical evolutions"
- Each evolution linked to specific treatments performed
- Progress tracking against treatment plan
- Migrates data from `dental_consultation_sessions`

**Informe final sub-tab:**
- Auto-generated summary: initial findings → treatments performed → outcomes
- Printable PDF format
- Signed-off by treating professional

---

## Migration Strategy: Phase 1 → Phase 4

### Why Tratamiento stays as top-level tab in Phase 1

The treatment system currently operates independently: services are added manually, sessions are scheduled manually. The odontogram workflow (Phase 3-4) fundamentally changes this: treatments are GENERATED from clinical findings, not manually added.

Migrating Tratamiento inside Historia before the odontogram exists would create a UX regression — the tab would be nested deeper without gaining the clinical context that justifies the nesting.

### Phase 4 migration path

When Phase 4 activates:
1. Top-level `treatments` tab is removed from `TabKey` and `tabs` array
2. `treatment-plan` and `evolutions` sub-tabs become active inside `ConsultationClinicalHistoryTab`
3. `ConsultationTreatmentPlanTab.vue` wrapper is reused inside the sub-tab container (same component, different mounting point)
4. No data migration needed — same `dental_consultation_treatments` and `dental_consultation_sessions` tables

### Forward-compatibility guarantees

- `ConsultationClinicalHistoryTab.vue` already defines the full `HistorySubKey` type with all 10 sub-tabs
- Adding a new sub-tab = add content component + unhide the sub-tab in the navigation array
- Sub-tab container uses dynamic component rendering, so new sections don't require parent view changes
- Each sub-section is a self-contained component with its own data fetching

---

## Verification

1. **Tab order**: Open consultation detail — tabs: Resumen, Historia, Fotos, Tratamiento, Presupuesto
2. **Summary tab**: Consultation info + financial summary card (total/paid/pending) with pay button
3. **Historia tab**: Opens with sub-tab "Resumen medico" active, shows medical history (same as before)
4. **Historia > Archivos**: Click "Archivos clinicos" sub-tab — shows medical documents section + attachments section in one view
5. **Sub-tab navigation**: Horizontal pills inside Historia tab, visually distinct from main tabs
6. **Fotos tab**: Photo gallery works as before
7. **Tratamiento tab**: Services/line items + session timeline in one view, all CRUD operations work
8. **Presupuesto tab**: Shows linked quotes or empty state; links to quote detail work
9. **Payment panels**: Register payment, installments, pay installment slide panels still work from summary card
10. **Mobile**: All tabs render correctly in single-column; Historia sub-tabs stack or use scrollable pills
11. **No regressions**: All existing data loads correctly, no console errors
