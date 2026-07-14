const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

function createCatalogController(table, label) {
    function validate(body, res) {
        if (!body.code?.trim() || !body.name?.trim()) {
            res.status(400).json({ error: 'code y name son requeridos' });
            return false;
        }
        return true;
    }

    function valuesFrom(body) {
        return [body.code.trim(), body.name.trim()];
    }

    return {
        async list(req, res) {
            try {
                const { schema } = await resolveSchema(req);
                const { status = 'active', q } = req.query;
                const params = [];
                const conditions = [];
                if (status !== 'all') {
                    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status debe ser active, inactive o all' });
                    params.push(status);
                    conditions.push(`status = $${params.length}`);
                }
                if (q?.trim()) {
                    params.push(`%${q.trim()}%`);
                    conditions.push(`(code ILIKE $${params.length} OR name ILIKE $${params.length})`);
                }
                const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
                const result = await db.query(`SELECT * FROM ${schema}.${table} ${where} ORDER BY name ASC`, params);
                res.json(result.rows);
            } catch (err) {
                console.error(`${table}.list error:`, err.message);
                res.status(err.statusCode || 500).json({ error: err.message || `No fue posible listar ${label}` });
            }
        },

        async getById(req, res) {
            try {
                const { schema } = await resolveSchema(req);
                const result = await db.query(`SELECT * FROM ${schema}.${table} WHERE id = $1`, [req.params.id]);
                if (!result.rows.length) return res.status(404).json({ error: `${label} no encontrado/a` });
                res.json(result.rows[0]);
            } catch (err) {
                console.error(`${table}.getById error:`, err.message);
                res.status(err.statusCode || 500).json({ error: err.message || `No fue posible obtener ${label}` });
            }
        },

        async create(req, res) {
            try {
                if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
                if (!validate(req.body, res)) return;
                const { schema } = await resolveSchema(req);
                const [code, name] = valuesFrom(req.body);
                const duplicate = await db.query(`SELECT id FROM ${schema}.${table} WHERE code = $1`, [code]);
                if (duplicate.rows.length) return res.status(409).json({ error: `Ya existe un/a ${label} con este código`, id: duplicate.rows[0].id });
                const result = await db.query(`INSERT INTO ${schema}.${table} (code, name) VALUES ($1, $2) RETURNING *`, [code, name]);
                res.status(201).json(result.rows[0]);
            } catch (err) {
                console.error(`${table}.create error:`, err.message);
                res.status(err.statusCode || 500).json({ error: err.message || `No fue posible crear ${label}` });
            }
        },

        async update(req, res) {
            try {
                if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
                if (!validate(req.body, res)) return;
                const { schema } = await resolveSchema(req);
                const [code, name] = valuesFrom(req.body);
                const duplicate = await db.query(`SELECT id FROM ${schema}.${table} WHERE code = $1 AND id <> $2`, [code, req.params.id]);
                if (duplicate.rows.length) return res.status(409).json({ error: `Ya existe otro/a ${label} con este código` });
                const result = await db.query(`UPDATE ${schema}.${table} SET code = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`, [code, name, req.params.id]);
                if (!result.rows.length) return res.status(404).json({ error: `${label} no encontrado/a` });
                res.json(result.rows[0]);
            } catch (err) {
                console.error(`${table}.update error:`, err.message);
                res.status(err.statusCode || 500).json({ error: err.message || `No fue posible actualizar ${label}` });
            }
        },

        async toggleStatus(req, res) {
            try {
                if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
                if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ error: 'status debe ser active o inactive' });
                const { schema } = await resolveSchema(req);
                const result = await db.query(`UPDATE ${schema}.${table} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [req.body.status, req.params.id]);
                if (!result.rows.length) return res.status(404).json({ error: `${label} no encontrado/a` });
                res.json(result.rows[0]);
            } catch (err) {
                console.error(`${table}.toggleStatus error:`, err.message);
                res.status(err.statusCode || 500).json({ error: err.message || `No fue posible cambiar el estado de ${label}` });
            }
        }
    };
}

module.exports = { createCatalogController };
