/* ============================================================
   Shagor Portfolio — Server + CMS API
   Zero dependencies. Run:  npm start   (or: node server.js)
   Public site : http://localhost:3000
   Admin panel : http://localhost:3000/admin
   ============================================================ */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DB_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DB_DIR, "db.json");
const UPLOAD_DIR = path.join(ROOT, "uploads");
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
  ".woff2": "font/woff2"
};

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
const MAX_BODY = 15 * 1024 * 1024; // 15 MB

/* ---------------- Database ---------------- */

function hashPassword(salt, password) {
  return crypto.createHash("sha256").update(salt + ":" + password).digest("hex");
}

function seedDB() {
  const now = new Date().toISOString();
  return {
    config: {
      salt: crypto.randomBytes(16).toString("hex"),
      secret: crypto.randomBytes(24).toString("hex"),
      // default login -> admin / admin123  (change it in Admin > Settings)
      passwordHash: null,
      passwordChanged: false,
      createdAt: now
    },
    home: {
      name: "Md. Shagor Islam",
      title: "DevOps & Cloud Engineer",
      subtitle: "System Engineer | Network Engineer | IT Infrastructure",
      description:
        "IT infrastructure professional with hands-on experience in networking, Linux and Windows server administration, virtualization, cloud infrastructure, system security and DevOps technologies.",
      currentPosition: "DevOps & Cloud Engineer",
      primaryBtn: { label: "View Experience", href: "#experience" },
      secondaryBtn: { label: "Contact Me", href: "#contact" },
      heroImage: "",
      skills: [
        "Linux", "Networking", "AWS", "Azure", "GCP",
        "Docker", "Kubernetes", "Ansible", "Python", "Bash"
      ]
    },
    about: {
      intro: [
        "I started my professional journey with networking, where I learned how networks communicate and how real-world infrastructure problems are solved.",
        "My career then moved into system administration, where I worked with Linux and Windows servers, Active Directory, DNS, DHCP, virtualization, monitoring and infrastructure security.",
        "Today, I am working toward modern DevOps and Cloud Engineering, focusing on cloud infrastructure, containers, automation, deployment and reliable infrastructure operations."
      ],
      belief:
        "I believe the best engineers are not only people who know technologies, but people who can understand problems, troubleshoot them and build reliable solutions.",
      focus: "Cloud Infrastructure • Containers • Automation • Reliable Systems",
      images: [],
      lifeTitle: "When I'm Not Working",
      lifeItems: [],
      education: [
        { id: uid(), degree: "BSc in Computer Science & Engineering", institution: "Uttara University", status: "Currently Pursuing", resultType: "cgpa", result: "", resultScale: "4.00", showResult: true },
        { id: uid(), degree: "Diploma in Computer Engineering", institution: "Borak Polytechnic Institute", status: "Completed", resultType: "cgpa", result: "", resultScale: "4.00", showResult: true }
      ],
      certifications: [
        { id: uid(), name: "Cisco Certified Network Associate", code: "CCNA 200-301", type: "Certification" },
        { id: uid(), name: "MikroTik Certified Network Associate", code: "MTCNA", type: "Certification" },
        { id: uid(), name: "IT Essentials", code: "", type: "Course" },
        { id: uid(), name: "Linux Essentials", code: "", type: "Course" },
        { id: uid(), name: "DevOps Tools", code: "", type: "Course" },
        { id: uid(), name: "Industrial Training", code: "", type: "Training" }
      ]
    },
    skills: [
      { id: uid(), category: "Networking", items: ["CCNA", "MikroTik", "Cisco", "VLAN", "OSPF", "EIGRP", "BGP", "NAT", "VLSM", "Firewall"] },
      { id: uid(), category: "Linux", items: ["Ubuntu", "CentOS", "Red Hat", "Linux Server Administration", "Server Monitoring", "Troubleshooting", "Bash"] },
      { id: uid(), category: "Windows", items: ["Windows Server", "Active Directory", "DNS", "DHCP", "Group Policy"] },
      { id: uid(), category: "Virtualization", items: ["VMware", "Hyper-V", "KVM", "vSAN"] },
      { id: uid(), category: "Cloud", items: ["AWS EC2", "AWS ECS", "Azure", "GCP"] },
      { id: uid(), category: "DevOps", items: ["Docker", "Kubernetes", "CI/CD", "Ansible", "Python"] },
      { id: uid(), category: "Security", items: ["Palo Alto", "Wazuh", "Infrastructure Security", "System Monitoring"] },
      { id: uid(), category: "Tools", items: ["PuTTY", "Winbox", "Wireshark", "VMware", "Git"] }
    ],
    experiences: [
      {
        id: uid(),
        company: "ICC Communication Ltd.",
        position: "DevOps & Cloud Engineer",
        startDate: "July 2026",
        endDate: "",
        current: true,
        logo: "",
        summary:
          "Working on cloud infrastructure, deployment automation, containerization, monitoring and infrastructure reliability for production services.",
        description:
          "After working in system administration and infrastructure operations, I moved into a DevOps & Cloud Engineering role, focusing on cloud infrastructure, deployment, automation, containerization, monitoring and infrastructure reliability.",
        responsibilities: [
          "Managed and maintained cloud-based Linux infrastructure on AWS EC2 and AWS ECS.",
          "Worked with Docker-based environments and containerized workloads.",
          "Worked with Kubernetes-based container environments; troubleshot pod/container issues.",
          "Supported automated and repeatable CI/CD deployment workflows.",
          "Monitored server health — CPU, RAM, disk and service status.",
          "Analyzed logs and performed root-cause investigation for infrastructure problems.",
          "Maintained Linux infrastructure stability across Ubuntu, CentOS and Red Hat servers."
        ],
        tech: ["AWS EC2", "AWS ECS", "Docker", "Kubernetes", "CI/CD", "Linux"],
        visible: true,
        order: 0
      },
      {
        id: uid(),
        company: "ICC Communication Ltd.",
        position: "Assistant System Engineer",
        startDate: "February 2025",
        endDate: "July 2026",
        current: false,
        logo: "",
        summary:
          "Managed and monitored 50+ production Linux and Windows servers while contributing to infrastructure reliability, security and operational stability.",
        description:
          "Core system administration role covering Linux/Windows servers, virtualization, security and day-to-day production operations.",
        responsibilities: [
          "Configured and maintained production Linux servers (Ubuntu, CentOS, Red Hat).",
          "Managed Windows Server environments, Active Directory, DNS, DHCP and Group Policies.",
          "Managed virtualized infrastructure with VMware and Hyper-V.",
          "Configured and managed Palo Alto next-generation firewall environments.",
          "Monitored system security using Wazuh and investigated security-related events.",
          "Maintained configuration records, system documentation and operational logs."
        ],
        tech: ["Ubuntu", "CentOS", "Red Hat", "Windows Server", "Active Directory", "VMware", "Hyper-V", "Palo Alto", "Wazuh"],
        visible: true,
        order: 1
      },
      {
        id: uid(),
        company: "Exord Online",
        position: "Network Engineer",
        startDate: "December 2023",
        endDate: "February 2025",
        current: false,
        logo: "",
        summary:
          "Built my foundation in networking — routing, switching, VLANs, firewalls and enterprise network troubleshooting.",
        description:
          "My earlier professional role where I worked on real-world ISP/network infrastructure every day.",
        responsibilities: [
          "Configured MikroTik and Cisco routers and switches.",
          "Configured VLANs and routing protocols (OSPF, EIGRP, BGP, NAT).",
          "Performed IP planning using VLSM.",
          "Analyzed network traffic with Wireshark and optimized bandwidth / latency.",
          "Worked with firewalls and resolved connectivity issues.",
          "Configured CCTV/IP camera systems."
        ],
        tech: ["MikroTik", "Cisco", "VLAN", "OSPF", "EIGRP", "BGP", "NAT", "VLSM", "Firewall", "Wireshark"],
        visible: true,
        order: 2
      }
    ],
    projects: [],
    posts: [
      {
        id: uid(),
        title: "Weekend in Dhaka 🌆",
        text: "Sometimes stepping away from servers and terminals is exactly what you need.",
        location: "Dhaka, Bangladesh",
        date: "2026-08-16",
        category: "Life",
        tags: ["weekend", "dhaka"],
        images: [],
        status: "published",
        likes: 0,
        comments: [],
        order: 0
      },
      {
        id: uid(),
        title: "Learning Kubernetes 🚀",
        text: "Spent the weekend experimenting with containers, deployments and services.",
        location: "",
        date: "2026-08-09",
        category: "Learning",
        tags: ["kubernetes", "containers"],
        images: [],
        status: "published",
        likes: 0,
        comments: [],
        order: 1
      }
    ],
    messages: [],
    resume: null,
    contact: {
      email: "shagor.cst@gmail.com",
      phone: "+880 1406-642156",
      location: "Dhaka, Bangladesh",
      socials: [
        { platform: "GitHub", url: "" },
        { platform: "LinkedIn", url: "" },
        { platform: "Facebook", url: "" },
        { platform: "Instagram", url: "" }
      ]
    },
    sections: {
      enabled: {
        hero: true, experience: true, projects: true, about: true,
        education: true, certifications: true, skills: true, blog: true, contact: true
      },
      order: ["hero", "experience", "projects", "about", "education", "certifications", "skills", "blog", "contact"]
    }
  };
}

