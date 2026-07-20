-- =============================================================
-- MIGRATION: 51_products_cotizaciones_module_catalog.sql
-- Products Catalog Transversal — Phase 1 (public schema only)
--
-- Seeds two module_catalog entries:
--   1. `products`    — NEUTRAL catalog module. NOT independently
--      purchasable; enablement is DERIVED (OR of garage_operations
--      and inventory), computed at read time by backend Phase 2
--      work. No company_modules row is ever persisted for it.
--   2. `cotizaciones` — STANDALONE module (own permission/menu,
--      independently enablable, reusable by future cores).
--
-- Also seeds their child module_transactions:
--   - `products` transaction under the `products` module.
--   - `quotes` transaction under the `cotizaciones` module.
--
-- Additive/expand-only. Idempotent (ON CONFLICT DO UPDATE / DO NOTHING).
-- PostgreSQL 10.23 compatible. Safe to paste once in public schema
-- via phpPgAdmin.
-- =============================================================

-- —————————————————————————————————————————————————————————————
-- 1. Seed module_catalog: products (neutral) + cotizaciones (standalone)
-- —————————————————————————————————————————————————————————————

INSERT INTO public.module_catalog
    (code, name, description, icon, group_name, is_core, is_global, is_system,
     menu_visible_default, menu_order_default, status, category, version)
VALUES
    ('products', 'Productos',
     'Catálogo neutral de productos, compartido por Operaciones de Taller e Inventario. Habilitación derivada (OR), sin fila propia en company_modules.',
     'package', 'Catálogo', FALSE, TRUE, FALSE, TRUE, 15, 'activo', 'business_core', '1.0.0'),
    ('cotizaciones', 'Cotizaciones',
     'Módulo independiente de cotizaciones con integración a Tesorería y flujo de compra a proveedor (tercerizador).',
     'clipboard-list', 'Cotizaciones', FALSE, TRUE, FALSE, TRUE, 70, 'activo', 'business_core', '1.0.0')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    version     = EXCLUDED.version,
    status      = EXCLUDED.status;

-- —————————————————————————————————————————————————————————————
-- 2. Seed module_transactions: products (under products) + quotes (under cotizaciones)
-- —————————————————————————————————————————————————————————————

DO $$
DECLARE
    products_mod_id     INTEGER;
    cotizaciones_mod_id INTEGER;
BEGIN
    SELECT id INTO products_mod_id     FROM public.module_catalog WHERE code = 'products';
    SELECT id INTO cotizaciones_mod_id FROM public.module_catalog WHERE code = 'cotizaciones';

    INSERT INTO public.module_transactions (module_id, code, name, description, route, icon, tab_order, menu_visible, status)
    VALUES
        (products_mod_id,     'products', 'Productos',    'Catálogo de productos e insumos (visible con Operaciones de Taller o Inventario)', '/products',    'package',        1, TRUE, 'activo'),
        (cotizaciones_mod_id, 'quotes',   'Cotizaciones', 'Cotizaciones a clientes con líneas de stock o tercerizadas',                       '/cotizaciones', 'clipboard-list', 1, TRUE, 'activo')
    ON CONFLICT (module_id, code) DO UPDATE SET
        name        = EXCLUDED.name,
        description = EXCLUDED.description,
        route       = EXCLUDED.route,
        tab_order   = EXCLUDED.tab_order,
        status      = EXCLUDED.status;
END $$;

-- No company_modules row is inserted for `products` (virtual OR enablement,
-- ADR-1). `cotizaciones` follows the normal opt-in flow via the existing
-- company_modules admin UI, same as any other standalone core.
