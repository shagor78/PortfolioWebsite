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
      var links = "";
      if (p.link) links += '<a href="' + esc(p.link) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-arrow-r"/></svg> Live</a>';
      if (p.github) links += '<a href="' + esc(p.github) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-github"/></svg> GitHub</a>';
      return (
        '<article class="project-card glass" data-reveal style="--rd:' + (i % 3) * 70 + 'ms">' +
          '<div class="project-media">' + img + "</div>" +
          '<div class="project-body">' +
            "<h3>" + esc(p.title) + "</h3>" +
            "<p>" + esc(p.shortDesc || "") + "</p>" +
            (p.contribution ? '<p class="project-field"><strong>My contribution</strong>' + esc(p.contribution) + "</p>" : "") +
            (tech ? '<div class="project-tech">' + tech + "</div>" : "") +
            (links ? '<div class="project-links">' + links + "</div>" : "") +
          "</div>" +
        "</article>"
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
    return (
      '<section id="about" class="section"><div class="container">' +
        '<div class="about-grid">' +
          '<div class="about-side" data-reveal>' +
            '<p class="eyebrow">About Me</p><h2 class="section-title">More Than Just<br /><span class="grad-text">an Engineer</span></h2>' + focus +
            (imgs ? '<div class="about-images">' + imgs + "</div>" : "") +
          "</div>" +
          '<div class="about-story" data-reveal data-delay="120">' + paras +
            (a.belief ? '<p class="about-belief">' + esc(a.belief) + "</p>" : "") + life +
          "</div>" +
        "</div>" +
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
    var items = (C.about.education || []).map(function (ed, i) {
      var ongoing = !/complet/i.test(ed.status || "");
      var resLine = "";
      if (ed.showResult !== false && ed.resultType && ed.result) {
        resLine = '<p class="edu-result"><span class="edu-res-label">' + (ed.resultType === "gpa" ? "GPA" : "CGPA") + "</span>" +
          "<strong>" + esc(ed.result) + "</strong>" +
          (ed.resultScale ? '<span class="edu-res-scale">/ ' + esc(ed.resultScale) + "</span>" : "") + "</p>";
      }
      return '<article class="edu-item" data-reveal style="--rd:' + i * 80 + 'ms">' +
        '<div class="edu-icon"><svg class="ic"><use href="#i-cap"/></svg></div>' +
        '<div class="edu-card glass"><span class="edu-status' + (ongoing ? "" : " done") + '">' + esc(ed.status) + "</span>" +
        "<h3>" + esc(ed.degree) + '</h3><p class="edu-inst">' + esc(ed.institution) + "</p>" + resLine + "</div></article>";
    }).join("");
    return (
      '<section id="education" class="section"><div class="container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Academic Background</p><h2 class="section-title">My <span class="grad-text">Education</span></h2></header>' +
        '<div class="edu-timeline">' + items + "</div>" +
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
        '<h3 class="post-title">' + esc(p.title) + "</h3>" +
        '<p class="post-caption">' + esc(p.text) + "</p>" +
        gallery +
        (tags ? '<div class="post-tags">' + tags + "</div>" : "") +
        '<footer class="post-actions">' +
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

  function blogSection() {
    var posts = C.posts.map(blogPostHTML).join("");
    return (
      '<section id="blog" class="section"><div class="container blog-container">' +
        '<header class="section-head" data-reveal><p class="eyebrow">Digital Diary</p><h2 class="section-title">Beyond the <span class="grad-text">Terminal</span></h2>' +
        '<p class="section-sub">Life, travel, learning and everything in between.</p></header>' +
        '<div class="blog-feed">' + (posts || "") + "</div>" +
        (!posts ? '<p class="blog-empty">No posts yet — new updates coming soon.</p>' : "") +
      "</div></section>"
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

  /* ---------- hash routing ----------
     "#/section"  -> show ONLY that section (solo view, no API calls)
     "#/" or ""   -> full homepage (all sections, natural scrolling)
     "#section"   -> plain anchor scroll inside the current view        */

  function currentMode() {
    var m = (location.hash || "").match(/^#\/([a-zA-Z]+)/);
    return m ? m[1].toLowerCase() : null;
  }

  var pendingScroll = null;
  var lastMode = null;

  function navList(enabled, mode) {
    var html = '<li><a href="#/" data-key="home" class="nav-link' + (mode ? "" : " active") + '">Home</a></li>';
    NAV_MAP.forEach(function (n) {
      if (enabled[n.key] === false) return;
      html += '<li><a href="#/' + n.key + '" data-key="' + n.key + '" class="nav-link' + (mode === n.key ? " active" : "") + '">' + n.label + "</a></li>";
    });
    return html;
  }

  function navPlain(enabled, mode) {
    var html = '<a href="#/" data-key="home" class="mobile-link' + (mode ? "" : " active") + '">Home</a>';
    NAV_MAP.forEach(function (n) {
      if (enabled[n.key] === false) return;
      html += '<a href="#/' + n.key + '" data-key="' + n.key + '" class="mobile-link' + (mode === n.key ? " active" : "") + '">' + n.label + "</a>";
    });
    return html;
  }

  function footNav(enabled) {
    var html = '<a href="#/">Home</a>';
    NAV_MAP.forEach(function (n) {
      if (enabled[n.key] === false) return;
      html += '<a href="#/' + n.key + '">' + n.label + "</a>";
    });
    return html;
  }

  function render() {
    var app = el("app");
    var order = (C.sections && C.sections.order) || Object.keys(BUILDERS);
    var enabled = (C.sections && C.sections.enabled) || {};
    var mode = currentMode();
    if (!(mode && BUILDERS[mode] && enabled[mode] !== false)) mode = null;

    document.body.classList.toggle("solo", !!mode);

    if (mode) {
      app.innerHTML = BUILDERS[mode]();
    } else {
      var html = "";
      order.forEach(function (key) {
        if (enabled[key] !== false && BUILDERS[key]) html += BUILDERS[key]();
      });
      app.innerHTML = html;
    }
    lastMode = mode;

    /* chrome */
    el("nav-links").innerHTML = navList(enabled, mode);
    el("nav-contact").style.display = enabled.contact === false ? "none" : "";
    el("mobile-menu").innerHTML =
      navPlain(enabled, mode) +
      (enabled.contact !== false ? '<a href="#contact" class="mobile-link mobile-cta">Contact Me</a>' : "");
    el("foot-links").innerHTML = footNav(enabled);
    el("brand-name").innerHTML = "Shagor<span class='logo-dot'>.</span>";

    initInteractions(mode);
    if ((!mode || mode === "hero") && !C.home.heroImage) runTerminal();

    if (pendingScroll) {
      var t = el(pendingScroll);
      pendingScroll = null;
      if (t) setTimeout(function () { scrollToEl(t); }, 80);
    } else if (mode) {
      window.scrollTo(0, 0);
    }
  }

  function scrollToEl(t) {
    t.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  /* route links (#/...) re-render via hashchange; plain anchors are handled manually */
  window.addEventListener("hashchange", function () {
    if ((currentMode() || null) === lastMode) return;
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

  /* scrollspy — full page only (solo views mark their link statically) */
  function updateSpy() {
    if (currentMode()) return;
    var pos = window.scrollY + window.innerHeight * 0.35;
    var current = "home";
    ["home", "projects", "experience", "education", "about", "blog"].forEach(function (key) {
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
            var list = form.closest(".comments-wrap");
            var html = "";
            d.comments.forEach(function (cm) {
              html += '<div class="comment-item"><strong>' + esc(cm.name) + "</strong><p>" + esc(cm.text) + "</p></div>";
            });
            var formKeep = form.outerHTML;
            var toggleBtn = list.closest(".post-card").querySelector(".comments-toggle span");
            if (toggleBtn) toggleBtn.textContent = d.comments.length;
            list.innerHTML = html + formKeep;
            bindCommentForm(list.querySelector(".comment-form"));
            showToast("Comment added");
          }
        });
      });
    });

    document.querySelectorAll(".share-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var url = window.location.origin + window.location.pathname + "#blog";
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

  /* ---------- boot ---------- */

  el("foot-year").textContent = new Date().getFullYear();

  /* chrome bindings — once, never re-bound on re-render */
  window.addEventListener("scroll", syncChrome, { passive: true });
  el("to-top").onclick = function () {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };
  el("hamburger").onclick = function () {
    var open = el("mobile-menu").classList.toggle("open");
    el("hamburger").classList.toggle("open", open);
  };
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

  fetch("/api/content")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      C = data;
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
