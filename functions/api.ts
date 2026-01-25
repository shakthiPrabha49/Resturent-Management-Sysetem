
// Fix: Use 'any' for D1Database and PagesFunction as they are provided by the Cloudflare Pages environment at runtime but not found during compilation.
interface Env {
  DB: any;
}

export const onRequest: any = async (context: any) => {
  const { request, env } = context;
  
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { action, table, data, id, query, params, sql } = await request.json() as any;

    let result;
    switch (action) {
      case "EXECUTE":
        // Allows running raw SQL (like CREATE TABLE)
        result = await env.DB.prepare(sql).run();
        return Response.json({ success: true, result });

      case "SELECT_ALL":
        result = await env.DB.prepare(`SELECT * FROM ${table} ${query || ""}`).all();
        return Response.json(result.results);
      
      case "SELECT_SINGLE":
        result = await env.DB.prepare(`SELECT * FROM ${table} WHERE ${query} LIMIT 1`).bind(...(params || [])).first();
        return Response.json(result);

      case "INSERT":
        const keys = Object.keys(data);
        const placeholders = keys.map(() => "?").join(",");
        const values = Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
        await env.DB.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`).bind(...values).run();
        return Response.json({ success: true });

      case "UPDATE":
        const setClause = Object.keys(data).map(k => `${k} = ?`).join(",");
        const updateValues = [...Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v), id];
        await env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).bind(...updateValues).run();
        return Response.json({ success: true });

      case "DELETE":
        await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
        return Response.json({ success: true });

      default:
        return new Response("Invalid action", { status: 400 });
    }
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
};
