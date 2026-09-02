/* ============================================================
   Shagor Portfolio — Server + CMS API
   Persistent storage: PostgreSQL + Cloudinary
   Run:  npm start   (or: node server.js)
   Public site : http://localhost:3000
   Admin panel : http://localhost:3000/admin
   ============================================================ */

"use strict";

/* Load .env first so local development picks up DATABASE_URL etc.
   before any module reads the environment. */
try {
  require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: false });
} catch (e) { /* dotenv not installed — ignore */ }

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const cloudinary = require("./cloudinary");

const ROOT = __dirname;
const IMAGE_DIR = path.join(ROOT, "image");
const LEGACY_UPLOAD_DIR = path.join(ROOT, "uploads");
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
const VIDEO_EXT = [".mp4", ".webm", ".mov"];
const VIDEO_MIME = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};
const MAX_BODY = 400 * 1024 * 1024;
const MAX_VIDEO = 256 * 1024 * 1024;

/* ---------------- Helpers ---------------- */

function hashPassword(salt, password) {
  return crypto.createHash("sha256").update(salt + ":" + password).digest("hex");
}

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

function scoreError(gpa, gpaScale, cgpa, cgpaScale) {
  function bad(v, scale) {
    if (v === undefined || v === null || String(v).trim() === "") {
      if (scale !== undefined && String(scale).trim() !== "" && String(v || "").trim() === "") {
        return "GPA/CGPA scale provided without a value.";
      }
      return null;
    }
    const s = String(v).trim();
    if (!/^\d+(\.\d+)?$/.test(s)) return "GPA/CGPA must be a number (e.g. 3.71).";
    if (/^\d+(\.\d+)?$/.test(s) && scale !== undefined && String(scale).trim() !== "" && !/^\d+(\.\d+)?$/.test(String(scale).trim())) {
      return "GPA/CGPA scale must be a number (e.g. 4.00).";
    }
    return null;
  }
  return bad(gpa, gpaScale) || bad(cgpa, cgpaScale);
}

function navUrlError(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (u.startsWith("#") || u.startsWith("/") || u.startsWith("./") || u.startsWith("../")) return null;
  if (/^https?:\/\//i.test(u)) return null;
  if (/^mailto:/i.test(u)) return null;
  return "Invalid navigation URL. Use a route (#/blog), anchor (#contact), or a full http(s) URL.";
}

/* ---------------- Rich text sanitizer ---------------- */

const SAFE_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s", "strike", "del", "a", "h1", "h2", "h3",
  "ul", "ol", "li", "blockquote", "code", "pre", "span", "div"
]);

function sanitizeHTML(html) {
  if (html == null) return "";
  let src = String(html);
  src = src.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  src = src.replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  src = src.replace(/&nbsp;/gi, " ");
  src = src.replace(/\s+class="[^"]*isSelectedEnd[^"]*"/gi, "");
  src = src.replace(/\s+data-[a-z-]+="[^"]*"/gi, "");
  src = src.replace(/\s+contenteditable="[^"]*"/gi, "");
  const out = [];
  const re = /(<\/?[a-zA-Z][^>]*>)|([^<>]+)|([<>])/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) stripTag(m[1], out);
    else if (m[2]) out.push(escapeText(m[2]));
    else if (m[3]) out.push(" ");
  }
  let result = out.join("");
  result = result.replace(/ {2,}/g, " ");
  result = result.replace(/<p>\s+<\/p>/gi, "");
  result = result.replace(/<p><\/p>/gi, "");
  return result.trim();
}

function stripTag(raw, out) {
  for (const m of raw.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g)) {
    const tag = m[1].toLowerCase();
    const isClose = m[0].startsWith("</");
    if (!SAFE_TAGS.has(tag)) continue;
    if (isClose) { out.push("</" + tag + ">"); continue; }
    const attrs = parseAttrs(m[2] || "");
    if (tag === "a") {
      const href = (attrs.href || "").trim();
      const safeHref = /^(https?:)?\/\/|^mailto:|^#|^\/|^\.?\//i.test(href) && !/javascript:/i.test(href) ? href : null;
      if (!safeHref) { out.push("<a>"); continue; }
      out.push('<a href="' + escapeAttr(safeHref) + '" target="_blank" rel="noopener nofollow">');
      continue;
    }
    if (tag === "span" || tag === "div" || tag === "p") {
      const align = /text-align\s*:\s*(left|center|right|justify)/i.exec(attrs.style || "") || "";
      const styleAttr = align[1] ? ' style="text-align:' + align[1] + '"' : "";
      out.push("<" + tag + styleAttr + ">");
      continue;
    }
    out.push("<" + tag + ">");
  }
}

function parseAttrs(str) {
  const attrs = {};
  const re = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(str))) attrs[m[1].toLowerCase()] = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4];
  return attrs;
}

