/* ============================================================
   PostgreSQL Database Adapter for Portfolio CMS
   Uses Supabase/PostgreSQL for persistent data storage.
   ============================================================ */

"use strict";

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let pool = null;
let dbCache = null;

/**
 * Load .env from the project root so local development works without
 * exporting variables manually. Safe to call even if dotenv is absent.
 */
function loadEnv() {
  try {
    require("dotenv").config({
      path: path.join(__dirname, ".env"),
      override: false
    });
  } catch (e) { /* dotenv not installed — ignore */ }
}

/** Resolve the PostgreSQL connection string from the environment. */
function connectionString() {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || null;
}

/** True when a database connection string is present in the environment. */
function isConfigured() {
  return !!connectionString();
}

/** Build a clear error message that tells the operator exactly what to fix. */
function missingConnectionMessage() {
  return [
    "Database connection string is missing.",
    "",
    "Set the DATABASE_URL environment variable (or SUPABASE_DB_URL):",
    "  - Locally:  copy .env.example to .env, fill in your value, then restart.",
    "  - Render:   Dashboard > your service > Environment > add DATABASE_URL, redeploy.",
    "  - Supabase: Project > Settings > Database > Connection string (Pooler, port 5432).",
    "  - Example:  postgresql://user:password@host:5432/dbname",
    "",
    "The server will not start until a valid PostgreSQL URL is provided."
  ].join("\n");
}

