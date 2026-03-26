export interface User {
  id: number;
  email: string;
  full_name: string;
  is_super_admin: boolean;
}

export interface Company {
  id: number;
  name: string;
  schema_name: string;
  is_company_admin?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  companies: Company[];
  currentCompany: Company | null;
  isAuthenticated: boolean;
}
