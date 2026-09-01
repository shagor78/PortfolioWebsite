/* Public website renderer — pulls everything from the API */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = null;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }
  function el(id) { return document.getElementById(id); }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  /* YouTube detection + embed for project / about video URLs */
  function isYouTube(u) {
    return /(^|\.)youtube\.com|youtu\.be/i.test(u || "");
  }
  function youtubeEmbed(u) {
    var m = String(u || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/i);
    return m ? "https://www.youtube.com/embed/" + m[1] + "?rel=0" : "";
  }

  /* Detect whether post content is rich HTML (produced by the admin editor) or legacy plain text. */
  function isRichText(s) {
    return /<(p|br|ul|ol|h[123]|blockquote|div|li|strong|b|em|i|u|a|pre|code)[\s>]/i.test(s || "");
  }

  /* Render post body for the public feed. Rich HTML is shown as-is (server-sanitised,
     so it is safe). Legacy plain text is escaped and wrapped into paragraphs so line
     breaks / bullet glyphs survive. */
  function renderRich(s) {
    var t = s == null ? "" : String(s);
    if (!t.trim()) return "";
    if (isRichText(t)) {
      return '<div class="post-richtext">' + t + "</div>";
    }
    var paras = t.split(/\n{2,}/);
    var out = '<div class="post-richtext">';
    paras.forEach(function (block) {
      block = block.trim();
      if (!block) return;
      if (/^[-*•]\s/m.test(block)) {
        var items = block.split(/\n/).map(function (l) { return l.replace(/^[-*•]\s*/, ""); }).filter(Boolean);
        out += "<ul>" + items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
      } else if (/^\d+[.)]\s/.test(block)) {
        var oi = block.split(/\n/).map(function (l) { return l.replace(/^\d+[.)]\s*/, ""); }).filter(Boolean);
        out += "<ol>" + oi.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ol>";
      } else {
        out += "<p>" + block.replace(/\n/g, "<br />") + "</p>";
      }
    });
    out += "</div>";
    return out;
  }

  /* ---------- section builders ---------- */

  function heroSection() {
    var h = C.home;
    var skills = (h.skills || []).map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("");
    var visual;
    if (h.heroImage) {
      visual = '<div class="hero-photo" data-reveal data-delay="150"><img src="' + esc(h.heroImage) + '" alt="' + esc(h.name) + '" /></div>';
    } else {
      visual =
        '<div class="hero-visual" data-reveal data-delay="150" aria-hidden="true">' +
          '<svg class="net-lines" viewBox="0 0 600 520" preserveAspectRatio="none">' +
            '<path class="net-path" d="M90 70 C 180 110, 220 140, 300 190"/>' +
            '<path class="net-path" d="M520 90 C 450 130, 380 160, 310 200"/>' +
            '<path class="net-path" d="M540 400 C 460 370, 400 340, 320 300"/>' +
            '<path class="net-path" d="M70 420 C 160 390, 230 350, 290 310"/>' +
            '<path class="net-path" d="M300 190 L 300 300"/>' +
          "</svg>" +
          '<div class="terminal"><div class="terminal-head"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span class="terminal-title">shagor@infra:~</span></div>' +
          '<div class="terminal-body" id="terminal-body"></div></div>' +
          '<div class="node-chip nc-aws"><svg class="ic"><use href="#i-cloud"/></svg><div><strong>AWS</strong><small>cloud infrastructure</small></div></div>' +
          '<div class="node-chip nc-docker"><svg class="ic"><use href="#i-box"/></svg><div><strong>Docker</strong><small>containers</small></div></div>' +
          '<div class="node-chip nc-k8s"><svg class="ic"><use href="#i-server"/></svg><div><strong>Kubernetes</strong><small>orchestration</small></div></div>' +
          '<div class="node-chip nc-cicd"><svg class="ic"><use href="#i-zap"/></svg><div><strong>CI/CD</strong><small>pipeline</small></div></div>' +
        "</div>";
    }
    return (
      '<section id="hero" class="hero">' +
        '<div class="hero-bg" aria-hidden="true"></div>' +
        '<div class="container hero-grid">' +
          '<div class="hero-content" data-reveal>' +
            '<div class="status-pill"><span class="pulse-dot"></span>' + esc(h.currentPosition) + "</div>" +
            '<h1 class="hero-title">Hi, I\'m <span class="grad-text">' + esc(h.name) + "</span></h1>" +
            '<p class="hero-role">' + esc(h.title) + "</p>" +
            '<p class="hero-sub">' + esc(h.subtitle) + "</p>" +
            '<p class="hero-desc">' + esc(h.description) + "</p>" +
            (skills ? '<div class="home-skills">' + skills + "</div>" : "") +
            '<div class="hero-btns">' +
              '<a href="' + esc(h.primaryBtn.href) + '" class="btn btn-primary">' + esc(h.primaryBtn.label) + ' <svg class="ic"><use href="#i-arrow-r"/></svg></a>' +
              (h.secondaryBtn && h.secondaryBtn.label ? '<a href="' + esc(h.secondaryBtn.href) + '" class="btn btn-outline">' + esc(h.secondaryBtn.label) + "</a>" : "") +
              (C.resume ? '<a href="' + esc(C.resume.url) + '" download class="btn btn-outline"><svg class="ic"><use href="#i-download"/></svg> Download Resume</a>' : "") +
            "</div>" +
          "</div>" + visual +
        "</div>" +
        '<a href="#experience" class="scroll-hint" aria-label="Scroll down"><svg class="ic"><use href="#i-chev-d"/></svg></a>' +
      "</section>"
    );
  }

  function experienceSection() {
    var cards = C.experiences.map(function (e, i) {
      var dur = e.startDate + " – " + (e.current ? "Present" : e.endDate);
      var tech = (e.tech || []).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
      var resp = (e.responsibilities || []).map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("");
      return (
        '<article class="experience-card glass' + (e.current ? " current" : "") + '" data-reveal style="--rd:' + i * 60 + 'ms">' +
          '<header class="exp-head">' +
            '<span class="exp-index">' + String(i + 1).padStart(2, "0") + "</span>" +
            '<div class="exp-meta"><h3>' + esc(e.position) + '</h3><p class="exp-company">' + esc(e.company) + '</p>' +
            '<p class="exp-duration"><svg class="ic"><use href="#i-calendar"/></svg> ' + esc(dur) + "</p></div>" +
            (e.current ? '<span class="badge-current"><span class="pulse-dot"></span> CURRENT</span>' : "") +
          "</header>" +
          '<p class="exp-summary">' + esc(e.summary) + "</p>" +
          (tech ? '<div class="exp-tech">' + tech + "</div>" : "") +
          '<button type="button" class="view-details-btn" data-details>View Details <svg class="ic"><use href="#i-chev-d"/></svg></button>' +
          '<div class="exp-details"><div class="exp-details-inner">' +
            (e.description ? "<h4>About this role</h4><p>" + esc(e.description) + "</p>" : "") +
            (resp ? "<h4>Responsibilities</h4><ul class=\"check-list\">" + resp + "</ul>" : "") +
          "</div></div>" +
        "</article>"
      );
    }).join("");

    return (
      '<section id="experience" class="section"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Career Timeline</p><h2 class="section-title">Job <span class="grad-text">Experience</span></h2>' +
        '<p class="section-sub">From network engineering to systems to cloud and DevOps.</p></header>' +
        (cards || emptyNote("No experience entries yet.")) +
      "</div></section>"
    );
  }

  function projectsSection() {
    var cards = C.projects.map(function (p, i) {
      var img = p.images && p.images.length
        ? '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy" />'
        : '<span class="project-media-fallback"><svg class="ic"><use href="#i-folder"/></svg></span>';
      var tech = (p.tech || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
      var linkKey = p.slug || p.id;
      return (
        '<a class="project-card glass project-link" href="#/project/' + esc(linkKey) + '" data-reveal style="--rd:' + (i % 3) * 70 + 'ms">' +
          '<div class="project-media">' + img +
            '<span class="project-media-more">View Case Study <svg class="ic"><use href="#i-arrow-r"/></svg></span>' +
          "</div>" +
          '<div class="project-body">' +
            "<h3>" + esc(p.title) + "</h3>" +
            "<p>" + esc(p.shortDesc || "") + "</p>" +
            (tech ? '<div class="project-tech">' + tech + "</div>" : "") +
          "</div>" +
        "</a>"
      );
    }).join("");

    var empty = '<div class="empty-state glass" data-reveal><svg class="ic"><use href="#i-folder"/></svg>' +
      "<h3>Projects coming soon</h3><p>Detailed project case studies will be published here soon.</p></div>";

    return (
      '<section id="projects" class="section alt-bg"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Work &amp; Builds</p><h2 class="section-title">Featured <span class="grad-text">Projects</span></h2>' +
        '<p class="section-sub">Real infrastructure and engineering work.</p></header>' +
        '<div class="projects-grid">' + (cards || empty) + "</div>" +
      "</div></section>"
    );
  }

  function aboutSection() {
    var a = C.about;
    var paras = (a.intro || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    var focus = (a.focus || "")
      ? '<div class="about-focus">' + a.focus.split("•").map(function (f) { return f.trim(); }).filter(Boolean).map(function (f) { return "<span>" + esc(f) + "</span>"; }).join("") + "</div>"
      : "";
    var imgs = (a.images || []).map(function (u) { return '<img src="' + esc(u) + '" alt="About photo" loading="lazy" />'; }).join("");
    var life = "";
    if ((a.lifeItems || []).length) {
      life = '<div class="life-section" data-reveal><h3 class="life-title">' + esc(a.lifeTitle || "When I'm Not Working") + "</h3>" +
        '<div class="interest-grid">' + a.lifeItems.map(function (it) {
          return '<article class="interest-card glass"><svg class="ic"><use href="#i-camera"/></svg><h4>' + esc(it.title || "") + "</h4><p>" + esc(it.text || "") + "</p></article>";
        }).join("") + "</div></div>";
    }
    var profile = "";
    if (a.profileImage) {
      var apFacts = "";
      if (a.location) apFacts += '<li><svg class="ic"><use href="#i-pin"/></svg><span>' + esc(a.location) + "</span></li>";
      if (a.availability) apFacts += '<li><svg class="ic"><use href="#i-check"/></svg><span>' + esc(a.availability) + "</span></li>";
      if (a.yearsOfExperience) apFacts += '<li><svg class="ic"><use href="#i-briefcase"/></svg><span>' + esc(a.yearsOfExperience) + " of experience</span></li>";
      profile = '<div class="about-profile" data-reveal>' +
        '<img class="about-profile-img" src="' + esc(a.profileImage) + '" alt="' + esc(a.name || "Profile") + '" loading="lazy" />' +
        '<div class="about-profile-meta">' +
          (a.name ? '<h3>' + esc(a.name) + "</h3>" : "") +
          (a.title ? '<p class="ap-role">' + esc(a.title) + "</p>" : "") +
          (apFacts ? '<ul class="about-profile-facts">' + apFacts + "</ul>" : "") +
        "</div></div>";
    }
    var extra = "";
    if (a.headline) extra += '<p class="about-lead">' + esc(a.headline) + "</p>";
    if (a.shortDescription) extra += "<p>" + esc(a.shortDescription) + "</p>";
    if (a.detailedDescription || a.description) extra += '<p class="about-more">' + esc(a.detailedDescription || a.description) + "</p>";
    if (a.careerSummary) extra += '<p class="about-more">' + esc(a.careerSummary) + "</p>";
    var expLine = a.experienceSummary ? '<p class="about-experience">' + esc(a.experienceSummary) + "</p>" : "";
    var video = "";
    if (a.videoEnabled && a.videoUrl) {
      video = '<div class="about-video" data-reveal>' +
        '<div class="av-frame">' + (isYouTube(a.videoUrl)
          ? '<iframe src="' + esc(youtubeEmbed(a.videoUrl)) + '" title="' + esc(a.videoTitle || "Introduction video") + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'
          : '<video src="' + esc(a.videoUrl) + '" controls playsinline' +
            (a.videoThumbnail ? ' poster="' + esc(a.videoThumbnail) + '"' : "") + '></video>') +
        "</div>" +
        (a.videoTitle ? '<h3 class="av-title">' + esc(a.videoTitle) + "</h3>" : "") +
        (a.videoDescription ? '<p class="av-desc">' + esc(a.videoDescription) + "</p>" : "") +
      "</div>";
    }
    return (
      '<section id="about" class="section"><div class="container">' +
        '<div class="about-grid">' +
          '<div class="about-side" data-reveal>' +
            '<p class="eyebrow">About Me</p><h2 class="section-title">More Than Just<br /><span class="grad-text">an Engineer</span></h2>' + focus + profile +
            (imgs ? '<div class="about-images">' + imgs + "</div>" : "") +
          "</div>" +
          '<div class="about-story" data-reveal data-delay="120">' + extra + paras +
            (a.belief ? '<p class="about-belief">' + esc(a.belief) + "</p>" : "") + expLine + life +
          "</div>" +
        "</div>" + video +
      "</div></section>"
    );
  }

  var SKILL_ICONS = {
    networking: "#i-network", linux: "#i-terminal", windows: "#i-monitor", virtualization: "#i-layers",
    cloud: "#i-cloud", devops: "#i-box", security: "#i-shield", tools: "#i-wrench"
  };

  function skillsSection() {
    var cards = C.skills.map(function (s, i) {
      var key = (s.category || "").toLowerCase();
      var chips = (s.items || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
      return '<article class="skill-card glass" data-reveal style="--rd:' + (i % 4) * 55 + 'ms">' +
        "<h3><svg class=\"ic\"><use href=\"" + (SKILL_ICONS[key] || "#i-zap") + "\"/></svg>" + esc(s.category) + "</h3>" +
        '<div class="skill-chips">' + chips + "</div></article>";
    }).join("");
    return (
      '<section id="skills" class="section alt-bg"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Technical Stack</p><h2 class="section-title">Skills &amp; <span class="grad-text">Technologies</span></h2></header>' +
        '<div class="skills-grid">' + cards + "</div>" +
      "</div></section>"
    );
  }

  function educationSection() {
    var src = (C.education && C.education.length ? C.education : (C.about.education || [])).slice();
    src = src.filter(function (e) { return e.status !== "draft"; });
    src.sort(function (a, b) { return (a.order ?? 0) - (b.order ?? 0) || String(a.startYear||"").localeCompare(String(b.startYear||"")); });
    var items = src.map(function (ed, i) {
      var ongoing = ed.currentStudying === true || /pursu|current|ongoing|studying/i.test(ed.status || "");
      var resLine = "";
      var legacyScale = ed.resultScale || ed.resultScaleGpa || ed.resultScaleCgpa || "4.00";
      /* support both legacy (resultType/result) and new explicit gpa/cgpa fields */
      if (ed.gpa && ed.gpa !== "0") {
        var gScale = ed.gpaScale || legacyScale;
        resLine += '<p class="edu-result"><span class="edu-res-label">GPA</span><strong>' + esc(ed.gpa) + "</strong>" +
          (gScale ? '<span class="edu-res-scale">/ ' + esc(gScale) + "</span>" : "") + "</p>";
      } else if (ed.showResult !== false && ed.resultType === "gpa" && ed.result) {
        resLine += '<p class="edu-result"><span class="edu-res-label">GPA</span><strong>' + esc(ed.result) + "</strong>" +
          (ed.resultScale ? '<span class="edu-res-scale">/ ' + esc(ed.resultScale) + "</span>" : "") + "</p>";
      }
      if (ed.cgpa && ed.cgpa !== "0") {
        var cScale = ed.cgpaScale || legacyScale;
        resLine += '<p class="edu-result"><span class="edu-res-label">CGPA</span><strong>' + esc(ed.cgpa) + "</strong>" +
          (cScale ? '<span class="edu-res-scale">/ ' + esc(cScale) + "</span>" : "") + "</p>";
      } else if (ed.showResult !== false && ed.resultType === "cgpa" && ed.result) {
        resLine += '<p class="edu-result"><span class="edu-res-label">CGPA</span><strong>' + esc(ed.result) + "</strong>" +
          (ed.resultScale ? '<span class="edu-res-scale">/ ' + esc(ed.resultScale) + "</span>" : "") + "</p>";
      }
      var levelBadge = ed.level ? '<span class="edu-level">' + esc(ed.level) + "</span>" : "";
      /* institution type e.g. University / Polytechnic Institute — shown subtly */
      var instType = ed.institutionType ? '<span class="edu-inst-type">' + esc(ed.institutionType) + "</span>" : "";
      var subInfo = "";
      if (ed.department || ed.subject) subInfo = '<p class="edu-sub">' + [ed.department, ed.subject].filter(Boolean).map(esc).join(" · ") + "</p>";
      var dateLine = "";
      if (ed.startYear || ed.endYear || ed.currentStudying) {
        var endD = ed.currentStudying ? "Present" : (ed.endYear || "");
        dateLine = '<p class="edu-dates"><svg class="ic"><use href="#i-calendar"/></svg> ' + esc(ed.startYear || "—") + " – " + esc(endD || "—") + "</p>";
      }
      var loc = ed.location ? '<p class="edu-loc"><svg class="ic"><use href="#i-pin"/></svg> ' + esc(ed.location) + "</p>" : "";
      var desc = ed.description ? "<p>" + esc(ed.description) + "</p>" : "";
      var website = ed.website ? '<a class="edu-link" href="' + esc(ed.website) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-ext"/></svg> Website</a>' : "";
      var degree = ed.degree || ed.program || "";
      /* status text: "published"/"draft" is a publish-state, not academic text */
      var statusText = "";
      if (ed.status === "published" || ed.status === "draft") {
        statusText = ongoing ? "Currently Studying" : "Completed";
      } else {
        statusText = ed.status || (ongoing ? "Currently Studying" : "Completed");
      }
      return '<article class="edu-item" data-reveal style="--rd:' + i * 80 + 'ms">' +
        '<div class="edu-icon"><svg class="ic"><use href="#i-cap"/></svg></div>' +
        '<div class="edu-card glass"><div class="edu-top">' +
          (ed.logo ? '<img class="edu-logo" src="' + esc(ed.logo) + '" alt="" loading="lazy" />' : "") +
          '<div class="edu-top-main">' + levelBadge + instType +
          '<span class="edu-status' + (ongoing ? "" : " done") + '">' + esc(statusText) + "</span></div></div>" +
          "<h3>" + (degree ? esc(degree) : "Untitled") + '</h3><p class="edu-inst">' + esc(ed.institution || "") + "</p>" +
          subInfo + dateLine + loc + resLine + desc + website +
        "</div></article>";
    }).join("");
    var empty = !items ? '<div class="empty-state glass"><svg class="ic"><use href="#i-folder"/></svg><h3>No education records yet</h3><p>Academic details will appear here once added from the admin panel.</p></div>' : "";
    return (
      '<section id="education" class="section"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Academic Background</p><h2 class="section-title">My <span class="grad-text">Education</span></h2></header>' +
        (items ? '<div class="edu-timeline">' + items + "</div>" : empty) +
      "</div></section>"
    );
  }

  function certsSection() {
    var cards = (C.about.certifications || []).map(function (ct, i) {
      return '<article class="cert-card glass" data-reveal style="--rd:' + (i % 3) * 60 + 'ms">' +
        '<svg class="ic cert-icon"><use href="' + (/certification/i.test(ct.type || "") ? "#i-award" : "#i-check-c") + '"/></svg>' +
        "<h3>" + esc(ct.name) + "</h3>" +
        (ct.code ? '<p class="cert-code">' + esc(ct.code) + "</p>" : "") +
        '<span class="cert-tag">' + esc(ct.type || "Credential") + "</span></article>";
    }).join("");
    return (
      '<section id="certifications" class="section alt-bg"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Credentials</p><h2 class="section-title">Certifications &amp; <span class="grad-text">Courses</span></h2></header>' +
        '<div class="certs-grid">' + cards + "</div>" +
      "</div></section>"
    );
  }

  /* ---------- Project Details (case study page) ---------- */

  function projectLinksHTML(p) {
    var keys = [
      { k: "github", label: "GitHub", icon: "#i-github" },
      { k: "live", label: "Live Demo", icon: "#i-ext" },
      { k: "demo", label: "Live Demo", icon: "#i-ext" },
      { k: "link", label: "Live Demo", icon: "#i-ext" },
      { k: "documentation", label: "Documentation", icon: "#i-file-text" },
      { k: "doc", label: "Documentation", icon: "#i-file-text" },
      { k: "facebook", label: "Facebook", icon: "#i-facebook" },
      { k: "youtube", label: "YouTube", icon: "#i-youtube" },
      { k: "linkedin", label: "LinkedIn", icon: "#i-linkedin" },
      { k: "other", label: "More Info", icon: "#i-ext" }
    ];
    function iconForLabel(label) {
      var l = String(label || "").toLowerCase();
      if (l.indexOf("github") !== -1) return "#i-github";
      if (l.indexOf("youtube") !== -1) return "#i-youtube";
      if (l.indexOf("facebook") !== -1) return "#i-facebook";
      if (l.indexOf("linkedin") !== -1) return "#i-linkedin";
      if (l.indexOf("demo") !== -1 || l.indexOf("live") !== -1 || l.indexOf("play") !== -1) return "#i-ext";
      if (l.indexOf("doc") !== -1 || l.indexOf("guide") !== -1) return "#i-file-text";
      return "#i-ext";
    }
    var out = "";
    var l = p.links;
    if (Array.isArray(l)) {
      l.forEach(function (entry) {
        var label = "", url = "";
        if (entry && typeof entry === "object") { label = entry.label || ""; url = entry.url || ""; }
        else {
          var s = String(entry || "");
          var ci = s.indexOf(":");
          if (ci > 0) { label = s.slice(0, ci).trim(); url = s.slice(ci + 1).trim(); }
          else { url = s.trim(); }
        }
        if (!url) return;
        out += '<a class="pl-btn" href="' + esc(url) + '" target="_blank" rel="noopener nofollow">' +
          '<svg class="ic"><use href="' + iconForLabel(label) + '"/></svg>' + esc(label || "More Info") + "</a>";
      });
    } else {
      var links = {};
      if (l && typeof l === "object") links = l;
      if (!links.github && p.github) links.github = p.github;
      if (!(links.live || links.demo || links.link) && p.link) links.live = p.link;
      keys.forEach(function (item) {
        var url = links[item.k];
        if (!url) return;
        out += '<a class="pl-btn" href="' + esc(url) + '" target="_blank" rel="noopener nofollow"><svg class="ic"><use href="' + item.icon + '"/></svg>' + item.label + "</a>";
      });
    }
    return out;
  }

  function projectTechHTML(tech) {
    return (tech || []).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
  }

  function featureList(items) {
    return (items || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
  }

  function projectDetailsHTML(p) {
    var cover = p.images && p.images.length
      ? '<div class="pd-cover"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" /></div>'
      : "";
    var videoSrc = p.videoUrl || p.video || "";
    var showVideo = (p.videoEnabled === true) && videoSrc;
    var video = showVideo
      ? '<section class="pd-video"><div class="pd-video-inner">' + (isYouTube(videoSrc)
          ? '<div class="video-shell yt-shell"><iframe src="' + esc(youtubeEmbed(videoSrc)) + '" title="' + esc(p.videoTitle || p.title || "Project video") + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'
          : '<div class="video-shell" ' +
            (p.videoPoster ? 'style="--poster:url(\'' + esc(p.videoPoster) + '\')"' : "") + '>' +
            '<video class="custom-video" id="project-video" preload="metadata" playsinline ' +
            (p.videoPoster ? 'poster="' + esc(p.videoPoster) + '"' : "") + '>' +
              '<source src="' + esc(videoSrc) + '" type="' + esc(p.videoMime || "video/mp4") + '" />' +
            "Your browser does not support HTML5 video.</video>" +
            '<div class="vc-bigplay" data-vplay><span class="bp-btn"><svg class="ic"><use href="#i-play"/></svg></span></div>' +
            renderVideoOverlay(p) +
            buildVideoControls() +
            '<div class="vc-error" id="vc-error" hidden>' +
              '<svg class="ic"><use href="#i-warning"/></svg>' +
              "This video couldn't be played. The URL or file may be unavailable." +
            "</div>" +
          "</div>") +
          renderVideoInfo(p) +
        "</div></section>"
      : "";

    var caseBlocks = "";
    var short = p.shortDesc ? '<div class="pd-block"><h3>Overview</h3><p>' + esc(p.shortDesc) + "</p></div>" : "";
    var full = p.description || p.fullDesc;
    if (full) caseBlocks += '<div class="pd-block"><h3>Project Description</h3><div class="pd-html">' + richOrText(full) + "</div></div>";
    if (p.contribution) caseBlocks += '<div class="pd-block"><h3>What I Did</h3><div class="pd-html">' + richOrText(p.contribution) + "</div></div>";
    if (p.tech && p.tech.length) caseBlocks += '<div class="pd-block"><h3>Technologies Used</h3><div class="pd-tech">' + projectTechHTML(p.tech) + "</div></div>";
    var features = p.features && p.features.length ? p.features : (p.keyFeatures || []);
    if (features.length) caseBlocks += '<div class="pd-block"><h3>Key Features</h3><ul class="pd-list check-list">' + featureList(features) + "</ul></div>";
    if (p.challenges && p.challenges.length) caseBlocks += '<div class="pd-block"><h3>Challenges</h3><ul class="pd-list">' + featureList(p.challenges) + "</ul></div>";
    if (p.solutions && p.solutions.length) caseBlocks += '<div class="pd-block"><h3>Solutions</h3><ul class="pd-list">' + featureList(p.solutions) + "</ul></div>";

    var links = projectLinksHTML(p);
    var gallery = "";
    if (p.images && p.images.length > 1) {
      gallery = '<div class="pd-block"><h3>Gallery</h3><div class="pd-gallery">' +
        p.images.map(function (u, i) {
          return '<img src="' + esc(u) + '" alt="' + esc(p.title) + " " + (i + 1) + '" loading="lazy" data-lightbox />';
        }).join("") + "</div></div>";
    }

    return (
      '<article class="project-detail-page section solo-section">' +
        '<div class="container">' +
          '<a class="pd-back" href="#/projects">← Back to Projects</a>' +
          '<div class="pd-header">' +
            (p.category ? '<span class="pd-category">' + esc(p.category) + "</span>" : "") +
            '<h1 class="pd-title">' + esc(p.title || "Project") + "</h1>" +
            (p.shortDesc ? '<p class="pd-lead">' + esc(p.shortDesc) + "</p>" : "") +
            (links ? '<div class="pd-links">' + links + "</div>" : "") +
          "</div>" +
          cover +
          video +
          '<div class="pd-content">' + short + caseBlocks + gallery + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function richOrText(t) {
    if (!t) return "";
    var s = String(t);
    if (isRichText(s)) return s;
    return s.split(/\n+/).map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("");
  }

  /* optional subtle overlay text over the top of the video */
  function pVideoDesc(p) { return p.videoDescription || p.videoDesc || ""; }
  function pVideoTags(p) { return p.videoOverlays || p.videoTags || []; }
  function renderVideoOverlay(p) {
    var tags = pVideoTags(p);
    var show = p.videoOverlayEnabled !== false && (p.videoTitle || p.videoOverlayText || tags.length);
    if (!show) return "";
    var html = '<div class="video-overlay">';
    if (p.videoTitle) html += '<div class="vo-title">' + esc(p.videoTitle) + "</div>";
    if (pVideoDesc(p)) html += '<div class="vo-desc">' + esc(pVideoDesc(p)) + "</div>";
    if (p.videoCaption) html += '<div class="vo-caption">' + esc(p.videoCaption) + "</div>";
    if (p.videoOverlayText) html += '<div class="vo-text">' + escapeRich(p.videoOverlayText) + "</div>";
    if (tags.length) {
      html += '<div class="vo-tags">' + tags.map(function (o) { return "<span>" + esc(o) + "</span>"; }).join("") + "</div>";
    }
    html += "</div>";
    return html;
  }
  function escapeRich(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function buildVideoControls() {
    return (
      '<div class="vc-controls" id="vc-controls">' +
        '<div class="vc-progress" id="vc-progress"><div class="vc-buffer" id="vc-buffer"></div><div class="vc-fill" id="vc-fill"></div><div class="vc-dot" id="vc-dot"></div></div>' +
        '<div class="vc-row">' +
          '<button type="button" class="vc-btn" id="vc-play" data-role="play" aria-label="Play/Pause"><svg class="ic"><use id="vc-play-icon" href="#i-play"/></svg></button>' +
          '<button type="button" class="vc-btn vc-mute" id="vc-mute" aria-label="Mute"><svg class="ic"><use id="vc-mute-icon" href="#i-vol"/></svg></button>' +
          '<input type="range" class="vc-volume" id="vc-volume" min="0" max="100" value="100" aria-label="Volume" />' +
          '<span class="vc-time" id="vc-time">0:00 / 0:00</span>' +
          '<span class="vc-spacer"></span>' +
          '<button type="button" class="vc-btn" id="vc-pip" aria-label="Picture-in-picture"><svg class="ic"><use href="#i-pip"/></svg></button>' +
          '<select class="vc-speed" id="vc-speed" aria-label="Playback speed">' +
            (["0.5","0.75","1","1.25","1.5","1.75","2"].map(function (s) {
              return '<option value="' + s + '"' + (s === "1" ? " selected" : "") + ">" + s + "×</option>";
            }).join("")) +
          "</select>" +
          '<button type="button" class="vc-btn" id="vc-full" aria-label="Fullscreen"><svg class="ic"><use id="vc-full-icon" href="#i-full"/></svg></button>' +
        "</div>" +
      "</div>"
    );
  }

  /* Remaining video explanation / info section shown under the player */
  function renderVideoInfo(p) {
    var desc = pVideoDesc(p);
    if (!desc && !p.tech && !p.keyFeatures && !p.videoCaption) return "";
    var blocks = "";
    if (p.videoTitle) blocks += "<h3>" + esc(p.videoTitle) + "</h3>";
    if (desc) blocks += "<p>" + esc(desc) + "</p>";
    if (p.tech && p.tech.length) {
      blocks += '<div class="vi-label">Technologies</div><div class="pd-tech">' + projectTechHTML(p.tech) + "</div>";
    }
    var feats = p.keyFeatures && p.keyFeatures.length ? p.keyFeatures : (p.features || []);
    if (feats.length) {
      blocks += '<div class="vi-label">Key Work</div><ul class="pd-list check-list">' + featureList(feats) + "</ul>";
    }
    return '<div class="video-info">' + blocks + "</div>";
  }

  var CAT_CLASS = {
    life: "cat-life", travel: "cat-travel", technology: "", tech: "",
    career: "cat-career", learning: "cat-learning", photography: "cat-photography",
    food: "cat-life"
  };

  function blogPostHTML(p, idx) {
    var catKey = (p.category || "").toLowerCase();
    var imgs = p.images || [];
    var gallery = "";
    if (imgs.length === 1) {
      gallery = '<div class="post-gallery g1"><img src="' + esc(imgs[0]) + '" alt="' + esc(p.title) + '" loading="lazy" data-lightbox /></div>';
    } else if (imgs.length > 1) {
      gallery = '<div class="post-gallery g' + Math.min(imgs.length, 3) + '">' +
        imgs.slice(0, 3).map(function (u) { return '<img src="' + esc(u) + '" alt="' + esc(p.title) + '" loading="lazy" data-lightbox />'; }).join("") + "</div>";
    }
    var tags = (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var locLine = p.location ? '<span><svg class="ic"><use href="#i-pin"/></svg>' + esc(p.location) + "</span>" : "";

    var commentsHtml = (p.comments || []).map(function (cm) {
      return '<div class="comment-item"><strong>' + esc(cm.name) + "</strong><p>" + esc(cm.text) + "</p></div>";
    }).join("");

    return (
      '<article class="post-card glass" id="post-' + esc(p.id) + '" data-reveal style="--rd:' + Math.min(idx, 4) * 50 + 'ms">' +
        '<header class="post-head"><div class="avatar">MS</div>' +
          '<div class="post-id"><h4>Md. Shagor Islam</h4>' +
          '<div class="post-meta"><span><svg class="ic"><use href="#i-calendar"/></svg>' + esc(fmtDate(p.date)) + "</span>" + locLine + "</div></div>" +
          (p.category ? '<span class="cat-chip ' + (CAT_CLASS[catKey] || "") + '">' + esc(p.category) + "</span>" : "") +
        "</header>" +
        '<h3 class="post-title"><a href="#/blog/' + esc(p.slug || p.id) + '">' + esc(p.title) + "</a></h3>" +
        renderRich(p.text) +
        gallery +
        (tags ? '<div class="post-tags">' + tags + "</div>" : "") +
        '<footer class="post-actions">' +
          '<a class="action-btn read-more" href="#/blog/' + esc(p.slug || p.id) + '">Read More <svg class="ic"><use href="#i-arrow-r"/></svg></a>' +
          '<button type="button" class="action-btn like-btn" data-post="' + esc(p.id) + '"><svg class="ic"><use href="#i-heart-fill"/></svg><span class="like-count">' + (p.likes || 0) + "</span></button>" +
          '<button type="button" class="action-btn comments-toggle" data-post="' + esc(p.id) + '"><svg class="ic"><use href="#i-comment"/></svg><span>' + (p.comments || []).length + '</span></button>' +
          '<button type="button" class="action-btn share-btn" data-title="' + esc(p.title) + '"><svg class="ic"><use href="#i-share"/></svg><span>Share</span></button>' +
        "</footer>" +
        '<div class="comments-wrap hidden">' + commentsHtml +
          '<form class="comment-form" data-post="' + esc(p.id) + '">' +
            '<input type="text" name="name" placeholder="Your name" maxlength="80" required />' +
            '<input type="text" name="text" placeholder="Write a comment…" maxlength="1000" required />' +
            "<button type=\"submit\">Send</button>" +
          "</form>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- dedicated single post page ---------- */
  function blogPostPageHTML(p) {
    var notes = "";
    var all = C.posts || [];
    var idx = all.findIndex(function (x) { return x.id === p.id; });
    var prev = idx > 0 ? all[idx - 1] : null;
    var next = idx < all.length - 1 ? all[idx + 1] : null;
    var nav = "";
    if (prev) nav += '<a class="bp-nav-link" href="#/blog/' + esc(prev.slug || prev.id) + '"><svg class="ic"><use href="#i-arrow-l"/></svg><span>' + esc(prev.title || "") + "</span></a>";
    else nav += '<span class="bp-nav-placeholder"></span>';
    if (next) nav += '<a class="bp-nav-link right" href="#/blog/' + esc(next.slug || next.id) + '"><span>' + esc(next.title || "") + "</span>" + '<svg class="ic"><use href="#i-arrow-r"/></svg></a>';
    var imgs = p.images || [];
    var galleryHtml = "";
    if (imgs.length) {
      galleryHtml = '<div class="bp-gallery">' + imgs.map(function (u) {
        return '<img src="' + esc(u) + '" alt="' + esc(p.title) + '" loading="lazy" data-lightbox />';
      }).join("") + "</div>";
    }
    var tags = (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var commentsHtml = (p.comments || []).map(function (cm) {
      return '<div class="comment-item"><strong>' + esc(cm.name) + "</strong><p>" + esc(cm.text) + "</p></div>";
    }).join("");
    return (
      '<article class="blog-post-page section solo-section" id="single-post">' +
        '<div class="container">' +
          '<a class="pd-back" href="#/blog">← Back to Blog</a>' +
          '<header class="blog-post-head">' +
            (p.category ? '<span class="cat-chip">' + esc(p.category) + "</span>" : "") +
            '<h1 class="blog-post-title">' + esc(p.title) + "</h1>" +
            '<div class="blog-post-meta"><span><svg class="ic"><use href="#i-calendar"/></svg>' + esc(fmtDate(p.date)) + "</span>" +
              (p.location ? '<span><svg class="ic"><use href="#i-pin"/></svg>' + esc(p.location) + "</span>" : "") +
            "</div>" +
          "</header>" +
          galleryHtml +
          '<div class="blog-post-body post-richtext">' + (isRichText(p.text) ? p.text : renderRich(p.text)) + "</div>" +
          (tags ? '<div class="post-tags">' + tags + "</div>" : "") +
          '<div class="blog-post-footer">' +
            '<button type="button" class="action-btn like-btn" data-post="' + esc(p.id) + '"><svg class="ic"><use href="#i-heart-fill"/></svg><span class="like-count">' + (p.likes || 0) + '</span> Likes</button>' +
            '<button type="button" class="action-btn share-btn" data-title="' + esc(p.title) + '"><svg class="ic"><use href="#i-share"/></svg><span>Share</span></button>' +
          "</div>" +
          '<div class="blog-post-comments"><h3>Comments</h3>' +
            commentsHtml +
            '<form class="comment-form" data-post="' + esc(p.id) + '">' +
              '<input type="text" name="name" placeholder="Your name" maxlength="80" required />' +
              '<input type="text" name="text" placeholder="Write a comment…" maxlength="1000" required />' +
              "<button type=\"submit\">Send</button>" +
            "</form>" +
          "</div>" +
          '<div class="bp-nav">' + nav + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function blogSection() {
    var posts = C.posts.map(function (p, i) { return blogPostHTML(p, i); }).join("");
    return (
      '<section id="blog" class="section blog-section">' +
        '<div class="blog-hero"><div class="container">' +
          '<p class="eyebrow">Digital Diary</p>' +
          '<h1 class="blog-hero-title">Beyond the <span class="grad-text">Terminal</span></h1>' +
          '<p class="blog-hero-sub">Life, travel, learning and everything in between.</p>' +
        "</div></div>" +
        '<div class="container blog-container">' +
          '<header class="section-head" data-reveal><p class="eyebrow">All Posts</p><h2 class="section-title">Latest <span class="grad-text">Updates</span></h2></header>' +
          '<div class="blog-feed">' + (posts || "") + "</div>" +
          (!posts ? '<p class="blog-empty">No posts yet — new updates coming soon.</p>' : "") +
        "</div>" +
      "</section>"
    );
  }

  function contactSection() {
    var c = C.contact || {};
    var socials = (c.socials || []).filter(function (s) { return s.url; }).map(function (s) {
      var icon = { github: "#i-github", linkedin: "#i-linkedin", facebook: "#i-facebook", instagram: "#i-instagram" }[s.platform.toLowerCase()] || "#i-arrow-r";
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(s.platform) + '"><svg class="ic"><use href="' + icon + '"/></svg></a>';
    }).join("");
    return (
      '<section id="contact" class="section alt-bg"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Get In Touch</p><h2 class="section-title">Let\'s <span class="grad-text">Connect</span></h2>' +
        '<p class="section-sub">Open to opportunities, collaborations and infrastructure conversations.</p></header>' +
        '<div class="contact-grid">' +
          '<div class="contact-info" data-reveal>' +
            '<div class="c-card glass"><svg class="ic"><use href="#i-mail"/></svg><div><h4>Email</h4><p>' + esc(c.email || "") + "</p></div></div>" +
            (c.phone ? '<div class="c-card glass"><svg class="ic"><use href="#i-phone"/></svg><div><h4>Phone</h4><p dir="ltr">' + esc(c.phone) + "</p></div></div>" : "") +
            '<div class="c-card glass"><svg class="ic"><use href="#i-pin"/></svg><div><h4>Location</h4><p>' + esc(c.location || "") + "</p></div></div>" +
            (C.resume ? '<div class="c-card glass"><svg class="ic"><use href="#i-file-text"/></svg><div><h4>Resume</h4><p><a class="res-link" href="' + esc(C.resume.url) + '" download>Download Resume (PDF)</a></p></div></div>' : "") +
            (socials ? '<div class="socials">' + socials + "</div>" : "") +
          "</div>" +
          '<form class="contact-form glass" id="contact-form" data-reveal data-delay="120">' +
            '<div class="field-row">' +
              '<div class="field"><label for="cf-name">Name</label><input id="cf-name" name="name" required placeholder="Your name" /></div>' +
              '<div class="field"><label for="cf-email">Email</label><input id="cf-email" name="email" type="email" required placeholder="you@example.com" /></div>' +
            "</div>" +
            '<div class="field"><label for="cf-subject">Subject</label><input id="cf-subject" name="subject" placeholder="What is this about?" /></div>' +
            '<div class="field"><label for="cf-message">Message</label><textarea id="cf-message" name="message" rows="6" required placeholder="Write your message…"></textarea></div>' +
            '<button type="submit" class="btn btn-primary btn-block">Send Message <svg class="ic"><use href="#i-send"/></svg></button>' +
          "</form>" +
        "</div>" +
      "</div></section>"
    );
  }

  function emptyNote(msg) {
    return '<div class="empty-state glass"><svg class="ic"><use href="#i-folder"/></svg><h3>Nothing here yet</h3><p>' + esc(msg) + "</p></div>";
  }

  /* ---------- render ---------- */

  var BUILDERS = {
    hero: heroSection, experience: experienceSection, projects: projectsSection,
    about: aboutSection, skills: skillsSection, education: educationSection,
    certifications: certsSection, blog: blogSection, contact: contactSection
  };
  var NAV_MAP = [
    { key: "projects", label: "Projects" },
    { key: "experience", label: "Job Experience" },
    { key: "education", label: "Education" },
    { key: "about", label: "About" },
    { key: "blog", label: "Blog" }
  ];

  /* ---------- navigation (driven by CMS) ----------
     The navbar is built from C.navigation (managed in admin). Each item has
     { key, label, url, enabled }. "Home" stays first. A nav click uses the
     item's url or defaults to "#/key". Items are hidden when the matching
     section is switched off in C.sections.enabled (preserves legacy behaviour
     without hard-coding the whole menu).                                 */

  function navHref(n) {
    if (n && n.url) return n.url;
    return "#/" + (n && n.key ? n.key : "");
  }
  function navExternal(href) {
    /* only genuine protocol links (http/https/mailto/tel) open in a new tab.
       Hash routes (#/…) and in-page anchors (#contact) are internal. */
    return /^(https?:|mailto:|tel:)/i.test(href || "");
  }
  function navEntries(enabled) {
    var list = (C && C.navigation) || NAV_MAP;
    return list.filter(function (n) {
      if (!n || n.enabled === false) return false;
      var href = navHref(n);
      var m = href.match(/^#\/([a-zA-Z]+)/);
      if (m && enabled && enabled[m[1]] === false) return false;
      return true;
    });
  }

  function navList(enabled, mode) {
    var html = '<li><a href="#/" data-key="home" class="nav-link' + (mode ? "" : " active") + '">Home</a></li>';
    navEntries(enabled).forEach(function (n) {
      var href = navHref(n);
      var ext = navExternal(href);
      html += "<li><a href=\"" + href + "\" data-key=\"" + (n.key || "") + "\"" +
        (ext ? ' target="_blank" rel="noopener"' : "") +
        ' class="nav-link' + (n.key && mode === n.key ? " active" : "") + '">' +
        esc(n.label || n.key || "") + "</a></li>";
    });
    return html;
  }

  function navPlain(enabled, mode) {
    var html = '<a href="#/" data-key="home" class="mobile-link' + (mode ? "" : " active") + '">Home</a>';
    navEntries(enabled).forEach(function (n) {
      var href = navHref(n);
      var ext = navExternal(href);
      html += '<a href="' + href + '" data-key="' + (n.key || "") + '"' +
        (ext ? ' target="_blank" rel="noopener"' : "") +
        ' class="mobile-link' + (n.key && mode === n.key ? " active" : "") + '">' +
        esc(n.label || n.key || "") + "</a>";
    });
    return html;
  }

  function footNav(enabled) {
    var html = '<a href="#/">Home</a>';
    navEntries(enabled).forEach(function (n) {
      var href = navHref(n);
      var ext = navExternal(href);
      html += '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" +
        esc(n.label || n.key || "") + "</a>";
    });
    return html;
  }

  /* ---------- hash routing ----------
     "#/section"     -> show ONLY that section (solo view)
     "#/project/:id" -> show a single project details case-study page
     "#/" or ""      -> full homepage (all sections)
     "#section"      -> plain anchor scroll inside the current view        */

  var PROJECT_ID = null;

  function currentMode() {
    var m = (location.hash || "").match(/^#\/([a-zA-Z]+)/);
    return m ? m[1].toLowerCase() : null;
  }
  function currentProjectId() {
    var m = (location.hash || "").match(/^#\/project\/([\w-]+)/);
    return m ? m[1] : null;
  }
  function currentBlogSlug() {
    var m = (location.hash || "").match(/^#\/blog\/([\w-]+)/);
    return m ? m[1] : null;
  }

  var pendingScroll = null;
  var lastMode = null;

  function render() {
    var app = el("app");
    var order = (C.sections && C.sections.order) || ["hero", "experience", "projects", "about", "education", "certifications", "skills", "contact"];
    var enabled = (C.sections && C.sections.enabled) || {};
    var homeOrder = (C.sections && C.sections.homeOrder) || [].concat(order).filter(function (k) { return k !== "blog"; });
    var projId = currentProjectId();
    var mode = currentMode();
    var project = null;
    var blogSlug = currentBlogSlug();
    var blogPost = null;
    if (blogSlug) {
      blogPost = C.posts.filter(function (p) { return p.id === blogSlug || (p.slug || "") === blogSlug; })[0] || null;
    }
    if (projId) {
      project = C.projects.filter(function (p) { return p.slug === projId || p.id === projId; })[0] || null;
    }
    if (blogPost) mode = null;
    if (project) mode = null;
    if (mode === "project") mode = null;
    if (mode === "blog" && blogSlug && !blogPost) { mode = "blog"; }

    document.body.classList.toggle("solo", !!mode || !!project || !!blogPost);

    if (project) {
      app.innerHTML = projectDetailsHTML(project);
    } else if (blogPost) {
      app.innerHTML = blogPostPageHTML(blogPost);
    } else if (mode) {
      app.innerHTML = BUILDERS[mode]();
    } else {
      var html = "";
      homeOrder.forEach(function (key) {
        if (enabled[key] !== false && BUILDERS[key]) html += BUILDERS[key]();
      });
      app.innerHTML = html;
    }
    lastMode = mode;

    /* chrome */
    var navMode = blogPost ? "blog" : (project ? "projects" : mode);
    el("nav-links").innerHTML = navList(enabled, navMode);
    el("nav-contact").style.display = enabled.contact === false ? "none" : "";
    el("mobile-menu").innerHTML =
      navPlain(enabled, navMode) +
      (enabled.contact !== false ? '<a href="#contact" class="mobile-link mobile-cta">Contact Me</a>' : "");
    el("foot-links").innerHTML = footNav(enabled);
    el("brand-name").innerHTML = "Shagor<span class='logo-dot'>.</span>";

    initInteractions(mode);
    if (project) initProjectPage();
    if ((!mode && !project && !blogPost) || (mode === "hero")) {
      if (!C.home.heroImage) runTerminal();
    }

    if (pendingScroll) {
      var t = el(pendingScroll);
      pendingScroll = null;
      if (t) setTimeout(function () { scrollToEl(t); }, 80);
    } else if (mode || project || blogPost) {
      window.scrollTo(0, 0);
    }
    PROJECT_ID = projId;
  }

  function scrollToEl(t) {
    t.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  /* route links (#/...) re-render via hashchange; plain anchors are handled manually */
  window.addEventListener("hashchange", function () {
    var m = currentMode() || null;
    var pid = currentProjectId();
    if (m === lastMode && pid === PROJECT_ID) return;
    render();
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href^='#']") : null;
    if (!a) return;
    var href = a.getAttribute("href");
    if (href === "#/" || /^#\/[a-zA-Z]/.test(href)) return; /* routed link */
    e.preventDefault();
    var id = href.slice(1);
    if (currentMode() && !el(id)) {       /* section lives on the homepage */
      pendingScroll = id;
      location.hash = "/";
      return;
    }
    var t = el(id);
    if (t) {
      history.replaceState(null, "", href);
      scrollToEl(t);
    }
  });

  /* scrollspy — full page only (solo views mark their link statically).
     Tracks the sections that exist on the homepage AND are in nav config,
     so admin-managed navigation stays in sync with highlighting. */
  function updateSpy() {
    if (currentMode()) return;
    var pos = window.scrollY + window.innerHeight * 0.35;
    var keys = ["home"];
    navEntries().forEach(function (n) {
      var m = navHref(n).match(/^#\/([a-zA-Z]+)/);
      if (m) keys.push(m[1]);
    });
    var seen = {};
    keys = keys.filter(function (k) { return seen[k] ? false : (seen[k] = true); });
    var current = "home";
    keys.forEach(function (key) {
      var sec = el(key === "home" ? "hero" : key);
      if (sec && sec.offsetTop <= pos) current = key;
    });
    document.querySelectorAll(".nav-link").forEach(function (l) {
      l.classList.toggle("active", l.getAttribute("data-key") === current);
    });
  }

  function syncChrome() {
    el("site-header").classList.toggle("scrolled", window.scrollY > 30);
    el("to-top").classList.toggle("show", window.scrollY > 600);
    updateSpy();
  }

  function initInteractions(mode) {
    syncChrome();

    /* reveal */
    var revealEls = document.querySelectorAll("[data-reveal]");
    if ("IntersectionObserver" in window && !reducedMotion) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("visible");
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      revealEls.forEach(function (n) { obs.observe(n); });
    } else {
      revealEls.forEach(function (n) { n.classList.add("visible"); });
    }

    /* close mobile menu after choosing a link */
    document.querySelectorAll(".mobile-link").forEach(function (a) {
      a.addEventListener("click", function () {
        el("mobile-menu").classList.remove("open");
        el("hamburger").classList.remove("open");
      });
    });

    /* view details toggles */
    document.querySelectorAll("[data-details]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = btn.nextElementSibling;
        var open = btn.classList.toggle("open");
        panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0px";
        btn.innerHTML = (open ? "Hide Details" : "View Details") + ' <svg class="ic"><use href="#i-chev-d"/></svg>';
      });
    });

    /* likes / comments / share */
    document.querySelectorAll(".like-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        fetch("/api/posts/" + btn.dataset.post + "/like", { method: "POST" })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            btn.querySelector(".like-count").textContent = d.likes;
            btn.classList.add("liked");
          });
      });
    });

    document.querySelectorAll(".comments-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wrap = btn.closest(".post-card").querySelector(".comments-wrap");
        wrap.classList.toggle("hidden");
      });
    });

    document.querySelectorAll(".comment-form").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = form.querySelector('[name="name"]').value.trim();
        var text = form.querySelector('[name="text"]').value.trim();
        if (!name || !text) return;
        fetch("/api/posts/" + form.dataset.post + "/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, text: text })
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (d.ok) {
            var list = form.closest(".comments-wrap, .blog-post-comments");
            var container = list || form.parentNode;
            var html = "";
            d.comments.forEach(function (cm) {
              html += '<div class="comment-item"><strong>' + esc(cm.name) + "</strong><p>" + esc(cm.text) + "</p></div>";
            });
            var formKeep = form.outerHTML;
            var toggleBtn = list ? list.closest(".post-card").querySelector(".comments-toggle span") : null;
            if (toggleBtn) toggleBtn.textContent = d.comments.length;
            var extra = "";
            if (list && list.classList.contains("blog-post-comments")) {
              var h = list.querySelector("h3");
              if (h) extra = h.outerHTML;
            }
            container.innerHTML = (extra || "") + html + formKeep;
            bindCommentForm(container.querySelector(".comment-form"));
            showToast("Comment added");
          }
        });
      });
    });

    document.querySelectorAll(".share-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var url = window.location.origin + window.location.pathname + "#/blog/" + btn.dataset.post;
        if (navigator.share) {
          navigator.share({ title: btn.dataset.title, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () { showToast("Link copied"); });
        }
      });
    });

    /* contact form */
    var cf = el("contact-form");
    if (cf) {
      cf.addEventListener("submit", function (e) {
        e.preventDefault();
        var b = new FormData(cf);
        fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: b.get("name"), email: b.get("email"),
            subject: b.get("subject"), message: b.get("message")
          })
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (d.ok) { showToast("Message sent! I'll get back to you soon."); cf.reset(); }
          else showToast(d.error || "Something went wrong");
        }).catch(function () { showToast("Could not send — is the server running?"); });
      });
    }
  }

  /* ---------- custom project video player ---------- */
  function initProjectPage() {
    var video = el("project-video");
    if (!video) return;

    var shell = video.closest(".video-shell");
    var playBtn = el("vc-play");
    var playIcon = el("vc-play-icon");
    var muteBtn = el("vc-mute");
    var muteIcon = el("vc-mute-icon");
    var volInput = el("vc-volume");
    var timeEl = el("vc-time");
    var progress = el("vc-progress");
    var fill = el("vc-fill");
    var buffer = el("vc-buffer");
    var dot = el("vc-dot");
    var pipBtn = el("vc-pip");
    var fullBtn = el("vc-full");
    var fullIcon = el("vc-full-icon");
    var speed = el("vc-speed");

    function fmt(t) {
      if (isNaN(t)) return "0:00";
      t = Math.round(t);
      var m = Math.floor(t / 60), s = t % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }
    function updateTime() { timeEl.textContent = fmt(video.currentTime) + " / " + fmt(video.duration); }
    function updatePlay() {
      playIcon.setAttribute("href", video.paused ? "#i-play" : "#i-pause");
      var playing = !video.paused && !video.ended;
      shell.classList.toggle("playing", playing);
    }
    function togglePlay() {
      if (video.paused) video.play().catch(function () {});
      else video.pause();
    }
    function updateProgress() {
      if (!video.duration) return;
      var pct = (video.currentTime / video.duration) * 100;
      fill.style.width = pct + "%";
      dot.style.left = "calc(" + pct + "% - 8px)";
    }
    function updateVolume() {
      var mute = video.muted || video.volume === 0;
      muteIcon.setAttribute("href", mute ? "#i-muted" : "#i-vol");
      if (!video.muted) volInput.value = video.volume * 100;
    }

    playBtn.addEventListener("click", togglePlay);
    video.addEventListener("click", togglePlay);
    video.addEventListener("play", updatePlay);
    video.addEventListener("pause", updatePlay);
    video.addEventListener("ended", updatePlay);
    video.addEventListener("timeupdate", function () { updateTime(); updateProgress(); });
    video.addEventListener("loadedmetadata", updateTime);
    video.addEventListener("durationchange", updateTime);
    video.addEventListener("volumechange", updateVolume);
    video.addEventListener("progress", function () {
      if (video.buffered.length) buffer.style.width = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100 + "%";
    });

    /* friendly message if the video/URL fails to load or the file is missing */
    function showVideoError() {
      var err = el("vc-error");
      var controls = el("vc-controls");
      var big = shell.querySelector("[data-vplay]");
      if (err) err.hidden = false;
      if (controls) controls.style.display = "none";
      if (big) big.style.display = "none";
    }
    video.addEventListener("error", showVideoError);
    var vSrc = video.querySelector("source");
    if (vSrc) vSrc.addEventListener("error", showVideoError);

    muteBtn.addEventListener("click", function () {
      video.muted = !video.muted;
      updateVolume();
    });
    volInput.addEventListener("input", function () {
      video.volume = +volInput.value / 100;
      video.muted = video.volume === 0;
      updateVolume();
    });

    var seeking = false;
    progress.addEventListener("mousedown", function () { seeking = true; });
    window.addEventListener("mouseup", function () { seeking = false; });
    progress.addEventListener("click", function (e) {
      var rect = progress.getBoundingClientRect();
      var ratio = (e.clientX - rect.left) / rect.width;
      if (video.duration) video.currentTime = ratio * video.duration;
    });

    speed.addEventListener("change", function () { video.playbackRate = parseFloat(speed.value) || 1; });

    pipBtn.addEventListener("click", function () {
      if (document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        else video.requestPictureInPicture().catch(function () {});
      }
    });

    fullBtn.addEventListener("click", function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (shell.requestFullscreen) shell.requestFullscreen();
    });
    document.addEventListener("fullscreenchange", function () {
      fullIcon.setAttribute("href", document.fullscreenElement ? "#i-shrink" : "#i-full");
      shell.classList.toggle("fullscreen", !!document.fullscreenElement);
    });

    /* keyboard controls when project page focused */
    document.addEventListener("keydown", function (e) {
      if (!el("project-video")) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.key === "m" || e.key === "M") { video.muted = !video.muted; updateVolume(); }
      else if (e.key === "ArrowRight") { video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
      else if (e.key === "ArrowLeft") { video.currentTime = Math.max(0, video.currentTime - 5); }
      else if (e.key === "f" || e.key === "F") { fullBtn.click(); }
    });

    /* clicking the big play overlay */
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-vplay]")) togglePlay();
    });

    updateTime();
    updateVolume();
    updatePlay();
  }

  function bindCommentForm(form) {
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector('[name="name"]').value.trim();
      var text = form.querySelector('[name="text"]').value.trim();
      if (!name || !text) return;
      fetch("/api/posts/" + form.dataset.post + "/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, text: text })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) {
          var list = form.closest(".comments-wrap");
          var html = "";
          d.comments.forEach(function (cm) {
            html += '<div class="comment-item"><strong>' + esc(cm.name) + "</strong><p>" + esc(cm.text) + "</p></div>";
          });
          list.innerHTML = html + form.outerHTML;
          bindCommentForm(list.querySelector(".comment-form"));
          showToast("Comment added");
        }
      });
    });
  }

  /* ---------- terminal typing ---------- */
  function runTerminal() {
    var body = el("terminal-body");
    if (!body) return;
    var script = [
      { prompt: true, text: "kubectl get pods" },
      { out: true, ok: true, text: "web-app-7f9c4d     1/1   Running   0" },
      { prompt: true, text: "docker ps --format '{{.Names}}'" },
      { out: true, text: "nginx-proxy" },
      { out: true, text: "redis-cache" },
      { prompt: true, text: "ssh admin@ec2-prod-01" },
      { out: true, ok: true, text: "connected — Ubuntu 22.04 LTS" }
    ];
    function escH(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    if (reducedMotion) {
      body.innerHTML = script.map(function (l) {
        return l.prompt
          ? '<div class="t-line"><span class="t-prompt">$ </span><span class="t-cmd">' + escH(l.text) + "</span></div>"
          : '<div class="t-line ' + (l.ok ? "t-ok" : "t-out") + '">' + escH(l.text) + "</div>";
      }).join("") + '<div class="t-line"><span class="t-prompt">$ </span><span class="cursor"></span></div>';
      return;
    }
    var li = 0, ci = 0, cur = null;
    (function next() {
      if (li >= script.length) {
        body.insertAdjacentHTML("beforeend", '<div class="t-line"><span class="t-prompt">$ </span><span class="cursor"></span></div>');
        return;
      }
      var line = script[li];
      if (!cur) {
        cur = document.createElement("div");
        cur.className = "t-line" + (line.prompt ? "" : line.ok ? " t-ok" : " t-out");
        if (line.prompt) cur.innerHTML = '<span class="t-prompt">$ </span><span class="t-cmd"></span>';
        body.appendChild(cur);
        ci = 0;
      }
      var target = line.prompt ? cur.querySelector(".t-cmd") : cur;
      target.textContent = line.text.slice(0, ++ci);
      if (ci >= line.text.length) { li++; cur = null; setTimeout(next, line.prompt ? 350 : 120); }
      else setTimeout(next, line.prompt ? 42 : 14);
    })();
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function showToast(msg) {
    var t = el("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- theme (dark / light / system) ----------
     Admin controls the server default (db.settings.theme). A visitor can still
     override it for their own browser via localStorage ("pv_theme"). This is
     applied straight after content loads (and pre-render via the inline script
     in index.html) so there is no theme flash.                            */

  var THEME_PREF_KEY = "pv_theme";

  function readThemePref() {
    try {
      var v = localStorage.getItem(THEME_PREF_KEY);
      if (v === "dark" || v === "light" || v === "system") return v;
    } catch (e) {}
    return null;
  }

  function persistThemePref(mode) {
    try {
      if (mode) localStorage.setItem(THEME_PREF_KEY, mode);
      else localStorage.removeItem(THEME_PREF_KEY);
    } catch (e) {}
  }

  function themeBase() {
    /* server default (from admin), or dark as fallback before content loads */
    return (C && C.settings && C.settings.theme) || "dark";
  }

  function resolveTheme() {
    var mode = readThemePref() || themeBase();
    var actual = mode;
    if (mode === "system") {
      actual = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
    }
    return { mode: mode, actual: actual };
  }

  function applyTheme() {
    var t = resolveTheme();
    var doc = document.documentElement;
    doc.setAttribute("data-theme", t.actual);
    doc.setAttribute("data-theme-mode", t.mode);
    var btn = el("theme-toggle");
    var icon = el("theme-toggle-icon");
    if (btn) {
      btn.classList.toggle("active", t.mode !== "system");
      btn.setAttribute("aria-label", "Theme: " + t.mode + ". Click to change");
    }
    if (icon) icon.setAttribute("href", t.actual === "light" ? "#i-sun" : "#i-moon");
  }

  function cycleTheme() {
    var order = ["dark", "light", "system", "dark", "light"];
    var cur = readThemePref() || themeBase();
    var next = "dark";
    for (var i = 0; i < order.length - 1; i++) {
      if (order[i] === cur) { next = order[i + 1]; break; }
    }
    if (next === "system") persistThemePref(null); /* "system" == default */
    else persistThemePref(next);
    applyTheme();
    var msgTxt = "Theme: " + next;
    if (next === "system") msgTxt += " (follows device)";
    showToast(msgTxt);
  }

  /* ---------- boot ---------- */

  el("foot-year").textContent = new Date().getFullYear();

  /* Record a portfolio view — once per visitor per hour (server dedupes). */
  (function trackView() {
    var vid = null;
    try {
      vid = localStorage.getItem("pv_visitor");
      if (!vid) {
        vid = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("pv_visitor", vid);
      }
    } catch (e) { vid = "v" + Date.now().toString(36); }
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: vid })
    }).catch(function () {});
  })();

  /* chrome bindings — once, never re-bound on re-render */
  window.addEventListener("scroll", syncChrome, { passive: true });
  el("to-top").onclick = function () {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };
  el("hamburger").onclick = function () {
    var open = el("mobile-menu").classList.toggle("open");
    el("hamburger").classList.toggle("open", open);
  };
  var themeBtn = el("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", cycleTheme);
  window.addEventListener("matchMedia", function () { applyTheme(); });
  /* lightbox (delegated — survives re-renders) */
  document.body.addEventListener("click", function (e) {
    if (e.target.matches("[data-lightbox]")) {
      var lb = document.createElement("div");
      lb.className = "lightbox";
      lb.innerHTML = '<img src="' + e.target.src + '" alt="" />';
      lb.addEventListener("click", function () { lb.remove(); });
      document.body.appendChild(lb);
    }
  });
  /* broken-image detection (delegated — survives re-renders) */
  document.body.addEventListener("error", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "IMG" || t.classList.contains("img-broken")) return;
    t.classList.add("img-broken");
    t.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }, true);

  fetch("/api/content")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      C = data;
      applyTheme();
      render();
    })
    .catch(function () {
      el("app").innerHTML =
        '<div class="server-note"><div class="glass">' +
        '<h2 style="font-family:\'Space Grotesk\',sans-serif;margin-bottom:12px">Server not running</h2>' +
        '<p style="color:#93a4bd">This portfolio loads its content dynamically.<br />Start it with:</p>' +
        '<p style="margin-top:14px"><code>npm start</code></p>' +
        '<p style="color:#93a4bd;margin-top:14px">Then open <code>http://localhost:3000</code></p>' +
        "</div></div>";
    });
})();