function getPool() {
  if (!pool) {
    const connStr = connectionString();
    if (!connStr) {
      console.error("\n======================================================");
      console.error(missingConnectionMessage());
      console.error("======================================================\n");
      throw new Error("DATABASE_URL (or SUPABASE_DB_URL) environment variable is not set");
    }
    if (typeof connStr !== "string" || !/^postgres(ql)?:\/\//i.test(connStr.trim())) {
      throw new Error("DATABASE_URL does not look like a PostgreSQL connection string. Expected postgresql://user:password@host:port/dbname — got: " + String(connStr).slice(0, 60));
    }
    pool = new Pool({
      connectionString: connStr,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    pool.on("error", (err) => {
      console.error("Database pool error:", err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initDB() {
  let p;
  try {
    p = getPool();
    await p.query("SELECT 1");
  } catch (err) {
    /* A missing env var is already explained by getPool()/missingConnectionMessage().
       Only print connection-level details when a URL is actually configured. */
    const connStr = connectionString();
    if (connStr) {
      let host = "(unknown)";
      let user = "(unknown)";
      try {
        const u = new URL(connStr);
        host = u.host;
        user = (u.username || "?") + " on database " + (u.pathname || "").replace("/", "");
      } catch (e) { host = connStr.slice(0, 40); }
      console.error("\n======================================================");
      console.error(" Database connection FAILED.");
      console.error(" Target: " + host);
      console.error(" User:   " + user);
      console.error(" Detail: " + (err.message || err));
      console.error("");
      console.error(" Fix: check DATABASE_URL / SUPABASE_DB_URL is correct,");
      console.error("      the database exists, is reachable, and the network");
      console.error("      allows connections from this host.");
      console.error("======================================================\n");
    }
    throw err;
  }

  await p.query(`
    CREATE TABLE IF NOT EXISTS config (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS home (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS about (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS contact (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      "order" INTEGER DEFAULT 0
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS experiences (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      "order" INTEGER DEFAULT 0
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      "order" INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft'
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      "order" INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      slug VARCHAR(100)
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS education (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      "order" INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'published'
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS navigation (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      "order" INTEGER DEFAULT 0,
      enabled BOOLEAN DEFAULT true
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      read BOOLEAN DEFAULT false
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS activity (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS views (
      id SERIAL PRIMARY KEY,
      total INTEGER DEFAULT 0,
      today INTEGER DEFAULT 0,
      week INTEGER DEFAULT 0,
      month INTEGER DEFAULT 0,
      last_date VARCHAR(10),
      last_week VARCHAR(10),
      last_month VARCHAR(10)
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS visitors (
      k VARCHAR(100) PRIMARY KEY,
      t BIGINT DEFAULT 0
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS resume (
      id SERIAL PRIMARY KEY,
      data JSONB
    );
  `);

  console.log("  Database tables initialized successfully");
}

/* ---- Config Operations ---- */

async function getConfig() {
  const res = await query("SELECT value FROM config WHERE key = 'main'");
  return res.rows.length > 0 ? res.rows[0].value : null;
}

async function saveConfig(config) {
  await query(
    "INSERT INTO config (key, value) VALUES ('main', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
    [JSON.stringify(config)]
  );
}

/* ---- Singleton Table Operations (home, about, contact, settings, views, resume) ---- */

async function getSingleton(table) {
  const res = await query(`SELECT data FROM ${table} LIMIT 1`);
  return res.rows.length > 0 ? res.rows[0].data : null;
}

async function saveSingleton(table, data) {
  const exists = await query(`SELECT id FROM ${table} LIMIT 1`);
  if (exists.rows.length > 0) {
    await query(`UPDATE ${table} SET data = $1, updated_at = NOW()`, [JSON.stringify(data)]);
  } else {
    await query(`INSERT INTO ${table} (data) VALUES ($1)`, [JSON.stringify(data)]);
  }
}

async function updateSingletonPartial(table, allowedFields, body) {
  const current = await getSingleton(table);
  if (!current) return null;
  const updated = { ...current };
  for (const k of allowedFields) {
    if (k in body) updated[k] = body[k];
  }
  await saveSingleton(table, updated);
  return updated;
}

/* ---- Collection Operations (skills, experiences, projects, posts, education, navigation) ---- */

async function getCollection(table) {
  const res = await query(`SELECT id, data, "order" FROM ${table} ORDER BY "order" ASC`);
  return res.rows.map((r) => ({ id: r.id, ...r.data, order: r.order }));
}

async function getCollectionItem(table, id) {
  const res = await query(`SELECT data FROM ${table} WHERE id = $1`, [id]);
  return res.rows.length > 0 ? { id, ...res.rows[0].data } : null;
}

async function createCollectionItem(table, item) {
  const id = item.id;
  const order = item.order || 0;
  const data = { ...item };
  delete data.id;
  delete data.order;

  if (table === "posts") {
    await query(
      `INSERT INTO ${table} (id, data, "order", status, slug) VALUES ($1, $2, $3, $4, $5)`,
      [id, JSON.stringify(data), order, item.status || "draft", item.slug || ""]
    );
  } else if (table === "projects") {
    await query(
      `INSERT INTO ${table} (id, data, "order", status) VALUES ($1, $2, $3, $4)`,
      [id, JSON.stringify(data), order, item.status || "draft"]
    );
  } else if (table === "education") {
    await query(
      `INSERT INTO ${table} (id, data, "order", status) VALUES ($1, $2, $3, $4)`,
      [id, JSON.stringify(data), order, item.status || "published"]
    );
  } else if (table === "navigation") {
    await query(
      `INSERT INTO ${table} (id, data, "order", enabled) VALUES ($1, $2, $3, $4)`,
      [id, JSON.stringify(data), order, item.enabled !== false]
    );
  } else {
    await query(
      `INSERT INTO ${table} (id, data, "order") VALUES ($1, $2, $3)`,
      [id, JSON.stringify(data), order]
    );
  }

  return { id, ...item };
}

async function updateCollectionItem(table, id, patch) {
  const res = await query(`SELECT data FROM ${table} WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;

  const current = res.rows[0].data;
  const updated = { ...current, ...patch };
  delete updated.id;

  const updates = ["data = $1"];
  const values = [JSON.stringify(updated)];
  let paramIdx = 2;

  if (table === "posts" && patch.status !== undefined) {
    updates.push(`status = $${paramIdx}`);
    values.push(patch.status);
    paramIdx++;
  }
  if (table === "posts" && patch.slug !== undefined) {
    updates.push(`slug = $${paramIdx}`);
    values.push(patch.slug);
    paramIdx++;
  }
  if (table === "projects" && patch.status !== undefined) {
    updates.push(`status = $${paramIdx}`);
    values.push(patch.status);
    paramIdx++;
  }
  if (table === "education" && patch.status !== undefined) {
    updates.push(`status = $${paramIdx}`);
    values.push(patch.status);
    paramIdx++;
  }
  if (table === "navigation" && patch.enabled !== undefined) {
    updates.push(`enabled = $${paramIdx}`);
    values.push(patch.enabled);
    paramIdx++;
  }
  if (patch.order !== undefined) {
    updates.push(`"order" = $${paramIdx}`);
    values.push(patch.order);
    paramIdx++;
  }

  values.push(id);
  await query(`UPDATE ${table} SET ${updates.join(", ")} WHERE id = $${paramIdx}`, values);

  return { id, ...updated };
}

async function deleteCollectionItem(table, id) {
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

async function reorderCollection(table, ids) {
  for (let i = 0; i < ids.length; i++) {
    await query(`UPDATE ${table} SET "order" = $1 WHERE id = $2`, [i, ids[i]]);
  }
}

/* ---- Messages Operations ---- */

async function getMessages() {
  const res = await query("SELECT id, data FROM messages ORDER BY created_at DESC");
  return res.rows.map((r) => ({ id: r.id, ...r.data }));
}

async function createMessage(msg) {
  await query(
    "INSERT INTO messages (id, data, read) VALUES ($1, $2, $3)",
    [msg.id, JSON.stringify(msg), msg.read || false]
  );
}

async function markMessageRead(id) {
  await query("UPDATE messages SET read = true WHERE id = $1", [id]);
}

async function deleteMessage(id) {
  await query("DELETE FROM messages WHERE id = $1", [id]);
}

/* ---- Activity Operations ---- */

async function getActivity() {
  const res = await query("SELECT id, data FROM activity ORDER BY created_at DESC");
  return res.rows.map((r) => ({ id: r.id, ...r.data }));
}

async function logActivity(text) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const data = { text: String(text).slice(0, 200), date: new Date().toISOString() };
  await query(
    "INSERT INTO activity (id, data) VALUES ($1, $2)",
    [id, JSON.stringify(data)]
  );
}

/* ---- Blog Categories Operations ---- */

async function getBlogCategories() {
  const res = await query("SELECT name FROM blog_categories ORDER BY id ASC");
  return res.rows.map((r) => r.name);
}

async function addBlogCategory(name) {
  await query("INSERT INTO blog_categories (name) VALUES ($1)", [name]);
}

async function updateBlogCategory(oldName, newName) {
  await query("UPDATE blog_categories SET name = $1 WHERE name = $2", [newName, oldName]);
}

async function deleteBlogCategory(name) {
  await query("DELETE FROM blog_categories WHERE name = $1", [name]);
}

/* ---- Views/Visitor Operations ---- */

async function getViews() {
  const res = await query("SELECT * FROM views LIMIT 1");
  if (res.rows.length === 0) {
    const now = new Date().toISOString();
    await query(
      "INSERT INTO views (total, today, week, month, last_date, last_week, last_month) VALUES (0, 0, 0, 0, $1, $1, $1)",
      [now.slice(0, 10)]
    );
    return { total: 0, today: 0, week: 0, month: 0, lastDate: now.slice(0, 10), lastWeek: now.slice(0, 10), lastMonth: now.slice(0, 7) };
  }
  const r = res.rows[0];
  return { total: r.total, today: r.today, week: r.week, month: r.month, lastDate: r.last_date, lastWeek: r.last_week, lastMonth: r.last_month };
}

async function updateViews(views) {
  await query(
    "UPDATE views SET total = $1, today = $2, week = $3, month = $4, last_date = $5, last_week = $6, last_month = $7 WHERE id = (SELECT id FROM views LIMIT 1)",
    [views.total, views.today, views.week, views.month, views.lastDate, views.lastWeek, views.lastMonth]
  );
}

async function getVisitor(key) {
  const res = await query("SELECT t FROM visitors WHERE k = $1", [key]);
  return res.rows.length > 0 ? res.rows[0].t : null;
}

async function upsertVisitor(key, time) {
  await query(
    "INSERT INTO visitors (k, t) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET t = $2",
    [key, time]
  );
}

async function cleanupVisitors(maxAge) {
  await query("DELETE FROM visitors WHERE t < $1", [maxAge]);
}

/* ---- Close Pool ---- */

async function closeDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  loadEnv,
  connectionString,
  isConfigured,
  initDB,
  getConfig,
  saveConfig,
  getSingleton,
  saveSingleton,
  updateSingletonPartial,
  getCollection,
  getCollectionItem,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  reorderCollection,
  getMessages,
  createMessage,
  markMessageRead,
  deleteMessage,
  getActivity,
  logActivity,
  getBlogCategories,
  addBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getViews,
  updateViews,
  getVisitor,
  upsertVisitor,
  cleanupVisitors,
  closeDB
};
