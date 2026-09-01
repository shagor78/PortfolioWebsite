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
/* Allow large bodies for video uploads (base64 inflates ~1.37x). */
const MAX_BODY = 400 * 1024 * 1024; // 400 MB request cap (accommodates ~256MB videos)
const MAX_VIDEO = 256 * 1024 * 1024; // 256 MB actual video file cap

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
    },
    education: [],
    navigation: [
      { id: uid(), key: "projects", label: "Projects", url: "#/projects", icon: "", newTab: false, order: 0, enabled: true },
      { id: uid(), key: "experience", label: "Job Experience", url: "#/experience", icon: "", newTab: false, order: 1, enabled: true },
      { id: uid(), key: "education", label: "Education", url: "#/education", icon: "", newTab: false, order: 2, enabled: true },
      { id: uid(), key: "about", label: "About", url: "#/about", icon: "", newTab: false, order: 3, enabled: true },
      { id: uid(), key: "blog", label: "Blog", url: "#/blog", icon: "", newTab: false, order: 4, enabled: true }
    ],
    settings: {
      theme: "dark"
    },
    views: {
      total: 0,
      today: 0,
      week: 0,
      month: 0,
      lastDate: now.slice(0, 10),
      lastWeek: now.slice(0, 10),
      lastMonth: now.slice(0, 10)
    },
    visitors: []
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

/* keep only permanent image references (never blob:/data: browser temporaries) */
function cleanImages(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter((u) => typeof u === "string" && /^(\/uploads\/|https?:\/\/)/i.test(u))
    .slice(0, 24);
}

/* ---------------- Education model ----------------
   A single, unified education collection lives at db.education.
   Legacy data was previously stored inside db.about.education with a
   different field shape; migrateEducation() maps it safely into the new
   structure without losing any existing records.                               */

function defaultEducation() {
  return {
    id: uid(),
    level: "University",
    institution: "",
    institutionType: "",
    degree: "",
    program: "",
    subject: "",
    department: "",
    startYear: "",
    endYear: "",
    currentStudying: false,
    gpa: "",
    gpaScale: "",
    cgpa: "",
    cgpaScale: "",
    resultType: "",
    result: "",
    resultScale: "",
    showResult: false,
    description: "",
    location: "",
    website: "",
    logo: "",
    status: "published",
    order: 0
  };
}