let db;
function loadDB() {
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return true;
  } catch (e) {
    return false;
  }
}
function saveDB() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* keep only permanent image references (never blob:/data: browser temporaries) */
function cleanImages(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter((u) => typeof u === "string" && /^(\/uploads\/|https?:\/\/)/i.test(u))
    .slice(0, 24);
}

function logActivity(text) {
  db.activity = db.activity || [];
  db.activity.unshift({ id: uid(), text: String(text).slice(0, 200), date: new Date().toISOString() });
  if (db.activity.length > 40) db.activity.length = 40;
}

function init() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const existed = loadDB();
  if (!existed) {
    db = seedDB();
    db.config.passwordHash = hashPassword(db.config.salt, "admin123");
    saveDB();
    console.log("  First run: database created at data/db.json");
    console.log("  Default admin login ->  username: admin   password: admin123");
    console.log("  !! Change this password in Admin Panel > Settings after first login.");
  }
  if (!db.config.passwordHash) {
    db.config.passwordHash = hashPassword(db.config.salt, "admin123");
  }

  /* ---- lightweight migrations for older data files ---- */
  let migrated = false;
  const nowIso = new Date().toISOString();
  (db.posts || []).forEach((p) => {
    const cleaned = cleanImages(p.images);
    if (JSON.stringify(cleaned) !== JSON.stringify(p.images)) { p.images = cleaned; migrated = true; }
    if (!p.createdAt) { p.createdAt = nowIso; migrated = true; }
    if (!p.updatedAt) { p.updatedAt = nowIso; migrated = true; }
    if (p.publishedAt === undefined) { p.publishedAt = p.status === "published" ? nowIso : null; migrated = true; }
  });
  (db.projects || []).forEach((p) => {
    const cleaned = cleanImages(p.images);
    if (JSON.stringify(cleaned) !== JSON.stringify(p.images)) { p.images = cleaned; migrated = true; }
  });
  if (!Array.isArray(db.blogCategories)) { db.blogCategories = ["Life", "Learning", "Technology", "Career", "Travel"]; migrated = true; }
  if (!Array.isArray(db.activity)) { db.activity = []; migrated = true; }
  if (db.resume === undefined) { db.resume = null; migrated = true; }
  ((db.about && db.about.education) || []).forEach((ed) => {
    if (ed.resultType === undefined) { ed.resultType = ""; migrated = true; }
    if (ed.result === undefined) { ed.result = ""; migrated = true; }
    if (ed.resultScale === undefined) { ed.resultScale = ""; migrated = true; }
    if (ed.showResult === undefined) { ed.showResult = true; migrated = true; }
  });
  if (migrated || !fs.existsSync(DB_PATH)) saveDB();
}

