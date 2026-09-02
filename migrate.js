/* ============================================================
   Migration Script: JSON db.json → PostgreSQL
   Run: npm run migrate
   Safe: preserves all existing data, creates backup first.
   ============================================================ */

"use strict";

/* Load .env from the project root so `npm run migrate` works locally. */
try {
  require("dotenv").config({ path: path.join(__dirname, ".env"), override: false });
} catch (e) { /* dotenv not installed — ignore */ }

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const db = require("./db");

const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "data", "db.json");
const BACKUP_DIR = path.join(ROOT, "data", "backups");

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function slugify(title, existing) {
  existing = existing || [];
  let base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
  let slug = base, i = 2;
  while (existing.indexOf(slug) !== -1) slug = base + "-" + i++;
  return slug;
}

function cleanImages(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter((u) => typeof u === "string" && /^(\/image\/|\/uploads\/|https?:\/\/)/i.test(u));
}

function normalizeEducation(raw, idx) {
  const o = raw || {};
  return {
    id: o.id || uid(),
    level: String(o.level || "University").trim(),
    institution: String(o.institution || "").trim(),
    institutionType: String(o.institutionType || "").trim(),
    degree: String(o.degree || o.title || "").trim(),
    program: String(o.program || "").trim(),
    subject: String(o.subject || "").trim(),
    department: String(o.department || "").trim(),
    startYear: String(o.startYear || "").trim(),
    endYear: String(o.endYear || "").trim(),
    currentStudying: !!o.currentStudying,
    gpa: String(o.gpa || "").trim(),
    gpaScale: String(o.gpaScale || "").trim(),
    cgpa: String(o.cgpa || "").trim(),
    cgpaScale: String(o.cgpaScale || "").trim(),
    resultType: String(o.resultType || "").toLowerCase(),
    result: String(o.result || "").trim(),
    resultScale: String(o.resultScale || "").trim(),
    showResult: o.showResult !== false,
    description: String(o.description || "").trim(),
    location: String(o.location || "").trim(),
    website: String(o.website || "").trim(),
    logo: String(o.logo || "").trim().slice(0, 400),
    status: o.status === "draft" ? "draft" : "published",
    order: Number.isInteger(o.order) ? o.order : (idx || 0)
  };
}

function normalizeNavigation(raw, idx) {
  const o = raw || {};
  return {
    id: o.id || uid(),
    key: String(o.key || "").trim(),
    label: String(o.label || "Menu item").trim().slice(0, 40),
    url: String(o.url || ("#/" + (o.key || ""))).trim().slice(0, 400),
    icon: String(o.icon || "").trim().slice(0, 80),
    newTab: o.newTab === true,
    order: Number.isInteger(o.order) ? o.order : (idx || 0),
    enabled: o.enabled !== false
  };
}