function escapeText(s) {
  return String(s)
    .replace(/&nbsp;/gi, " ")
    .replace(/&thinsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/'/g, "&#39;")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------------- View counter ---------------- */

function mondayKey(iso) {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

async function recordView(visitorId, ip) {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);
  const month = nowIso.slice(0, 7);
  const week = mondayKey(nowIso);

  const views = await db.getViews();
  if (views.lastDate !== today) { views.today = 0; views.lastDate = today; }
  if (views.lastMonth !== month) { views.month = 0; views.lastMonth = month; }
  if (views.lastWeek !== week) { views.week = 0; views.lastWeek = week; }

  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const key = String(visitorId || "").slice(0, 64) || ("ip:" + String(ip || ""));
  const lastVisit = await db.getVisitor(key);
  if (lastVisit && lastVisit > hourAgo) return { newView: false, views };

  await db.upsertVisitor(key, now.getTime());
  views.total = (views.total || 0) + 1;
  views.today = (views.today || 0) + 1;
  views.week = (views.week || 0) + 1;
  views.month = (views.month || 0) + 1;
  await db.updateViews(views);

  return { newView: true, views };
}

/* ---------------- Auth ---------------- */

let configCache = null;
async function getConfig() {
  if (!configCache) configCache = await db.getConfig();
  return configCache;
}

function sign(secret, exp) {
  const sig = crypto.createHmac("sha256", secret).update(String(exp)).digest("hex");
  return exp + "." + sig;
}

function verifyToken(secret, token) {
  if (!token || token.indexOf(".") === -1) return false;
  const [exp, sig] = token.split(".");
  const expect = sign(secret, exp).split(".")[1];
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect)) && Number(exp) > Date.now();
  } catch (e) {
    return false;
  }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

async function isAdmin(req) {
  const config = await getConfig();
  return verifyToken(config.secret, getCookie(req, "sid"));
}

/* ---------------- HTTP helpers ---------------- */

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/* ---------------- Public content ---------------- */

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0) || String(b.date || "").localeCompare(String(a.date || ""));
}

async function publicContent() {
  const home = await db.getSingleton("home");
  const about = await db.getSingleton("about");
  const contact = await db.getSingleton("contact");
  const settings = await db.getSingleton("settings");
  const resume = await db.getSingleton("resume");
  const skills = await db.getCollection("skills");
  const experiences = await db.getCollection("experiences");
  const projects = await db.getCollection("projects");
  const posts = await db.getCollection("posts");
  const education = await db.getCollection("education");
  const navigation = await db.getCollection("navigation");
  const views = await db.getViews();

  return {
    home: home || {},
    about: about || {},
    contact: contact || {},
    resume: resume || null,
    skills: skills.sort(byOrder),
    experiences: experiences.filter((e) => (e.visible !== false)).sort(byOrder),
    projects: projects.filter((p) => p.status === "published").sort(byOrder),
    posts: posts
      .filter((p) => p.status === "published")
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .map((p) => ({
        id: p.id, slug: p.slug, title: p.title, text: p.text, location: p.location, date: p.date,
        category: p.category, tags: p.tags || [], images: p.images || [],
        likes: p.likes || 0, comments: p.comments || []
      })),
    sections: (await db.getSingleton("sections")) || {
      enabled: { hero: true, experience: true, projects: true, about: true, education: true, certifications: true, skills: true, blog: true, contact: true },
      order: ["hero", "experience", "projects", "about", "education", "certifications", "skills", "blog", "contact"]
    },
    education: education.filter((e) => e.status !== "draft").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    navigation: navigation.filter((n) => n.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    settings: settings || { theme: "dark" },
    views: views || { total: 0, today: 0, week: 0, month: 0 }
  };
}

/* ---------------- Media (Cloudinary or fallback) ---------------- */

/* Build a collision-free local filename that keeps the original name. */
function uniqueLocalName(dir, name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let candidate = name;
  let i = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = base + "-" + i + ext;
    i++;
  }
  return candidate;
}

/* Sanitize a client filename so it cannot escape the storage directory,
   but otherwise preserve the original name (never truncate it away). */
function safeFileName(name, fallback) {
  let base = String(name || "").replace(/^.*[\\/]/, "").replace(/[^a-zA-Z0-9._ ()-]/g, "").trim();
  if (!base) base = fallback;
  return base;
}

function listMedia() {
  const items = [];
  const seen = new Set();
  const dirs = [IMAGE_DIR, LEGACY_UPLOAD_DIR];
  for (const dir of dirs) {
    try {
      if (!cloudinary.isConfigured() && fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          const ext = path.extname(f).toLowerCase();
          const isImage = IMAGE_EXT.includes(ext);
          const isVideo = VIDEO_EXT.includes(ext);
          if (!isImage && !isVideo) continue;
          if (seen.has(f)) continue;
          seen.add(f);
          const st = fs.statSync(path.join(dir, f));
          const prefix = dir === IMAGE_DIR ? "/image/" : "/uploads/";
          items.push({
            name: f,
            url: prefix + encodeURIComponent(f),
            size: st.size,
            mtime: st.mtimeMs,
            type: isImage ? "image" : "video",
            mime: isImage ? (MIME[ext] || "application/octet-stream") : (VIDEO_MIME[ext] || "video/mp4")
          });
        }
      }
    } catch (e) { /* ignore */ }
  }
  return items.sort((a, b) => b.mtime - a.mtime);
}

async function saveUpload(dataField, originalName) {
  const fileName = safeFileName(originalName, "image.jpg");

  if (cloudinary.isConfigured()) {
    const result = await cloudinary.uploadImage(dataField, "portfolio/image", fileName);
    return { name: fileName, url: result.url, publicId: result.publicId };
  }

  // Fallback to local storage — always into /image/ (never overwrites)
  const match = /^data:(image\/[a-zA-Z0-9+.\-]+);base64,(.+)$/.exec(dataField || "");
  if (!match) throw new Error("Invalid image data (expected base64 data URL)");
  const mime = match[1];
  const extMap = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" };
  const ext = extMap[mime];
  if (!ext) throw new Error("Unsupported image type: " + mime);
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > 10 * 1024 * 1024) throw new Error("Image too large (max 10MB)");
  const finalName = uniqueLocalName(IMAGE_DIR, fileName.replace(/\.[^.]+$/, "") + ext);
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGE_DIR, finalName), buf);
  return { name: finalName, url: "/image/" + encodeURIComponent(finalName) };
}

