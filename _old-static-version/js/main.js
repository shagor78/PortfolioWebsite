(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var data = window.SITE_DATA || { projects: [], posts: [] };

  /* ---------- Navbar ---------- */
  var header = document.getElementById("site-header");
  var toTop = document.getElementById("to-top");

  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 30);
    toTop.classList.toggle("show", window.scrollY > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var hamburger = document.getElementById("hamburger");
  var mobileMenu = document.getElementById("mobile-menu");

  hamburger.addEventListener("click", function () {
    var open = mobileMenu.classList.toggle("open");
    hamburger.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  mobileMenu.querySelectorAll(".mobile-link").forEach(function (link) {
    link.addEventListener("click", function () {
      mobileMenu.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Scrollspy ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var spySections = ["home", "projects", "experience", "about", "blog"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function updateSpy() {
    var pos = window.scrollY + window.innerHeight * 0.35;
    var currentId = "home";
    spySections.forEach(function (sec) {
      if (sec.offsetTop <= pos) currentId = sec.id;
    });
    navLinks.forEach(function (l) {
      l.classList.toggle("active", l.getAttribute("href") === "#" + currentId);
    });
    mobileMenu.querySelectorAll(".mobile-link").forEach(function (l) {
      l.classList.toggle("active", l.getAttribute("href") === "#" + currentId);
    });
  }
  window.addEventListener("scroll", updateSpy, { passive: true });
  updateSpy();

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  revealEls.forEach(function (el) {
    if (el.dataset.delay) el.style.setProperty("--rd", el.dataset.delay + "ms");
  });

  if ("IntersectionObserver" in window && !reducedMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          finishReveal(entry.target);
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  function finishReveal(el) {
    var delay = parseInt(el.dataset.delay, 10) || 0;
    el.classList.add("visible");
    setTimeout(function () {
      el.removeAttribute("data-reveal");
      el.classList.remove("visible");
      el.style.transitionDelay = "";
    }, 750 + delay);
  }

  /* ---------- Stat counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reducedMotion) { el.textContent = target; return; }
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          countObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { countObs.observe(c); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------- Career timeline progress line ---------- */
  var timeline = document.getElementById("career-timeline");
  var tlProgress = document.getElementById("tl-progress");

  function updateTimeline() {
    if (!timeline || !tlProgress) return;
    var rect = timeline.getBoundingClientRect();
    var mid = window.innerHeight * 0.55;
    var total = rect.height;
    var passed = Math.min(Math.max(mid - rect.top, 0), total);
    tlProgress.style.height = (passed / total) * 100 + "%";
  }
  window.addEventListener("scroll", updateTimeline, { passive: true });
  updateTimeline();

  /* ---------- Accordions (experience cards) ---------- */
  var accItems = document.querySelectorAll(".acc-item");

  function sizePanel(item) {
    var panel = item.querySelector(".acc-panel");
    panel.style.maxHeight = item.classList.contains("open") ? panel.scrollHeight + "px" : "0px";
  }

  accItems.forEach(function (item) { sizePanel(item); });

  document.querySelectorAll(".acc-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.parentElement;
      var wasOpen = item.classList.contains("open");
      var group = item.parentElement;
      group.querySelectorAll(".acc-item.open").forEach(function (other) {
        other.classList.remove("open");
        other.querySelector(".acc-btn").setAttribute("aria-expanded", "false");
        sizePanel(other);
      });
      if (!wasOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        sizePanel(item);
      }
    });
  });

  window.addEventListener("resize", function () {
    accItems.forEach(sizePanel);
  });

  /* ---------- Projects ---------- */
  var projectsGrid = document.getElementById("projects-grid");
  var projectsEmpty = document.getElementById("projects-empty");

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = String(str == null ? "" : str);
    return d.innerHTML;
  }

  function renderProject(p, idx) {
    var catLabel = p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "Project";
    var media = p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + ' project cover" loading="lazy" />'
      : '<div class="post-media-fallback ' + esc(p.gradient || "") + '"><svg class="ic"><use href="#i-folder"/></svg></div>';
    var tech = (p.tech || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
    var gh = p.github
      ? '<a href="' + esc(p.github) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-github"/></svg> Code</a>'
      : "";
    var demo = p.demo
      ? '<a href="' + esc(p.demo) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-arrow-r"/></svg> Live Demo</a>'
      : "";

    var card = document.createElement("article");
    card.className = "project-card glass";
    card.setAttribute("data-category", esc(p.category || ""));
    card.setAttribute("data-reveal", "");
    card.style.transitionDelay = (idx % 3) * 70 + "ms";
    card.innerHTML =
      '<div class="project-media">' + media + '<span class="project-cat">' + esc(catLabel) + "</span></div>" +
      '<div class="project-body">' +
        "<h3>" + esc(p.title) + "</h3>" +
        '<p class="project-field"><strong>Problem</strong>' + esc(p.problem) + "</p>" +
        '<p class="project-field"><strong>Solution</strong>' + esc(p.solution) + "</p>" +
        '<p class="project-field"><strong>My Role</strong>' + esc(p.role) + "</p>" +
        '<p class="project-field"><strong>Key Contribution</strong>' + esc(p.contribution) + "</p>" +
        '<div class="project-tech">' + tech + "</div>" +
        '<div class="project-links">' + gh + demo + "</div>" +
      "</div>";
    return card;
  }

  if (data.projects.length) {
    projectsEmpty.remove();
    data.projects.forEach(function (p) {
      projectsGrid.appendChild(renderProject(p));
      var el = projectsGrid.lastElementChild;
      if (!reducedMotion && "IntersectionObserver" in window) {
        revealObs.observe(el);
      } else {
        el.classList.add("visible");
      }
    });
  }

  /* Project filters */
  var projectFilters = document.querySelectorAll("[data-filter]");
  projectFilters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      projectFilters.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var filter = btn.getAttribute("data-filter");
      projectsGrid.querySelectorAll(".project-card").forEach(function (card) {
        var match = filter === "all" || card.getAttribute("data-category") === filter;
        card.style.display = match ? "" : "none";
      });
      var anyVisible = filter === "all" ||
        Array.prototype.some.call(projectsGrid.querySelectorAll(".project-card"), function (card) {
          return card.getAttribute("data-category") === filter;
        });
      var emptyNote = projectsGrid.querySelector(".filter-empty");
      if (!anyVisible && !emptyNote) {
        var note = document.createElement("p");
        note.className = "blog-empty filter-empty";
        note.style.gridColumn = "1 / -1";
        note.textContent = "No projects in this category yet.";
        projectsGrid.appendChild(note);
      } else if (anyVisible && emptyNote) {
        emptyNote.remove();
      }
    });
  });

  /* ---------- Blog feed ---------- */
  var blogFeed = document.getElementById("blog-feed");
  var blogEmpty = document.getElementById("blog-empty");

  function renderPost(post, idx) {
    var catClass = "cat-" + post.category;
    var gradClass = post.image ? "" : "post-media gradient-" + post.gradient;
    var media = post.image
      ? '<img src="' + esc(post.image) + '" alt="' + esc(post.title) + '" loading="lazy" />'
      : '<div class="' + gradClass + '"><span class="post-media-fallback"><svg class="ic"><use href="#i-camera"/></svg></span></div>';
    var locationLine = post.location
      ? '<span><svg class="ic"><use href="#i-pin"/></svg>' + esc(post.location) + "</span>"
      : "";
    var tags = (post.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");

    var article = document.createElement("article");
    article.className = "post-card glass";
    article.setAttribute("data-post-cat", esc(post.category || ""));
    article.innerHTML =
      '<header class="post-head">' +
        '<div class="avatar">MS</div>' +
        '<div class="post-id">' +
          "<h4>Md. Shagor Islam</h4>" +
          '<div class="post-meta">' +
            '<span><svg class="ic"><use href="#i-calendar"/></svg>' + esc(post.date) + "</span>" +
            locationLine +
          "</div>" +
        "</div>" +
        '<span class="cat-chip ' + esc(catClass) + '">' + esc(post.category) + "</span>" +
      "</header>" +
      "<h3 class=\"post-title\">" + esc(post.title) + "</h3>" +
      '<p class="post-caption">' + esc(post.caption) + "</p>" +
      '<div class="post-media-wrap">' + media + "</div>" +
      '<div class="post-tags">' + tags + "</div>" +
      '<footer class="post-actions">' +
        '<button type="button" class="action-btn like-btn"><svg class="ic"><use href="#i-heart"/></svg><span class="like-label">Like</span></button>' +
        '<button type="button" class="action-btn comment-btn"><svg class="ic"><use href="#i-comment"/></svg><span>Comment</span></button>' +
        '<button type="button" class="action-btn share-btn"><svg class="ic"><use href="#i-share"/></svg><span>Share</span></button>' +
      "</footer>";
    return article;
  }

  if (data.posts.length) {
    data.posts.forEach(function (post, i) {
      blogFeed.appendChild(renderPost(post, i));
    });
  } else {
    blogEmpty.textContent = "No posts yet — new updates coming soon.";
    blogEmpty.classList.remove("hidden");
  }

  /* Blog interactions */
  blogFeed.addEventListener("click", function (e) {
    var likeBtn = e.target.closest(".like-btn");
    var commentBtn = e.target.closest(".comment-btn");
    var shareBtn = e.target.closest(".share-btn");

    if (likeBtn) {
      likeBtn.classList.toggle("liked");
      var label = likeBtn.querySelector(".like-label");
      label.textContent = likeBtn.classList.contains("liked") ? "Liked" : "Like";
    } else if (commentBtn) {
      showToast("Comments are coming soon — reach out via the contact form!");
    } else if (shareBtn) {
      var title = shareBtn.closest(".post-card").querySelector(".post-title").textContent;
      if (navigator.share) {
        navigator.share({ title: title, url: window.location.href + "#blog" }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href + "#blog").then(function () {
          showToast("Link copied to clipboard");
        });
      }
    }
  });

  /* Blog filters */
  var blogFilters = document.querySelectorAll("[data-blog-filter]");
  blogFilters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      blogFilters.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var filter = btn.getAttribute("data-blog-filter");
      var visible = 0;
      blogFeed.querySelectorAll(".post-card").forEach(function (card) {
        var match = filter === "all" || card.getAttribute("data-post-cat") === filter;
        card.style.display = match ? "" : "none";
        if (match) visible++;
      });
      blogEmpty.classList.toggle("hidden", visible > 0);
    });
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contact-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("cf-name").value.trim();
    var email = document.getElementById("cf-email").value.trim();
    var subject = document.getElementById("cf-subject").value.trim();
    var message = document.getElementById("cf-message").value.trim();
    var body = "Name: " + name + "\nEmail: " + email + "\n\n" + message;
    window.location.href =
      "mailto:shagor.cst@gmail.com?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    showToast("Opening your email app…");
  });

  /* ---------- Placeholder links ---------- */
  document.querySelectorAll("a[data-placeholder]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      showToast("Add your profile link in index.html (search: data-placeholder)");
    });
  });

  /* ---------- Back to top ---------- */
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  /* ---------- Toast ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  /* ---------- Hero terminal typing ---------- */
  var termBody = document.getElementById("terminal-body");
  var script = [
    { prompt: true, text: "kubectl get pods" },
    { out: true, text: "web-app-7f9c4d     1/1   Running   0" },
    { out: true, ok: true, text: "api-service-84b2   1/1   Running   0" },
    { prompt: true, text: "docker ps --format '{{.Names}}'" },
    { out: true, text: "nginx-proxy" },
    { out: true, text: "redis-cache" },
    { prompt: true, text: "ssh admin@ec2-prod-01" },
    { out: true, ok: true, text: "connected — Ubuntu 22.04 LTS" },
    { prompt: true, text: "systemctl status nginx | head -3" },
    { out: true, ok: true, text: "active (running)" }
  ];

  function buildStatic() {
    var html = "";
    script.forEach(function (line) {
      if (line.prompt) {
        html += '<div class="t-line"><span class="t-prompt">$ </span><span class="t-cmd">' + escapeHtml(line.text) + "</span></div>";
      } else {
        html += '<div class="t-line t-' + (line.ok ? "ok" : "out") + '">' + escapeHtml(line.text) + "</div>";
      }
    });
    html += '<div class="t-line"><span class="t-prompt">$ </span><span class="cursor"></span></div>';
    termBody.innerHTML = html;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function typeSequence(done) {
    var li = 0;
    var ci = 0;
    var current = null;

    function nextFrame() {
      if (li >= script.length) {
        var end = document.createElement("div");
        end.className = "t-line";
        end.innerHTML = '<span class="t-prompt">$ </span><span class="cursor"></span>';
        termBody.appendChild(end);
        done();
        return;
      }
      var line = script[li];
      if (!current) {
        current = document.createElement("div");
        current.className = "t-line" + (line.prompt ? "" : line.ok ? " t-ok" : " t-out");
        if (line.prompt) {
          current.innerHTML = '<span class="t-prompt">$ </span><span class="t-cmd"></span>';
        }
        termBody.appendChild(current);
        ci = 0;
      }
      var targetEl = line.prompt ? current.querySelector(".t-cmd") : current;
      ci++;
      targetEl.textContent = line.text.slice(0, ci);
      if (ci >= line.text.length) {
        li++;
        current = null;
        setTimeout(nextFrame, line.prompt ? 350 : 120);
      } else {
        setTimeout(nextFrame, line.prompt ? 42 : 14);
      }
    }
    nextFrame();
  }

  if (reducedMotion) {
    buildStatic();
  } else {
    typeSequence(function () {});
  }
})();