/* Convert one education object (legacy or new) into a fully-normalised record. */
function normalizeEducation(raw, idx) {
  const base = defaultEducation();
  const o = raw || {};
  const years = String(o.years || "").trim();
  let sy = o.startYear || "", ey = o.endYear || "";
  if (!sy && years) {
    const mm = years.match(/(\d{4})\s*[–—-]\s*(\d{4})|(\d{4})\s*[–—-]\s*(Pr|Cur|Ong|Now|Pres)/i);
    if (mm) { sy = mm[1] || ""; ey = mm[2] || mm[4] || (/\d{4}.*(Pr|Cur|Ong|Now|Pres)/i.test(years) ? "Present" : ""); }
    else if (/^\d{4}$/.test(years)) sy = years;
  }
  const cur = o.currentStudying === true ||
    o.currentStudying === "true" ||
    /(pursu|current|ongoing|studying|Pr|Cur|Ong|Now|Pres)/i.test(String(o.status || ""));
  // pick explicit gpa/cgpa first, fall back to legacy resultType/result
  let gpa = String(o.gpa != null ? o.gpa : "").trim();
  let cgpa = String(o.cgpa != null ? o.cgpa : "").trim();
  let resultType = String(o.resultType || "").toLowerCase();
  if (!gpa && !cgpa && o.result) {
    if (resultType === "gpa") gpa = o.result;
    else if (resultType === "cgpa") cgpa = o.result;
  }
  return {
    id: o.id || base.id,
    level: String(o.level || base.level).trim(),
    institution: String(o.institution != null ? o.institution : "").trim(),
    institutionType: String(o.institutionType != null ? o.institutionType : "").trim(),
    degree: String(o.degree != null ? o.degree : (o.title || "")).trim(),
    program: String(o.program != null ? o.program : "").trim(),
    subject: String(o.subject != null ? o.subject : "").trim(),
    department: String(o.department != null ? o.department : "").trim(),
    startYear: String(sy).trim(),
    endYear: String(ey).trim(),
    currentStudying: !!cur,
    gpa: String(gpa).trim(),
    gpaScale: String(o.gpaScale != null ? o.gpaScale : (o.resultType === "gpa" ? o.resultScale : "")).trim(),
    cgpa: String(cgpa).trim(),
    cgpaScale: String(o.cgpaScale != null ? o.cgpaScale : (o.resultType === "cgpa" ? o.resultScale : "")).trim(),
    resultType: resultType,
    result: String(o.result != null ? o.result : "").trim(),
    resultScale: String(o.resultScale != null ? o.resultScale : "").trim(),
    showResult: o.showResult !== false && (!!gpa || !!cgpa),
    description: String(o.description != null ? o.description : "").trim(),
    location: String(o.location != null ? o.location : "").trim(),
    website: String(o.website != null ? o.website : "").trim(),
    logo: String(o.logo != null ? o.logo : "").trim().slice(0, 400),
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

/* Validate an optional GPA/CGPA field. Returns an error string, or null if OK. */
function scoreError(gpa, gpaScale, cgpa, cgpaScale) {
  function bad(v, scale) {
    if (v === undefined || v === null || String(v).trim() === "") {
      /* value empty is fine, but a dangling scale without a value is not */
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

/* Validate a navigation URL. Returns an error string, or null if OK. */
function navUrlError(url) {
  const u = String(url || "").trim();
  if (!u) return null; // empty url is allowed (falls back to #/key)
  if (u.startsWith("#") || u.startsWith("/") || u.startsWith("./") || u.startsWith("../")) return null;
  if (/^https?:\/\//i.test(u)) return null;
  if (/^mailto:/i.test(u)) return null;
  return "Invalid navigation URL. Use a route (#/blog), anchor (#contact), or a full http(s) URL.";
}

/* ---------------- Rich text (blog) sanitizer ----------------
   Allows only safe, whitelisted HTML that the public editor produces.
   Strips scripts, event handlers, javascript: URLs, inline styles except
   a controlled text-align, and unknown tags — protecting against XSS.   */

const SAFE_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s", "strike", "del", "a", "h1", "h2", "h3",
  "ul", "ol", "li", "blockquote", "code", "pre", "span", "div"
]);
const BLOCK_LEVEL = new Set(["p", "pre", "blockquote", "ul", "ol", "h1", "h2", "h3", "div"]);

function sanitizeHTML(html) {
  if (html == null) return "";
  let src = String(html);
  /* strip script/style blocks entirely */
  src = src.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  src = src.replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  /* normalize &nbsp; to regular space */
  src = src.replace(/&nbsp;/gi, " ");
  /* strip editor-specific attributes like class="isSelectedEnd", data-*, style on non-allowed tags */
  src = src.replace(/\s+class="[^"]*isSelectedEnd[^"]*"/gi, "");
  src = src.replace(/\s+data-[a-z-]+="[^"]*"/gi, "");
  src = src.replace(/\s+contenteditable="[^"]*"/gi, "");
  const out = [];
  /* single pass — match either a tag, a run of text, or a stray angle bracket.
     (The previous /[^<>]+/ loop matched tag *names* as text, silently dropping
      the "<"/">" of every tag. Matching tags explicitly fixes that.) */
  const re = /(<\/?[a-zA-Z][^>]*>)|([^<>]+)|([<>])/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) stripTag(m[1], out);
    else if (m[2]) out.push(escapeText(m[2]));
    else if (m[3]) out.push(" ");
  }
  let result = out.join("");
  /* collapse multiple spaces but preserve single spaces */
  result = result.replace(/ {2,}/g, " ");
  /* strip leading/trailing whitespace in paragraphs */
  result = result.replace(/<p>\s+<\/p>/gi, "");
  /* strip empty paragraphs */
  result = result.replace(/<p><\/p>/gi, "");
  return result.trim();
}

function stripTag(raw, out) {
  for (const m of raw.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g)) {
    const tag = m[1].toLowerCase();
    const isClose = m[0].startsWith("</");
    if (!SAFE_TAGS.has(tag)) continue; // drop unknown tags
    if (isClose) { out.push("</" + tag + ">"); continue; }
    const attrs = parseAttrs(m[2] || "");
    /* only allow href on <a>, and only safe http(s)/mailto/# links */
    if (tag === "a") {
      const href = (attrs.href || "").trim();
      const safeHref = /^(https?:)?\/\/|^mailto:|^#|^\/|^\.?\//i.test(href) && !/javascript:/i.test(href) ? href : null;
      if (!safeHref) { out.push("<a>"); continue; }
      /* emit exactly one target/rel so re-sanitizing is stable (idempotent) */
      const target = attrs.target === "_blank" ? ' target="_blank"' : ' target="_blank"';
      out.push('<a href="' + escapeAttr(safeHref) + '"' + target + ' rel="noopener nofollow">');
      continue;
    }
    if (tag === "span" || tag === "div" || tag === "p") {
      /* allow text-align on block/span via style */
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
  /* Idempotent text escaping: first decode any already-encoded entities back to
     their literal characters, then re-encode exactly once. This guarantees the
     output is stable no matter how many times sanitizeHTML runs (e.g. on each
     editor save or server restart), preventing "&amp;amp;" style corruption. */
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

/* Detect whether a stored post body looks like rich HTML (vs legacy plain text). */
function looksLikeHTML(s) {
  return /<(p|br|ul|ol|h[123]|blockquote|div|li|strong|b|em|i|a)[\s>]/i.test(s || "");
}

function logActivity(text) {
  db.activity = db.activity || [];
  db.activity.unshift({ id: uid(), text: String(text).slice(0, 200), date: new Date().toISOString() });
  if (db.activity.length > 40) db.activity.length = 40;
}

/* ---------------- View / visitor counter ----------------
   A "view" is recorded once per visitor per rolling hour window. The client
   generates a stable anonymous visitor id (kept in localStorage) and sends it
   along with the server IP as a fallback, so simple refresh spam does not
   inflate the count. Daily/weekly/monthly aggregates roll with the calendar. */

function rollViewCounters(nowIso) {
  const today = nowIso.slice(0, 10);
  const month = nowIso.slice(0, 7);
  const week = mondayKey(nowIso);
  const v = db.views;
  if (v.lastDate !== today) { v.today = 0; v.lastDate = today; }
  if (v.lastMonth !== month) { v.month = 0; v.lastMonth = month; }
  if (v.lastWeek !== week) { v.week = 0; v.lastWeek = week; }
}

function recordView(visitorId, ip) {
  db.views = db.views || {};
  db.visitors = Array.isArray(db.visitors) ? db.visitors : [];
  const now = new Date();
  const nowIso = now.toISOString();
  rollViewCounters(nowIso);

  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const key = String(visitorId || "").slice(0, 64) || ("ip:" + String(ip || ""));
  /* find an existing recent record for this visitor + ip combo */
  let rec = db.visitors.find((x) => x.k === key);
  if (rec && rec.t > hourAgo) return false; // duplicate within the hour → not a new view
  if (rec) rec.t = now.getTime();
  else {
    db.visitors.push({ k: key, t: now.getTime() });
    if (db.visitors.length > 4000) db.visitors = db.visitors.slice(-4000);
  }
  db.views.total = (db.views.total || 0) + 1;
  db.views.today = (db.views.today || 0) + 1;
  db.views.week = (db.views.week || 0) + 1;
  db.views.month = (db.views.month || 0) + 1;
  return true;
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
    if (!p.slug && p.title) { p.slug = slugify(p.title, db.posts.filter((x) => x !== p && x.slug)); migrated = true; }
    /* re-sanitize existing content so editor markup / class artifacts never leak to visitors */
    if (p.text !== undefined) {
      const clean = sanitizeHTML(p.text);
      if (clean !== p.text) { p.text = clean; migrated = true; }
    }
  });
  (db.projects || []).forEach((p) => {
    const cleaned = cleanImages(p.images);
    if (JSON.stringify(cleaned) !== JSON.stringify(p.images)) { p.images = cleaned; migrated = true; }
  });
  if (!Array.isArray(db.blogCategories)) { db.blogCategories = ["Life", "Learning", "Technology", "Career", "Travel"]; migrated = true; }
  if (!Array.isArray(db.activity)) { db.activity = []; migrated = true; }
  if (db.resume === undefined) { db.resume = null; migrated = true; }

  /* ---- views / visitor counter migration ---- */
  const todayIso = nowIso.slice(0, 10);
  if (!db.views) {
    db.views = {
      total: 0, today: 0, week: 0, month: 0,
      lastDate: todayIso, lastWeek: todayIso, lastMonth: todayIso
    };
    migrated = true;
  }
  if (!Array.isArray(db.visitors)) { db.visitors = []; migrated = true; }
  /* roll over daily/weekly/monthly counters if the day/week/month has changed */
  if (db.views.lastDate !== todayIso) { db.views.today = 0; db.views.lastDate = todayIso; migrated = true; }
  const weekKey = mondayKey(nowIso);
  if (db.views.lastWeek !== weekKey) { db.views.week = 0; db.views.lastWeek = weekKey; migrated = true; }
  const monthKey = nowIso.slice(0, 7);
  if (db.views.lastMonth !== monthKey) { db.views.month = 0; db.views.lastMonth = monthKey; migrated = true; }

  ((db.about && db.about.education) || []).forEach((ed) => {
    if (ed.resultType === undefined) { ed.resultType = ""; migrated = true; }
    if (ed.result === undefined) { ed.result = ""; migrated = true; }
    if (ed.resultScale === undefined) { ed.resultScale = ""; migrated = true; }
    if (ed.showResult === undefined) { ed.showResult = true; migrated = true; }
  });
  (db.projects || []).forEach((p) => {
    if (p.links === undefined) { p.links = {}; migrated = true; }
    if (p.videoEnabled === undefined) { p.videoEnabled = !!(p.video || p.videoUrl); migrated = true; }
  });

  /* ---- education migration: unify into a single db.education collection ----
     Previously education lived inside db.about.education. We keep it as the
     single source of truth at db.education, migrating old records safely.    */
  if (!Array.isArray(db.education)) {
    let legacy = ((db.about && db.about.education) || []);
    db.education = legacy.map((ed, i) => normalizeEducation(ed, i));
    (db.education || []).forEach((ed, i) => (ed.order = i));
    migrated = true;
  } else {
    db.education.forEach((ed, i) => { ed.order = i; });
  }

  /* ---- navigation migration: seed CMS nav items from the previous defaults ----
     Preserves existing order/enabled via db.sections when available.           */
  if (!Array.isArray(db.navigation) ) {
    const navDefault = [
      { key: "projects", label: "Projects", url: "#/projects" },
      { key: "experience", label: "Job Experience", url: "#/experience" },
      { key: "education", label: "Education", url: "#/education" },
      { key: "about", label: "About", url: "#/about" },
      { key: "blog", label: "Blog", url: "#/blog" }
    ];
    const enabled = (db.sections && db.sections.enabled) || {};
    db.navigation = navDefault.map((n, i) =>
      normalizeNavigation({
        key: n.key, label: n.label, url: n.url,
        enabled: enabled[n.key] !== false
      }, i)
    );
    migrated = true;
  } else {
    db.navigation.forEach((n, i) => { n.order = i; n.enabled = n.enabled !== false; });
  }

  /* ---- settings / theme migration ---- */
  if (!db.settings || typeof db.settings !== "object") { db.settings = { theme: "dark" }; migrated = true; }
  if (!["dark", "light", "system"].includes(db.settings.theme)) { db.settings.theme = "dark"; migrated = true; }

  if (migrated || !fs.existsSync(DB_PATH)) saveDB();
}

/* returns the Monday (start-of-week) date string for a given ISO date */
function mondayKey(iso) {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
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
        id: p.id, slug: p.slug, title: p.title, text: p.text, location: p.location, date: p.date,
        category: p.category, tags: p.tags || [], images: p.images || [],
        likes: p.likes || 0, comments: p.comments || []
      })),
    sections: db.sections,
    education: (db.education || [])
      .filter((e) => e.status !== "draft")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    navigation: (db.navigation || []).filter((n) => n.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    settings: db.settings || { theme: "dark" },
    views: db.views || { total: 0, today: 0, week: 0, month: 0 }
  };
}

