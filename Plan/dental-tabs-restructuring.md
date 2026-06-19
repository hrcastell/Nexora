# Plan: Reestructuración de Tabs — Consulta Dental

## Context

The dental consultation detail screen (`screens_dental_consultation_detail.vue`) currently has 8 tabs in an order that doesn't follow the clinical workflow. The user provided a comprehensive clinical flowchart describing the ideal dental patient journey: history → exam → odontogram → diagnosis → treatment → payment. The current tab order (summary → treatments → sessions → photos → history → payments → attachments → documents) puts history at position 5 and scatters related concerns across separate tabs.

This is Phase 1 of an incremental restructuring. The goal is to reorder and consolidate tabs to match the clinical flow WITHOUT refactoring the consultation engine or breaking existing functionality. Future phases (anamnesis, odontogram, diagnosis) are documented but not implemented.

## Phase 1: Tab Reorder and Consolidation

### New Tab Order (6 tabs, down from 8)

| # | Key | Label | Icon | Content |
|---|-----|-------|------|---------|
| 1 | `summary` | Resumen | ClipboardList | Current summary + **payment summary card** (moved from Pagos tab) |
| 2 | `history` | Historia | BookOpen | Current medical history (unchanged content) |
| 3 | `documents` | Documentos | FileText | **Merged**: medical documents + file attachments (two visual sections) |
| 4 | `photos` | Fotos | Camera | Photo gallery (unchanged) |
| 5 | `treatments` | Tratamiento | Stethoscope | **Merged**: treatment line items + session timeline |
| 6 | `quotes` | Presupuesto | Receipt | **New**: quotes linked to this consultation |

### What Changes

1. **Pagos tab → absorbed into Resumen**: A compact financial card in the summary tab showing total/paid/pending + button to trigger existing payment slide panels. `ConsultationPaymentsTab.vue` is no longer rendered as a standalone tab.

2. **Adjuntos + Documentos → merged into Documentos**: New wrapper `ConsultationFilesTab.vue` renders `ConsultationDocumentsSection` (medical docs) above `ConsultationAttachmentsTab` (file uploads) in a single tab.

3. **Tratamiento + Sesiones → merged into Tratamiento**: New wrapper `ConsultationTreatmentPlanTab.vue` renders `ConsultationTreatmentsTab` (services + follow-up) above `ConsultationSessionsTab` (session timeline) in a single tab.

4. **Presupuesto → new tab**: Shows quotes linked to this consultation via `consultation_id` FK.

### Files to Modify

#### Frontend — New Components (3 files)

1. **`FrontEnd/Portal/src/components/dental/ConsultationFilesTab.vue`** — NEW
   - Thin wrapper: renders `ConsultationDocumentsSection` + `ConsultationAttachmentsTab` vertically
   - Props forwarded from parent (consultation data, handlers)

2. **`FrontEnd/Portal/src/components/dental/ConsultationTreatmentPlanTab.vue`** — NEW
   - Thin wrapper: renders `ConsultationTreatmentsTab` + `ConsultationSessionsTab` vertically
   - Props forwarded from parent (treatments, sessions, handlers)

3. **`FrontEnd/Portal/src/components/dental/ConsultationQuotesTab.vue`** — NEW
   - Calls `GET /api/dental/consultations/:id/quotes`
   - Shows linked quotes as cards (number, date, status, total)
   - Links to quote detail page; empty state if none
   - Button to create new quote for this patient

#### Frontend — Modified (1 file)

4. **`FrontEnd/Portal/src/views/dental/screens_dental_consultation_detail.vue`** — MODIFY
   - Update `TabKey` type: `'summary' | 'history' | 'documents' | 'photos' | 'treatments' | 'quotes'`
   - Update `tabs` array with new order and icons
   - Update `selectTab`: remove `payments` case, keep `history` case
   - Move `loadCharge()` call to `onMounted` (charge data needed in summary)
   - Add payment summary card in summary tab section
   - Replace `attachments`/`documents` tab blocks with single `documents` → `ConsultationFilesTab`
   - Replace `treatments`/`sessions` tab blocks with single `treatments` → `ConsultationTreatmentPlanTab`
   - Add `quotes` tab block → `ConsultationQuotesTab`
   - Update imports (add new components, keep existing ones)
   - Payment slide panels remain in parent — unchanged behavior

