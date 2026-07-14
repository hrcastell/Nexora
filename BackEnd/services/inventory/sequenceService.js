const SEQUENCE_DEFAULTS = {
    purchase_order: { prefix: 'OC', padding: 6, resetPolicy: 'yearly' },
    purchase_invoice: { prefix: 'FC', padding: 6, resetPolicy: 'yearly' },
    dispatch_order: { prefix: 'OD', padding: 6, resetPolicy: 'yearly' },
    stock_count: { prefix: 'CI', padding: 6, resetPolicy: 'yearly' }
};

function assertSchema(schema) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
        throw new Error('Invalid tenant schema');
    }
}

async function allocateNumber(client, schema, documentType) {
    assertSchema(schema);

    const defaults = SEQUENCE_DEFAULTS[documentType];
    if (!defaults) {
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    await client.query(
        `INSERT INTO ${schema}.document_sequences
            (document_type, prefix, current_number, padding, reset_policy, status, seq_year)
         VALUES ($1, $2, 0, $3, $4, 'active', EXTRACT(YEAR FROM CURRENT_DATE)::int)
         ON CONFLICT (document_type) DO NOTHING`,
        [documentType, defaults.prefix, defaults.padding, defaults.resetPolicy]
    );

    const sequenceResult = await client.query(
        `SELECT id, prefix, current_number, padding, reset_policy,
                EXTRACT(YEAR FROM CURRENT_DATE)::int AS cur_year, seq_year
           FROM ${schema}.document_sequences
          WHERE document_type = $1
          FOR UPDATE`,
        [documentType]
    );

    if (sequenceResult.rows.length === 0) {
        throw new Error(`Unable to allocate sequence for document type: ${documentType}`);
    }

    const sequence = sequenceResult.rows[0];
    const currentYear = Number(sequence.cur_year);
    const shouldReset = sequence.reset_policy === 'yearly' && Number(sequence.seq_year) !== currentYear;
    const nextNumber = shouldReset ? 1 : Number(sequence.current_number) + 1;

    await client.query(
        `UPDATE ${schema}.document_sequences
            SET current_number = $1, seq_year = $2, updated_at = NOW()
          WHERE id = $3`,
        [nextNumber, currentYear, sequence.id]
    );

    return `${sequence.prefix}-${currentYear}-${String(nextNumber).padStart(Number(sequence.padding), '0')}`;
}

module.exports = { allocateNumber };
