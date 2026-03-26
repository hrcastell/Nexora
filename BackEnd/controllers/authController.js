const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user in public.users
    const result = await db.query(
      'SELECT * FROM public.users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // 2. Validate password
    // For the initial seed user, we might need a specific check if hashing isn't set up yet in DB
    // But assuming standard flow:
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Get User Companies
    const companiesResult = await db.query(
      `SELECT c.id, c.name, c.schema_name, cu.is_company_admin 
       FROM public.companies c
       JOIN public.company_users cu ON c.id = cu.company_id
       WHERE cu.user_id = $1 AND c.is_active = TRUE`,
      [user.id]
    );

    const companies = companiesResult.rows;

    // 4. Determine response
    // If user has no companies, they can't login (unless super admin, maybe?)
    // If user has 1 company, auto-select? Or always show selector?
    // Requirement says: "El sistema debe permitir entrar a una ventana donde pueda ver todas las compañías"
    // So we return the list of companies and a temporary token (or just the list if we use a different flow)
    
    // We'll issue a temporary "pre-auth" token that allows fetching companies and selecting one
    const preAuthToken = generateToken(user); 

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_super_admin: user.is_super_admin
      },
      companies,
      token: preAuthToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.selectCompany = async (req, res) => {
  const { companyId } = req.body;
  const userId = req.user.id; // From middleware

  try {
    // Verify user belongs to company
    const result = await db.query(
      `SELECT c.id, c.name, c.schema_name 
       FROM public.companies c
       JOIN public.company_users cu ON c.id = cu.company_id
       WHERE c.id = $1 AND cu.user_id = $2`,
      [companyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access to this company denied' });
    }

    const company = result.rows[0];
    const userResult = await db.query('SELECT * FROM public.users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Generate full token with schema context
    const token = generateToken(user, company.id, company.schema_name);

    res.json({
      message: 'Company selected',
      company,
      token
    });

  } catch (error) {
    console.error('Select company error:', error);
    res.status(500).json({ error: 'Server error selecting company' });
  }
};

exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const userResult = await db.query('SELECT id, email, full_name, is_super_admin FROM public.users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: userResult.rows[0], context: { company_id: req.user.company_id, schema: req.user.schema_name } });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
}
