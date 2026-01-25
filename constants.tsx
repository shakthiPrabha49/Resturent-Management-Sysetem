
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
  // Fix: renamed isAvailable to is_available to match MenuItem type definition
  { id: 'm1', name: 'Margherita Pizza', category: 'Main', price: 12.50, is_available: true, description: 'Classic tomato, mozzarella, and basil' },
  { id: 'm2', name: 'Pasta Carbonara', category: 'Main', price: 14.00, is_available: true, description: 'Creamy pasta with pancetta' },
  { id: 'm3', name: 'Greek Salad', category: 'Appetizer', price: 9.00, is_available: true, description: 'Fresh veggies with feta cheese' },
  { id: 'm4', name: 'Truffle Fries', category: 'Appetizer', price: 7.50, is_available: true, description: 'Crispy fries with truffle oil' },
  { id: 'm5', name: 'Tiramisu', category: 'Dessert', price: 8.00, is_available: true, description: 'Italian coffee-flavored cake' },
  { id: 'm6', name: 'Espresso', category: 'Drink', price: 3.50, is_available: true, description: 'Strong black coffee' },
  { id: 'm7', name: 'Red Wine (Glass)', category: 'Drink', price: 8.50, is_available: true, description: 'House Cabernet' },
  { id: 'm8', name: 'Bruschetta', category: 'Appetizer', price: 6.50, is_available: true, description: 'Toasted bread with tomato and garlic' },
];

export const INITIAL_STOCK: StockEntry[] = [
  { id: 's1', itemName: 'Mozzarella', quantity: 50, purchaseDate: Date.now() - 86400000 * 3 },
  { id: 's2', itemName: 'Pasta', quantity: 100, purchaseDate: Date.now() - 86400000 * 2 },
  { id: 's3', itemName: 'Tomato', quantity: 30, purchaseDate: Date.now() - 86400000 * 5 },
  { id: 's4', itemName: 'Mozzarella', quantity: 50, purchaseDate: Date.now() - 86400000 * 1 }, // Newer stock
];
