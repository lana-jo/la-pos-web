import { Database } from './types/database';

type CategoriesInsert = Database['public']['Tables']['categories']['Insert'];

const data: CategoriesInsert = {
  name: "test",
  slug: "test",
  icon: null,
  color: "#ffffff",
  is_active: true,
  sort_order: 1
};

console.log('Type check passed');