/* ---------------- Auth ---------------- */

function sign(exp) {
  const sig = crypto.createHmac("sha256", db.config.secret).update(String(exp)).digest("hex");
  return exp + "." + sig;
}

function verifyToken(token) {
  if (!token || token.indexOf(".") === -1) return false;
  const [exp, sig] = token.split(".");
  const expect = sign(exp).split(".")[1];
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

function isAdmin(req) {
  return verifyToken(getCookie(req, "sid"));
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

function publicContent() {
  return {
    home: db.home,
    about: db.about,
    contact: db.contact,
    resume: db.resume || null,
    skills: [...db.skills].sort(byOrder),
    experiences: db.experiences.filter((e) => e.visible !== false).sort(byOrder),
    projects: db.projects.filter((p) => p.status === "published").sort(byOrder),
    posts: db.posts
      .filter((p) => p.status === "published")
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .map((p) => ({
        id: p.id, title: p.title, text: p.text, location: p.location, date: p.date,
        category: p.category, tags: p.tags || [], images: p.images || [],
        likes: p.likes || 0, comments: p.comments || []
      })),
    sections: db.sections
  };
}

/* ---------------- Media ---------------- */

function listMedia() {
  try {
    return fs.readdirSync(UPLOAD_DIR)
      .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
      .map((f) => {
        const st = fs.statSync(path.join(UPLOAD_DIR, f));
        return { name: f, url: "/uploads/" + encodeURIComponent(f), size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (e) {
    return [];
  }
}

function saveUpload(dataField, originalName) {
  const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataField || "");
  if (!match) throw new Error("Invalid image data (expected base64 data URL)");
  const mime = match[1];
  const extMap = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" };
  const ext = extMap[mime];
  if (!ext) throw new Error("Unsupported image type: " + mime);
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > 10 * 1024 * 1024) throw new Error("Image too large (max 10MB)");
  const safeBase = (originalName || "image").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 40) || "image";
  const name = safeBase.replace(/\s+/g, "-") + "-" + Date.now().toString(36) + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return { name, url: "/uploads/" + encodeURIComponent(name) };
}

/* ---------------- API router ---------------- */

async function handleAPI(req, res, pathname) {
  const method = req.method;
  const parts = pathname.split("/").filter(Boolean); // ["api", ...]

  /* ----- public endpoints ----- */

  if (method === "GET" && pathname === "/api/content") {
    return sendJSON(res, 200, publicContent());
  }

  if (method === "POST" && pathname === "/api/contact") {
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 100);
    const email = String(b.email || "").trim().slice(0, 150);
    const subject = String(b.subject || "").trim().slice(0, 200);
    const message = String(b.message || "").trim().slice(0, 5000);
    if (!name || !email || !message) return sendJSON(res, 400, { error: "Name, email and message are required." });
    db.messages.unshift({ id: uid(), name, email, subject, message, date: new Date().toISOString(), read: false });
    logActivity("New contact message from " + name);
    saveDB();
    return sendJSON(res, 200, { ok: true });
  }

  let m;
  if ((m = pathname.match(/^\/api\/posts\/([\w-]+)\/like$/)) && method === "POST") {
    const post = db.posts.find((p) => p.id === m[1] && p.status === "published");
    if (!post) return sendJSON(res, 404, { error: "Post not found" });
    post.likes = (post.likes || 0) + 1;
    saveDB();
    return sendJSON(res, 200, { likes: post.likes });
  }

  if ((m = pathname.match(/^\/api\/posts\/([\w-]+)\/comments$/)) && method === "POST") {
    const post = db.posts.find((p) => p.id === m[1] && p.status === "published");
    if (!post) return sendJSON(res, 404, { error: "Post not found" });
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 80);
    const text = String(b.text || "").trim().slice(0, 1000);
    if (!name || !text) return sendJSON(res, 400, { error: "Name and comment are required." });
    post.comments = post.comments || [];
    post.comments.push({ id: uid(), name, text, date: new Date().toISOString() });
    saveDB();
    return sendJSON(res, 200, { ok: true, comments: post.comments });
  }

  /* ----- auth ----- */

  if (pathname === "/api/admin/login" && method === "POST") {
    const b = await readBody(req);
    const username = String(b.username || "");
    const password = String(b.password || "");
    if (username !== "admin" || hashPassword(db.config.salt, password) !== db.config.passwordHash) {
      return sendJSON(res, 401, { error: "Wrong username or password." });
    }
    const token = sign(Date.now() + 7 * 24 * 3600 * 1000);
    res.setHeader("Set-Cookie", "sid=" + encodeURIComponent(token) + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/logout" && method === "POST") {
    res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
    return sendJSON(res, 200, { ok: true });
  }

  /* ----- everything below requires admin ----- */

  if (!isAdmin(req)) return sendJSON(res, 401, { error: "Unauthorized" });

  if (pathname === "/api/admin/me" && method === "GET") {
    return sendJSON(res, 200, { ok: true, passwordChanged: !!db.config.passwordChanged });
  }

  if (pathname === "/api/admin/stats" && method === "GET") {
    return sendJSON(res, 200, {
      projects: db.projects.length,
      posts: db.posts.length,
      publishedPosts: db.posts.filter((p) => p.status === "published").length,
      draftPosts: db.posts.filter((p) => p.status !== "published").length,
      experiences: db.experiences.length,
      skills: db.skills.reduce((n, s) => n + s.items.length, 0),
      messages: db.messages.length,
      unreadMessages: db.messages.filter((x) => !x.read).length,
      drafts: db.posts.filter((p) => p.status === "draft").length
    });
  }

  if (pathname === "/api/admin/home" && method === "GET") {
    return sendJSON(res, 200, db.home);
  }
  if (pathname === "/api/admin/home" && method === "PUT") {
    const b = await readBody(req);
    const allowed = ["name", "title", "subtitle", "description", "currentPosition", "primaryBtn", "secondaryBtn", "heroImage", "skills"];
    for (const k of allowed) if (k in b) db.home[k] = b[k];
    saveDB();
    return sendJSON(res, 200, db.home);
  }

  if (pathname === "/api/admin/about" && method === "GET") {
    return sendJSON(res, 200, db.about);
  }
  if (pathname === "/api/admin/about" && method === "PUT") {
    const b = await readBody(req);
    const allowed = ["intro", "belief", "focus", "images", "lifeTitle", "lifeItems", "education", "certifications"];
    for (const k of allowed) if (k in b) db.about[k] = b[k];
    saveDB();
    return sendJSON(res, 200, db.about);
  }

  if (pathname === "/api/admin/contact" && method === "GET") {
    return sendJSON(res, 200, db.contact);
  }
  if (pathname === "/api/admin/contact" && method === "PUT") {
    const b = await readBody(req);
    const allowed = ["email", "phone", "location", "socials"];
    for (const k of allowed) if (k in b) db.contact[k] = b[k];
    saveDB();
    return sendJSON(res, 200, db.contact);
  }

  if (pathname === "/api/admin/password" && method === "POST") {
    const b = await readBody(req);
    if (hashPassword(db.config.salt, String(b.current || "")) !== db.config.passwordHash) {
      return sendJSON(res, 400, { error: "Current password is wrong." });
    }
    const next = String(b.next || "");
    if (next.length < 6) return sendJSON(res, 400, { error: "New password must be at least 6 characters." });
    db.config.passwordHash = hashPassword(db.config.salt, next);
    db.config.passwordChanged = true;
    saveDB();
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/export" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="portfolio-backup.json"'
    });
    return res.end(JSON.stringify(db, null, 2));
  }

  /* ----- generic collections: experiences, projects, posts, skills ----- */

  const collections = ["experiences", "projects", "posts", "skills"];

  for (const col of collections) {
    const base = "/api/admin/" + col;

    if (pathname === base && method === "GET") return sendJSON(res, 200, db[col]);

    if (pathname === base && method === "POST") {
      const item = await readBody(req);
      item.id = uid();
      const nowIso = new Date().toISOString();
      if (col === "posts") {
        item.images = cleanImages(item.images);
        item.status = item.status === "published" ? "published" : "draft";
        if (item.status === "published" && !String(item.title || "").trim()) {
          return sendJSON(res, 400, { error: "A title is required to publish." });
        }
        item.likes = 0;
        item.comments = [];
        if (!item.date) item.date = nowIso.slice(0, 10);
        item.createdAt = nowIso;
        item.updatedAt = nowIso;
        item.publishedAt = item.status === "published" ? nowIso : null;
        logActivity((item.status === "published" ? "Published post: " : "Saved draft: ") + (String(item.title || "").trim() || "Untitled"));
      }
      if (col === "projects") {
        item.images = cleanImages(item.images);
        item.status = item.status === "published" ? "published" : "draft";
        item.createdAt = nowIso;
        item.updatedAt = nowIso;
        logActivity("Added project: " + (String(item.title || "").trim() || "Untitled"));
      }
      if (col === "experiences") logActivity("Added experience entry");
      if (col === "skills") logActivity("Added skill category: " + (item.category || ""));
      item.order = db[col].length;
      db[col].push(item);
      saveDB();
      return sendJSON(res, 200, item);
    }

    /* order must be matched before the :id route below ("order" looks like an id) */
    if (pathname === base + "/order" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      db[col].sort((a, b2) => {
        const ia = ids.indexOf(a.id), ib = ids.indexOf(b2.id);
        return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
      });
      db[col].forEach((x, i) => (x.order = i));
      saveDB();
      return sendJSON(res, 200, { ok: true });
    }

    let mm;
    if ((mm = pathname.match(new RegExp("^" + base + "/([\\w-]+)$")))) {
      const idx = db[col].findIndex((x) => x.id === mm[1]);
      if (idx === -1) return sendJSON(res, 404, { error: "Not found" });
      const current = db[col][idx];

      if (method === "PUT") {
        const patch = await readBody(req);
        delete patch.id;

        if (col === "posts") {
          if (patch.images !== undefined) patch.images = cleanImages(patch.images);
          const wasPublished = current.status === "published";
          const wantsPublish = patch.status === "published";
          const titleAfter = String(patch.title !== undefined ? patch.title : current.title || "").trim();
          if (wantsPublish && !wasPublished) {
            if (!titleAfter) return sendJSON(res, 400, { error: "A title is required to publish." });
            patch.publishedAt = new Date().toISOString();
            logActivity("Published post: " + titleAfter);
          } else if (patch.status === "draft" && wasPublished) {
            logActivity("Unpublished post: " + titleAfter);
          }
          // plain content update with no explicit status change -> status stays as-is
        }
        if (col === "projects") {
          if (patch.images !== undefined) patch.images = cleanImages(patch.images);
          if (patch.status === "published" && current.status !== "published") {
            patch.publishedAt = new Date().toISOString();
          }
        }

        db[col][idx] = Object.assign({}, current, patch);
        if (col === "posts") {
          db[col][idx].updatedAt = new Date().toISOString();
          if (db[col][idx].status === "published" && !db[col][idx].publishedAt) db[col][idx].publishedAt = db[col][idx].updatedAt;
        }
        if (col === "projects") db[col][idx].updatedAt = new Date().toISOString();
        saveDB();
        return sendJSON(res, 200, db[col][idx]);
      }
      if (method === "DELETE") {
        const label = col === "posts" ? "post" : col === "projects" ? "project" : col === "experiences" ? "experience" : "skill category";
        logActivity("Deleted " + label + (current.title ? ": " + current.title : current.category ? ": " + current.category : current.position ? ": " + current.position : ""));
        db[col].splice(idx, 1);
        saveDB();
        return sendJSON(res, 200, { ok: true });
      }
    }
  }

  /* ----- messages ----- */

  if (pathname === "/api/admin/messages" && method === "GET") {
    return sendJSON(res, 200, db.messages);
  }
  if ((m = pathname.match(/^\/api\/admin\/messages\/([\w-]+)\/read$/)) && method === "PUT") {
    const msg = db.messages.find((x) => x.id === m[1]);
    if (msg) { msg.read = true; saveDB(); }
    return sendJSON(res, 200, { ok: true });
  }
  if ((m = pathname.match(/^\/api\/admin\/messages\/([\w-]+)$/)) && method === "DELETE") {
    db.messages = db.messages.filter((x) => x.id !== m[1]);
    saveDB();
    return sendJSON(res, 200, { ok: true });
  }

  /* ----- activity feed ----- */

  if (pathname === "/api/admin/activity" && method === "GET") {
    return sendJSON(res, 200, db.activity || []);
  }

  /* ----- blog categories ----- */

  if (pathname === "/api/admin/categories" && method === "GET") {
    return sendJSON(res, 200, db.blogCategories || []);
  }
  if (pathname === "/api/admin/categories" && method === "POST") {
    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 40);
    if (!name) return sendJSON(res, 400, { error: "Category name is required." });
    if (db.blogCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      return sendJSON(res, 400, { error: "That category already exists." });
    }
    db.blogCategories.push(name);
    logActivity("Added blog category: " + name);
    saveDB();
    return sendJSON(res, 200, db.blogCategories);
  }
  if ((m = pathname.match(/^\/api\/admin\/categories\/([\w-]+)$/)) && (method === "PUT" || method === "DELETE")) {
    const idx = db.blogCategories.findIndex((c) => String(c).toLowerCase() === decodeURIComponent(m[1]).toLowerCase());
    if (idx === -1) return sendJSON(res, 404, { error: "Category not found" });
    if (method === "PUT") {
      const b = await readBody(req);
      const name = String(b.name || "").trim().slice(0, 40);
      if (!name) return sendJSON(res, 400, { error: "Category name is required." });
      db.blogCategories[idx] = name;
    } else {
      const removed = db.blogCategories.splice(idx, 1)[0];
      logActivity("Deleted blog category: " + removed);
    }
    saveDB();
    return sendJSON(res, 200, db.blogCategories);
  }

  /* ----- resume / CV ----- */

  if (pathname === "/api/admin/resume" && method === "GET") {
    return sendJSON(res, 200, db.resume || null);
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
    fs.writeFileSync(path.join(UPLOAD_DIR, "resume.pdf"), buf);
    db.resume = {
      filename: String(b.filename || "resume.pdf").replace(/[^\w.\- ()]/g, "").trim().slice(0, 80) || "resume.pdf",
      url: "/uploads/resume.pdf",
      uploadedAt: new Date().toISOString()
    };
    logActivity("Updated resume / CV");
    saveDB();
    return sendJSON(res, 200, db.resume);
  }
  if (pathname === "/api/admin/resume" && method === "DELETE") {
    const p = path.join(UPLOAD_DIR, "resume.pdf");
    if (fs.existsSync(p)) fs.unlinkSync(p);
    db.resume = null;
    logActivity("Removed resume / CV");
    saveDB();
    return sendJSON(res, 200, { ok: true });
  }

  /* ----- media ----- */

  if (pathname === "/api/admin/media" && method === "GET") {
    return sendJSON(res, 200, listMedia());
  }
  if (pathname === "/api/admin/media" && method === "POST") {
    const b = await readBody(req);
    if (Array.isArray(b.images)) {
      const saved = [];
      for (const img of b.images.slice(0, 12)) saved.push(saveUpload(img.data, img.name));
      logActivity("Uploaded " + saved.length + " image" + (saved.length === 1 ? "" : "s"));
      saveDB();
      return sendJSON(res, 200, saved);
    }
    const saved = saveUpload(b.data, b.name);
    logActivity("Uploaded image: " + saved.name);
    saveDB();
    return sendJSON(res, 200, [saved]);
  }
  /* replace an existing image in place — same URL keeps working everywhere */
  if (pathname === "/api/admin/media/replace" && method === "PUT") {
    const b = await readBody(req);
    const targetName = path.basename(String(b.name || ""));
    const targetPath = path.join(UPLOAD_DIR, targetName);
    if (!fs.existsSync(targetPath)) return sendJSON(res, 404, { error: "Original image not found." });
    const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(b.data || "");
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
    logActivity("Replaced image: " + targetName);
    saveDB();
    return sendJSON(res, 200, { ok: true, url: "/uploads/" + encodeURIComponent(targetName) });
  }
  if ((m = pathname.match(/^\/api\/admin\/media\/(.+)$/)) && method === "DELETE") {
    const name = path.basename(decodeURIComponent(m[1]));
    const full = path.join(UPLOAD_DIR, name);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return sendJSON(res, 200, { ok: true });
  }

  /* ----- sections ----- */

  if (pathname === "/api/admin/sections" && method === "GET") {
    return sendJSON(res, 200, db.sections);
  }
  if (pathname === "/api/admin/sections" && method === "PUT") {
    const b = await readBody(req);
    if (b.enabled) db.sections.enabled = Object.assign({}, db.sections.enabled, b.enabled);
    if (Array.isArray(b.order)) db.sections.order = b.order;
    saveDB();
    return sendJSON(res, 200, db.sections);
  }

  return sendJSON(res, 404, { error: "Unknown API endpoint" });
}

/* ---------------- Static files ---------------- */

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/" ) rel = "/index.html";
  if (rel === "/admin" || rel === "/admin/") rel = "/admin/index.html";

  let baseDir = PUBLIC_DIR;
  if (rel.startsWith("/uploads/")) {
    baseDir = UPLOAD_DIR;
    rel = rel.slice("/uploads".length);
  } else if (rel.startsWith("/admin/")) {
    rel = rel; // inside public/admin/
  }

  const full = path.normalize(path.join(baseDir, rel));
  if (!full.startsWith(path.normalize(baseDir))) {
    res.writeHead(403); return res.end("Forbidden");
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      // friendly fallback for unknown non-file paths
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

/* ---------------- Server ---------------- */

init();

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
  if (!db.config.passwordChanged) {
    console.log("   Login       :  admin / admin123  (change it!)");
  }
  console.log("  ──────────────────────────────────────────────");
  console.log("");
});