async function saveVideoUpload(dataField, originalName) {
  const fileName = safeFileName(originalName, "video.mp4");

  if (cloudinary.isConfigured()) {
    const result = await cloudinary.uploadVideo(dataField, "portfolio/videos", fileName);
    return { name: fileName, url: result.url, publicId: result.publicId };
  }

  // Fallback to local storage — always into /image/ (never overwrites)
  const mimeMatch = /^data:(video\/[a-zA-Z0-9+.\-]+);base64,(.+)$/.exec(dataField || "");
  if (!mimeMatch) throw new Error("Invalid video data (expected base64 data URL)");
  const mime = mimeMatch[1].toLowerCase();
  const extMap = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };
  const ext = extMap[mime];
  if (!ext) throw new Error("Unsupported video type. Use MP4, WebM or MOV.");
  const buf = Buffer.from(mimeMatch[2], "base64");
  if (buf.length > MAX_VIDEO) throw new Error("Video too large (max 256MB).");
  const finalName = uniqueLocalName(IMAGE_DIR, fileName.replace(/\.[^.]+$/, "") + ext);
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGE_DIR, finalName), buf);
  return { name: finalName, url: "/image/" + encodeURIComponent(finalName) };
}

/* ---------------- API router ---------------- */

async function handleAPI(req, res, pathname) {
  const method = req.method;

  // Public endpoints
  if (method === "GET" && pathname === "/api/content") {
    return sendJSON(res, 200, await publicContent());
  }

  if (method === "POST" && pathname === "/api/view") {
    const b = await readBody(req);
    const ip = req.socket.remoteAddress || "";
    const { newView, views } = await recordView(b.visitorId, ip);
    return sendJSON(res, 200, { ok: true, newView, views: { total: views.total, today: views.today, week: views.week, month: views.month } });
  }

  if (method === "POST" && pathname === "/api/contact") {
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 100);
    const email = String(b.email || "").trim().slice(0, 150);
    const subject = String(b.subject || "").trim().slice(0, 200);
    const message = String(b.message || "").trim().slice(0, 5000);
    if (!name || !email || !message) return sendJSON(res, 400, { error: "Name, email and message are required." });
    await db.createMessage({ id: uid(), name, email, subject, message, date: new Date().toISOString(), read: false });
    await db.logActivity("New contact message from " + name);
    return sendJSON(res, 200, { ok: true });
  }

  let m;
  if ((m = pathname.match(/^\/api\/posts\/([\w-]+)\/like$/)) && method === "POST") {
    const post = await db.getCollectionItem("posts", m[1]);
    if (!post || post.status !== "published") return sendJSON(res, 404, { error: "Post not found" });
    post.likes = (post.likes || 0) + 1;
    await db.updateCollectionItem("posts", m[1], { likes: post.likes });
    return sendJSON(res, 200, { likes: post.likes });
  }

  if ((m = pathname.match(/^\/api\/posts\/([\w-]+)\/comments$/)) && method === "POST") {
    const post = await db.getCollectionItem("posts", m[1]);
    if (!post || post.status !== "published") return sendJSON(res, 404, { error: "Post not found" });
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 80);
    const text = String(b.text || "").trim().slice(0, 1000);
    if (!name || !text) return sendJSON(res, 400, { error: "Name and comment are required." });
    post.comments = post.comments || [];
    post.comments.push({ id: uid(), name, text, date: new Date().toISOString() });
    await db.updateCollectionItem("posts", m[1], { comments: post.comments });
    return sendJSON(res, 200, { ok: true, comments: post.comments });
  }

  // Auth endpoints
  if (pathname === "/api/admin/login" && method === "POST") {
    const config = await getConfig();
    const b = await readBody(req);
    const username = String(b.username || "");
    const password = String(b.password || "");
    if (username !== "admin" || hashPassword(config.salt, password) !== config.passwordHash) {
      return sendJSON(res, 401, { error: "Wrong username or password." });
    }
    const token = sign(config.secret, Date.now() + 7 * 24 * 3600 * 1000);
    res.setHeader("Set-Cookie", "sid=" + encodeURIComponent(token) + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/logout" && method === "POST") {
    res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
    return sendJSON(res, 200, { ok: true });
  }

  // Everything below requires admin
  if (!await isAdmin(req)) return sendJSON(res, 401, { error: "Unauthorized" });

  if (pathname === "/api/admin/me" && method === "GET") {
    const config = await getConfig();
    return sendJSON(res, 200, { ok: true, passwordChanged: !!config.passwordChanged });
  }

  if (pathname === "/api/admin/stats" && method === "GET") {
    const projects = await db.getCollection("projects");
    const posts = await db.getCollection("posts");
    const experiences = await db.getCollection("experiences");
    const skills = await db.getCollection("skills");
    const messages = await db.getMessages();
    const education = await db.getCollection("education");
    const views = await db.getViews();
    const media = listMedia();
    return sendJSON(res, 200, {
      projects: projects.length,
      posts: posts.length,
      publishedPosts: posts.filter((p) => p.status === "published").length,
      draftPosts: posts.filter((p) => p.status !== "published").length,
      experiences: experiences.length,
      skills: skills.reduce((n, s) => n + (s.items ? s.items.length : 0), 0),
      messages: messages.length,
      unreadMessages: messages.filter((x) => !x.read).length,
      drafts: posts.filter((p) => p.status === "draft").length,
      education: education.length,
      media: media.length,
      images: media.filter((m) => m.type === "image").length,
      videos: media.filter((m) => m.type === "video").length,
      views: views || { total: 0, today: 0, week: 0, month: 0 },
      visitors: 0
    });
  }

  if (pathname === "/api/admin/home" && method === "GET") {
    return sendJSON(res, 200, await db.getSingleton("home") || {});
  }
  if (pathname === "/api/admin/home" && method === "PUT") {
    const b = await readBody(req);
    const allowed = ["name", "title", "subtitle", "description", "currentPosition", "primaryBtn", "secondaryBtn", "heroImage", "skills"];
    const result = await db.updateSingletonPartial("home", allowed, b);
    return sendJSON(res, 200, result);
  }

  if (pathname === "/api/admin/about" && method === "GET") {
    const about = await db.getSingleton("about") || {};
    return sendJSON(res, 200, about);
  }
  if (pathname === "/api/admin/about" && method === "PUT") {
    const b = await readBody(req);
    const allowed = ["intro", "belief", "focus", "images", "lifeTitle", "lifeItems", "certifications",
      "name", "title", "headline", "shortDescription", "description", "detailedDescription",
      "careerSummary", "location", "availability", "experienceSummary", "yearsOfExperience",
      "profileImage", "videoUrl", "videoTitle", "videoDescription", "videoEnabled", "videoThumbnail",
      "profileVideo", "profileMediaType"];
    const result = await db.updateSingletonPartial("about", allowed, b);
    return sendJSON(res, 200, result);
  }

  if (pathname === "/api/admin/contact" && method === "GET") {
    return sendJSON(res, 200, await db.getSingleton("contact") || {});
  }
  if (pathname === "/api/admin/contact" && method === "PUT") {
    const b = await readBody(req);
    const allowed = ["email", "phone", "location", "socials"];
    const result = await db.updateSingletonPartial("contact", allowed, b);
    return sendJSON(res, 200, result);
  }

  if (pathname === "/api/admin/password" && method === "POST") {
    const config = await getConfig();
    const b = await readBody(req);
    if (hashPassword(config.salt, String(b.current || "")) !== config.passwordHash) {
      return sendJSON(res, 400, { error: "Current password is wrong." });
    }
    const next = String(b.next || "");
    if (next.length < 6) return sendJSON(res, 400, { error: "New password must be at least 6 characters." });
    config.passwordHash = hashPassword(config.salt, next);
    config.passwordChanged = true;
    await db.saveConfig(config);
    configCache = null;
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/export" && method === "GET") {
    const exportData = {
      home: await db.getSingleton("home"),
      about: await db.getSingleton("about"),
      contact: await db.getSingleton("contact"),
      settings: await db.getSingleton("settings"),
      skills: await db.getCollection("skills"),
      experiences: await db.getCollection("experiences"),
      projects: await db.getCollection("projects"),
      posts: await db.getCollection("posts"),
      education: await db.getCollection("education"),
      navigation: await db.getCollection("navigation"),
      messages: await db.getMessages()
    };
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="portfolio-backup.json"'
    });
    return res.end(JSON.stringify(exportData, null, 2));
  }

  // Education management
  {
    const base = "/api/admin/education";
    if (pathname === base && method === "GET") {
      const items = await db.getCollection("education");
      return sendJSON(res, 200, items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }
    if (pathname === base && method === "POST") {
      const b = await readBody(req);
      const scoreErr = scoreError(b.gpa, b.gpaScale, b.cgpa, b.cgpaScale);
      if (scoreErr) return sendJSON(res, 400, { error: scoreErr });
      if (!String(b.institution || "").trim() && !String(b.degree || "").trim()) {
        return sendJSON(res, 400, { error: "Institution or degree is required." });
      }
      const items = await db.getCollection("education");
      const item = normalizeEducation(b, items.length);
      item.id = uid();
      item.order = items.length;
      item.status = b.status === "draft" ? "draft" : "published";
      await db.createCollectionItem("education", item);
      await db.logActivity("Added education: " + (String(item.degree || item.institution || "record").slice(0, 60)));
      return sendJSON(res, 200, item);
    }
    if (pathname === base + "/order" && method === "PUT" || pathname === base + "/reorder" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      await db.reorderCollection("education", ids);
      return sendJSON(res, 200, { ok: true });
    }
    const em = pathname.match(/^\/api\/admin\/education\/([\w-]+)$/);
    if (em) {
      const item = await db.getCollectionItem("education", em[1]);
      if (!item) return sendJSON(res, 404, { error: "Education record not found" });
      if (method === "PUT") {
        const patch = await readBody(req);
        const scoreErr = scoreError(patch.gpa !== undefined ? patch.gpa : item.gpa,
          patch.gpaScale !== undefined ? patch.gpaScale : item.gpaScale,
          patch.cgpa !== undefined ? patch.cgpa : item.cgpa,
          patch.cgpaScale !== undefined ? patch.cgpaScale : item.cgpaScale);
        if (scoreErr) return sendJSON(res, 400, { error: scoreErr });
        const merged = normalizeEducation({ ...item, ...patch }, 0);
        merged.id = item.id;
        if (patch.order !== undefined && Number.isInteger(patch.order)) merged.order = patch.order;
        await db.updateCollectionItem("education", em[1], merged);
        return sendJSON(res, 200, merged);
      }
      if (method === "DELETE") {
        await db.deleteCollectionItem("education", em[1]);
        return sendJSON(res, 200, { ok: true });
      }
    }
  }

  // Navigation management
  {
    const base = "/api/admin/navigation";
    if (pathname === base && method === "GET") {
      const items = await db.getCollection("navigation");
      return sendJSON(res, 200, items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }
    if (pathname === base && method === "POST") {
      const b = await readBody(req);
      const uerr = navUrlError(b.url);
      if (uerr) return sendJSON(res, 400, { error: uerr });
      if (!String(b.label || "").trim()) return sendJSON(res, 400, { error: "Menu label is required." });
      const items = await db.getCollection("navigation");
      const item = normalizeNavigation(b, items.length);
      item.id = uid();
      item.order = items.length;
      await db.createCollectionItem("navigation", item);
      await db.logActivity("Added nav item: " + (item.label || ""));
      return sendJSON(res, 200, item);
    }
    if (pathname === base + "/order" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      await db.reorderCollection("navigation", ids);
      return sendJSON(res, 200, { ok: true });
    }
    const nm = pathname.match(/^\/api\/admin\/navigation\/([\w-]+)$/);
    if (nm) {
      const item = await db.getCollectionItem("navigation", nm[1]);
      if (!item) return sendJSON(res, 404, { error: "Navigation item not found" });
      if (method === "PUT") {
        const patch = await readBody(req);
        const nextUrl = patch.url !== undefined ? patch.url : item.url;
        const uerr = navUrlError(nextUrl);
        if (uerr) return sendJSON(res, 400, { error: uerr });
        const merged = normalizeNavigation({ ...item, ...patch }, 0);
        merged.id = item.id;
        if (patch.order !== undefined && Number.isInteger(patch.order)) merged.order = patch.order;
        await db.updateCollectionItem("navigation", nm[1], merged);
        return sendJSON(res, 200, merged);
      }
      if (method === "DELETE") {
        await db.deleteCollectionItem("navigation", nm[1]);
        return sendJSON(res, 200, { ok: true });
      }
    }
  }

  // Settings
  if (pathname === "/api/admin/settings" && method === "GET") {
    return sendJSON(res, 200, await db.getSingleton("settings") || { theme: "dark" });
  }
  if (pathname === "/api/admin/settings" && method === "PUT") {
    const b = await readBody(req);
    if (!["dark", "light", "system"].includes(b.theme)) {
      return sendJSON(res, 400, { error: "Theme must be one of: dark, light, system." });
    }
    const current = await db.getSingleton("settings") || {};
    current.theme = b.theme;
    await db.saveSingleton("settings", current);
    await db.logActivity("Theme set to " + b.theme);
    return sendJSON(res, 200, current);
  }

  // Generic collections: experiences, projects, posts, skills
  const collections = ["experiences", "projects", "posts", "skills"];

  for (const col of collections) {
    const base = "/api/admin/" + col;

    if (pathname === base && method === "GET") {
      return sendJSON(res, 200, await db.getCollection(col));
    }

    if (pathname === base && method === "POST") {
      const item = await readBody(req);
      item.id = uid();
      const nowIso = new Date().toISOString();
      if (col === "posts") {
        item.images = cleanImages(item.images);
        if (item.text !== undefined) item.text = sanitizeHTML(item.text);
        item.status = item.status === "published" ? "published" : "draft";
        if (item.status === "published" && !String(item.title || "").trim()) {
          return sendJSON(res, 400, { error: "A title is required to publish." });
        }
        item.likes = 0;
        item.comments = [];
        const existingPosts = await db.getCollection("posts");
        item.slug = slugify(item.title, existingPosts.map((x) => x.slug));
        if (!item.date) item.date = nowIso.slice(0, 10);
        item.createdAt = nowIso;
        item.updatedAt = nowIso;
        item.publishedAt = item.status === "published" ? nowIso : null;
        await db.logActivity((item.status === "published" ? "Published post: " : "Saved draft: ") + (String(item.title || "").trim() || "Untitled"));
      }
      if (col === "projects") {
        item.images = cleanImages(item.images);
        item.status = item.status === "published" ? "published" : "draft";
        item.createdAt = nowIso;
        item.updatedAt = nowIso;
        await db.logActivity("Added project: " + (String(item.title || "").trim() || "Untitled"));
      }
      if (col === "experiences") await db.logActivity("Added experience entry");
      if (col === "skills") await db.logActivity("Added skill category: " + (item.category || ""));
      const existingItems = await db.getCollection(col);
      item.order = existingItems.length;
      await db.createCollectionItem(col, item);
      return sendJSON(res, 200, item);
    }

    if (pathname === base + "/order" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      await db.reorderCollection(col, ids);
      return sendJSON(res, 200, { ok: true });
    }

    let mm;
    if ((mm = pathname.match(new RegExp("^" + base + "/([\\w-]+)$")))) {
      const current = await db.getCollectionItem(col, mm[1]);
      if (!current) return sendJSON(res, 404, { error: "Not found" });

      if (method === "PUT") {
        const patch = await readBody(req);
        delete patch.id;

        if (col === "posts") {
          if (patch.images !== undefined) patch.images = cleanImages(patch.images);
          if (patch.text !== undefined) patch.text = sanitizeHTML(patch.text);
          if (patch.title !== undefined && String(patch.title).trim()) {
            if (patch.slug === undefined || patch.slug === "") {
              const existingPosts = await db.getCollection("posts");
              patch.slug = slugify(patch.title, existingPosts.filter((x) => x.id !== current.id).map((x) => x.slug));
            }
          }
          const wasPublished = current.status === "published";
          const wantsPublish = patch.status === "published";
          const titleAfter = String(patch.title !== undefined ? patch.title : current.title || "").trim();
          if (wantsPublish && !wasPublished) {
            if (!titleAfter) return sendJSON(res, 400, { error: "A title is required to publish." });
            patch.publishedAt = new Date().toISOString();
            await db.logActivity("Published post: " + titleAfter);
          } else if (patch.status === "draft" && wasPublished) {
            await db.logActivity("Unpublished post: " + titleAfter);
          }
        }
        if (col === "projects") {
          if (patch.images !== undefined) patch.images = cleanImages(patch.images);
          if (patch.status === "published" && current.status !== "published") {
            patch.publishedAt = new Date().toISOString();
          }
        }

        const updated = { ...current, ...patch };
        if (col === "posts") {
          updated.updatedAt = new Date().toISOString();
          if (updated.status === "published" && !updated.publishedAt) updated.publishedAt = updated.updatedAt;
        }
        if (col === "projects") updated.updatedAt = new Date().toISOString();
        await db.updateCollectionItem(col, mm[1], updated);
        return sendJSON(res, 200, updated);
      }
      if (method === "DELETE") {
        const label = col === "posts" ? "post" : col === "projects" ? "project" : col === "experiences" ? "experience" : "skill category";
        await db.logActivity("Deleted " + label + (current.title ? ": " + current.title : current.category ? ": " + current.category : current.position ? ": " + current.position : ""));
        await db.deleteCollectionItem(col, mm[1]);
        return sendJSON(res, 200, { ok: true });
      }
    }
  }

  // Messages
  if (pathname === "/api/admin/messages" && method === "GET") {
    return sendJSON(res, 200, await db.getMessages());
  }
  if ((m = pathname.match(/^\/api\/admin\/messages\/([\w-]+)\/read$/)) && method === "PUT") {
    await db.markMessageRead(m[1]);
    return sendJSON(res, 200, { ok: true });
  }
  if ((m = pathname.match(/^\/api\/admin\/messages\/([\w-]+)$/)) && method === "DELETE") {
    await db.deleteMessage(m[1]);
    return sendJSON(res, 200, { ok: true });
  }

  // Activity
  if (pathname === "/api/admin/activity" && method === "GET") {
    return sendJSON(res, 200, await db.getActivity());
  }

  // Blog categories
  if (pathname === "/api/admin/categories" && method === "GET") {
    return sendJSON(res, 200, await db.getBlogCategories());
  }
  if (pathname === "/api/admin/categories" && method === "POST") {
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 40);
    if (!name) return sendJSON(res, 400, { error: "Category name is required." });
    const existing = await db.getBlogCategories();
    if (existing.some((c) => c.toLowerCase() === name.toLowerCase())) {
      return sendJSON(res, 400, { error: "That category already exists." });
    }
    await db.addBlogCategory(name);
    await db.logActivity("Added blog category: " + name);
    return sendJSON(res, 200, [...existing, name]);
  }
  if ((m = pathname.match(/^\/api\/admin\/categories\/([\w-]+)$/)) && (method === "PUT" || method === "DELETE")) {
    const decoded = decodeURIComponent(m[1]).toLowerCase();
    const existing = await db.getBlogCategories();
    const idx = existing.findIndex((c) => c.toLowerCase() === decoded);
    if (idx === -1) return sendJSON(res, 404, { error: "Category not found" });
    if (method === "PUT") {
      const b = await readBody(req);
      const name = String(b.name || "").trim().slice(0, 40);
      if (!name) return sendJSON(res, 400, { error: "Category name is required." });
      await db.updateBlogCategory(existing[idx], name);
      existing[idx] = name;
    } else {
      await db.deleteBlogCategory(existing[idx]);
      await db.logActivity("Deleted blog category: " + existing[idx]);
      existing.splice(idx, 1);
    }
    return sendJSON(res, 200, existing);
  }

  // Resume / CV
  if (pathname === "/api/admin/resume" && method === "GET") {
    return sendJSON(res, 200, await db.getSingleton("resume") || null);
  }
  if (pathname === "/api/admin/resume" && method === "POST") {
    const b = await readBody(req);
    const match = /^data:application\/pdf;base64,(.+)$/.exec(b.data || "");
    if (!match) return sendJSON(res, 400, { error: "Only PDF files are allowed." });
    const buf = Buffer.from(match[1], "base64");
    if (buf.slice(0, 5).toString("latin1") !== "%PDF-") {
      return sendJSON(res, 400, { error: "That file is not a valid PDF." });
    }
    if (buf.length > 10 * 1024 * 1024) return sendJSON(res, 400, { error: "PDF too large (max 10MB)." });

    let resumeData;
    if (cloudinary.isConfigured()) {
      const result = await cloudinary.uploadPDF(b.data, "portfolio/documents", "resume");
      resumeData = {
        filename: String(b.filename || "resume.pdf").replace(/[^\w.\- ()]/g, "").trim().slice(0, 80) || "resume.pdf",
        url: result.url,
        publicId: result.publicId,
        uploadedAt: new Date().toISOString()
      };
    } else {
      fs.mkdirSync(IMAGE_DIR, { recursive: true });
      fs.writeFileSync(path.join(IMAGE_DIR, "resume.pdf"), buf);
      resumeData = {
        filename: String(b.filename || "resume.pdf").replace(/[^\w.\- ()]/g, "").trim().slice(0, 80) || "resume.pdf",
        url: "/image/resume.pdf",
        uploadedAt: new Date().toISOString()
      };
    }

    await db.saveSingleton("resume", resumeData);
    await db.logActivity("Updated resume / CV");
    return sendJSON(res, 200, resumeData);
  }
  if (pathname === "/api/admin/resume" && method === "DELETE") {
    const resume = await db.getSingleton("resume");
    if (resume && cloudinary.isConfigured() && resume.publicId) {
      await cloudinary.deleteFile(resume.publicId, "raw");
    }
    // Explicit deletion: only remove the locally-stored file for this resume
    const localPdf = path.join(IMAGE_DIR, "resume.pdf");
    if (!cloudinary.isConfigured() && fs.existsSync(localPdf)) fs.unlinkSync(localPdf);
    await db.saveSingleton("resume", null);
    await db.logActivity("Removed resume / CV");
    return sendJSON(res, 200, { ok: true });
  }
  if (pathname === "/api/admin/resume/url" && method === "PUT") {
    const b = await readBody(req);
    const url = String(b.url || "").trim().slice(0, 500);
    if (!/^https?:\/\//i.test(url)) return sendJSON(res, 400, { error: "Resume URL must start with http(s)://" });
    const current = await db.getSingleton("resume");
    const resumeData = {
      filename: "External Resume",
      url: url,
      uploadedAt: (current && current.uploadedAt) || new Date().toISOString()
    };
    await db.saveSingleton("resume", resumeData);
    await db.logActivity("Set external resume URL");
    return sendJSON(res, 200, resumeData);
  }

  // Media
  if (pathname === "/api/admin/media" && method === "GET") {
    return sendJSON(res, 200, listMedia());
  }
  if (pathname === "/api/admin/media" && method === "POST") {
    const b = await readBody(req);
    if (Array.isArray(b.images)) {
      const saved = [];
      for (const img of b.images) saved.push(await saveUpload(img.data, img.name));
      await db.logActivity("Uploaded " + saved.length + " image" + (saved.length === 1 ? "" : "s"));
      return sendJSON(res, 200, saved);
    }
    if (b.kind === "video") {
      const saved = await saveVideoUpload(b.data, b.name);
      await db.logActivity("Uploaded video: " + saved.name);
      return sendJSON(res, 200, [saved]);
    }
    const saved = await saveUpload(b.data, b.name);
    await db.logActivity("Uploaded image: " + saved.name);
    return sendJSON(res, 200, [saved]);
  }
  if (pathname === "/api/admin/media/replace" && method === "PUT") {
    const b = await readBody(req);
    if (cloudinary.isConfigured()) {
      // For Cloudinary, just upload the new image
      const saved = await saveUpload(b.data, b.name);
      return sendJSON(res, 200, { ok: true, url: saved.url });
    }
    // Local fallback
    const targetName = path.basename(String(b.name || ""));
    let targetPath = path.join(IMAGE_DIR, targetName);
    if (!fs.existsSync(targetPath)) targetPath = path.join(LEGACY_UPLOAD_DIR, targetName);
    if (!fs.existsSync(targetPath)) return sendJSON(res, 404, { error: "Original image not found." });
    const match = /^data:(image\/[a-zA-Z0-9+.\-]+);base64,(.+)$/.exec(b.data || "");
    if (!match) return sendJSON(res, 400, { error: "Invalid image data." });
    const extMap = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" };
    const newExt = extMap[match[1]];
    if (!newExt) return sendJSON(res, 400, { error: "Unsupported image type: " + match[1] });
    if (newExt !== path.extname(targetName).toLowerCase()) {
      return sendJSON(res, 400, { error: "Replacement must use the same format (" + path.extname(targetName).replace(".", "").toUpperCase() + ")." });
    }
    const buf = Buffer.from(match[2], "base64");
    if (buf.length > 10 * 1024 * 1024) return sendJSON(res, 400, { error: "Image too large (max 10MB)." });
    fs.writeFileSync(targetPath, buf);
    await db.logActivity("Replaced image: " + targetName);
    const urlPrefix = targetPath.indexOf(IMAGE_DIR) === 0 ? "/image/" : "/uploads/";
    return sendJSON(res, 200, { ok: true, url: urlPrefix + encodeURIComponent(targetName) });
  }
  if ((m = pathname.match(/^\/api\/admin\/media\/(.+)$/)) && method === "DELETE") {
    const name = path.basename(decodeURIComponent(m[1]));
    if (cloudinary.isConfigured()) {
      const publicId = cloudinary.extractPublicId(name);
      if (publicId) await cloudinary.deleteFile(publicId);
    } else {
      const fullImg = path.join(IMAGE_DIR, name);
      const fullLegacy = path.join(LEGACY_UPLOAD_DIR, name);
      if (fs.existsSync(fullImg)) fs.unlinkSync(fullImg);
      else if (fs.existsSync(fullLegacy)) fs.unlinkSync(fullLegacy);
    }
    return sendJSON(res, 200, { ok: true });
  }

  // Sections
  if (pathname === "/api/admin/sections" && method === "GET") {
    const sections = await db.getSingleton("sections");
    return sendJSON(res, 200, sections || {
      enabled: { hero: true, experience: true, projects: true, about: true, education: true, certifications: true, skills: true, blog: true, contact: true },
      order: ["hero", "experience", "projects", "about", "education", "certifications", "skills", "blog", "contact"]
    });
  }
  if (pathname === "/api/admin/sections" && method === "PUT") {
    const b = await readBody(req);
    const current = await db.getSingleton("sections") || {
      enabled: { hero: true, experience: true, projects: true, about: true, education: true, certifications: true, skills: true, blog: true, contact: true },
      order: ["hero", "experience", "projects", "about", "education", "certifications", "skills", "blog", "contact"]
    };
    if (b.enabled) current.enabled = { ...current.enabled, ...b.enabled };
    if (Array.isArray(b.order)) current.order = b.order;
    await db.saveSingleton("sections", current);
    return sendJSON(res, 200, current);
  }

  return sendJSON(res, 404, { error: "Unknown API endpoint" });
}

/* ---------------- Static files ---------------- */

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  if (rel === "/admin" || rel === "/admin/") rel = "/admin/index.html";

  let baseDir = PUBLIC_DIR;
  if (rel.startsWith("/image/")) {
    baseDir = IMAGE_DIR;
    rel = rel.slice("/image".length);
  } else if (rel.startsWith("/uploads/")) {
    baseDir = LEGACY_UPLOAD_DIR;
    rel = rel.slice("/uploads".length);
  } else if (rel.startsWith("/admin/")) {
    rel = rel;
  }

  const full = path.normalize(path.join(baseDir, rel));
  if (!full.startsWith(path.normalize(baseDir))) {
    res.writeHead(403); return res.end("Forbidden");
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      if (!path.extname(rel)) {
        const fallback = path.join(PUBLIC_DIR, rel.startsWith("/admin") ? "/admin/index.html" : "/index.html");
        return fs.readFile(fallback, (e2, d2) => {
          if (e2) { res.writeHead(404); return res.end("Not found"); }
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(d2);
        });
      }
      res.writeHead(404); return res.end("Not found");
    }
    const ext = path.extname(full).toLowerCase();
    const cache = ext === ".html" ? "no-cache" : "public, max-age=300";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache });
    res.end(data);
  });
}

