
import { User, UserRole, MenuItem, Table, TableStatus, StockEntry } from './types.ts';

export const INITIAL_USERS: User[] = [
  { id: '1', username: 'owner', role: UserRole.OWNER, name: 'Admin Owner' },
  { id: '2', username: 'cashier', role: UserRole.CASHIER, name: 'Sarah Cashier' },
  { id: '3', username: 'chef', role: UserRole.CHEF, name: 'Marco Chef' },
  { id: '4', username: 'waitress', role: UserRole.WAITRESS, name: 'Elena Waitress' },
];

export const INITIAL_TABLES: Table[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t-${i + 1}`,
  number: i + 1,
  status: TableStatus.AVAILABLE,
}));

export const INITIAL_MENU: MenuItem[] = [
  { id: 'm1', name: 'Margherita Pizza', category: 'Main', price: 3750.00, is_available: true, description: 'Classic tomato, mozzarella, and basil' },
  { id: 'm2', name: 'Pasta Carbonara', category: 'Main', price: 4200.00, is_available: true, description: 'Creamy pasta with pancetta' },
  { id: 'm3', name: 'Greek Salad', category: 'Appetizer', price: 1800.00, is_available: true, description: 'Fresh veggies with feta cheese' },
  { id: 'm4', name: 'Truffle Fries', category: 'Appetizer', price: 1500.00, is_available: true, description: 'Crispy fries with truffle oil' },
  { id: 'm5', name: 'Tiramisu', category: 'Dessert', price: 2200.00, is_available: true, description: 'Italian coffee-flavored cake' },
  { id: 'm6', name: 'Espresso', category: 'Drink', price: 850.00, is_available: true, description: 'Strong black coffee' },
  { id: 'm7', name: 'Red Wine (Glass)', category: 'Drink', price: 2500.00, is_available: true, description: 'House Cabernet' },
  { id: 'm8', name: 'Bruschetta', category: 'Appetizer', price: 1200.00, is_available: true, description: 'Toasted bread with tomato and garlic' },
];

export const INITIAL_STOCK: StockEntry[] = [
  { id: 's1', item_name: 'Mozzarella', quantity: 50, purchase_date: Date.now() - 86400000 * 3 },
  { id: 's2', item_name: 'Pasta', quantity: 100, purchase_date: Date.now() - 86400000 * 2 },
  { id: 's3', item_name: 'Tomato', quantity: 30, purchase_date: Date.now() - 86400000 * 5 },
  { id: 's4', item_name: 'Mozzarella', quantity: 50, purchase_date: Date.now() - 86400000 * 1 },
];
