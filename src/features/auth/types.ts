export type UserRole = 'admin' | 'collector';
export type AppArea = 'dashboard' | 'collection' | 'segregation' | 'recycling' | 'inventory';

export type AuthUser = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
