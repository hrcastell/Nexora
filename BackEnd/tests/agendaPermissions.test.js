const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Exercise the real routers + permission middleware; stub only identity,
// database results and final business handlers (no persistent test data).
let user;
let modules;
let permissions;
let databaseError = false;
const queriedSchemas = [];
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    query: async (sql, params) => {
        if (databaseError) throw new Error('test database unavailable');
        if (sql.includes('public.module_catalog')) return { rows: modules.map(code => ({ code })) };
        const flag = sql.match(/bool_or\(ptp\.(\w+)\)/)?.[1];
        const schema = sql.match(/FROM "([^"]+)"/)[1];
        queriedSchemas.push(schema);
        return { rows: [{ allowed: permissions[schema]?.[params[1]]?.includes(flag) || false }] };
    }
} };
const authPath = require.resolve('../middleware/authMiddleware');
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: (req, res, next) => {
    if (!user) return res.sendStatus(401);
    req.user = { ...user };
    next();
} };
for (const domain of ['garage', 'dental']) {
    const controller = require(`../controllers/${domain}/appointmentsController`);
    for (const key of Object.keys(controller)) controller[key] = (req, res) => res.sendStatus(204);
}
const { invalidateCompanyModuleCache } = require('../utils/moduleState');
const { resolveRouteModule } = require('../config/routeModuleMap');
const app = express();
app.use(express.json());
for (const domain of ['garage', 'dental']) {
    const router = require(`../routes/${domain}/${domain}Routes`);
    app.use(`/${domain}`, router);
    app.use(`/companies/:companyId/${domain}`, router);
}

test('agenda route permission matrix', async t => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(domain, method, route, expected, prefix = '') {
        const res = await fetch(`${base}${prefix}/${domain}${route}`, { method });
        assert.equal(res.status, expected, `${method} ${prefix}/${domain}${route}`);
        await res.text();
    }
    function reset() {
        user = { id: 7, company_id: 10, schema_name: 'audit_a', is_super_admin: false, role: 'inner_user', read_only: false };
        modules = ['garage_operations', 'dental_core'];
        permissions = { audit_a: {}, audit_b: {} };
        databaseError = false;
        invalidateCompanyModuleCache(10);
        queriedSchemas.length = 0;
    }
    for (const domain of ['garage', 'dental']) {
        const transaction = `${domain}_appointments`;
        const destination = domain === 'garage' ? 'garage_work_orders' : 'dental_consultations';
        const update = domain === 'garage' ? 'PUT' : 'PATCH';
        const convert = domain === 'garage' ? 'convert-to-work-order' : 'convert-to-consultation';
        const writes = [['POST', '/appointments'], [update, '/appointments/1'], ['PUT', '/appointment-settings'],
            ...['confirm', 'cancel', 'no-show', ...(domain === 'garage' ? ['mark-arrived', 'reschedule'] : []), convert].map(action => ['POST', `/appointments/1/${action}`])];
        const reads = ['/appointments', '/appointments/1', '/appointment-settings', ...(domain === 'dental' ? ['/appointments/day', '/appointments/month'] : [])];
        await t.test(`${domain}: anonymous and no profile denied on every agenda route`, async () => {
            reset(); user = null;
            for (const route of reads) await request(domain, 'GET', route, 401);
            reset();
            for (const route of reads) await request(domain, 'GET', route, 403);
            for (const [method, route] of writes) await request(domain, method, route, 403);
        });
        await t.test(`${domain}: viewing does not authorize writing`, async () => {
            reset(); permissions.audit_a[transaction] = ['can_view'];
            for (const route of reads) await request(domain, 'GET', route, 204);
            for (const [method, route] of writes) await request(domain, method, route, 403);
        });
        await t.test(`${domain}: create, edit and admin are independent`, async () => {
            reset(); permissions.audit_a[transaction] = ['can_view', 'can_create'];
            await request(domain, 'POST', '/appointments', 204);
            await request(domain, update, '/appointments/1', 403);
            await request(domain, 'PUT', '/appointment-settings', 403);
            permissions.audit_a[transaction] = ['can_view', 'can_edit'];
            for (const [method, route] of writes.filter(([, r]) => r.includes('/appointments/1') && !r.endsWith(convert))) await request(domain, method, route, 204);
            await request(domain, 'POST', '/appointments', 403);
            await request(domain, 'PUT', '/appointment-settings', 403);
            permissions.audit_a[transaction] = ['can_view', 'can_admin'];
            await request(domain, 'PUT', '/appointment-settings', 204);
            await request(domain, update, '/appointments/1', 403);
        });
        await t.test(`${domain}: conversion also requires destination view and creation`, async () => {
            reset(); permissions.audit_a[transaction] = ['can_view', 'can_edit'];
            await request(domain, 'POST', `/appointments/1/${convert}`, 403);
            permissions.audit_a[destination] = ['can_create'];
            await request(domain, 'POST', `/appointments/1/${convert}`, 403);
            permissions.audit_a[destination] = ['can_view', 'can_create'];
            await request(domain, 'POST', `/appointments/1/${convert}`, 204);
        });
        await t.test(`${domain}: disabled module, read-only, and super admin`, async () => {
            reset(); permissions.audit_a[transaction] = ['can_view', 'can_create', 'can_edit', 'can_admin'];
            permissions.audit_a[destination] = ['can_view', 'can_create'];
            modules = []; invalidateCompanyModuleCache(10);
            for (const route of reads) await request(domain, 'GET', route, 403);
            for (const [method, route] of writes) await request(domain, method, route, 403);
            user.is_super_admin = true;
            for (const [method, route] of writes) await request(domain, method, route, 204);
            user.read_only = true;
            for (const [method, route] of writes) await request(domain, method, route, 403);
            await request(domain, 'GET', '/appointments', 204);
            user.is_super_admin = false; modules = ['garage_operations', 'dental_core']; invalidateCompanyModuleCache(10);
            await request(domain, 'GET', '/appointments', 204);
            for (const [method, route] of writes) await request(domain, method, route, 403);
        });
        await t.test(`${domain}: tenant context and validation errors fail closed`, async () => {
            reset(); permissions.audit_b[transaction] = ['can_view', 'can_create'];
            await request(domain, 'POST', '/appointments', 403);
            assert.deepEqual(queriedSchemas, ['audit_a']);
            await request(domain, 'GET', '/appointments', 403, '/companies/11');
            user.schema_name = 'invalid"schema';
            await request(domain, 'GET', '/appointments', 403);
            reset(); databaseError = true;
            await request(domain, 'GET', '/appointment-settings', 500);
            reset();
            for (const method of ['GET', 'PUT']) {
                assert.deepEqual(resolveRouteModule(method, `/${domain}/appointment-settings`).modules, [domain === 'garage' ? 'garage_operations' : 'dental_core']);
            }
        });
    }
});
