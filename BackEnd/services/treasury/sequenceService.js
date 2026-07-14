const DEFAULTS = {
    sale_invoice: { prefix: 'FV', padding: 6 },
    sale_note: { prefix: 'NV', padding: 6 },
    purchase_invoice: { prefix: 'FC', padding: 6 },
    debit_note: { prefix: 'ND', padding: 6 },
    credit_note: { prefix: 'NC', padding: 6 },
    installment_plan: { prefix: 'CP', padding: 6 },
    internal_charge: { prefix: 'CI', padding: 6 }
};

function assertSchema(schema) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw new Error('Invalid tenant schema');
}

async function getNextNumber(client, schema, companyId, documentType) {
    assertSchema(schema);
    const config = DEFAULTS[documentType];
    if (!config) throw new Error(`Unsupported document type: ${documentType}`);
    const year = new Date().getFullYear();
    await client.query(
        `INSERT INTO ${schema}.treasury_document_sequences (tenant_id, document_type, seq_year, last_number, prefix)
         VALUES ($1, $2, $3, 0, $4)
         ON CONFLICT (tenant_id, document_type, seq_year) DO NOTHING`,
        [companyId, documentType, year, config.prefix]
    );
    const result = await client.query(
        `SELECT id, prefix, last_number FROM ${schema}.treasury_document_sequences
         WHERE tenant_id = $1 AND document_type = $2 AND seq_year = $3 FOR UPDATE`,
        [companyId, documentType, year]
    );
    if (!result.rows.length) throw new Error('No fue posible obtener el correlativo del documento');
    const sequence = result.rows[0];
    const next = Number(sequence.last_number) + 1;
    await client.query(`UPDATE ${schema}.treasury_document_sequences SET last_number = $1 WHERE id = $2`, [next, sequence.id]);
    return `${sequence.prefix || config.prefix}-${year}-${String(next).padStart(config.padding, '0')}`;
}

module.exports = { getNextNumber };
