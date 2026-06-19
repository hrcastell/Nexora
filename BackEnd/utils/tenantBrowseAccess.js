const BROWSE_ROLE = 'hernanci';

const quoteIdent = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Invalid SQL identifier');
  }
  return `"${value.replace(/"/g, '""')}"`;
};

const buildGrantBrowseStatements = (schemaName, roleName = BROWSE_ROLE) => {
  const schema = quoteIdent(schemaName);
  const role = quoteIdent(roleName);

  return [
    `GRANT ALL PRIVILEGES ON SCHEMA ${schema} TO ${role}`,
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schema} TO ${role}`,
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT ALL PRIVILEGES ON TABLES TO ${role}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT ALL PRIVILEGES ON SEQUENCES TO ${role}`,
  ];
};

const roleExists = async (client, roleName = BROWSE_ROLE) => {
  const result = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1 LIMIT 1', [roleName]);
  return result.rows.length > 0;
};

const listTenantSchemas = async (client) => {
  const result = await client.query(`
    SELECT c.id, c.name, c.schema_name, n.oid IS NOT NULL AS schema_exists
    FROM public.companies c
    LEFT JOIN pg_namespace n ON n.nspname = c.schema_name
    WHERE c.schema_name IS NOT NULL AND c.schema_name <> ''
    ORDER BY c.schema_name
  `);

  return result.rows;
};

const grantBrowseAccessForSchema = async (client, schemaName, roleName = BROWSE_ROLE) => {
  const statements = buildGrantBrowseStatements(schemaName, roleName);

  await client.query('BEGIN');
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const grantBrowseAccessForTenants = async (client, roleName = BROWSE_ROLE) => {
  const tenants = await listTenantSchemas(client);
  const exists = await roleExists(client, roleName);
  const aplicados = [];
  const omitidos = [];

  if (!exists) {
    return {
      role: roleName,
      roleExists: false,
      aplicados,
      omitidos: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        schema_name: tenant.schema_name,
        reason: `El rol ${roleName} no existe en PostgreSQL`,
      })),
    };
  }

  for (const tenant of tenants) {
    if (!tenant.schema_exists) {
      omitidos.push({
        id: tenant.id,
        name: tenant.name,
        schema_name: tenant.schema_name,
        reason: 'El schema no existe en PostgreSQL',
      });
      continue;
    }

    try {
      await grantBrowseAccessForSchema(client, tenant.schema_name, roleName);
      aplicados.push({
        id: tenant.id,
        name: tenant.name,
        schema_name: tenant.schema_name,
      });
    } catch (error) {
      omitidos.push({
        id: tenant.id,
        name: tenant.name,
        schema_name: tenant.schema_name,
        reason: error.message,
      });
    }
  }

  return {
    role: roleName,
    roleExists: true,
    aplicados,
    omitidos,
  };
};

module.exports = {
  BROWSE_ROLE,
  buildGrantBrowseStatements,
  grantBrowseAccessForTenants,
};