async function migrate() {
  console.log("\n=== Portfolio Database Migration ===\n");

  const connStr = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connStr) {
    console.error("Error: DATABASE_URL environment variable is required.");
    console.error("Set it in your .env file or environment.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connStr,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

  if (!fs.existsSync(DB_PATH)) {
    console.log("No db.json found. Creating fresh database...");
    await db.initDB();
    await createDefaultConfig(pool);
    console.log("\nMigration complete. Fresh database created.\n");
    await pool.end();
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  console.log("Loaded existing db.json successfully");

  // Backup the old file
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupName = `db-backup-${Date.now()}.json`;
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, backupName));
  console.log(`Backup saved: data/backups/${backupName}`);

  // Safely consolidate existing images into the dedicated /image/ directory.
  // Copies (never deletes) files from the legacy /uploads/ folder so the site
  // keeps one canonical image directory while existing references still work.
  const legacyUploads = path.join(ROOT, "uploads");
  const imageDir = path.join(ROOT, "image");
  if (fs.existsSync(legacyUploads)) {
    fs.mkdirSync(imageDir, { recursive: true });
    let copied = 0;
    for (const f of fs.readdirSync(legacyUploads)) {
      const src = path.join(legacyUploads, f);
      if (!fs.statSync(src).isFile()) continue;
      const dest = path.join(imageDir, f);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        copied++;
      }
    }
    console.log(`Images consolidated into /image/ (${copied} file(s) copied, nothing deleted)`);
  }

  // Initialize PostgreSQL tables
  await db.initDB();

  // Migrate config
  console.log("Migrating config...");
  await db.saveConfig(jsonData.config || {});

  // Migrate home
  console.log("Migrating home...");
  await db.saveSingleton("home", jsonData.home || {});

  // Migrate about (without education, which is separate)
  console.log("Migrating about...");
  const aboutData = { ...(jsonData.about || {}) };
  delete aboutData.education;
  await db.saveSingleton("about", aboutData);

  // Migrate contact
  console.log("Migrating contact...");
  await db.saveSingleton("contact", jsonData.contact || {});

  // Migrate settings
  console.log("Migrating settings...");
  await db.saveSingleton("settings", jsonData.settings || { theme: "dark" });

  // Migrate views
  console.log("Migrating views...");
  const views = jsonData.views || {};
  await db.updateViews({
    total: views.total || 0,
    today: views.today || 0,
    week: views.week || 0,
    month: views.month || 0,
    lastDate: views.lastDate || new Date().toISOString().slice(0, 10),
    lastWeek: views.lastWeek || new Date().toISOString().slice(0, 10),
    lastMonth: views.lastMonth || new Date().toISOString().slice(0, 7)
  });

  // Migrate resume
  console.log("Migrating resume...");
  if (jsonData.resume) {
    await db.saveSingleton("resume", jsonData.resume);
  }

  // Migrate visitors
  console.log("Migrating visitors...");
  if (Array.isArray(jsonData.visitors)) {
    for (const v of jsonData.visitors) {
      await pool.query(
        "INSERT INTO visitors (k, t) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET t = $2",
        [v.k, v.t]
      );
    }
  }

  // Migrate skills
  console.log("Migrating skills...");
  for (let i = 0; i < (jsonData.skills || []).length; i++) {
    const skill = jsonData.skills[i];
    await db.createCollectionItem("skills", {
      id: skill.id || uid(),
      category: skill.category,
      items: skill.items || [],
      order: i
    });
  }

  // Migrate experiences
  console.log("Migrating experiences...");
  for (let i = 0; i < (jsonData.experiences || []).length; i++) {
    const exp = jsonData.experiences[i];
    await db.createCollectionItem("experiences", {
      id: exp.id || uid(),
      ...exp,
      order: i
    });
  }

  // Migrate projects
  console.log("Migrating projects...");
  for (let i = 0; i < (jsonData.projects || []).length; i++) {
    const proj = jsonData.projects[i];
    await db.createCollectionItem("projects", {
      id: proj.id || uid(),
      ...proj,
      images: cleanImages(proj.images),
      order: i
    });
  }

  // Migrate posts
  console.log("Migrating posts...");
  const existingSlugs = [];
  for (let i = 0; i < (jsonData.posts || []).length; i++) {
    const post = jsonData.posts[i];
    const slug = post.slug || slugify(post.title, existingSlugs);
    existingSlugs.push(slug);
    await db.createCollectionItem("posts", {
      id: post.id || uid(),
      ...post,
      images: cleanImages(post.images),
      slug: slug,
      order: i
    });
  }

  // Migrate education
  console.log("Migrating education...");
  const legacyEducation = (jsonData.about && jsonData.about.education) || [];
  const newEducation = jsonData.education || legacyEducation;
  for (let i = 0; i < newEducation.length; i++) {
    const edu = normalizeEducation(newEducation[i], i);
    await db.createCollectionItem("education", {
      ...edu,
      order: i
    });
  }

  // Migrate navigation
  console.log("Migrating navigation...");
  for (let i = 0; i < (jsonData.navigation || []).length; i++) {
    const nav = jsonData.navigation[i];
    await db.createCollectionItem("navigation", normalizeNavigation(nav, i));
  }

  // Migrate messages
  console.log("Migrating messages...");
  for (const msg of (jsonData.messages || [])) {
    await db.createMessage({
      id: msg.id || uid(),
      ...msg
    });
  }

  // Migrate activity
  console.log("Migrating activity...");
  if (Array.isArray(jsonData.activity)) {
    for (const act of jsonData.activity) {
      await pool.query(
        "INSERT INTO activity (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
        [act.id || uid(), JSON.stringify(act)]
      );
    }
  }

  // Migrate blog categories
  console.log("Migrating blog categories...");
  for (const cat of (jsonData.blogCategories || [])) {
    await db.addBlogCategory(cat);
  }

  console.log("\n=== Migration Complete ===");
  console.log("All data has been safely migrated to PostgreSQL.");
  console.log("Original db.json backed up at: data/backups/" + backupName);
  console.log("\nYou can now deploy with confidence - your data is persistent!\n");

  await pool.end();
}

async function createDefaultConfig(pool) {
  const salt = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  const passwordHash = crypto.createHash("sha256").update(salt + ":admin123").digest("hex");
  const config = {
    salt,
    secret,
    passwordHash,
    passwordChanged: false,
    createdAt: new Date().toISOString()
  };
  await db.saveConfig(config);
  console.log("Default config created (admin/admin123)");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
