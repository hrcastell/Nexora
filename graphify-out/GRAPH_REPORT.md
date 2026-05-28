# Graph Report - .  (2026-05-22)

## Corpus Check
- Large corpus: 215 files � ~590,559 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1111 nodes · 1258 edges · 113 communities (106 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Core Controllers|Backend Core Controllers]]
- [[_COMMUNITY_Module & User Controllers|Module & User Controllers]]
- [[_COMMUNITY_User Management View|User Management View]]
- [[_COMMUNITY_Commercial & Subscriptions View|Commercial & Subscriptions View]]
- [[_COMMUNITY_Profiles & Permissions View|Profiles & Permissions View]]
- [[_COMMUNITY_API Server & Middleware|API Server & Middleware]]
- [[_COMMUNITY_Garage Operations Backend|Garage Operations Backend]]
- [[_COMMUNITY_Module Catalog View|Module Catalog View]]
- [[_COMMUNITY_Frontend Dependencies & Config|Frontend Dependencies & Config]]
- [[_COMMUNITY_Backend Dependencies & Config|Backend Dependencies & Config]]
- [[_COMMUNITY_Company Edit Modal|Company Edit Modal]]
- [[_COMMUNITY_Database & Labor Rate API|Database & Labor Rate API]]
- [[_COMMUNITY_Modules Manager View|Modules Manager View]]
- [[_COMMUNITY_Subscriptions Management View|Subscriptions Management View]]
- [[_COMMUNITY_Work Order Payments UI|Work Order Payments UI]]
- [[_COMMUNITY_Customers & Upload Backend|Customers & Upload Backend]]
- [[_COMMUNITY_Dashboard View|Dashboard View]]
- [[_COMMUNITY_Companies List View|Companies List View]]
- [[_COMMUNITY_Garage API Routes|Garage API Routes]]
- [[_COMMUNITY_Platform Architecture Documentation|Platform Architecture Documentation]]
- [[_COMMUNITY_Component Group 20|Component Group 20]]
- [[_COMMUNITY_Component Group 21|Component Group 21]]
- [[_COMMUNITY_Component Group 22|Component Group 22]]
- [[_COMMUNITY_Component Group 23|Component Group 23]]
- [[_COMMUNITY_Component Group 24|Component Group 24]]
- [[_COMMUNITY_Component Group 25|Component Group 25]]
- [[_COMMUNITY_Component Group 26|Component Group 26]]
- [[_COMMUNITY_Component Group 27|Component Group 27]]
- [[_COMMUNITY_Component Group 28|Component Group 28]]
- [[_COMMUNITY_Component Group 29|Component Group 29]]
- [[_COMMUNITY_Component Group 30|Component Group 30]]
- [[_COMMUNITY_Component Group 31|Component Group 31]]
- [[_COMMUNITY_Component Group 32|Component Group 32]]
- [[_COMMUNITY_Component Group 33|Component Group 33]]
- [[_COMMUNITY_Component Group 34|Component Group 34]]
- [[_COMMUNITY_Component Group 35|Component Group 35]]
- [[_COMMUNITY_Component Group 36|Component Group 36]]
- [[_COMMUNITY_Component Group 37|Component Group 37]]
- [[_COMMUNITY_Component Group 38|Component Group 38]]
- [[_COMMUNITY_Component Group 39|Component Group 39]]
- [[_COMMUNITY_Component Group 40|Component Group 40]]
- [[_COMMUNITY_Component Group 41|Component Group 41]]
- [[_COMMUNITY_Component Group 42|Component Group 42]]
- [[_COMMUNITY_Component Group 43|Component Group 43]]
- [[_COMMUNITY_Component Group 44|Component Group 44]]
- [[_COMMUNITY_Component Group 45|Component Group 45]]
- [[_COMMUNITY_Component Group 46|Component Group 46]]
- [[_COMMUNITY_Component Group 47|Component Group 47]]
- [[_COMMUNITY_Component Group 48|Component Group 48]]
- [[_COMMUNITY_Component Group 49|Component Group 49]]
- [[_COMMUNITY_Component Group 50|Component Group 50]]
- [[_COMMUNITY_Component Group 51|Component Group 51]]
- [[_COMMUNITY_Component Group 52|Component Group 52]]
- [[_COMMUNITY_Component Group 53|Component Group 53]]
- [[_COMMUNITY_Component Group 54|Component Group 54]]
- [[_COMMUNITY_Component Group 55|Component Group 55]]
- [[_COMMUNITY_Component Group 56|Component Group 56]]
- [[_COMMUNITY_Component Group 57|Component Group 57]]
- [[_COMMUNITY_Component Group 58|Component Group 58]]
- [[_COMMUNITY_Component Group 59|Component Group 59]]
- [[_COMMUNITY_Component Group 60|Component Group 60]]
- [[_COMMUNITY_Component Group 61|Component Group 61]]
- [[_COMMUNITY_Component Group 62|Component Group 62]]
- [[_COMMUNITY_Component Group 63|Component Group 63]]
- [[_COMMUNITY_Component Group 64|Component Group 64]]
- [[_COMMUNITY_Component Group 65|Component Group 65]]
- [[_COMMUNITY_Component Group 66|Component Group 66]]
- [[_COMMUNITY_Component Group 67|Component Group 67]]
- [[_COMMUNITY_Component Group 68|Component Group 68]]
- [[_COMMUNITY_Component Group 69|Component Group 69]]
- [[_COMMUNITY_Component Group 70|Component Group 70]]
- [[_COMMUNITY_Component Group 71|Component Group 71]]
- [[_COMMUNITY_Component Group 72|Component Group 72]]
- [[_COMMUNITY_Component Group 73|Component Group 73]]
- [[_COMMUNITY_Component Group 74|Component Group 74]]
- [[_COMMUNITY_Component Group 75|Component Group 75]]
- [[_COMMUNITY_Component Group 76|Component Group 76]]
- [[_COMMUNITY_Component Group 77|Component Group 77]]
- [[_COMMUNITY_Component Group 78|Component Group 78]]
- [[_COMMUNITY_Component Group 79|Component Group 79]]
- [[_COMMUNITY_Component Group 80|Component Group 80]]
- [[_COMMUNITY_Component Group 81|Component Group 81]]
- [[_COMMUNITY_Component Group 82|Component Group 82]]
- [[_COMMUNITY_Component Group 83|Component Group 83]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `resolveSchema()` - 15 edges
3. `compilerOptions` - 15 edges
4. `Nexora Platform` - 11 edges
5. `PaginatedResponse` - 8 edges
6. `makeGarageUpload()` - 6 edges
7. `useMenuStore` - 5 edges
8. `showFeedback()` - 5 edges
9. `scripts` - 4 edges
10. `normalizeCatalogText()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Pinia State Stores` --implements--> `Nexora Platform`  [INFERRED]
  README.md → CLAUDE.md
- `Visual Configuration Module Plan` --implements--> `Nexora Platform`  [INFERRED]
  Plan/plan-implementacion-config-visual-nexora.md → CLAUDE.md
- `DOM Elements Plan` --implements--> `Nexora Platform`  [INFERRED]
  Plan/plan_implementacion_elementos_dom_nexora.md → CLAUDE.md
- `Nexora Master Prompt v3` --references--> `Nexora Platform`  [INFERRED]
  Plan/nexora_prompt_maestro_v3.md → CLAUDE.md
- `Phase 1 - Base System` --implements--> `Nexora Platform`  [INFERRED]
  README_PHASE_1.md → CLAUDE.md

## Hyperedges (group relationships)
- **Nexora Core Architecture** — CLAUDE_nexora_platform, CLAUDE_multi_schema_isolation, CLAUDE_hernancius_master_schema, CLAUDE_two_phase_auth [EXTRACTED 0.95]
- **Garage Core 1 Entities** — core1plan_work_order, core1plan_customers, core1plan_vehicles, core1plan_payments [EXTRACTED 0.95]
- **Implementation Plans** — plan_visual_config, plan_dashboard_config, plan_login, plan_dom_elements [INFERRED 0.85]
- **Nexora Brand Assets** — logo_icon_brand, logo_sf_brand, logo_full_brand [INFERRED 0.90]
- **Security and Access Control Modules** — sec_profiles_module, sec_users_module, sec_profiles_permissions_model, sec_profiles_profile_concept [EXTRACTED 0.95]

## Communities (113 total, 7 thin omitted)

### Community 0 - "Backend Core Controllers"
Cohesion: 0.04
Nodes (33): bcrypt, buildTransactionFlags(), db, fs, GARAGE_TRANSACTION_CODES, hasSubscriptionPlanField, path, { registerCompanyCoreModules } (+25 more)

### Community 1 - "Module & User Controllers"
Cohesion: 0.06
Nodes (29): { createNotification }, db, DEFAULT_PROFILE_PERMISSION_FLAGS, isAdmin(), isSuperAdmin(), { createNotification }, db, bcrypt (+21 more)

### Community 2 - "User Management View"
Cohesion: 0.06
Nodes (36): canManageScopedUsers, cardBg, cardBorder, emptyForm(), fd, filteredUsers, filterRole, filterStatus (+28 more)

### Community 3 - "Commercial & Subscriptions View"
Cohesion: 0.07
Nodes (30): agreementForm, applyPlanToAgreementForm(), cardBg, cardBorder, companyId, defaultAgreementForm(), fmtCurrency(), freqLabel() (+22 more)

### Community 4 - "Profiles & Permissions View"
Cohesion: 0.06
Nodes (30): ACTIONS, cardBg, cardBorder, Component, enabledCount(), filteredProfiles, form, headerColor (+22 more)

### Community 5 - "API Server & Middleware"
Cohesion: 0.06
Nodes (28): allowedOrigins, app, authMiddleware, cors, corsOptions, express, helmet, moduleGuard (+20 more)

### Community 6 - "Garage Operations Backend"
Cohesion: 0.08
Nodes (23): db, { normalizeCatalogText }, normalized, params, { resolveSchema }, VALID_CATALOG_TYPES, conditions, countParams (+15 more)

### Community 7 - "Module Catalog View"
Cohesion: 0.09
Nodes (22): cardBg, cardBorder, filteredModules, filterStatus, form, headerColor, inputBg, inputBorder (+14 more)

### Community 8 - "Frontend Dependencies & Config"
Cohesion: 0.08
Nodes (23): dependencies, axios, lucide-vue-next, pinia, vue, vue-router, devDependencies, autoprefixer (+15 more)

### Community 9 - "Backend Dependencies & Config"
Cohesion: 0.09
Nodes (21): author, dependencies, bcryptjs, cors, dotenv, express, helmet, jsonwebtoken (+13 more)

### Community 10 - "Company Edit Modal"
Cohesion: 0.10
Nodes (15): configStore, error, form, handleClose(), handleSubmit(), headerTextColor, inputBg, inputBorder (+7 more)

### Community 11 - "Database & Labor Rate API"
Cohesion: 0.12
Nodes (14): { Pool }, injectGarageSchema(), conditions, db, params, { resolveSchema }, db, orders (+6 more)

### Community 12 - "Modules Manager View"
Cohesion: 0.12
Nodes (17): activeCompanyId, cardBg, cardBorder, Component, headerColor, inputBg, inputBorder, isLoading (+9 more)

### Community 13 - "Subscriptions Management View"
Cohesion: 0.11
Nodes (19): cardBg, cardBorder, defaultForm(), form, headerColor, inputBg, inputBorder, isLoading (+11 more)

### Community 14 - "Work Order Payments UI"
Cohesion: 0.11
Nodes (17): deletePayment(), error, form, load(), loading, pctPaid, registerPayment(), saving (+9 more)

### Community 15 - "Customers & Upload Backend"
Cohesion: 0.11
Nodes (17): conditions, countParams, customerUpload, db, fs, { makeGarageUpload }, oldPath, params (+9 more)

### Community 16 - "Dashboard View"
Cohesion: 0.10
Nodes (19): badgeBg, badgeBorder, badgeText, cardBg, cardBorder, goldIconColor, goldIconContainerBg, greenIconColor (+11 more)

### Community 17 - "Companies List View"
Cohesion: 0.11
Nodes (14): cardBg, cardBorder, filteredList, headerTextColor, mutedTextColor, searchBg, searchIconColor, searchInputBg (+6 more)

### Community 18 - "Garage API Routes"
Cohesion: 0.11
Nodes (18): appointmentsCtrl, authMiddleware, catalogsCtrl, customersCtrl, db, employeesCtrl, express, laborRatesCtrl (+10 more)

### Community 19 - "Platform Architecture Documentation"
Cohesion: 0.11
Nodes (19): Bluehost Shared Hosting Constraint, Hernancius Master Schema, Multi-Schema PostgreSQL Isolation, Nexora Platform, Two-Phase Authentication, Phase 1 - Base System, Multi-Company Architecture, Pinia State Stores (+11 more)

### Community 20 - "Component Group 20"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 21 - "Component Group 21"
Cohesion: 0.12
Nodes (16): conditions, countParams, db, filePath, fs, { makeGarageUpload }, params, path (+8 more)

### Community 22 - "Component Group 22"
Cohesion: 0.12
Nodes (14): db, dueDate, dueDayValue, hasPlanField, isAdmin(), isSuperAdmin(), lastEnd, params (+6 more)

### Community 23 - "Component Group 23"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 24 - "Component Group 24"
Cohesion: 0.14
Nodes (14): resetAuthCheckPromise(), useVisualConfigStore, AuthState, Company, CompanyUser, Invoice, ModuleGroup, NexoraModule (+6 more)

### Community 25 - "Component Group 25"
Cohesion: 0.13
Nodes (12): close(), customerQuery, customerSearching, error, form, isTransfer, save(), saving (+4 more)

### Community 26 - "Component Group 26"
Cohesion: 0.19
Nodes (12): garageWorkOrdersService, useGarageWorkOrdersStore, AppointmentService, AppointmentStatus, AppointmentStatusHistory, GarageDashboard, VehicleHistorySummary, WorkOrder (+4 more)

### Community 27 - "Component Group 27"
Cohesion: 0.14
Nodes (11): canConfirm, configStore, confirmText, headerColor, inputBg, inputBorder, isDeleting, isLight (+3 more)

### Community 28 - "Component Group 28"
Cohesion: 0.15
Nodes (10): bcrypt, db, { generateToken }, preAuthToken, token, authController, authMiddleware, express (+2 more)

### Community 29 - "Component Group 29"
Cohesion: 0.15
Nodes (11): cardBg, cardBorder, filteredUsers, headerTextColor, inputBg, inputBorder, isLoading, mutedTextColor (+3 more)

### Community 30 - "Component Group 30"
Cohesion: 0.15
Nodes (5): apiBase, canAdd, deliveryPhotos, entryPhotos, MAX

### Community 31 - "Component Group 31"
Cohesion: 0.17
Nodes (11): conditions, countParams, db, filePath, fs, { makeGarageUpload }, { normalizePlate }, params (+3 more)

### Community 32 - "Component Group 32"
Cohesion: 0.17
Nodes (9): cfg, headerColor, inputBg, inputBorder, isLight, isLoading, mutedColor, perms (+1 more)

### Community 33 - "Component Group 33"
Cohesion: 0.17
Nodes (8): DEFAULT_CONFIG, FontOption, FONTS, NEXORA_COLORS, PRESET_COLORS, ThemeMode, Wallpaper, WALLPAPERS

### Community 34 - "Component Group 34"
Cohesion: 0.17
Nodes (10): db, moduleIds, permsMap, profileIds, tree, txByModule, auth, ctrl (+2 more)

### Community 35 - "Component Group 35"
Cohesion: 0.18
Nodes (10): conditions, countParams, db, employeeUpload, fs, { makeGarageUpload }, oldPath, params (+2 more)

### Community 36 - "Component Group 36"
Cohesion: 0.18
Nodes (6): authStore, hasParent, menuStore, requiredModule, requiredTransaction, router

### Community 37 - "Component Group 37"
Cohesion: 0.18
Nodes (8): configStore, headerColor, isLight, isProcessing, modalBg, modalBorder, mutedColor, variantConfig

### Community 38 - "Component Group 38"
Cohesion: 0.18
Nodes (9): cardBg, cardBorder, error, formatCLP, headerTextColor, isLoading, mutedTextColor, tableHeaderBg (+1 more)

### Community 39 - "Component Group 39"
Cohesion: 0.20
Nodes (11): Nexora UI Screenshot - Dashboard/Module View, Nexora UI Screenshot - List/Form View, Nexora UI Screenshot - Dark Theme Admin Panel, Glass Surface UI Design Language, SEC-PROFILES-01 Profile Permissions Module, Module Visibility Concept, Parametric Permissions Model, Profile Definition (Reusable Access Config) (+3 more)

### Community 40 - "Component Group 40"
Cohesion: 0.20
Nodes (7): conditions, db, params, auth, ctrl, express, router

### Community 41 - "Component Group 41"
Cohesion: 0.20
Nodes (7): conditions, countParams, db, params, { resolveSchema }, VALID_STATUSES, year

### Community 42 - "Component Group 42"
Cohesion: 0.20
Nodes (7): garageVehicleHistoryService, Notification, NotificationPreferences, useNotificationsStore, VehicleHistory, api, token

### Community 43 - "Component Group 43"
Cohesion: 0.22
Nodes (8): catalogsStore, createNew(), creating, error, open, q, query, select()

### Community 44 - "Component Group 44"
Cohesion: 0.22
Nodes (6): day, db, auth, ctrl, express, router

### Community 45 - "Component Group 45"
Cohesion: 0.28
Nodes (7): db, finalHours, { recalculateTotals, recalculateServiceTotals }, { resolveSchema }, VALID, recalculateServiceTotals(), recalculateTotals()

### Community 46 - "Component Group 46"
Cohesion: 0.33
Nodes (7): usePermissions(), useAuthStore, MenuModule, MenuTransaction, PermissionAction, TransactionPerms, useMenuStore

### Community 47 - "Component Group 47"
Cohesion: 0.22
Nodes (7): configStore, headerColor, isLight, modalBg, modalBorder, mutedColor, typeConfig

### Community 48 - "Component Group 48"
Cohesion: 0.22
Nodes (8): dependencies, lucide-vue-next, pinia, vue-router, devDependencies, autoprefixer, postcss, tailwindcss

### Community 49 - "Component Group 49"
Cohesion: 0.25
Nodes (5): close(), error, save(), saving, store

### Community 50 - "Component Group 50"
Cohesion: 0.25
Nodes (6): { conditions, params, paramIdx: pi }, db, limit, page, VALID_CATEGORIES, where

### Community 51 - "Component Group 51"
Cohesion: 0.29
Nodes (6): close(), error, form, save(), saving, store

### Community 52 - "Component Group 52"
Cohesion: 0.29
Nodes (5): db, authMiddleware, express, router, subscriptionController

### Community 53 - "Component Group 53"
Cohesion: 0.29
Nodes (5): db, authMiddleware, express, router, statsController

### Community 54 - "Component Group 54"
Cohesion: 0.29
Nodes (5): db, authMiddleware, companyConfigController, express, router

### Community 55 - "Component Group 55"
Cohesion: 0.29
Nodes (5): GONE_RESPONSE, auth, ctrl, express, router

### Community 56 - "Component Group 56"
Cohesion: 0.38
Nodes (3): resetConfiguration(), saveConfiguration(), triggerToast()

### Community 57 - "Component Group 57"
Cohesion: 0.48
Nodes (5): garageCustomersService, useGarageCustomersStore, Customer, CustomerFormData, CustomerListItem

### Community 58 - "Component Group 58"
Cohesion: 0.33
Nodes (6): close(), error, form, save(), saving, store

### Community 59 - "Component Group 59"
Cohesion: 0.33
Nodes (6): close(), convert(), error, form, saving, store

### Community 60 - "Component Group 60"
Cohesion: 0.33
Nodes (6): close(), error, form, save(), saving, store

### Community 61 - "Component Group 61"
Cohesion: 0.33
Nodes (3): reader, unknown, validTypes

### Community 62 - "Component Group 62"
Cohesion: 0.47
Nodes (4): garageAppointmentsService, useGarageAppointmentsStore, Appointment, PaginatedResponse

### Community 63 - "Component Group 63"
Cohesion: 0.47
Nodes (4): garageServiceTemplatesService, useGarageServiceTemplatesStore, ServiceTemplate, ServiceTemplateProduct

### Community 64 - "Component Group 64"
Cohesion: 0.53
Nodes (4): garageCatalogsService, useGarageCatalogsStore, CatalogItem, CatalogType

### Community 65 - "Component Group 65"
Cohesion: 0.53
Nodes (4): garageVehiclesService, useGarageVehiclesStore, Vehicle, VehiclePhoto

### Community 67 - "Component Group 67"
Cohesion: 0.40
Nodes (4): auth, ctrl, express, router

### Community 68 - "Component Group 68"
Cohesion: 0.40
Nodes (4): auth, ctrl, express, router

### Community 69 - "Component Group 69"
Cohesion: 0.40
Nodes (4): auth, ctrl, express, router

### Community 70 - "Component Group 70"
Cohesion: 0.60
Nodes (3): garageEmployeesService, useGarageEmployeesStore, Employee

### Community 71 - "Component Group 71"
Cohesion: 0.60
Nodes (3): garageLaborRatesService, useGarageLaborRatesStore, LaborRate

### Community 72 - "Component Group 72"
Cohesion: 0.60
Nodes (3): garageProductsService, useGarageProductsStore, Product

### Community 73 - "Component Group 73"
Cohesion: 0.50
Nodes (4): Company Management Module, Payment Window, Requests Window, Super Admin Role

### Community 74 - "Component Group 74"
Cohesion: 0.50
Nodes (3): basic, payload, selected

### Community 75 - "Component Group 75"
Cohesion: 0.50
Nodes (3): db, jwt, token

### Community 76 - "Component Group 76"
Cohesion: 0.50
Nodes (4): SDD New Change Workflow, SDD Status Check Workflow, SDD Phase Skills, SDD Workflow Pattern

### Community 79 - "Component Group 79"
Cohesion: 0.67
Nodes (3): Nexora Full Logo (Text+Icon), Nexora Logo Icon (Brand Identity), Nexora Logo SF (No-Text Variant)

## Knowledge Gaps
- **704 isolated node(s):** `lucide-vue-next`, `pinia`, `vue-router`, `autoprefixer`, `postcss` (+699 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resolveSchema()` connect `Database & Labor Rate API` to `Component Group 35`, `Garage Operations Backend`, `Component Group 41`, `Component Group 45`, `Customers & Upload Backend`, `Garage API Routes`, `Component Group 21`, `Component Group 31`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Nexora Platform` (e.g. with `Pinia State Stores` and `Visual Configuration Module Plan`) actually correct?**
  _`Nexora Platform` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lucide-vue-next`, `pinia`, `vue-router` to the rest of the system?**
  _718 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Core Controllers` be split into smaller, more focused modules?**
  _Cohesion score 0.04251700680272109 - nodes in this community are weakly interconnected._
- **Should `Module & User Controllers` be split into smaller, more focused modules?**
  _Cohesion score 0.05609756097560976 - nodes in this community are weakly interconnected._
- **Should `User Management View` be split into smaller, more focused modules?**
  _Cohesion score 0.05512820512820513 - nodes in this community are weakly interconnected._
- **Should `Commercial & Subscriptions View` be split into smaller, more focused modules?**
  _Cohesion score 0.06722689075630252 - nodes in this community are weakly interconnected._