#### Frontend — Service (1 file)

5. **`FrontEnd/Portal/src/services/dentalQuotesService.ts`** — MODIFY
   - Add method: `getForConsultation(consultationId: number)`

#### Backend — New Endpoint (2 files)

6. **`BackEnd/controllers/dental/quotesController.js`** — MODIFY
   - Add handler: `getForConsultation` — `SELECT * FROM ${schema}.dental_quotes WHERE consultation_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`

7. **`BackEnd/routes/dental/dentalRoutes.js`** — MODIFY
   - Register: `GET /dental/consultations/:consultationId/quotes` → `quotesCtrl.getForConsultation`

### Implementation Order

1. Create `ConsultationFilesTab.vue` (wrapper — no backend changes)
2. Create `ConsultationTreatmentPlanTab.vue` (wrapper — no backend changes)
3. Add backend endpoint `GET /dental/consultations/:id/quotes`
4. Add `getForConsultation` to `dentalQuotesService.ts`
5. Create `ConsultationQuotesTab.vue`
6. Modify `screens_dental_consultation_detail.vue` (tab reorder, merges, payment card in summary)

### What Does NOT Change

- `ConsultationSummaryTab.vue` — internal content unchanged (payment card is added in the PARENT, not inside this component)
- `ConsultationTreatmentsTab.vue` — unchanged, just wrapped
- `ConsultationSessionsTab.vue` — unchanged, just wrapped
- `ConsultationAttachmentsTab.vue` — unchanged, just wrapped
- `ConsultationDocumentsSection.vue` — unchanged, just wrapped
- `ConsultationHistoryTab.vue` — unchanged
- `WidgetsDentalPhotoGallery.vue` — unchanged
- `ConsultationPaymentsTab.vue` — still exists, not deleted (may be useful elsewhere later)
- All payment slide panels — behavior unchanged, triggered from summary card
- Consultation status state machine — untouched
- All backend APIs — unchanged except adding ONE new endpoint

---

## Phase 2+ Roadmap (documented, NOT implemented now)

### Phase 2A: Structured Anamnesis
- New `dental_anamnesis` table with structured boolean/enum fields for medical conditions, dental history, habits
- Accordion/form sections in Historia tab: personal history, allergies, medications, dental history, habits
- API: `GET/POST/PUT /api/dental/consultations/:id/anamnesis`

### Phase 2B: Clinical Examination
- Extend `dental_clinical_history_entries` with `clinical_exam` type or new `dental_clinical_exams` table
- Structured fields: extraoral findings, intraoral findings, chief complaint, symptoms
- Section within Historia tab

### Phase 3: Odontogram
- New `dental_odontogram_entries` table (tooth_number FDI, surface, finding_type, finding_status)
- Interactive SVG tooth chart component (permanent/deciduous/mixed dentition)
- Per-tooth click → surface selector → finding type dropdown
- API: `GET /api/dental/patients/:id/odontogram`, `POST /api/dental/consultations/:id/odontogram`

### Phase 4: Diagnosis + Treatment Plan Generation
- From odontogram findings → map to treatments from catalog
- Auto-generate `dental_consultation_treatments` with tooth references
- API: `POST /api/dental/consultations/:id/generate-treatment-plan`

---

## Verification

1. **Tab order**: Open consultation detail — tabs should appear as: Resumen, Historia, Documentos, Fotos, Tratamiento, Presupuesto
2. **Summary tab**: Should show consultation info + financial summary card with pay button
3. **Historia tab**: Should load medical history on click (same behavior as before)
4. **Documentos tab**: Should show medical documents section + attachments section in one view
5. **Fotos tab**: Photo gallery works as before
6. **Tratamiento tab**: Services/line items + session timeline in one view, all CRUD operations work
7. **Presupuesto tab**: Shows linked quotes or empty state; links to quote detail work
8. **Payment panels**: Register payment, installments, pay installment slide panels still work from summary card
9. **Mobile**: All merged tabs render correctly in single-column layout
10. **No regressions**: All existing data loads correctly, no console errors