/* ---------------- Server Startup ---------------- */

async function startServer() {
  console.log("");
  console.log("  Initializing persistent storage...");

  // Initialize database. Fail with a clear, actionable message instead of a
  // raw crash when DATABASE_URL / SUPABASE_DB_URL is missing or unreachable.
  try {
    await db.initDB();
  } catch (err) {
    console.error("");
    console.error("  ✘ The server could not start because the database is unavailable.");
    console.error("    " + String(err.message || err).split("\n").join("\n    "));
    console.error("──────────────────────────────────────────────");
    console.error("  Fix: set DATABASE_URL (or SUPABASE_DB_URL) and try again.");
    console.error("  Locally:  copy .env.example to .env and fill it in,");
    console.error("            then run: npm install && npm run migrate && npm start");
    console.error("  Render:   Dashboard > your service > Environment >");
    console.error("            add DATABASE_URL, then redeploy.");
    console.error("  See README.md and .env.example for details.");
    console.error("──────────────────────────────────────────────");
    console.error("");
    process.exit(1);
  }

  // Initialize Cloudinary (if configured)
  cloudinary.configureCloudinary();

  // Ensure image directory exists (dedicated, persistent image storage)
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  // Legacy /uploads/ kept only to keep serving previously-stored references
  fs.mkdirSync(LEGACY_UPLOAD_DIR, { recursive: true });

  // Check if config exists, create default if not
  let config = await db.getConfig();
  if (!config) {
    config = {
      salt: crypto.randomBytes(16).toString("hex"),
      secret: crypto.randomBytes(24).toString("hex"),
      passwordHash: null,
      passwordChanged: false,
      createdAt: new Date().toISOString()
    };
    config.passwordHash = hashPassword(config.salt, "admin123");
    await db.saveConfig(config);
    console.log("  Default admin login ->  username: admin   password: admin123");
    console.log("  !! Change this password in Admin Panel > Settings after first login.");
  }
  if (!config.passwordHash) {
    config.passwordHash = hashPassword(config.salt, "admin123");
    await db.saveConfig(config);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;

    try {
      if (pathname.startsWith("/api/")) {
        await handleAPI(req, res, pathname);
      } else {
        serveStatic(req, res, pathname);
      }
    } catch (err) {
      console.error("[error]", err.message);
      if (!res.headersSent) sendJSON(res, err.message === "Body too large" ? 413 : 400, { error: err.message });
    }
  });

  server.listen(PORT, () => {
    console.log("");
    console.log("  ──────────────────────────────────────────────");
    console.log("   Md. Shagor Islam — Portfolio + Admin Panel");
    console.log("  ──────────────────────────────────────────────");
    console.log("   Public site :  http://localhost:" + PORT);
    console.log("   Admin panel :  http://localhost:" + PORT + "/admin");
    if (!config.passwordChanged) {
      console.log("   Login       :  admin / admin123  (change it!)");
    }
    console.log("   Database    :  PostgreSQL (persistent)");
    console.log("   Images      :  " + (cloudinary.isConfigured() ? "Cloudinary (persistent)" : "Local storage (configure Cloudinary for persistence)"));
    console.log("  ──────────────────────────────────────────────");
    console.log("");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
