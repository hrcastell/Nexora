# Graph Report - .  (2026-06-05)

## Corpus Check
- Large corpus: 305 files · ~663,235 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1634 nodes · 1952 edges · 152 communities (141 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db8c077`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 151|Community 151]]

## God Nodes (most connected - your core abstractions)
1. `resolveSchema()` - 30 edges
2. `compilerOptions` - 17 edges
3. `compilerOptions` - 15 edges
4. `PaginatedResponse` - 8 edges
5. `Perfil reutilizable` - 8 edges
6. `Usuario` - 8 edges
7. `Profile Permissions` - 7 edges
8. `updateStatusAndNotify()` - 6 edges
9. `makeGarageUpload()` - 6 edges
10. `Nexora` - 6 edges

## Surprising Connections (you probably didn't know these)
- `updateStatusAndNotify()` --calls--> `Notification`  [INFERRED]
  BackEnd/controllers/dental/appointmentsController.js → FrontEnd/Portal/src/stores/notifications.ts
- `Nexora` --conceptually_related_to--> `Multi-tenant SaaS Platform`  [EXTRACTED]
  README.md → CLAUDE.md
- `Nexora` --references--> `FastAPI Backend`  [EXTRACTED]
  README.md → RULES_AND_SKILLS.md
- `Nexora` --references--> `PostgreSQL 10.23`  [EXTRACTED]
  README.md → RULES_AND_SKILLS.md
- `Window-based Development` --conceptually_related_to--> `Configuration Dashboard`  [INFERRED]
  README.md → Plan/plan_implementacion_dashboard_config_nexora.md

## Hyperedges (group relationships)
- **Nexora Platform Architecture** — nexora, multi_tenant_saas_platform, postgresql_schema_isolation, vue_frontend, fastapi_backend, cpanel_shared_hosting [EXTRACTED 1.00]
- **Permission Enforcement Flow** — profile_permissions, sidebar_visibility, route_permission_guard, backend_permission_validation, forbidden_403 [EXTRACTED 1.00]
- **Agent Tooling Ecosystem** — unified_agent_system, engram_memory, sdd_spec_driven_development, graphify_knowledge_graphs, skill_registry, skill_resolver_protocol [EXTRACTED 1.00]
- **Multi-company login flow components** — login_discover_companies_endpoint, login_validate_password_endpoint, login_select_profile_endpoint, login_auth_me_endpoint, login_session_token_context [EXTRACTED 1.00]
- **Parameterized permission model** — profiles_profile, profiles_module, profiles_action_permission, profiles_profile_scope, profiles_profile_module_action_relation [EXTRACTED 1.00]
- **User access identity model** — users_user, users_role, users_job_position, users_profile, users_access_level, users_enabled_modules [EXTRACTED 1.00]
- **Logo Icon Brand Composition** — logo_icon_metallic_n_monogram, logo_icon_circular_gradient_ring, logo_icon_metallic_dimensional_style, logo_icon_soft_blurred_background [EXTRACTED 1.00]
- **hyperedge:logo_icon3_brand_mark_composition** — image:logo_icon3, visual:metallic_n_monogram, visual:circular_gradient_ring, layout:centered_logo_composition, color:purple_gradient, color:gold_gradient, color:silver_metallic [INFERRED 0.95]
- **Brand Mark Composition** — logo_sf_n_monogram, logo_sf_circular_badge, logo_sf_purple_gold_gradient, logo_sf_metallic_3d_style [EXTRACTED 1.00]
- **hyperedge:hrcastell_logo_identity** — logo_mark:blue_octagonal_emblem, brand:HRCastell, tagline:Enterprise_Core, style:dark_enterprise_tech [INFERRED 0.94]
- **HRCastell Enterprise Core Brand Lockup Components** — logo_full1_blue_geometric_icon, logo_full1_hrcastell_wordmark, logo_full1_enterprise_core_tagline, logo_full1_horizontal_layout, logo_full1_blue_black_palette [EXTRACTED 1.00]
- **Nexora Brand Logo Composition** — nexora1_nexora_wordmark, nexora1_circular_n_emblem, nexora1_metallic_3d_logo_style, nexora1_purple_gold_accent_glow, nexora1_gray_gradient_background [EXTRACTED 1.00]
- **Nexora Brand Logo Composition** — nexora2_nexora_wordmark, nexora2_circular_n_icon, nexora2_metallic_lettering, nexora2_purple_gold_ring, nexora2_black_background [EXTRACTED 1.00]
- **Nexora Brand Identity Composition** — nexora3_wordmark, nexora3_monogram_n, nexora3_circular_emblem, nexora3_gradient_ring, nexora3_metallic_style [EXTRACTED 1.00]
- **Logo Icon Brand Mark Composition** — logo_icon_n_monogram, logo_icon_circular_badge, logo_icon_purple_gold_gradient, logo_icon_metallic_3d_style [EXTRACTED 1.00]
- **Brand Mark Composition** — logo_sf_metallic_letter_n, logo_sf_circular_gradient_ring, logo_sf_purple_gold_palette, logo_sf_metallic_embossed_style, logo_sf_glowing_background [EXTRACTED 1.00]

## Communities (152 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (53): dentalAppointmentsService, dentalChargesService, dentalConsultationServicesService, dentalConsultationSessionsService, dentalConsultationsService, dentalDashboardService, dentalPatientsService, dentalServicesService (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (46): garageAppointmentsService, garageCatalogsService, garageCustomersService, garageEmployeesService, garageLaborRatesService, garageProductsService, garageServiceTemplatesService, garageVehicleHistoryService (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (31): bcrypt, buildTransactionFlags(), db, fs, GARAGE_TRANSACTION_CODES, hasSubscriptionPlanField, path, { registerCompanyCoreModules } (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (34): conditions, count, countParams, db, dueDate, insertedRows, limitNum, newChargeStatus (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (35): canManageScopedUsers, cardBg, cardBorder, emptyForm(), fd, filteredUsers, filterRole, filterStatus (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (34): ACTIONS, canAdminProfiles, canCreateProfile, canDeleteProfile, canEditProfile, cardBg, cardBorder, Component (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (27): financialBudgetPlansService, financialCategoriesService, financialPeriodsService, financialSummaryService, financialTransactionsService, useFinancialBudgetPlansStore, useFinancialCategoriesStore, useFinancialPeriodsStore (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (28): allowedOrigins, app, authMiddleware, cors, corsOptions, express, helmet, moduleGuard (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (23): bcrypt, { createNotification }, db, defaultProfileCodeFromUserRole(), fs, normalizedProfileIds, oldPath, path (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (29): agreementForm, applyPlanToAgreementForm(), cardBg, cardBorder, companyId, defaultAgreementForm(), fmtCurrency(), freqLabel() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (34): AUTH-01 Login multiempresa y multiperfil con onboarding de solicitud, GET /auth/me, AuthService, POST /auth/discover-companies, Login multiempresa por pasos, Profile-driven modules and navigation, POST /auth/select-profile, SessionContext or AuthStore (+26 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (23): conditions, countParams, db, filePath, fs, { makeGarageUpload }, params, path (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (21): cardBg, cardBorder, filteredModules, filterStatus, form, headerColor, inputBg, inputBorder (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (16): db, fmtDate, { resolveSchema }, VALID_SESSION_STATUSES, db, { resolveSchema }, today, conditions (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (21): actionUrl(), APPOINTMENT_STATUSES, appointmentSelect(), conditions, countParams, { createNotification }, db, getAppointmentById() (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (23): dependencies, axios, lucide-vue-next, pinia, vue, vue-router, devDependencies, autoprefixer (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (24): Backend Permission Validation, Administrador de Empresa Profile, Company Schema, Configuration Dashboard, cPanel Shared Hosting, FastAPI Backend, 403 Forbidden, hernancius Master Schema (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (21): author, dependencies, bcryptjs, cors, dotenv, express, helmet, jsonwebtoken (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (17): activeCompanyId, cardBg, cardBorder, Component, headerColor, inputBg, inputBorder, isLoading (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (17): deletePayment(), error, form, load(), loading, pctPaid, registerPayment(), saving (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (7): [], JOB_OPTIONS, MODULE_OPTIONS, NexoraUsersManagementV1(), PROFILE_OPTIONS, ROLE_OPTIONS, statusStyles()

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (18): cardBg, cardBorder, defaultForm(), form, headerColor, inputBg, inputBorder, isLoading (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (16): db, { normalizeCatalogText }, normalized, params, { resolveSchema }, VALID_CATALOG_TYPES, conditions, countParams (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (19): badgeBg, badgeBorder, badgeText, cardBg, cardBorder, goldIconColor, goldIconContainerBg, greenIconColor (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (5): [], canAdvanceToProfiles(), FLOW_STEPS, getStepState(), SmokeTests()

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (18): appointmentsCtrl, authMiddleware, catalogsCtrl, customersCtrl, db, employeesCtrl, express, laborRatesCtrl (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (14): cardBg, cardBorder, filteredList, headerTextColor, mutedTextColor, searchBg, searchIconColor, searchInputBg (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (17): allowed, conditions, countParams, db, filePath, fs, limitNum, { makeDentalUpload } (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (15): breakdown, budget, db, debts, defaults, deviations, EXPENSE_TYPES, INCOME_TYPES (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (14): ci, db, { resolveSchema }, authMiddleware, budgetPlansCtrl, categoriesCtrl, express, periodsCtrl (+6 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (14): db, dueDate, dueDayValue, hasPlanField, isAdmin(), isSuperAdmin(), lastEnd, params (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (3): [], getStatusStyles(), NexoraDashboardConfigV1()

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (12): close(), customerQuery, customerSearching, error, form, isTransfer, save(), saving (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (13): configStore, error, form, handleClose(), handleSubmit(), headerTextColor, inputBg, inputBorder (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (10): { Pool }, { createNotification }, db, DEFAULT_PROFILE_PERMISSION_FLAGS, isAdmin(), isSuperAdmin(), { createNotification }, db (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (11): canConfirm, configStore, confirmText, headerColor, inputBg, inputBorder, isDeleting, isLight (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (7): authStore, hasParent, menuStore, requiredModule, requiredTransaction, router, app

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (11): usePermissions(), resetAuthCheckPromise(), useAuthStore, MenuModule, MenuTransaction, PermissionAction, TransactionPerms, useMenuStore (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (10): { conditions, params, paramIdx: pi }, db, limit, page, VALID_CATEGORIES, where, auth, ctrl (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (10): bcrypt, db, { generateToken }, preAuthToken, token, authController, authMiddleware, express (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (11): cardBg, cardBorder, filteredUsers, headerTextColor, inputBg, inputBorder, isLoading, mutedTextColor (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (5): apiBase, canAdd, deliveryPhotos, entryPhotos, MAX

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (3): [], NexoraProfilesPermissionsV1(), scopeStyles()

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (11): conditions, countParams, db, filePath, fs, { makeGarageUpload }, { normalizePlate }, params (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (9): cfg, headerColor, inputBg, inputBorder, isLight, isLoading, mutedColor, perms (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (8): DEFAULT_CONFIG, FontOption, FONTS, NEXORA_COLORS, PRESET_COLORS, ThemeMode, Wallpaper, WALLPAPERS

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (5): [], hexToRgba(), NexoraConfigVisualStylesV1(), PRESET_COLORS, wallpaperBackground()

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (10): db, moduleIds, permsMap, profileIds, tree, txByModule, auth, ctrl (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (11): Agent Replication Guide, Engram Persistent Memory, Graphify Build Workflow, Graphify Knowledge Graphs, Graphify Query Workflow, SDD New Workflow, SDD Spec-Driven Development, SDD Status Workflow (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (8): configStore, headerColor, isLight, isProcessing, modalBg, modalBorder, mutedColor, variantConfig

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (10): AuthState, CompanyUser, Invoice, ModuleGroup, NexoraModule, Payment, PaymentAgreement, Profile (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (9): cardBg, cardBorder, error, formatCLP, headerTextColor, isLoading, mutedTextColor, tableHeaderBg (+1 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (10): conditions, countParams, customerUpload, db, fs, { makeGarageUpload }, oldPath, params (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (10): conditions, countParams, db, employeeUpload, fs, { makeGarageUpload }, oldPath, params (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.20
Nodes (7): conditions, countParams, db, params, { resolveSchema }, VALID_STATUSES, year

### Community 59 - "Community 59"
Cohesion: 0.20
Nodes (7): conditions, db, params, auth, ctrl, express, router

### Community 60 - "Community 60"
Cohesion: 0.20
Nodes (6): date, fmtDate(), key, agenda, fmtTime(), string

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (8): fs, makeDentalUpload(), makeGarageUpload(), multer, path, storage, upload, UPLOAD_DIR

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (8): catalogsStore, createNew(), creating, error, open, q, query, select()

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (6): day, db, auth, ctrl, express, router

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (7): db, jwt, token, authMiddleware, express, router, solicitudesController

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (9): Gold gradient, Purple gradient, Silver metallic gradient, logo_icon3.png, Nexora icon logo, Centered logo composition, Circular purple-gold ring, Metallic N monogram (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.22
Nodes (7): configStore, headerColor, isLight, modalBg, modalBorder, mutedColor, typeConfig

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (8): dependencies, lucide-vue-next, pinia, vue-router, devDependencies, autoprefixer, postcss, tailwindcss

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (5): close(), error, save(), saving, store

### Community 69 - "Community 69"
Cohesion: 0.25
Nodes (7): conditions, countParams, db, limitNum, pageNum, params, { resolveSchema }

### Community 70 - "Community 70"
Cohesion: 0.25
Nodes (7): conditions, countParams, db, { normalizeCatalogText }, normalized, params, { resolveSchema }

### Community 71 - "Community 71"
Cohesion: 0.25
Nodes (8): Transparent background, Metallic silver, Purple-to-gold gradient, logo_icon3.png, Circular ring, Beveled 3D logo style, Uppercase N, Nexora logo icon

### Community 72 - "Community 72"
Cohesion: 0.25
Nodes (8): Gold brand color, Purple brand color, Silver metallic color, Logo_icon2.png, Gradient circular ring, Dark navy background, Metallic letter N, Nexora logo icon

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (6): close(), error, form, save(), saving, store

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (6): conditions, countParams, db, params, { resolveSchema }, validTypes

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (5): db, authMiddleware, express, router, subscriptionController

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (5): db, authMiddleware, companyConfigController, express, router

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (5): GONE_RESPONSE, auth, ctrl, express, router

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (5): db, authMiddleware, express, router, statsController

### Community 79 - "Community 79"
Cohesion: 0.38
Nodes (7): DentalAppointment, DentalBillingService, DentalPatientProfile, Garage Appointments / Pre-ingreso, Nexora Dental Core, Nexora Garage Core 1, Vehicle History

### Community 80 - "Community 80"
Cohesion: 0.38
Nodes (3): resetConfiguration(), saveConfiguration(), triggerToast()

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (6): close(), convert(), error, form, saving, store

### Community 82 - "Community 82"
Cohesion: 0.38
Nodes (7): Circular Emblem, Purple-to-Gold Gradient Ring, Nexora Logo, Metallic Silver 3D Style, N Monogram, Transparent Dark-Compatible Background, NEXORA Wordmark

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (6): close(), error, form, save(), saving, store

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (6): close(), error, form, save(), saving, store

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (5): conditions, db, params, { resolveSchema }, validTypes

### Community 86 - "Community 86"
Cohesion: 0.47
Nodes (6): HRCastell, logo_full.png, Horizontal logo lockup, Blue octagonal emblem, Dark enterprise technology styling, Enterprise Core

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (3): reader, unknown, validTypes

### Community 89 - "Community 89"
Cohesion: 0.47
Nodes (6): Blue and Black Brand Palette, Blue Geometric Octagonal Brand Icon, ENTERPRISE CORE Tagline, HRCastell Enterprise Core Full Logo Lockup, Horizontal Logo Layout, HRCastell Wordmark

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (6): Circular Gradient Ring, Soft Glowing Background, Metallic Embossed Style, Metallic Letter N, Nexora Logo, Purple and Gold Palette

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (6): Black Background, Circular N Icon, Nexora Logo Asset, Metallic Silver Lettering, NEXORA Wordmark, Purple Gold Gradient Ring

### Community 93 - "Community 93"
Cohesion: 0.40
Nodes (4): conditions, db, params, { resolveSchema }

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (4): db, orders, { resolveSchema }, services

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (4): auth, ctrl, express, router

### Community 96 - "Community 96"
Cohesion: 0.60
Nodes (5): Logo Icon Brand Mark, Circular Purple-Gold Gradient Ring, Metallic Dimensional Logo Style, Metallic N Monogram, Soft Blurred Gray Purple Gold Background

### Community 97 - "Community 97"
Cohesion: 0.60
Nodes (5): Circular Badge, Metallic 3D Style, N Monogram, Nexora Logo Icon, Purple and Gold Gradient

### Community 98 - "Community 98"
Cohesion: 0.60
Nodes (5): Circular Badge Frame, Metallic 3D Brand Style, Metallic N Monogram, Nexora Logo Asset, Purple and Gold Gradient Glow

### Community 99 - "Community 99"
Cohesion: 0.50
Nodes (5): Circular N Emblem, Gray Gradient Background, Metallic 3D Logo Style, Nexora Wordmark, Purple and Gold Accent Glow

### Community 100 - "Community 100"
Cohesion: 0.67
Nodes (4): BudgetPlan, FinancialPeriod, FinancialTransaction, Nexora Financial Core

### Community 101 - "Community 101"
Cohesion: 0.50
Nodes (3): basic, payload, selected

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (3): Base Modal, DOM Elements, Toast Notifications

## Knowledge Gaps
- **917 isolated node(s):** `lucide-vue-next`, `pinia`, `vue-router`, `autoprefixer`, `postcss` (+912 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `updateStatusAndNotify()` connect `Community 14` to `Community 13`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `resolveSchema()` connect `Community 13` to `Community 3`, `Community 11`, `Community 14`, `Community 22`, `Community 25`, `Community 28`, `Community 29`, `Community 30`, `Community 46`, `Community 56`, `Community 57`, `Community 58`, `Community 69`, `Community 70`, `Community 74`, `Community 85`, `Community 92`, `Community 93`, `Community 94`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **What connects `lucide-vue-next`, `pinia`, `vue-router` to the rest of the system?**
  _917 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05516431924882629 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05879692446856626 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._