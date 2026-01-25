
export const db = {
  async query(action: string, table: string | null, options: any = {}) {
    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, table, ...options })
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch (err) {
      console.error(`DB Error (${action} ${table}):`, err);
      return null;
    }
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
