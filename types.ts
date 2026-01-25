
export enum UserRole {
  OWNER = 'OWNER',
  CASHIER = 'CASHIER',
  CHEF = 'CHEF',
  WAITRESS = 'WAITRESS'
}

export enum TableStatus {
  AVAILABLE = 'Available',
  ORDERING = 'Ordering',
  COOKING = 'Cooking',
  READY = 'Ready',
  SERVED = 'Served',
  COMPLETED = 'Completed'
}

export enum OrderStatus {
  PENDING = 'Pending',
  COOKING = 'Cooking',
  READY = 'Ready',
  SERVED = 'Served',
  PAID = 'Paid'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface AppSettings {
  id: string;
  name: string;
  slogan: string;
  logo_url: string;
}

export interface MenuItem {
  id: string;
  item_number?: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  description?: string;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  waitress_name?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  status: 'Pending' | 'Cooking' | 'Completed';
}

export interface Order {
  id: string;
  table_id: string;
  table_number: number;
  items: OrderItem[];
  status: OrderStatus;
  timestamp: number;
  total: number;
  waitress_name?: string;
}

export interface StockEntry {
  id: string;
  item_name: string;
  quantity: number;
  purchase_date: number;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  timestamp: number;
  category: string;
}
