const path = require('path');
const fs   = require('fs');
const db   = require('../../config/db');
const { resolveSchema }    = require('../../utils/tenantResolver');
const { makeGarageUpload } = require('../../utils/upload');
const { normalizePlate }   = require('../../utils/normalizeText');

const vehicleUpload = makeGarageUpload('vehicles', 5);
const MAX_PHOTOS    = 8;

/**
 * GET /garage/vehicles
 * Query: ?q=placa, ?customer_id=N, ?brand_id=N, ?status=active|inactive|all, ?page=1, ?limit=50
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, customer_id, brand_id, status = 'active', page = 1, limit = 50 } = req.query;

        const params = [];
        const conditions = [];

        if (status !== 'all') {
            params.push(status);
            conditions.push(`v.status = $${params.length}`);
        }
        if (q) {
            params.push(`%${normalizePlate(q)}%`);
            params.push(`%${q.toLowerCase()}%`);
            conditions.push(`(UPPER(v.plate) LIKE $${params.length - 1} OR LOWER(vb.name) LIKE $${params.length} OR LOWER(vm.name) LIKE $${params.length})`);
        }
        if (customer_id) {
            params.push(customer_id);
            conditions.push(`v.customer_id = $${params.length}`);
        }
        if (brand_id) {
            params.push(brand_id);
            conditions.push(`v.brand_id = $${params.length}`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await db.query(
            `SELECT v.id, v.plate, v.year, v.status, v.customer_id,
                    c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
                    vb.name AS brand, vm.name AS model, v.version,
                    vt.name AS vehicle_type, vc.name AS color
             FROM ${schema}.vehicles v
             LEFT JOIN ${schema}.customers c        ON c.id = v.customer_id
             LEFT JOIN ${schema}.vehicle_brands vb  ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm  ON vm.id = v.model_id
             LEFT JOIN ${schema}.vehicle_types vt   ON vt.id = v.vehicle_type_id
             LEFT JOIN ${schema}.vehicle_colors vc  ON vc.id = v.color_id
             ${where}
             ORDER BY vb.name ASC, vm.name ASC, v.plate ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.vehicles v
             LEFT JOIN ${schema}.vehicle_brands vb ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm ON vm.id = v.model_id
             ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('vehiclesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar vehículos' });
    }
};

/**
 * GET /garage/vehicles/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT v.*,
                    c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
                    vb.name AS brand_name, vm.name AS model_name,
                    vt.name AS vehicle_type_name, vbt.name AS body_type_name,
                    vc.name AS color_name, vc.hex_color,
                    vtr.name AS transmission_name, vft.name AS fuel_type_name
             FROM ${schema}.vehicles v
             LEFT JOIN ${schema}.customers c              ON c.id = v.customer_id
             LEFT JOIN ${schema}.vehicle_brands vb        ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm        ON vm.id = v.model_id
             LEFT JOIN ${schema}.vehicle_types vt         ON vt.id = v.vehicle_type_id
             LEFT JOIN ${schema}.vehicle_body_types vbt   ON vbt.id = v.body_type_id
             LEFT JOIN ${schema}.vehicle_colors vc        ON vc.id = v.color_id
             LEFT JOIN ${schema}.vehicle_transmissions vtr ON vtr.id = v.transmission_id
             LEFT JOIN ${schema}.vehicle_fuel_types vft   ON vft.id = v.fuel_type_id
             WHERE v.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('vehiclesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener vehículo' });
    }
};

/**
 * GET /garage/customers/:customerId/vehicles
 */
