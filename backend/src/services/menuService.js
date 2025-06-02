const sql = require("mssql");
const env = require("../config/env");
const logger = require("../utils/logger");

const pool = new sql.ConnectionPool({
  user: "sa",
  password: "Peyvast@123",
  server: "192.168.1.158",
  database: "gs",
  options: { trustServerCertificate: true },
}).connect();

async function fetchMenus(parentId = null) {
  const conn = await pool;
  const req = conn.request();
  const sqlTxt = `
    SELECT *
    FROM menu
    WHERE ${parentId === null ? "parent_id IS NULL" : "parent_id = @pid"}
    ORDER BY category`;
  if (parentId !== null) req.input("pid", sql.Int, parentId);
  return (await req.query(sqlTxt)).recordset;
}

async function buildTree(parentId = null) {
  const rows = await fetchMenus(parentId);
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      title: r.category,
      link: r.link,
      children: await buildTree(r.id),
    }))
  );
}

module.exports = { buildTree };