/* ---------------- Media ---------------- */

function listMedia() {
  const items = [];
  try {
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      const ext = path.extname(f).toLowerCase();
      const isImage = IMAGE_EXT.includes(ext);
      const isVideo = VIDEO_EXT.includes(ext);
      if (!isImage && !isVideo) continue;
      const st = fs.statSync(path.join(UPLOAD_DIR, f));
      items.push({
        name: f,
        url: "/uploads/" + encodeURIComponent(f),
        size: st.size,
        mtime: st.mtimeMs,
        type: isImage ? "image" : "video",
        mime: isImage ? (MIME[ext] || "application/octet-stream") : (VIDEO_MIME[ext] || "video/mp4")
      });
    }
  } catch (e) { /* ignore */ }
  return items.sort((a, b) => b.mtime - a.mtime);
}

function saveUpload(dataField, originalName) {
  const match = /^data:(image\/[a-zA-Z0-9+.\-]+);base64,(.+)$/.exec(dataField || "");
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

/* Video upload via base64 data URL. Validates MIME + magic bytes + size. */
function saveVideoUpload(dataField, originalName) {
  const mimeMatch = /^data:(video\/[a-zA-Z0-9+.\-]+);base64,(.+)$/.exec(dataField || "");
  if (!mimeMatch) throw new Error("Invalid video data (expected base64 data URL)");
  const mime = mimeMatch[1].toLowerCase();
  const extMap = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };
  const ext = extMap[mime];
  if (!ext) throw new Error("Unsupported video type. Use MP4, WebM or MOV.");
  const buf = Buffer.from(mimeMatch[2], "base64");
  if (buf.length > MAX_VIDEO) throw new Error("Video too large (max 256MB).");
  /* magic-byte validation to reject disguised files */
  const magics = { ".mp4": buf.slice(4, 8).toString("latin1") === "ftyp", ".mov": buf.slice(4, 8).toString("latin1") === "ftyp" }; /* webm EBML magic 1A45DFA3 */
  if (ext === ".mp4" && buf.length > 8 && !magics[".mp4"]) throw new Error("That file is not a valid MP4 video.");
  if (ext === ".mov" && buf.length > 8 && !magics[".mov"]) throw new Error("That file is not a valid MOV video.");
  if (ext === ".webm" && buf.length > 4 && !(buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3)) {
    throw new Error("That file is not a valid WebM video.");
  }
  const safeBase = (originalName || "video").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 40) || "video";
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

  /* record a portfolio view — deduplicated per visitor per hour */
  if (method === "POST" && pathname === "/api/view") {
    const b = await readBody(req);
    const ip = req.socket.remoteAddress || "";
    const newView = recordView(b.visitorId, ip);
    const v = db.views;
    sendJSON(res, 200, { ok: true, newView, views: { total: v.total, today: v.today, week: v.week, month: v.month } });
    if (newView) saveDB();
    return;
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
      drafts: db.posts.filter((p) => p.status === "draft").length,
      education: (db.education ? db.education : []).length,
      media: listMedia().length,
      images: listMedia().filter((m) => m.type === "image").length,
      videos: listMedia().filter((m) => m.type === "video").length,
      views: db.views || { total: 0, today: 0, week: 0, month: 0 },
      visitors: Array.isArray(db.visitors) ? db.visitors.length : 0
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
    return sendJSON(res, 200, Object.assign({}, db.about, { educationHistory: db.about.education || [] }));
  }
  if (pathname === "/api/admin/about" && method === "PUT") {
    const b = await readBody(req);
    /* note: education is managed by the dedicated /api/admin/education endpoints */
    const allowed = ["intro", "belief", "focus", "images", "lifeTitle", "lifeItems", "certifications",
      "name", "title", "headline", "shortDescription", "description", "detailedDescription",
      "careerSummary", "location", "availability", "experienceSummary", "yearsOfExperience",
      "profileImage", "videoUrl", "videoTitle", "videoDescription", "videoEnabled", "videoThumbnail",
      "profileVideo", "profileMediaType"];
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

  /* ----- education management ----- */
  {
    const base = "/api/admin/education";
    if (pathname === base && method === "GET") {
      return sendJSON(res, 200, (db.education || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }
    if (pathname === base && method === "POST") {
      const b = await readBody(req);
      const scoreErr = scoreError(b.gpa, b.gpaScale, b.cgpa, b.cgpaScale);
      if (scoreErr) return sendJSON(res, 400, { error: scoreErr });
      if (!String(b.institution || "").trim() && !String(b.degree || "").trim()) {
        return sendJSON(res, 400, { error: "Institution or degree is required." });
      }
      const item = normalizeEducation(b, db.education.length);
      item.id = uid();
      item.order = db.education.length;
      item.status = b.status === "draft" ? "draft" : "published";
      db.education.push(item);
      logActivity("Added education: " + (String(item.degree || item.institution || "record").slice(0, 60)));
      saveDB();
      return sendJSON(res, 200, item);
    }
    if (pathname === base + "/order" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      db.education.sort((a, c) => {
        const ia = ids.indexOf(a.id), ib = ids.indexOf(c.id);
        return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
      });
      db.education.forEach((x, i) => (x.order = i));
      saveDB();
      return sendJSON(res, 200, { ok: true });
    }
    if (pathname === base + "/reorder" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      db.education.sort((a, c) => {
        const ia = ids.indexOf(a.id), ib = ids.indexOf(c.id);
        return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
      });
      db.education.forEach((x, i) => (x.order = i));
      saveDB();
      return sendJSON(res, 200, { ok: true });
    }
    const em = pathname.match(/^\/api\/admin\/education\/([\w-]+)$/);
    if (em) {
      const idx = (db.education || []).findIndex((x) => x.id === em[1]);
      if (idx === -1) return sendJSON(res, 404, { error: "Education record not found" });
      if (method === "PUT") {
        const patch = await readBody(req);
        const next = Object.assign({}, db.education[idx], patch);
        const scoreErr = scoreError(patch.gpa !== undefined ? patch.gpa : next.gpa,
          patch.gpaScale !== undefined ? patch.gpaScale : next.gpaScale,
          patch.cgpa !== undefined ? patch.cgpa : next.cgpa,
          patch.cgpaScale !== undefined ? patch.cgpaScale : next.cgpaScale);
        if (scoreErr) return sendJSON(res, 400, { error: scoreErr });
        const merged = normalizeEducation(next, idx);
        merged.id = db.education[idx].id;
        if (patch.order !== undefined && Number.isInteger(patch.order)) merged.order = patch.order;
        db.education[idx] = merged;
        saveDB();
        return sendJSON(res, 200, db.education[idx]);
      }
      if (method === "DELETE") {
        db.education.splice(idx, 1);
        db.education.forEach((x, i) => (x.order = i));
        saveDB();
        return sendJSON(res, 200, { ok: true });
      }
    }
  }

  /* ----- navigation / navbar management ----- */
  {
    const base = "/api/admin/navigation";
    if (pathname === base && method === "GET") {
      return sendJSON(res, 200, (db.navigation || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }
    if (pathname === base && method === "POST") {
      const b = await readBody(req);
      const uerr = navUrlError(b.url);
      if (uerr) return sendJSON(res, 400, { error: uerr });
      if (!String(b.label || "").trim()) return sendJSON(res, 400, { error: "Menu label is required." });
      const item = normalizeNavigation(b, db.navigation.length);
      item.id = uid();
      item.order = db.navigation.length;
      db.navigation.push(item);
      logActivity("Added nav item: " + (item.label || ""));
      saveDB();
      return sendJSON(res, 200, item);
    }
    if (pathname === base + "/order" && method === "PUT") {
      const b = await readBody(req);
      const ids = b.ids || [];
      db.navigation.sort((a, c) => {
        const ia = ids.indexOf(a.id), ib = ids.indexOf(c.id);
        return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
      });
      db.navigation.forEach((x, i) => (x.order = i));
      saveDB();
      return sendJSON(res, 200, { ok: true });
    }
    const nm = pathname.match(/^\/api\/admin\/navigation\/([\w-]+)$/);
    if (nm) {
      const idx = (db.navigation || []).findIndex((x) => x.id === nm[1]);
      if (idx === -1) return sendJSON(res, 404, { error: "Navigation item not found" });
      if (method === "PUT") {
        const patch = await readBody(req);
        const nextUrl = patch.url !== undefined ? patch.url : db.navigation[idx].url;
        const uerr = navUrlError(nextUrl);
        if (uerr) return sendJSON(res, 400, { error: uerr });
        const merged = normalizeNavigation(Object.assign({}, db.navigation[idx], patch), idx);
        merged.id = db.navigation[idx].id;
        if (patch.order !== undefined && Number.isInteger(patch.order)) merged.order = patch.order;
        db.navigation[idx] = merged;
        db.navigation.forEach((x, i) => { x.order = i; });
        saveDB();
        return sendJSON(res, 200, db.navigation[idx]);
      }
      if (method === "DELETE") {
        db.navigation.splice(idx, 1);
        db.navigation.forEach((x, i) => (x.order = i));
        saveDB();
        return sendJSON(res, 200, { ok: true });
      }
    }
  }

  /* ----- settings / appearance (theme) ----- */
  if (pathname === "/api/admin/settings" && method === "GET") {
    return sendJSON(res, 200, db.settings || { theme: "dark" });
  }
  if (pathname === "/api/admin/settings" && method === "PUT") {
    const b = await readBody(req);
    if (!["dark", "light", "system"].includes(b.theme)) {
      return sendJSON(res, 400, { error: "Theme must be one of: dark, light, system." });
    }
    db.settings = db.settings || {};
    db.settings.theme = b.theme;
    logActivity("Theme set to " + b.theme);
    saveDB();
    return sendJSON(res, 200, db.settings);
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
        if (item.text !== undefined) item.text = sanitizeHTML(item.text);
        item.status = item.status === "published" ? "published" : "draft";
        if (item.status === "published" && !String(item.title || "").trim()) {
          return sendJSON(res, 400, { error: "A title is required to publish." });
        }
        item.likes = 0;
        item.comments = [];
        item.slug = slugify(item.title, db.posts.map((x) => x.slug));
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
          if (patch.text !== undefined) patch.text = sanitizeHTML(patch.text);
          if (patch.title !== undefined && String(patch.title).trim()) {
            if (patch.slug === undefined || patch.slug === "") {
              patch.slug = slugify(patch.title, db.posts.filter((x) => x.id !== current.id).map((x) => x.slug));
            }
          }
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
  if (pathname === "/api/admin/resume/url" && method === "PUT") {
    const b = await readBody(req);
    const url = String(b.url || "").trim().slice(0, 500);
    if (!/^https?:\/\//i.test(url)) return sendJSON(res, 400, { error: "Resume URL must start with http(s)://" });
    db.resume = {
      filename: "External Resume",
      url: url,
      uploadedAt: (db.resume && db.resume.uploadedAt) || new Date().toISOString()
    };
    logActivity("Set external resume URL");
    saveDB();
    return sendJSON(res, 200, db.resume);
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
    if (b.kind === "video") {
      const saved = saveVideoUpload(b.data, b.name);
      logActivity("Uploaded video: " + saved.name);
      saveDB();
      return sendJSON(res, 200, [saved]);
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
