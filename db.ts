
import { INITIAL_USERS, INITIAL_TABLES, INITIAL_MENU } from './constants.tsx';

// Simple LocalStorage Fallback for when D1 is not bound or fails
const mockDb: Record<string, any[]> = {
  staff: INITIAL_USERS,
  tables: INITIAL_TABLES,
  menu_items: INITIAL_MENU,
  app_settings: [{
    id: 'singleton_settings',
    name: 'GustoFlow',
    slogan: 'Cloud-Synced Restaurant Operations',
    logo_url: ''
  }],
  orders: [],
  transactions: [],
  stock_entries: [],
  customers: [],
  staff_pings: []
};

// Initialize LocalStorage with constants if empty
const initLocal = () => {
  Object.keys(mockDb).forEach(key => {
    if (!localStorage.getItem(`gusto_${key}`)) {
      localStorage.setItem(`gusto_${key}`, JSON.stringify(mockDb[key]));
    }
  });
};
initLocal();

const getLocal = (table: string) => JSON.parse(localStorage.getItem(`gusto_${table}`) || '[]');
const setLocal = (table: string, data: any[]) => localStorage.setItem(`gusto_${table}`, JSON.stringify(data));

export const db = {
  async query(action: string, table: string | null, options: any = {}) {
    try {
      // 1. Try Cloud API
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, table, ...options })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return await response.json();
    } catch (err: any) {
      console.warn(`D1 Cloud unavailable, using LocalStorage fallback: ${err.message}`);
      
      // 2. LocalStorage Fallback Logic
      if (!table) return { success: true, message: "Connected to Local Storage (Fallback Mode)" };
      
      const data = getLocal(table);
      
      switch (action) {
        case "SELECT_ALL":
          return data;
        case "SELECT_SINGLE":
          const { params, query } = options;
          if (params && params.length > 0) {
            const val = params[0];
            // Fix: Intelligent lookup based on query content
            if (query && query.toLowerCase().includes('phone')) {
              return data.find((item: any) => item.phone === val) || null;
            }
            if (query && query.toLowerCase().includes('username')) {
              return data.find((item: any) => item.username === val.toLowerCase()) || null;
            }
          }
          return data[0] || null;
        case "INSERT":
          // Ensure data is treated as an object
          const insertData = Array.isArray(options.data) ? options.data[0] : options.data;
          const newData = [...data, insertData];
          setLocal(table, newData);
          return { success: true };
        case "UPDATE":
          const updateId = options.id;
          const updated = data.map((item: any) => {
            // Check for ID match or Phone match (if phone is PK)
            const isMatch = item.id === updateId || item.phone === updateId;
            return isMatch ? { ...item, ...options.data } : item;
          });
          setLocal(table, updated);
          return { success: true };
        case "DELETE":
          const filtered = data.filter((item: any) => item.id !== options.id && item.phone !== options.id);
          setLocal(table, filtered);
          return { success: true };
        default:
          return null;
      }
    }
  },

  async checkConnection() {
    return await this.query("CHECK_BINDING", null);
  },

  async execute(sql: string) {
    return await this.query("EXECUTE", null, { sql });
  },

  from(table: string) {
    return {
      select: async (query?: string) => await db.query("SELECT_ALL", table, { query }),
      maybeSingle: async (query: string, params: any[] = []) => await db.query("SELECT_SINGLE", table, { query, params }),
      insert: async (data: any[]) => {
        for (const item of data) {
          await db.query("INSERT", table, { data: item });
        }
        return { error: null };
      },
      update: (data: any) => ({
        eq: async (col: string, val: any) => {
          await db.query("UPDATE", table, { data, id: val });
          return { error: null };
        }
      }),
      delete: () => ({
        eq: async (col: string, val: any) => {
          await db.query("DELETE", table, { id: val });
          return { error: null };
        }
      })
    };
  }
};