exports.listByCustomer = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT v.id, v.plate, v.year, v.status, v.version,
                    vb.name AS brand, vm.name AS model, vt.name AS vehicle_type
             FROM ${schema}.vehicles v
             LEFT JOIN ${schema}.vehicle_brands vb ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm ON vm.id = v.model_id
             LEFT JOIN ${schema}.vehicle_types vt  ON vt.id = v.vehicle_type_id
             WHERE v.customer_id = $1
             ORDER BY vb.name ASC, vm.name ASC`,
            [req.params.customerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('vehiclesController.listByCustomer error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener vehículos del cliente' });
    }
};

/**
 * POST /garage/vehicles
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const {
            customer_id, vehicle_type_id, body_type_id, brand_id, model_id,
            version, plate, year, color_id, transmission_id, fuel_type_id,
            engine_displacement, vin, engine_number, mileage, notes
        } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });

        const normalizedPlate = plate ? normalizePlate(plate) : null;

        const result = await db.query(
            `INSERT INTO ${schema}.vehicles
             (customer_id, vehicle_type_id, body_type_id, brand_id, model_id, version,
              plate, year, color_id, transmission_id, fuel_type_id,
              engine_displacement, vin, engine_number, mileage, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             RETURNING *`,
            [
                customer_id, vehicle_type_id || null, body_type_id || null,
                brand_id || null, model_id || null, version || null,
                normalizedPlate, year || null, color_id || null,
                transmission_id || null, fuel_type_id || null,
                engine_displacement || null, vin || null, engine_number || null,
                mileage || 0, notes || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un vehículo con esa placa' });
        }
        console.error('vehiclesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear vehículo' });
    }
};

/**
 * PUT /garage/vehicles/:id
 */
exports.update = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const {
            customer_id, vehicle_type_id, body_type_id, brand_id, model_id,
            version, plate, year, color_id, transmission_id, fuel_type_id,
            engine_displacement, vin, engine_number, mileage, notes,
            transfer_reason
        } = req.body;

        const normalizedPlate = plate ? normalizePlate(plate) : null;

        await client.query('BEGIN');

        // Issue 4: detect ownership change and record transfer history
        const current = await client.query(
            `SELECT customer_id FROM ${schema}.vehicles WHERE id = $1`, [req.params.id]
        );
        if (current.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Vehículo no encontrado' });
        }
        const previousCustomerId = current.rows[0].customer_id;
        const isTransfer = customer_id && String(customer_id) !== String(previousCustomerId);

        const result = await client.query(
            `UPDATE ${schema}.vehicles SET
             customer_id=$1, vehicle_type_id=$2, body_type_id=$3, brand_id=$4, model_id=$5,
             version=$6, plate=$7, year=$8, color_id=$9, transmission_id=$10, fuel_type_id=$11,
             engine_displacement=$12, vin=$13, engine_number=$14, mileage=$15, notes=$16,
             updated_at=CURRENT_TIMESTAMP
             WHERE id=$17 RETURNING *`,
            [
                customer_id, vehicle_type_id || null, body_type_id || null,
                brand_id || null, model_id || null, version || null,
                normalizedPlate, year || null, color_id || null,
                transmission_id || null, fuel_type_id || null,
                engine_displacement || null, vin || null, engine_number || null,
                mileage || 0, notes || null, req.params.id
            ]
        );

        if (isTransfer) {
            // Try to record transfer — if the table doesn't exist yet, log and continue
            try {
                await client.query(
                    `INSERT INTO ${schema}.vehicle_ownership_transfers
                     (vehicle_id, previous_customer_id, new_customer_id, transfer_reason, transferred_by)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [req.params.id, previousCustomerId, customer_id,
                     transfer_reason || null, req.user?.id || null]
                );
            } catch (transferErr) {
                console.warn('vehiclesController.update: transfer table missing, skipping:', transferErr.message);
            }
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un vehículo con esa placa' });
        }
        console.error('vehiclesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar vehículo' });
    } finally {
        client.release();
    }
};

/**
 * PATCH /garage/vehicles/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'status debe ser active o inactive' });
        }

        const result = await db.query(
            `UPDATE ${schema}.vehicles SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, status`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('vehiclesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};

// ─── GALERÍA DE FOTOS ─────────────────────────────────────────

/**
 * GET /garage/vehicles/:id/photos
 */
exports.listPhotos = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.vehicle_photos WHERE vehicle_id = $1 ORDER BY stage ASC, sort_order ASC, created_at ASC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('vehiclesController.listPhotos error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener fotos' });
    }
};

/**
 * POST /garage/vehicles/:id/photos
 * Middleware: injectGarageSchema, vehicleUpload.single('photo')
 * Body: stage (entry|delivery), caption, sort_order, work_order_id
 */
exports.uploadPhoto = [
    vehicleUpload.single('photo'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No se proporcionó ningún archivo' });

            const { schema } = await resolveSchema(req);
            const vehicleId = req.params.id;

            // Verificar que el vehículo existe
            const vehicleCheck = await db.query(
                `SELECT id FROM ${schema}.vehicles WHERE id = $1`,
                [vehicleId]
            );
            if (vehicleCheck.rows.length === 0) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ error: 'Vehículo no encontrado' });
            }

            // Validar límite de 8 fotos
            const countResult = await db.query(
                `SELECT COUNT(*) FROM ${schema}.vehicle_photos WHERE vehicle_id = $1`,
                [vehicleId]
            );
            if (parseInt(countResult.rows[0].count) >= MAX_PHOTOS) {
                fs.unlinkSync(req.file.path);
                return res.status(422).json({ error: `El vehículo ya tiene el máximo de ${MAX_PHOTOS} fotos permitidas` });
            }

            const { stage = 'entry', caption, sort_order, work_order_id } = req.body;
            if (!['entry', 'delivery'].includes(stage)) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'stage debe ser entry o delivery' });
            }

            const photoUrl = `/uploads/garage/vehicles/${schema}/${req.file.filename}`;

            const result = await db.query(
                `INSERT INTO ${schema}.vehicle_photos
                 (vehicle_id, work_order_id, photo_url, stage, caption, sort_order, uploaded_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
                [
                    vehicleId, work_order_id || null, photoUrl,
                    stage, caption || null,
                    sort_order != null ? parseInt(sort_order) : 0,
                    req.user?.id || null
                ]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            console.error('vehiclesController.uploadPhoto error:', err.message);
            res.status(err.statusCode || 500).json({ error: err.message || 'Error al subir foto' });
        }
    }
];

/**
 * DELETE /garage/vehicles/:id/photos/:photoId
 */
exports.deletePhoto = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { id: vehicleId, photoId } = req.params;

        const existing = await db.query(
            `SELECT photo_url FROM ${schema}.vehicle_photos WHERE id = $1 AND vehicle_id = $2`,
            [photoId, vehicleId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Foto no encontrada' });

        const photoUrl = existing.rows[0].photo_url;
        await db.query(`DELETE FROM ${schema}.vehicle_photos WHERE id = $1`, [photoId]);

        if (photoUrl) {
            const filePath = path.join(__dirname, '..', '..', photoUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        res.json({ message: 'Foto eliminada' });
    } catch (err) {
        console.error('vehiclesController.deletePhoto error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al eliminar foto' });
    }
};
