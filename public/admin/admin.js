/* Admin Panel SPA — portfolio CMS */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function toast(msg, isErr) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function api(path, method, body) {
    return fetch(path, {
      method: method || "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin"
    }).then(function (r) {
      if (r.status === 401) { showLogin(); throw new Error("Please sign in again."); }
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || "Request failed");
        return d;
      });
    }, function () {
      throw new Error("Network error — is the server running?");
    });
  }

  /* Wraps an action: disables the button, shows a spinner, restores on finish,
     auto-toasts any thrown error so nothing can fail silently. */
  function guard(btn, fn, busyLabel) {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.innerHTML = '<span class="spin"></span>' + (busyLabel || "Saving…");
    Promise.resolve().then(fn).then(
      function () { btn.disabled = false; btn.innerHTML = orig; },
      function (err) { btn.disabled = false; btn.innerHTML = orig; toast((err && err.message) || "Something went wrong", true); }
    );
  }

  /* ================= auth flow ================= */

  function showLogin() {
    $("#app-view").classList.add("hidden");
    $("#login-view").classList.remove("hidden");
  }
  function showApp() {
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    refreshMsgPill();
    route();
  }

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var errEl = $("#login-error");
    errEl.classList.add("hidden");
    guard($("#login-form").querySelector("button[type=submit]"), function () {
      return api("/api/admin/login", "POST", { username: $("#login-user").value, password: $("#login-pass").value })
        .then(function () { $("#login-pass").value = ""; showApp(); },
          function (err) {
            errEl.textContent = err.message;
            errEl.classList.remove("hidden");
            throw err;
          });
    }, "Signing in…");
  });

  $("#logout-btn").addEventListener("click", function () {
    api("/api/admin/logout", "POST").then(function () { location.reload(); });
  });

  api("/api/admin/me").then(function (d) {
    if (d.ok) {
      showApp();
      if (!d.passwordChanged) {
        setTimeout(function () { toast("Default password in use — change it in Settings", true); }, 600);
      }
    } else showLogin();
  }).catch(showLogin);

  function refreshMsgPill() {
    api("/api/admin/stats").then(function (s) {
      var pill = $("#msg-pill");
      if (s.unreadMessages > 0) { pill.textContent = s.unreadMessages; pill.classList.remove("hidden"); }
      else pill.classList.add("hidden");
    }).catch(function () {});
  }

  /* ================= sidebar / routing ================= */

  $("#burger").addEventListener("click", function () {
    $("#sidebar").classList.toggle("open");
    $("#backdrop").classList.toggle("show");
  });
  $("#backdrop").addEventListener("click", closeSidebar);
  function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#backdrop").classList.remove("show");
  }

  var MODULES = {};
  var ROUTE_PARAM = null;
  function register(key, title, renderFn) {
    MODULES[key] = { title: title, render: renderFn };
  }

  function route() {
    var seg = (location.hash || "#/dashboard").replace("#/", "").split("?")[0].split("/");
    var key = seg[0] || "dashboard";
    ROUTE_PARAM = seg[1] || null;
    if (!MODULES[key]) key = "dashboard";
    $$("#side-nav a").forEach(function (a) {
      var n = a.getAttribute("data-nav");
      a.classList.toggle("active", n === key || (n === "blog" && key === "blogedit"));
    });
    closeSidebar();
    $("#page-title").textContent = MODULES[key].title;
    var content = $("#content");
    content.innerHTML = '<p class="empty-note"><span class="spin" style="display:inline-block"></span> Loading…</p>';
    Promise.resolve(MODULES[key].render(content, ROUTE_PARAM)).catch(function (err) {
      content.innerHTML = '<div class="card"><h3>Error</h3><p>' + esc(err.message || "") + "</p></div>";
    });
  }
  window.addEventListener("hashchange", function () { if (!$("#app-view").classList.contains("hidden")) route(); });

  /* ================= shared UI helpers ================= */

  function field(label, attrs, value, hint) {
    return '<div class="field"><label>' + esc(label) + "</label>" +
      "<input type=\"text\" " + attrs + ' value="' + esc(value == null ? "" : value) + '" />' +
      (hint ? '<p class="hint">' + esc(hint) + "</p>" : "") + "</div>";
  }
  function textareaField(label, attrs, value) {
    return '<div class="field"><label>' + esc(label) + "</label>" +
      "<textarea " + attrs + ">" + esc(value == null ? "" : value) + "</textarea></div>";
  }
  function lines(arr) { return (arr || []).join("\n"); }
  function toLines(str) {
    return String(str || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
  }
    function toList(str) {
    return String(str || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------- Rich text editor (blog content) ----------
     Lightweight contenteditable toolbar editor. Produces sanitised HTML
     that the server re-sanitises before storage. */
  function richTextField(label, initialHTML, opts) {
    opts = opts || {};
    var id = opts.id || ("rte-" + Math.random().toString(36).slice(2, 8));
    var h = initialHTML == null ? "" : String(initialHTML);
    if (!isRichHTML(h) && h.trim()) {
      h = "<p>" + h.replace(/\n/g, "<br />") + "</p>";
    }
    return '<div class="field rich-field"><label>' + esc(label) + "</label>" +
      '<div class="rte-toolbar" id="' + esc(id) + '-tb">' +
        rteBtn(id, "paragraph", "P", "Paragraph") +
        rteBtn(id, "formatBlock", "h1", "H1") +
        rteBtn(id, "formatBlock", "h2", "H2") +
        rteBtn(id, "formatBlock", "h3", "H3") +
        '<span class="rte-sep"></span>' +
        rteBtn(id, "bold", "B", "Bold") +
        rteBtn(id, "italic", "I", "Italic") +
        rteBtn(id, "underline", "U", "Underline") +
        rteBtn(id, "strikeThrough", "S", "Strikethrough") +
        '<span class="rte-sep"></span>' +
        rteBtn(id, "insertUnorderedList", "• List", "Bullet list") +
        rteBtn(id, "insertOrderedList", "1. List", "Numbered list") +
        rteBtn(id, "formatBlock", "blockquote", "❝", "Blockquote") +
        rteBtn(id, "createLink", "🔗", "Insert link") +
        '<span class="rte-sep"></span>' +
        '<button type="button" class="rte-btn" data-rte="justifyLeft" data-rteA="justifyLeft">⇤</button>' +
        '<button type="button" class="rte-btn" data-rte="justifyCenter" data-rteA="justifyCenter">⏺</button>' +
        '<button type="button" class="rte-btn" data-rte="justifyRight" data-rteA="justifyRight">⇥</button>' +
        '<span class="rte-sep"></span>' +
        rteBtn(id, "clearFormat" === "clearFormat" ? "removeFormat" : "removeFormat", "⌫ Clear", "Clear formatting") +
      "</div>" +
      '<div class="rte-editor" id="' + esc(id) + '" contenteditable="true" data-placeholder="' + esc(opts.placeholder || "Write your content here…") + '">' + h + "</div>" +
      '<input type="hidden" id="' + esc(id) + '-out" />' +
      (opts.hint ? '<p class="hint">' + esc(opts.hint) + "</p>" : "") +
      "</div>";
  }

  function rteBtn(id, cmd, label, title) {
    return '<button type="button" class="rte-btn" data-rte="' + esc(cmd) + '" data-rteA="' + esc(cmd) + '" title="' + esc(title || cmd) + '">' + esc(label) + "</button>";
  }

  function isRichHTML(s) {
    return /<(p|br|ul|ol|h[123]|blockquote|div|li|strong|b|em|i|u|a|pre|code)[\s>]/i.test(s || "");
  }

  /* Bind toolbar buttons + editor. Returns { getHTML, setHTML } */
  function bindRichEditor(root, outId) {
    var editor = root.querySelector(".rte-editor");
    var out = document.getElementById(outId);
    out.value = editor.innerHTML;

    function pull() {
      var v = editor.innerHTML.replace(/^\s*<br\s*\/?>\s*/, "");
      if (!v || v === "<br>") { out.value = ""; return; }
      out.value = v;
    }
    function exec(cmd, arg) {
      editor.focus();
      try { document.execCommand(cmd, false, arg); } catch (e) {}
      push();
    }
    function formatBlock(block) {
      if (block === "paragraph") block = "p";
      else if (block === "blockquote") block = "blockquote";
      else return exec("formatBlock", "<" + block + ">");
      return exec("formatBlock", "<" + block + ">");
    }
    editor.addEventListener("input", pull);
    editor.addEventListener("keyup", pull);

    root.querySelectorAll("[data-rte]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cmd = btn.getAttribute("data-rte");
        if (cmd === "formatBlock") {
          var label = btn.textContent.trim().toLowerCase();
          var block = label === "p" ? "p" : label === "h1" ? "h1" : label === "h2" ? "h2" : label === "h3" ? "h3" : label === "❝" ? "blockquote" : null;
          formatBlock(block || "p");
        } else if (cmd === "createLink") {
          var url = prompt("Enter link URL (https://…):");
          if (url) exec("createLink", url);
        } else {
          exec(cmd);
        }
      });
    });

    function push() { out.value = editor.innerHTML; }

    return {
      getHTML: function () {
        var v = editor.innerHTML.replace(/^\s*<br\s*\/?>\s*/, "");
        return (!v || v === "<br>") ? "" : v;
      },
      setHTML: function (h) {
        editor.innerHTML = h || "";
        out.value = editor.innerHTML;
      }
    };
  }

  /* YouTube detection + embed for previewing video URLs */
  function isYouTubeUrl(u) {
    return /(^|\.)youtube\.com|youtu\.be/i.test(u || "");
  }
  function youtubeEmbed(u) {
    var m = String(u || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/i);
    return m ? "https://www.youtube.com/embed/" + m[1] + "?rel=0" : "";
  }

  /* Upload a single video to the media library — returns permanent URL */
  function uploadVideo(file) {
    if (!/^video\//.test(file.type)) return Promise.reject(new Error("Only video files (MP4, WEBM, MOV) are allowed."));
    if (file.size > 256 * 1024 * 1024) return Promise.reject(new Error("Video too large (max 256MB)."));
    return fileToDataURL(file).then(function (data) {
      return api("/api/admin/media", "POST", { kind: "video", name: file.name, data: data });
    }).then(function (arr) { return arr[0]; });
  }


  function fmtDate(d) {
    if (!d) return "—";
    var dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtDateTime(d) {
    if (!d) return "—";
    var dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
      dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  /* --- reorderable list helper (drag handle + up/down buttons, persists both ways) --- */
  function makeSortable(container, col, onSave) {
    var dragged = null;
    var startOrder = null;

    function currentIds() {
      return $$(".dd-item", container).map(function (n) { return n.getAttribute("data-id") || n.getAttribute("data-key"); });
    }
    function sendOrder() {
      var ids = currentIds();
      if (col) {
        api("/api/admin/" + col + "/order", "PUT", { ids: ids }).then(function () {
          toast("Order saved");
          if (onSave) onSave(ids);
        }, function (err) { toast(err.message, true); });
      } else if (onSave) onSave(ids);
    }

    $$(".dd-item", container).forEach(function (item) {
      var handle = $(".drag-handle", item);
      if (handle) {
        handle.addEventListener("mousedown", function () { item.draggable = true; });
        handle.addEventListener("touchstart", function () { item.draggable = true; }, { passive: true });
      }
      item.addEventListener("dragstart", function (e) {
        dragged = item;
        startOrder = currentIds().join("|");
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      item.addEventListener("dragend", function () {
        item.classList.remove("dragging");
        item.draggable = false;
        dragged = null;
        if (startOrder !== null && currentIds().join("|") !== startOrder) sendOrder();
        startOrder = null;
      });
      item.addEventListener("dragover", function (e) {
        e.preventDefault();
        if (!dragged || dragged === item) return;
        var rect = item.getBoundingClientRect();
        var before = e.clientY < rect.top + rect.height / 2;
        container.insertBefore(dragged, before ? item : item.nextSibling);
      });
      item.addEventListener("drop", function (e) { e.preventDefault(); });
    });

    $$("[data-up]", container).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".dd-item");
        var prev = item.previousElementSibling;
        if (prev) { container.insertBefore(item, prev); sendOrder(); }
      });
    });
    $$("[data-down]", container).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".dd-item");
        var next = item.nextElementSibling;
        if (next) { container.insertBefore(next, item); sendOrder(); }
      });
    });
  }

  /* ================= image upload plumbing ================= */

  function fileToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error("Could not read file.")); };
      r.readAsDataURL(file);
    });
  }

  /* Select → validate → preview handled by caller → upload → returns permanent URL */
  function uploadSingle(file) {
    if (!/^image\//.test(file.type)) return Promise.reject(new Error("Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed."));
    if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error("Image too large (max 10MB)."));
    return fileToDataURL(file).then(function (data) {
      return api("/api/admin/media", "POST", { name: file.name, data: data });
    }).then(function (arr) { return arr[0].url; });
  }

  function uploadFiles(files) {
    files = Array.prototype.slice.call(files || [])
      .filter(function (f) { return /^image\//.test(f.type); })
      .slice(0, 12);
    if (!files.length) {
      return Promise.reject(new Error("No valid images selected (JPG, PNG, WEBP, GIF, SVG)."));
    }
    return Promise.all(files.map(function (f) {
      return fileToDataURL(f).then(function (data) { return { name: f.name, data: data }; });
    })).then(function (images) {
      return api("/api/admin/media", "POST", { images: images });
    }).then(function () {
      toast("✓ Uploaded " + files.length + " image" + (files.length === 1 ? "" : "s") + " successfully");
    });
  }

  function thumbsHTML(urls) {
    return (urls || []).map(function (u) {
      return '<div class="img-thumb"><img src="' + esc(u) + '" alt="" /><button type="button" data-remove-img="' + esc(u) + '">✕</button></div>';
    }).join("");
  }
  function bindThumbRemove(root, getArr, rerender) {
    $$("[data-remove-img]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var arr = getArr();
        var i = arr.indexOf(b.getAttribute("data-remove-img"));
        if (i >= 0) arr.splice(i, 1);
        rerender();
      });
    });
  }

  /* ================= MEDIA PICKER ================= */

  var pickerCb = null;
  var pickerSelected = [];
  var pickerMultiple = false;

  function openPicker(multiple, cb) {
    pickerCb = cb; pickerMultiple = multiple; pickerSelected = [];
    $("#picker-title").textContent = multiple ? "Select images" : "Select an image";
    $("#picker-use").textContent = multiple ? "Use Selected" : "Use This Image";
    $("#picker-overlay").classList.remove("hidden");
    loadPickerGrid();
  }
  function closePicker() {
    $("#picker-overlay").classList.add("hidden");
    pickerCb = null;
  }
  function loadPickerGrid() {
    var zone = $("#picker-zone");
    api("/api/admin/media").then(function (list) {
      var grid = $("#picker-grid");
      grid.innerHTML = list.length ? "" : '<p class="empty-note">No images yet — upload some above.</p>';
      list.forEach(function (m) {
        var tile = document.createElement("div");
        tile.className = "media-tile";
        tile.innerHTML = '<img src="' + esc(m.url) + '" alt="" />';
        $("img", tile).addEventListener("click", function () {
          if (pickerMultiple) {
            var i = pickerSelected.indexOf(m.url);
            if (i >= 0) { pickerSelected.splice(i, 1); tile.classList.remove("selected"); }
            else { pickerSelected.push(m.url); tile.classList.add("selected"); }
          } else {
            closePicker();
            if (pickerCb) pickerCb(m.url);
          }
        });
        grid.appendChild(tile);
      });
    }, function (err) { toast(err.message, true); });
    void zone;
  }
  $("#picker-close").addEventListener("click", closePicker);
  $("#picker-cancel").addEventListener("click", closePicker);
  $("#picker-use").addEventListener("click", function () {
    if (!pickerSelected.length) return toast("Select at least one image", true);
    var urls = pickerSelected.slice();
    closePicker();
    if (pickerCb) pickerCb(urls);
  });
  $("#picker-upload").addEventListener("change", function () {
    var zone = $("#picker-zone");
    var input = this;
    if (!input.files.length) return;
    guard(zone, function () {
      return uploadFiles(input.files).then(loadPickerGrid, function (err) { toast(err.message, true); })
        .then(function () { input.value = ""; });
    }, "Uploading…");
  });
  ["dragover", "dragleave", "drop"].forEach(function (ev) {
    $("#picker-zone").addEventListener(ev, function (e) {
      e.preventDefault();
      this.classList.toggle("dragover", ev === "dragover");
      if (ev === "drop") {
        var self = this;
        guard(self, function () {
          return uploadFiles(e.dataTransfer.files).then(loadPickerGrid, function (err) { toast(err.message, true); });
        }, "Uploading…");
      }
    });
  });

  /* ================= LIVE PREVIEW MODAL ================= */

  function openPreview(title, innerHTML) {
    $("#preview-title").textContent = title;
    $("#preview-body").innerHTML =
      '<div class="preview-note">Live preview — exactly what visitors will see on the public Blog.</div>' + innerHTML;
    $("#preview-overlay").classList.remove("hidden");
  }
  function closePreview() { $("#preview-overlay").classList.add("hidden"); }
  $("#preview-close").addEventListener("click", closePreview);
  $("#preview-overlay").addEventListener("click", function (e) { if (e.target === this) closePreview(); });

  /* Builds a public-site-style card from a post object */
  function postPreviewHTML(p) {
    var imgs = p.images || [];
    var gallery = "";
    if (imgs.length === 1) gallery = '<div class="pv-gallery g1"><img src="' + esc(imgs[0]) + '" alt="" /></div>';
    else if (imgs.length) gallery = '<div class="pv-gallery g' + Math.min(imgs.length, 2) + '">' + imgs.slice(0, 2).map(function (u) {
      return '<img src="' + esc(u) + '" alt="" />';
    }).join("") + "</div>";
    var tags = (p.tags || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
    var body = p.text || "";
    if (body && !/<[a-z][\s\S]*>/i.test(body)) {
      body = "<p>" + esc(body).replace(/\n/g, "<br />") + "</p>";
    }
    return '<article class="pv-post">' +
      (p.category ? '<span class="pv-cat">' + esc(p.category) + "</span>" : "") +
      '<h3 class="pv-title">' + esc(p.title || "Untitled post") + "</h3>" +
      '<div class="pv-meta">Md. Shagor Islam · ' + esc(fmtDate(p.date)) + (p.location ? " · 📍 " + esc(p.location) : "") + "</div>" +
      '<div class="pv-text">' + body + "</div>" + gallery +
      (tags ? '<div class="pv-tags">' + tags + "</div>" : "") +
      "</article>";
  }

  /* ================= MODULES ================= */

  /* ---------- Dashboard ---------- */
  register("dashboard", "Dashboard", function (content) {
    return Promise.all([
      api("/api/admin/stats"),
      api("/api/admin/posts"),
      api("/api/admin/activity")
    ]).then(function (res) {
      var s = res[0], posts = res[1], activity = res[2];
      posts.sort(function (a, b) { return String(b.updatedAt || b.date || "").localeCompare(String(a.updatedAt || a.date || "")); });

      content.innerHTML =
        '<div class="stat-grid">' +
          stat(s.projects, "Projects") +
          stat(s.posts, "Total Posts") +
          stat(s.publishedPosts != null ? s.publishedPosts : s.posts - s.drafts, "Published") +
          stat(s.draftPosts != null ? s.draftPosts : s.drafts, "Drafts") +
          stat(s.experiences, "Experience") +
          stat(s.messages + (s.unreadMessages ? ' <small style="color:var(--red)">(' + s.unreadMessages + " new)</small>" : ""), "Messages") +
        "</div>" +
        '<div class="stat-grid">' +
          stat(s.views != null ? (typeof s.views === "object" ? Number(s.views.total || 0).toLocaleString() : Number(s.views || 0).toLocaleString()) : "—", "Total Views") +
          stat(s.visitors != null ? Number(s.visitors || 0).toLocaleString() : "—", "Unique Visitors") +
          stat(s.education != null ? s.education : (s.about && s.about.education ? s.about.education.length : "—"), "Education") +
          stat(s.media != null ? s.media : "—", "Media Files") +
          stat(s.images != null ? s.images : "—", "Images") +
          stat(s.videos != null ? s.videos : "—", "Videos") +
        "</div>" +
        '<div class="card"><h3>Quick Actions</h3><div class="form-actions">' +
          '<a class="btn-primary" style="text-decoration:none" href="#/blognew">＋ Create Post</a>' +
          '<a class="btn-ghost" style="text-decoration:none" href="#/projects">＋ New Project</a>' +
          '<a class="btn-ghost" style="text-decoration:none" href="#/media">Media Library</a>' +
          '<a class="btn-ghost" style="text-decoration:none" href="#/messages">View Messages</a>' +
        "</div></div>" +
        '<div class="dash-cols">' +
          '<div class="card"><h3>Recent Blog Posts <a href="#/blog" style="font-size:0.8rem;font-weight:600;text-decoration:none">All posts →</a></h3>' +
            (posts.length
              ? '<div class="table-wrap" style="box-shadow:none"><table class="tbl" style="min-width:0"><tbody>' +
                posts.slice(0, 5).map(function (p) {
                  return "<tr><td><div class='t-title'>" + esc(p.title || "Untitled") + "</div><div class='t-sub'>" + esc(fmtDate(p.date)) + "</div></td>" +
                    '<td><span class="badge ' + (p.status === "published" ? "pub" : "draft") + '"><i></i>' + (p.status === "published" ? "Published" : "Draft") + "</span></td>" +
                    '<td style="text-align:right"><a class="btn-mini" style="text-decoration:none" href="#/blogedit/' + p.id + '">Edit</a></td></tr>';
                }).join("") + "</tbody></table></div>"
              : '<p class="empty-note">No posts yet.</p>') +
          "</div>" +
          '<div class="card"><h3>Recent Activity</h3>' +
            (activity.length
              ? '<ul class="activity-list">' + activity.slice(0, 8).map(function (a) {
                  return '<li><span class="act-dot"></span><span>' + esc(a.text) + '</span><span class="act-date">' + esc(fmtDateTime(a.date)) + "</span></li>";
                }).join("") + "</ul>"
              : '<p class="empty-note">Activity will appear here as you work.</p>') +
          "</div>" +
        "</div>";

      function stat(n, l) { return '<div class="stat-box"><div class="stat-num">' + n + '</div><div class="stat-lbl">' + esc(l) + "</div></div>"; }
    });
  });

  /* ---------- HOME ---------- */
  register("home", "Home Page", function (content) {
    return api("/api/admin/home").then(function (h) {
      content.innerHTML =
        '<div class="card"><h3>Hero Section</h3>' +
          field("Name", 'id="hm-name"', h.name) +
          '<div class="grid-2">' + field("Professional title", 'id="hm-title"', h.title) + field("Secondary line", 'id="hm-subtitle"', h.subtitle) + "</div>" +
          textareaField("Short description", 'id="hm-desc" rows="3"', h.description) +
          field("Current position badge", 'id="hm-cur"', h.currentPosition) +
        "</div>" +
        '<div class="card"><h3>Buttons</h3><div class="grid-2">' +
          field("Primary label", 'id="hm-p-label"', h.primaryBtn.label) + field("Primary link", 'id="hm-p-href"', h.primaryBtn.href) +
          field("Secondary label", 'id="hm-s-label"', h.secondaryBtn.label) + field("Secondary link", 'id="hm-s-href"', h.secondaryBtn.href) +
        "</div></div>" +
        '<div class="card"><h3>Hero Image</h3>' +
          '<div class="img-thumbs" id="hm-thumb">' + (h.heroImage ? thumbsHTML([h.heroImage]) : "") + "</div>" +
          '<div class="form-actions"><button type="button" class="btn-mini" id="hm-pick">Choose Image</button>' +
          '<button type="button" class="btn-danger" id="hm-clear">Remove Image</button></div>' +
          '<p class="hint">If no image is set, a decorative terminal graphic is shown.</p>' +
        "</div>" +
        '<div class="card"><h3>Skills shown on homepage</h3><div class="chips-editor" id="hm-skills"></div></div>' +
        '<div class="form-actions"><button type="button" class="btn-primary" id="hm-save">Save Changes</button>' +
        '<a class="btn-ghost" style="text-decoration:none" href="/" target="_blank">Preview Site ↗</a></div>';

      var skills = h.skills.slice();
      var heroImg = h.heroImage || "";

      renderChips($("#hm-skills"), skills);
      bindThumbRemove($("#hm-thumb"), function () { return [heroImg]; }, function () {
        $("#hm-thumb").innerHTML = heroImg ? thumbsHTML([heroImg]) : "";
      });
      $("#hm-pick").addEventListener("click", function () {
        openPicker(false, function (url) { heroImg = url; $("#hm-thumb").innerHTML = thumbsHTML([url]); });
      });
      $("#hm-clear").addEventListener("click", function () { heroImg = ""; $("#hm-thumb").innerHTML = ""; });

      $("#hm-save").addEventListener("click", function () {
        guard($("#hm-save"), function () {
          return api("/api/admin/home", "PUT", {
            name: val("#hm-name"), title: val("#hm-title"), subtitle: val("#hm-subtitle"),
            description: val("#hm-desc"), currentPosition: val("#hm-cur"),
            primaryBtn: { label: val("#hm-p-label"), href: val("#hm-p-href") },
            secondaryBtn: { label: val("#hm-s-label"), href: val("#hm-s-href") },
            heroImage: heroImg, skills: skills
          }).then(function () { toast("✓ Home page saved successfully"); });
        });
      });

      function val(sel) { return $(sel).value; }
      function renderChips(root, arr) {
        root.innerHTML = arr.map(function (s, i) {
          return '<span class="chip-tag">' + esc(s) + '<button type="button" data-i="' + i + '">✕</button></span>';
        }).join("") +
        '<span class="chip-add"><input type="text" placeholder="Add skill…" id="hm-newskill" /><button type="button" id="hm-addskill">Add</button></span>';
        $$("[data-i]", root).forEach(function (b) {
          b.addEventListener("click", function () { skills.splice(+b.dataset.i, 1); renderChips(root, skills); });
        });
        $("#hm-addskill", root).addEventListener("click", function () {
          var v = $("#hm-newskill", root).value.trim();
          if (v && arr.indexOf(v) === -1) { arr.push(v); renderChips(root, arr); }
        });
        $("#hm-newskill", root).addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); $("#hm-addskill", root).click(); }
        });
      }
    });
  });

  /* ---------- ABOUT (dedicated, simple) ---------- */
  register("about", "About", function (content) {
    return Promise.all([api("/api/admin/about"), api("/api/admin/resume")]).then(function (r) {
      var base = r[0] || {};
      var res = r[1] || null;
      var profileImage = base.profileImage || "";
      var profileVideo = base.profileVideo || "";
      var mediaType = (base.profileMediaType === "video" && profileVideo) ? "video" : "image";
      var resUrl = (res && /^https?:/i.test(res.url)) ? res.url : "";

      content.innerHTML =
        '<div class="card"><h3>Name &amp; Role</h3>' +
          field("Name", 'id="ab-name"', base.name) +
          field("Work Role / Professional Title", 'id="ab-title"', base.title) +
        "</div>" +
        '<div class="card"><h3>Description</h3>' +
          textareaField("Short professional description", 'id="ab-desc" rows="4"',
            base.shortDescription || base.description || base.detailedDescription || "") +
        "</div>" +
        '<div class="card"><h3>Location</h3>' +
          field("Location", 'id="ab-location"', base.location) +
        "</div>" +
        '<div class="card"><h3>Profile Media</h3>' +
          '<div class="ab-type-row">' +
            '<label class="ab-type"><input type="radio" name="ab-media" id="ab-media-img"' + (mediaType !== "video" ? " checked" : "") + ' /><span>Image</span></label>' +
            '<label class="ab-type"><input type="radio" name="ab-media" id="ab-media-vid"' + (mediaType === "video" ? " checked" : "") + ' /><span>Video</span></label>' +
          "</div>" +
          '<div id="ab-media-area" style="margin-top:14px"></div>' +
        "</div>" +
        '<div class="card"><h3>Resume</h3>' +
          '<div id="ab-res"></div>' +
          field("Resume URL (optional, https://…)", 'id="ab-resurl"', resUrl) +
        "</div>" +
        '<div class="form-actions"><button type="button" class="btn-primary" id="ab-save">SAVE CHANGES</button></div>';

      /* ---- Profile Media ---- */
      function abUploadVideo(file) {
        if (!file) return;
        if (!/^video\//.test(file.type)) { toast("Only video files (MP4, WEBM, MOV) are allowed.", true); return; }
        var status = $("#ab-vstatus");
        if (status) status.textContent = "⬆ Uploading " + file.name + "…";
        uploadVideo(file).then(function (url) {
          profileVideo = url;
          if (status) status.textContent = "✓ Uploaded " + file.name;
          renderMedia();
        }, function (err) {
          if (status) status.textContent = "✕ " + (err.message || "Upload failed");
          toast(err.message || "Upload failed", true);
        });
      }
      function renderMedia() {
        var useVideo = $("#ab-media-vid").checked;
        if (useVideo) {
          $("#ab-media-area").innerHTML =
            '<div class="field"><label>Video</label>' +
              '<label class="upload-zone" id="ab-vzone" style="margin-bottom:6px">' +
                '<span class="uz-main">🎬 Drag &amp; Drop Video Here</span>' +
                '<span class="uz-sub">or <strong>Browse Files</strong> — MP4 / WEBM / MOV</span>' +
                '<input type="file" accept="video/*" hidden /></label>' +
              '<p class="hint" id="ab-vstatus">' + (profileVideo ? "" : "Drop a video file or paste a Video URL below.") + "</p>" +
              field("Video URL (optional, direct video or YouTube)", 'id="ab-vurl"',
                /^https?:/i.test(profileVideo) && !/^\/uploads\//.test(profileVideo) ? profileVideo : "") +
              '<div id="ab-vprev" style="margin-top:10px">' + (profileVideo
                ? '<video src="' + esc(profileVideo) + '" controls playsinline style="width:100%;aspect-ratio:16/9;border-radius:10px;background:#000;display:block"></video>'
                : "") + "</div>" +
              (profileVideo ? '<div class="form-actions" style="margin-top:12px"><button type="button" class="btn-danger" id="ab-vrem">Remove Video</button></div>' : "") +
            "</div>";
          $("#ab-vzone").querySelector("input[type=file]").addEventListener("change", function () {
            var file = this.files[0];
            this.value = "";
            abUploadVideo(file);
          });
          ["dragover", "dragleave", "drop"].forEach(function (ev) {
            $("#ab-vzone").addEventListener(ev, function (e) {
              e.preventDefault();
              $("#ab-vzone").classList.toggle("dragover", ev === "dragover");
              if (ev === "drop" && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                abUploadVideo(e.dataTransfer.files[0]);
              }
            });
          });
          $("#ab-vurl").addEventListener("change", function () {
            var v = $("#ab-vurl").value.trim();
            profileVideo = v;
            renderMedia();
          });
          $("#ab-vurl").addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); $("#ab-vurl").blur(); }
          });
          var vr = $("#ab-vrem");
          if (vr) vr.addEventListener("click", function () { profileVideo = ""; renderMedia(); });
        } else {
          $("#ab-media-area").innerHTML =
            '<div class="field"><label>Image</label>' +
              '<div class="img-thumbs" id="ab-pimg">' + thumbsHTML(profileImage ? [profileImage] : []) + "</div>" +
              '<div class="form-actions">' +
                '<button type="button" class="btn-mini" id="ab-chooseimg">Choose Image</button>' +
                '<label class="btn-mini" style="cursor:pointer">Upload Image<input type="file" accept="image/*" id="ab-pup" hidden /></label>' +
              "</div></div>";
          bindThumbRemove($("#ab-pimg"), function () { return [profileImage]; }, function () { profileImage = ""; renderMedia(); });
          $("#ab-chooseimg").addEventListener("click", function () {
            openPicker(false, function (urls) { profileImage = urls[0] || ""; renderMedia(); });
          });
          $("#ab-pup").addEventListener("change", function () {
            var f = $("#ab-pup").files[0];
            $("#ab-pup").value = "";
            if (!f) return;
            guard($("#ab-pup"), function () {
              return uploadSingle(f).then(function (url) { profileImage = url; renderMedia(); });
            }, "Uploading…");
          });
        }
      }
      $$('input[name="ab-media"]').forEach(function (rd) { rd.addEventListener("change", renderMedia); });
      renderMedia();

      /* ---- Resume ---- */
      function abUploadResume(file) {
        if (!file) return;
        if (!/\.pdf$/i.test(file.name)) { toast("Only PDF files are allowed.", true); return; }
        if (file.size > 10 * 1024 * 1024) { toast("PDF too large (max 10MB).", true); return; }
        var status = $("#ab-resstatus");
        var resFile = $("#ab-resfile");
        if (status) status.textContent = "⬆ Uploading " + file.name + "…";
        guard(resFile, function () {
          return fileToDataURL(file).then(function (data) {
            return api("/api/admin/resume", "POST", { filename: file.name, data: data });
          }).then(function (nr) {
            res = nr;
            $("#ab-resurl").value = "";
            toast("✓ Resume updated");
            renderRes();
          }, function (err) {
            if (status) status.textContent = "✕ " + (err.message || "Upload failed");
          });
        }, "Uploading…");
      }
      function renderRes() {
        var has = !!res;
        $("#ab-res").innerHTML =
          '<label class="upload-zone" id="ab-reszone" style="margin-bottom:6px">' +
            '<span class="uz-main">📄 Drag &amp; Drop Resume Here</span>' +
            '<span class="uz-sub">or <strong>Browse Files</strong> — PDF only</span>' +
            '<input type="file" accept="application/pdf,.pdf" id="ab-resfile" hidden /></label>' +
          '<p class="hint" id="ab-resstatus">' + (has
            ? "Current Resume: <b>" + esc(res.filename || res.url) + "</b>"
            : "Drop a resume PDF, use Browse, or paste an external URL below.") + "</p>" +
          (has
            ? '<div class="form-actions" style="margin-top:10px;margin-bottom:0">' +
                '<a class="btn-mini" style="text-decoration:none" target="_blank" rel="noopener" href="' + esc(res.url) + '">View</a>' +
                '<button type="button" class="btn-danger" id="ab-resrem">Remove</button>' +
              "</div>"
            : "");
        var resZone = $("#ab-reszone");
        ["dragover", "dragleave", "drop"].forEach(function (ev) {
          resZone.addEventListener(ev, function (e) {
            e.preventDefault();
            resZone.classList.toggle("dragover", ev === "dragover");
            if (ev === "drop" && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
              abUploadResume(e.dataTransfer.files[0]);
            }
          });
        });
        var rf = $("#ab-resfile");
        rf.addEventListener("change", function () {
          var file = rf.files[0];
          rf.value = "";
          abUploadResume(file);
        });
        var rr = $("#ab-resrem");
        if (rr) rr.addEventListener("click", function () {
          if (!confirm("Remove the active resume from the website?")) return;
          guard(rr, function () {
            return api("/api/admin/resume", "DELETE").then(function () {
              res = null;
              toast("Resume removed");
              renderRes();
            });
          }, "Removing…");
        });
      }
      renderRes();
      $("#ab-resurl").addEventListener("change", function () {
        var v = $("#ab-resurl").value.trim();
        $("#ab-resurl").value = v;
        if (!v) return;
        if (!/^https?:\/\//i.test(v)) return toast("Resume URL must start with http(s)://", true);
        api("/api/admin/resume/url", "PUT", { url: v }).then(function (nr) {
          res = nr;
          toast("✓ Resume URL saved");
          renderRes();
        }, function (err) { toast(err.message, true); });
      });

      /* ---- Save ---- */
      $("#ab-save").addEventListener("click", function () {
        guard($("#ab-save"), function () {
          var useVideo = $("#ab-media-vid").checked;
          return api("/api/admin/about", "PUT", {
            name: $("#ab-name").value,
            title: $("#ab-title").value,
            shortDescription: $("#ab-desc").value,
            description: $("#ab-desc").value,
            location: $("#ab-location").value,
            profileImage: profileImage,
            profileVideo: profileVideo,
            profileMediaType: useVideo ? "video" : "image"
          }).then(function () { toast("✓ About section saved"); });
        });
      });
    });
  });

  /* ---------- SKILLS ---------- */
  register("skills", "Skills", function (content) {
    return api("/api/admin/skills").then(function (list) {
      content.innerHTML =
        '<div class="form-actions" style="margin-bottom:18px"><button type="button" class="btn-primary" id="sk-add">＋ Add Category</button></div>' +
        '<p class="hint" style="margin-bottom:14px">Drag ⠿ or use arrows to reorder — changes save automatically.</p>' +
        '<div id="sk-list"></div>';
      var listEl = $("#sk-list");

      function renderList() {
        listEl.innerHTML = list.map(function (s) {
          return '<div class="dd-item" data-id="' + s.id + '"><div class="row-item"><span class="drag-handle">⠿</span>' +
            '<div class="row-main">' +
              '<input type="text" value="' + esc(s.category) + '" data-cat-name style="font-weight:700;font-family:\'Space Grotesk\';border:none;background:transparent;font-size:1rem;width:auto;padding:2px 0;margin-bottom:8px" />' +
              '<div class="chips-editor sk-chips"></div>' +
            "</div>" +
            '<div class="row-actions">' +
              '<button type="button" class="btn-mini" data-rename="' + s.id + '">Rename ✓</button>' +
              '<button type="button" class="btn-mini" data-up="' + s.id + '">↑</button>' +
              '<button type="button" class="btn-mini" data-down="' + s.id + '">↓</button>' +
              '<button type="button" class="btn-danger" data-del="' + s.id + '">Delete</button>' +
            "</div></div></div>";
        }).join("") || '<p class="empty-note">No skill categories yet.</p>';

        makeSortable(listEl, "skills");

        list.forEach(function (s) {
          var rootEl = $('.dd-item[data-id="' + s.id + '"]', listEl);
          if (rootEl) renderSkillChips(rootEl, s);
        });

        $$("[data-rename]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            var s = list.filter(function (x) { return x.id === b.dataset.rename; })[0];
            var input = $('[data-cat-name]', b.closest(".row-main"));
            var v = input.value.trim();
            if (!v || v === s.category) return;
            guard(b, function () {
              return api("/api/admin/skills/" + s.id, "PUT", { category: v })
                .then(function () { toast("✓ Category renamed"); });
            }, "Renaming…");
          });
        });
        $$("[data-del]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            if (!confirm("Delete this skill category and all its skills?")) return;
            guard(b, function () {
              return api("/api/admin/skills/" + b.dataset.del, "DELETE")
                .then(function () { toast("✓ Deleted successfully"); route(); });
            }, "Deleting…");
          });
        });
      }

      function renderSkillChips(rootEl, s) {
        var box = $(".sk-chips", rootEl);
        box.innerHTML = s.items.map(function (it, i) {
          return '<span class="chip-tag">' + esc(it) + '<button type="button" data-rm="' + i + '">✕</button></span>';
        }).join("") + '<span class="chip-add" style="max-width:260px"><input type="text" placeholder="Add skill…" /><button type="button">Add</button></span>';

        $$("[data-rm]", box).forEach(function (b) {
          b.addEventListener("click", function () {
            s.items.splice(+b.dataset.rm, 1);
            api("/api/admin/skills/" + s.id, "PUT", { items: s.items })
              .then(function () { renderSkillChips(rootEl, s); },
                function (err) { toast(err.message, true); });
          });
        });
        var input = $("input", box), btn = $("button:not([data-rm])", box);
        function add() {
          var v = input.value.trim();
          if (!v || s.items.indexOf(v) !== -1) return;
          s.items.push(v);
          api("/api/admin/skills/" + s.id, "PUT", { items: s.items })
            .then(function () { renderSkillChips(rootEl, s); },
              function (err) { toast(err.message, true); });
        }
        btn.addEventListener("click", add);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
      }

      $("#sk-add").addEventListener("click", function () {
        guard($("#sk-add"), function () {
          return api("/api/admin/skills", "POST", { category: "New Category", items: [] })
            .then(function () { route(); });
        }, "Adding…");
      });
      renderList();
    });
  });

  /* ---------- EXPERIENCE ---------- */
  register("experience", "Job Experience", function (content) {
    return api("/api/admin/experiences").then(function (list) {
      content.innerHTML =
        '<div class="form-actions" style="margin-bottom:18px"><button type="button" class="btn-primary" id="exp-add">＋ Add Experience</button></div>' +
        '<p class="hint" style="margin-bottom:14px">Drag ⠿ or use arrows to reorder — the website shows them top-first. Entries marked <b>Hidden</b> do not appear on the site.</p>' +
        '<div id="exp-list"></div>';
      var listEl = $("#exp-list");

      function renderList() {
        listEl.innerHTML = list.map(function (e) {
          return '<div class="dd-item" data-id="' + e.id + '">' +
            '<div class="row-item"><span class="drag-handle">⠿</span>' +
              (e.logo ? '<img src="' + esc(e.logo) + '" alt="" style="width:52px;height:52px;object-fit:contain;border-radius:10px;border:1px solid var(--line);background:#fff;padding:4px" />' : "") +
              '<div class="row-main"><div class="row-title">' + esc(e.position || "Untitled") +
                (e.current ? ' <span class="badge cur"><i></i>Current · Present</span>' : "") +
                (e.visible === false ? ' <span class="badge draft"><i></i>Hidden</span>' : "") +
              '</div><div class="row-sub">' + esc(e.company || "") + " · " + esc(e.startDate || "?") + " – " + esc(e.current ? "Present" : (e.endDate || "?")) + "</div></div>" +
              '<div class="row-actions">' +
                '<button type="button" class="btn-mini" data-edit="' + e.id + '">Edit</button>' +
                '<button type="button" class="btn-mini" data-vis="' + e.id + '">' + (e.visible === false ? "Show" : "Hide") + "</button>" +
                '<button type="button" class="btn-mini" data-up="' + e.id + '">↑</button>' +
                '<button type="button" class="btn-mini" data-down="' + e.id + '">↓</button>' +
                '<button type="button" class="btn-danger" data-del="' + e.id + '">Delete</button>' +
              "</div></div>" +
            '<div class="editor-panel hidden" data-editor="' + e.id + '"></div>' +
          "</div>";
        }).join("") || '<p class="empty-note">No experience yet. Add your first entry.</p>';

        makeSortable(listEl, "experiences");

        $$("[data-del]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            if (!confirm("Delete this experience entry?")) return;
            guard(b, function () {
              return api("/api/admin/experiences/" + b.dataset.del, "DELETE")
                .then(function () { toast("✓ Deleted successfully"); reload(); });
            }, "Deleting…");
          });
        });
        $$("[data-vis]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            var e = find(b.dataset.vis);
            guard(b, function () {
              return api("/api/admin/experiences/" + e.id, "PUT", { visible: e.visible === false })
                .then(reload);
            }, "Saving…");
          });
        });
        $$("[data-edit]", listEl).forEach(function (b) {
          b.addEventListener("click", function () { openEditor(find(b.dataset.edit), b.closest(".dd-item")); });
        });

        function find(id) { return list.filter(function (x) { return x.id === id; })[0]; }
      }

      function openEditor(e, wrap) {
        var panel = $("[data-editor]", wrap);
        var isOpen = !panel.classList.contains("hidden");
        $$(".editor-panel").forEach(function (p) { p.classList.add("hidden"); p.innerHTML = ""; });
        if (isOpen) return;
        panel.innerHTML =
          '<div class="grid-2">' + field("Position", 'class="ed-pos"', e.position) + field("Company", 'class="ed-co"', e.company) + "</div>" +
          '<div class="grid-2">' + field("Start date", 'class="ed-start"', e.startDate) + field("End date", 'class="ed-end"', e.endDate, e.current ? "(ignored while Current is checked — “Present” is shown)" : "") + "</div>" +
          '<label class="check-row"><input type="checkbox" class="ed-current"' + (e.current ? " checked" : "") + " /> I currently work here (displays as Present)</label>" +
          '<div style="height:12px"></div>' +
          textareaField("Short summary (shown on card)", 'class="ed-summary" rows="2"', e.summary) +
          textareaField("Description (in details)", 'class="ed-desc" rows="3"', e.description) +
          textareaField("Responsibilities (one per line)", 'class="ed-resp" rows="6"', lines(e.responsibilities)) +
          field("Technologies (comma separated)", 'class="ed-tech"', (e.tech || []).join(", ")) +
          '<div class="field"><label>Company logo</label><div class="img-thumbs ed-logo-wrap">' + (e.logo ? thumbsHTML([e.logo]) : "") + "</div>" +
          '<div class="form-actions"><button type="button" class="btn-mini ed-logo-btn">Choose Logo</button>' +
          '<button type="button" class="btn-mini ed-logo-clear">Remove</button></div></div>' +
          '<label class="check-row"><input type="checkbox" class="ed-visible"' + (e.visible !== false ? " checked" : "") + " /> Visible on website</label>" +
          '<div class="form-actions"><button type="button" class="btn-primary ed-save">Save Entry</button>' +
          '<button type="button" class="btn-ghost ed-cancel">Cancel</button></div>';

        var logo = e.logo || "";
        bindThumbRemove($(".ed-logo-wrap", panel), function () { return [logo]; }, function () {
          $(".ed-logo-wrap", panel).innerHTML = logo ? thumbsHTML([logo]) : "";
        });
        $(".ed-logo-btn", panel).addEventListener("click", function () {
          openPicker(false, function (u) { logo = u; $(".ed-logo-wrap", panel).innerHTML = thumbsHTML([u]); });
        });
        $(".ed-logo-clear", panel).addEventListener("click", function () { logo = ""; $(".ed-logo-wrap", panel).innerHTML = ""; });

        var curCb = $(".ed-current", panel);
        function syncEnd() { $(".ed-end", panel).disabled = curCb.checked; }
        curCb.addEventListener("change", syncEnd); syncEnd();

        $(".ed-cancel", panel).addEventListener("click", function () { panel.classList.add("hidden"); panel.innerHTML = ""; });
        $(".ed-save", panel).addEventListener("click", function () {
          var btn = this;
          var patch = {
            position: $(".ed-pos", panel).value,
            company: $(".ed-co", panel).value,
            startDate: $(".ed-start", panel).value,
            endDate: $(".ed-end", panel).value,
            current: curCb.checked,
            summary: $(".ed-summary", panel).value,
            description: $(".ed-desc", panel).value,
            responsibilities: toLines($(".ed-resp", panel).value),
            tech: toList($(".ed-tech", panel).value),
            logo: logo,
            visible: $(".ed-visible", panel).checked
          };
          if (!patch.position.trim()) return toast("Position is required.", true);
          if (patch.current) patch.endDate = "";
          guard(btn, function () {
            return api("/api/admin/experiences/" + e.id, "PUT", patch)
              .then(function () { toast("✓ Saved successfully"); reload(); });
          });
        });
        panel.classList.remove("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      $("#exp-add").addEventListener("click", function () {
        guard($("#exp-add"), function () {
          return api("/api/admin/experiences", "POST", {
            company: "", position: "New Position", startDate: "", endDate: "",
            current: false, summary: "", description: "", responsibilities: [],
            tech: [], logo: "", visible: false
          }).then(reload);
        }, "Adding…");
      });

      function reload() { route(); }
      renderList();
    });
  });

  /* ---------- PROJECTS ---------- */
  register("projects", "Projects", function (content) {
    return api("/api/admin/projects").then(function (list) {
      content.innerHTML =
        '<div class="toolbar"><button type="button" class="btn-primary" id="prj-add">＋ Add Project</button>' +
        '<span class="hint" style="margin:0">Only <b>published</b> projects appear on the public site.</span></div>' +
        '<div id="prj-list"></div>';
      var listEl = $("#prj-list");

      function renderList() {
        listEl.innerHTML = list.map(function (p) {
          var thumb = p.images && p.images.length
            ? '<img class="t-thumb" src="' + esc(p.images[0]) + '" alt="" />'
            : '<div class="t-thumb" style="display:flex;align-items:center;justify-content:center;color:#b6c2d4">▢</div>';
          return '<div class="dd-item" data-id="' + p.id + '">' +
            '<div class="row-item"><span class="drag-handle">⠿</span>' + thumb +
              '<div class="row-main"><div class="row-title">' + esc(p.title || "Untitled") +
                ' <span class="badge ' + (p.status === "published" ? "pub" : "draft") + '"><i></i>' + (p.status === "published" ? "Published" : "Draft") + "</span></div>" +
                '<div class="row-sub">' + esc((p.shortDesc || "").slice(0, 100)) + "</div></div>" +
              '<div class="row-actions">' +
                '<button type="button" class="btn-mini" data-edit="' + p.id + '">Edit</button>' +
                '<button type="button" class="btn-mini" data-pub="' + p.id + '">' + (p.status === "published" ? "Unpublish" : "Publish") + "</button>" +
                '<button type="button" class="btn-mini" data-up="' + p.id + '">↑</button>' +
                '<button type="button" class="btn-mini" data-down="' + p.id + '">↓</button>' +
                '<button type="button" class="btn-danger" data-del="' + p.id + '">Delete</button>' +
              "</div></div>" +
            '<div class="editor-panel hidden" data-editor="' + p.id + '"></div>' +
          "</div>";
        }).join("") || '<p class="empty-note">No projects yet.</p>';

        makeSortable(listEl, "projects");

        $$("[data-del]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            if (!confirm("Delete this project permanently?")) return;
            guard(b, function () {
              return api("/api/admin/projects/" + b.dataset.del, "DELETE")
                .then(function () { toast("✓ Deleted successfully"); reload(); });
            }, "Deleting…");
          });
        });
        $$("[data-pub]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            var p = find(b.dataset.pub);
            var toPub = p.status !== "published";
            guard(b, function () {
              return api("/api/admin/projects/" + p.id, "PUT", { status: toPub ? "published" : "draft" })
                .then(function () { toast(toPub ? "✓ Published successfully" : "Moved to drafts"); reload(); });
            }, toPub ? "Publishing…" : "Unpublishing…");
          });
        });
        $$("[data-edit]", listEl).forEach(function (b) {
          b.addEventListener("click", function () { openEditor(find(b.dataset.edit), b.closest(".dd-item")); });
        });
        function find(id) { return list.filter(function (x) { return x.id === id; })[0]; }
      }

      function openEditor(p, wrap) {
        var panel = $("[data-editor]", wrap);
        var isOpen = !panel.classList.contains("hidden");
        $$(".editor-panel").forEach(function (x) { x.classList.add("hidden"); x.innerHTML = ""; });
        if (isOpen) return;
        panel.innerHTML =
          field("Project name", 'class="pj-title"', p.title) +
          '<div class="grid-2">' +
            field("Slug (URL — optional)", 'class="pj-slug" placeholder="auto-generated"', p.slug || "") +
            '<div class="field"><label>Status</label><select class="pj-status">' +
              '<option value="draft"' + (p.status !== "published" ? " selected" : "") + ">Draft (hidden)</option>" +
              '<option value="published"' + (p.status === "published" ? " selected" : "") + ">Published</option></select></div>" +
          "</div>" +
          textareaField("Short description", 'class="pj-desc" rows="2"', p.shortDesc) +
          '<div class="field"><label>Role / contribution</label><textarea class="pj-contrib" rows="3">' + esc(p.contribution || "") + "</textarea></div>" +
          '<div class="grid-2">' + field("Technologies (comma separated)", 'class="pj-tech"', (p.tech || []).join(", ")) +
            '<div class="field"><label>Category (single keyword)</label><input type="text" class="pj-cat" value="' + esc(p.category || "") + '" placeholder="e.g. Machine Learning" /></div></div>' +
          '<div class="field"><label>Links (label : URL — one per line)</label>' +
            '<textarea class="pj-links" rows="2" placeholder="Demo : https://example.com&#10;GitHub : https://github.com/u/r">' + esc(lines(p.links || [])) + "</textarea>" +
            "<p class='hint'>Add as many as you like. These power the buttons on the case-study page.</p></div>" +
          '<div class="grid-2">' + field("Live demo URL", 'class="pj-link" placeholder="https://…"', p.link) +
          field("GitHub URL", 'class="pj-github" placeholder="https://github.com/…"', p.github) + "</div>" +

          '<div class="card" style="margin-top:18px"><h3>Demo Video &amp; Overlay</h3>' +
            '<label style="display:flex;gap:8px;align-items:center;font-size:.9rem;color:var(--muted);cursor:pointer;margin-bottom:10px"><input type="checkbox" class="pj-videoenabled" ' + (p.videoEnabled ? " checked" : "") + " /> Show this video on the case-study page</label>" +
            '<div class="field"><label>Video URL</label><input type="text" class="pj-vurl" value="' + esc(p.videoUrl || p.video || "") + '" placeholder="https://…/video.mp4, /uploads/…, or a YouTube link" />' +
            '<label class="upload-zone pj-zone" style="margin-top:10px">' +
              '<input type="file" accept="video/*" class="pj-vfile" hidden />' +
              '<span class="uz-main">＋ Drag &amp; drop video here</span>' +
              '<span class="uz-sub">or click to browse — MP4 · WEBM · MOV, max 256MB</span>' +
            '</label>' +
            '<div class="form-actions" style="margin-top:10px">' +
              '<button type="button" class="btn-mini pj-vclear">Remove video</button>' +
              '<span id="pj-vstatus" class="hint" style="margin:0"></span></div>' +
            '<p class="hint">Uploads keep a permanent copy in your media library; YouTube links are embedded automatically.</p></div>' +
            '<div class="pd-video-preview" id="pj-vprev">' + (p.videoUrl || p.video
              ? '<video src="' + esc(p.videoUrl || p.video) + '" controls style="width:100%;max-height:240px;border-radius:10px;background:#000"></video>'
              : "") + "</div>" +
            '<div class="grid-2">' +
              field("Video title", 'class="pj-vtitle"', p.videoTitle || "") +
              field("Caption (short line above title)", 'class="pj-vcap"', p.videoCaption || "") +
            "</div>" +
            textareaField("Video description / subtitle (optional)", 'class="pj-vdesc" rows="2"', p.videoDesc || p.videoSubtitle || "") +
            field("Overlay tags (comma separated — optional)", 'class="pj-vtags"', (p.videoTags || []).join(", ")) +
            '<div class="field"><label>Poster image URL (optional)</label><input type="text" class="pj-vposter" value="' + esc(p.videoPoster || "") + '" placeholder="https://…/poster.jpg" />' +
            '<div class="form-actions" style="margin-top:8px"><button type="button" class="btn-mini pj-vposterpick">Choose from Library</button></div></div>' +
          "</div>" +

          '<div class="card" style="margin-top:18px"><h3>Case Study Content</h3>' +
            textareaField("Key Features (one per line)", 'class="pj-features" rows="4" placeholder="Real-time collaboration&#10;Offline-first sync&#10;Push notifications"', (p.features || []).join("\n")) +
            textareaField("Challenges (one per line — optional)", 'class="pj-challenges" rows="3"', (p.challenges || []).join("\n")) +
            textareaField("Solutions (one per line — optional)", 'class="pj-solutions" rows="3"', (p.solutions || []).join("\n")) +
            '<div class="grid-2">' +
              '<label style="display:flex;gap:8px;align-items:center;font-size:.9rem;color:var(--muted);cursor:pointer"><input type="checkbox" class="pj-feat" ' + (p.featured ? " checked" : "") + " /> Featured (highlight on site)</label>" +
              '<label style="display:flex;gap:8px;align-items:center;font-size:.9rem;color:var(--muted);cursor:pointer"><input type="checkbox" class="pj-hidecover" ' + (p.hideCover ? " checked" : "") + " /> Hide cover on case-study page</label>" +
            "</div>" +
          "</div>" +
          '<div class="field"><label>Images (multiple supported)</label><div class="img-thumbs pj-imgs">' + thumbsHTML(p.images) + "</div>" +
          '<div class="form-actions"><button type="button" class="btn-mini pj-addimg">Add Images</button></div>' +
          '<p class="hint">First image is used as the cover.</p></div>' +
          '<div class="form-actions"><button type="button" class="btn-primary pj-save">Save Project</button>' +
          '<button type="button" class="btn-ghost pj-cancel">Cancel</button></div>';

        var imgs = (p.images || []).slice();
        bindThumbRemove($(".pj-imgs", panel), function () { return imgs; }, function () {
          $(".pj-imgs", panel).innerHTML = thumbsHTML(imgs);
        });
        $(".pj-addimg", panel).addEventListener("click", function () {
          openPicker(true, function (urls) { imgs = imgs.concat(urls); $(".pj-imgs", panel).innerHTML = thumbsHTML(imgs); });
        });

        var vstatus = $("#pj-vstatus", panel);
        var vprev = $("#pj-vprev", panel);
        var vurlInput = $(".pj-vurl", panel);
        function showVid() {
          var v = $(".pj-vurl", panel).value.trim();
          vprev.innerHTML = v
            ? isYouTubeUrl(v)
              ? '<iframe src="' + esc(youtubeEmbed(v)) + '" title="Video preview" style="width:100%;aspect-ratio:16/9;border-radius:10px;border:0" allowfullscreen></iframe>'
              : '<video src="' + esc(v) + '" controls style="width:100%;max-height:240px;border-radius:10px;background:#000"></video>'
            : "";
        }
        function pjUpload(file) {
          if (!file) return;
          vstatus.textContent = "Uploading video…";
          uploadVideo(file).then(function (item) {
            $(".pj-vurl", panel).value = item.url;
            vstatus.textContent = "✓ Uploaded " + item.name;
            showVid();
          }).catch(function (err) { vstatus.textContent = "✕ " + (err.message || "Upload failed"); });
        }
        $(".pj-vfile", panel).addEventListener("change", function () {
          var file = this.files[0];
          this.value = "";
          pjUpload(file);
        });
        ["dragover", "dragleave", "drop"].forEach(function (ev) {
          $(".pj-zone", panel).addEventListener(ev, function (e) {
            e.preventDefault();
            $(".pj-zone", panel).classList.toggle("dragover", ev === "dragover");
            if (ev === "drop") pjUpload(e.dataTransfer.files[0]);
          });
        });
        $(".pj-vclear", panel).addEventListener("click", function () {
          $(".pj-vurl", panel).value = ""; vstatus.textContent = ""; showVid();
        });
        $(".pj-vurl", panel).addEventListener("input", showVid);
        $(".pj-vposterpick", panel).addEventListener("click", function () {
          openPicker(false, function (u) { $(".pj-vposter", panel).value = u; });
        });

        $(".pj-cancel", panel).addEventListener("click", function () { panel.classList.add("hidden"); panel.innerHTML = ""; });
        $(".pj-save", panel).addEventListener("click", function () {
          var btn = this;
          if (!$(".pj-title", panel).value.trim()) return toast("Project name is required.", true);
          guard(btn, function () {
            return api("/api/admin/projects/" + p.id, "PUT", {
              title: $(".pj-title", panel).value,
              slug: $(".pj-slug", panel).value.trim() || undefined,
              shortDesc: $(".pj-desc", panel).value,
              contribution: $(".pj-contrib", panel).value,
              tech: toList($(".pj-tech", panel).value),
              category: $(".pj-cat", panel).value.trim(),
              status: $(".pj-status", panel).value,
              links: toLines($(".pj-links", panel).value),
              link: $(".pj-link", panel).value,
              github: $(".pj-github", panel).value,
              videoUrl: $(".pj-vurl", panel).value.trim() || "",
              videoEnabled: $(".pj-videoenabled", panel).checked,
              videoTitle: $(".pj-vtitle", panel).value.trim(),
              videoCaption: $(".pj-vcap", panel).value.trim(),
              videoDesc: $(".pj-vdesc", panel).value.trim(),
              videoTags: toList($(".pj-vtags", panel).value),
              videoPoster: $(".pj-vposter", panel).value.trim(),
              features: toLines($(".pj-features", panel).value),
              challenges: toLines($(".pj-challenges", panel).value),
              solutions: toLines($(".pj-solutions", panel).value),
              featured: $(".pj-feat", panel).checked,
              hideCover: $(".pj-hidecover", panel).checked,
              images: imgs
            }).then(function () { toast("✓ Saved successfully"); reload(); });
          });
        });
        showVid();
        panel.classList.remove("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      $("#prj-add").addEventListener("click", function () {
        guard($("#prj-add"), function () {
          return api("/api/admin/projects", "POST", {
            title: "New Project", shortDesc: "", contribution: "", tech: [],
            link: "", github: "", images: [], status: "draft"
          }).then(reload);
        }, "Adding…");
      });

      function reload() { route(); }
      renderList();
    });
  });

  /* ---------- BLOG POST EDITOR (shared by Create Post + Edit) ---------- */

  function renderPostEditor(content, p, cats) {
    var isNew = !p;
    var today = new Date().toISOString().slice(0, 10);
    p = p || { title: "", text: "", images: [], tags: [], location: "", date: today, status: "draft", publishedAt: null, updatedAt: null };
    if (!cats.length) cats = ["Life", "Learning", "Technology", "Career"];
    var isPublished = p.status === "published";
    var imgs = (p.images || []).slice();

    content.innerHTML =
      '<div class="editor-layout">' +
        '<div class="ed-col-main">' +
          '<div class="card"><h3>Post Content</h3>' +
            '<div class="field"><label>Title *</label><input type="text" class="big-title-input pe-title" value="' + esc(p.title) + '" placeholder="Give this post a headline…" /></div>' +
            richTextField("Caption / content *", p.text, { id: "pe-rte", placeholder: "Write your post here… Use the toolbar to style it.", hint: "Supports rich formatting — headings, lists, quotes, links, bold & italic." }) +
            '<input type="hidden" id="pe-text" />' +
            '<div class="form-error" id="pe-error"></div>' +
          "</div>" +
          '<div class="card"><h3>Featured Image</h3>' +
            '<div class="feat-slot" id="pe-feat"></div>' +
            '<div class="form-actions" style="margin-top:12px">' +
              '<button type="button" class="btn-mini" id="pe-feat-pick">Choose from Library</button>' +
              '<label class="btn-mini" style="cursor:pointer">Upload from computer<input type="file" accept="image/*" id="pe-feat-file" hidden /></label>' +
              '<span class="hint" style="margin:0">Shown large on the public card · stored permanently</span>' +
            "</div>" +
          "</div>" +
          '<div class="card"><h3>Additional Images</h3><div class="img-grid" id="pe-gallery"></div></div>' +
        "</div>" +
        '<div class="ed-col-side">' +
          '<div class="card"><h3>Publish</h3>' +
            '<div class="meta-list" style="margin-bottom:14px">' +
              "<div>Status: <b>" + (isNew ? "New (unsaved)" : isPublished ? "🟢 Published" : "🟡 Draft") + "</b></div>" +
              "<div>Published on: <b>" + esc(fmtDateTime(p.publishedAt)) + "</b></div>" +
              "<div>Last updated: <b>" + esc(fmtDateTime(p.updatedAt)) + "</b></div>" +
            "</div>" +
            '<div class="form-actions" style="flex-direction:column;align-items:stretch">' +
              (isPublished
                ? '<button type="button" class="btn-primary" id="pe-update">✓ Update Post <small style="opacity:.8">(stays published)</small></button>' +
                  '<button type="button" class="btn-ghost" id="pe-unpublish">Unpublish (move to drafts)</button>'
                : '<button type="button" class="btn-primary" id="pe-publish">🚀 Publish</button>' +
                  '<button type="button" class="btn-ghost" id="pe-savedraft">Save Draft</button>') +
              '<button type="button" class="btn-ghost" id="pe-preview">👁 Live Preview</button>' +
              '<a class="btn-ghost" style="text-decoration:none;text-align:center" href="#/blog">Cancel</a>' +
            "</div>" +
          "</div>" +
          '<div class="card"><h3>Meta</h3>' +
            '<div class="field"><label>Category</label><select class="pe-cat">' +
              (cats.indexOf(p.category) === -1 && p.category ? cats.concat([p.category]) : cats).map(function (c) {
                return "<option" + (c === p.category ? " selected" : "") + ">" + esc(c) + "</option>";
              }).join("") +
            '</select><p class="hint">Manage categories under Blog → Categories.</p></div>' +
            field("Tags (comma separated)", 'class="pe-tags"', (p.tags || []).join(", ")) +
            field("Location (optional)", 'class="pe-loc"', p.location) +
            '<div class="field"><label>Post Date</label><input type="date" class="pe-date" value="' + esc((p.date || "").slice(0, 10)) + '" /></div>' +
          "</div>" +
        "</div>" +
      "</div>";

    function collect() {
      return {
        title: $(".pe-title", content).value.trim(),
        text: ($(".pe-text", content) || $("#pe-text", content)).value.trim(),
        category: $(".pe-cat", content).value,
        tags: toList($(".pe-tags", content).value),
        location: $(".pe-loc", content).value.trim(),
        date: $(".pe-date", content).value || today,
        images: imgs.slice()
      };
    }
    function showErr(msg) {
      var e = $("#pe-error");
      e.textContent = "✕ " + msg;
      e.classList.add("show");
      toast(msg, true);
    }

    /* --- featured image --- */
    var featBox = $("#pe-feat");
    function renderFeat() {
      if (!imgs.length) {
        featBox.innerHTML = '<div class="feat-empty">No featured image yet.<br />Pick one from the library or upload from your computer.</div>';
        featBox.classList.remove("has");
        return;
      }
      featBox.classList.add("has");
      featBox.innerHTML = '<div class="feat-img"><img src="' + esc(imgs[0]) + '" alt="" />' +
        '<div class="feat-tools"><button type="button" class="btn-mini" data-freplace>Replace</button>' +
        '<button type="button" class="btn-mini" data-fremove>Remove</button></div></div>';
      $("[data-freplace]", featBox).addEventListener("click", function () {
        openPicker(false, function (url) {
          if (imgs.indexOf(url) !== -1) imgs.splice(imgs.indexOf(url), 1);
          imgs[0] = url; renderFeat(); renderGallery();
        });
      });
      $("[data-fremove]", featBox).addEventListener("click", function () {
        imgs.shift(); renderFeat(); renderGallery();
      });
    }
    $("#pe-feat-pick").addEventListener("click", function () {
      openPicker(false, function (url) {
        if (imgs.length && imgs[0] !== url) imgs.splice(imgs.indexOf(url), imgs.indexOf(url) !== -1 ? 1 : 0);
        if (!imgs.length || imgs[0] !== url) imgs.unshift(url);
        renderFeat(); renderGallery();
        toast("✓ Image attached to post");
      });
    });
    $("#pe-feat-file").addEventListener("change", function () {
      var file = this.files[0];
      this.value = "";
      if (!file) return;
      guard(featBox, function () {
        featBox.classList.remove("has");
        featBox.innerHTML = '<div class="feat-empty"><span class="spin" style="display:inline-block"></span> Uploading…</div>';
        return uploadSingle(file).then(function (url) {
          if (imgs.length && imgs[0]) { imgs.unshift(url); }
          else imgs[0] = url;
          renderFeat(); renderGallery();
          toast("✓ Uploaded successfully — image attached to post");
        }, function (err) { renderFeat(); throw err; });
      }, "");
    });

    /* --- gallery --- */
    var galBox = $("#pe-gallery");
    function renderGallery() {
      var rest = imgs.slice(1);
      galBox.innerHTML = rest.map(function (u, i) {
        return '<div class="img-tile"><img src="' + esc(u) + '" alt="" /><button type="button" class="tile-del" data-gi="' + i + '">✕</button></div>';
      }).join("") + '<button type="button" class="img-add-tile" id="pe-addimgs"><span style="font-size:1.3rem">＋</span>Add images</button>';
      $$("[data-gi]", galBox).forEach(function (b) {
        b.addEventListener("click", function () {
          imgs.splice(1 + (+b.dataset.gi), 1); renderGallery();
        });
      });
      $("#pe-addimgs", galBox).addEventListener("click", function () {
        openPicker(true, function (urls) {
          urls.forEach(function (u) { if (imgs.indexOf(u) === -1) imgs.push(u); });
          renderGallery();
        });
      });
    }

    renderFeat();
    renderGallery();

    /* bind rich text editor; sync hidden #pe-text input which collect() reads */
    var peText = $("#pe-text", content);
    var peRte = $("#pe-rte", content);
    if (peText && peRte) {
      var rte = bindRichEditor(content, "pe-text");
    }

    /* --- save actions --- */
    function persist(statusOverride, doneMsg) {
      var d = collect();
      var errEl = $("#pe-error");
      errEl.classList.remove("show");
      if (statusOverride === "published" && (!d.title || !d.text)) {
        showErr(!d.title ? "A title is required to publish." : "Some caption/content is required to publish.");
        return Promise.reject(new Error("silent"));
      }
      var body = Object.assign({}, d);
      if (statusOverride) body.status = statusOverride;
      var req = isNew
        ? api("/api/admin/posts", "POST", body)
        : api("/api/admin/posts/" + p.id, "PUT", body);
      return req.then(function () {
        toast(doneMsg);
        location.hash = "#/blog";
      });
    }

    var pubBtn = $("#pe-publish");
    if (pubBtn) pubBtn.addEventListener("click", function () {
      guard(pubBtn, function () { return persist("published", "✓ Published successfully"); }, "Publishing…");
    });
    var sdBtn = $("#pe-savedraft");
    if (sdBtn) sdBtn.addEventListener("click", function () {
      guard(sdBtn, function () { return persist(null, "✓ Draft saved"); }, "Saving…");
    });
    var upBtn = $("#pe-update");
    if (upBtn) upBtn.addEventListener("click", function () {
      guard(upBtn, function () {
        var d = collect();
        if (!d.title) return Promise.reject(new Error("Title cannot be empty."));
        return api("/api/admin/posts/" + p.id, "PUT", d).then(function () {
          toast("✓ Updated successfully — still live on the public site");
          location.hash = "#/blog";
        });
      }, "Updating…");
    });
    var unBtn = $("#pe-unpublish");
    if (unBtn) unBtn.addEventListener("click", function () {
      guard(unBtn, function () {
        return api("/api/admin/posts/" + p.id, "PUT", Object.assign(collect(), { status: "draft" }))
          .then(function () { toast("Moved to drafts — removed from public site"); location.hash = "#/blog"; });
      }, "Unpublishing…");
    });
    $("#pe-preview").addEventListener("click", function () {
      openPreview("Blog post preview", postPreviewHTML(collect()));
    });
  }

  register("blognew", "Create Post", function (content) {
    return api("/api/admin/categories").then(function (cats) {
      renderPostEditor(content, null, cats);
    });
  });

  register("blogedit", "Edit Post", function (content, id) {
    return Promise.all([
      api("/api/admin/posts"),
      api("/api/admin/categories")
    ]).then(function (res) {
      var p = res[0].filter(function (x) { return x.id === id; })[0];
      if (!p) {
        content.innerHTML = '<div class="card"><h3>Not found</h3><p>This post no longer exists.</p><p><a href="#/blog">← Back to all posts</a></p></div>';
        return;
      }
      renderPostEditor(content, p, res[1]);
    });
  });

  /* ---------- BLOG — ALL POSTS ---------- */
  register("blog", "All Posts", function (content) {
    return api("/api/admin/posts").then(function (list) {
      var state = { q: "", f: "all" };
      content.innerHTML =
        '<div class="toolbar">' +
          '<div class="search-box"><input type="text" id="bp-search" placeholder="Search title, tag or category…" /></div>' +
          '<span class="chip-filters" id="bp-filters">' +
            '<button type="button" class="btn-mini active" data-f="all">All</button>' +
            '<button type="button" class="btn-mini" data-f="published">🟢 Published</button>' +
            '<button type="button" class="btn-mini" data-f="draft">🟡 Drafts</button>' +
          "</span>" +
          '<a class="btn-primary" style="text-decoration:none;margin-left:auto" href="#/blognew">＋ Create Post</a>' +
        "</div>" +
        '<div id="bp-table"></div>';

      function filtered() {
        return list.filter(function (p) {
          if (state.f !== "all" && p.status !== state.f) return false;
          if (!state.q) return true;
          var hay = ((p.title || "") + " " + (p.category || "") + " " + (p.tags || []).join(" ") + " " + (p.location || "")).toLowerCase();
          return hay.indexOf(state.q.toLowerCase()) !== -1;
        }).sort(function (a, b) {
          return String(b.updatedAt || b.date || "").localeCompare(String(a.updatedAt || a.date || ""));
        });
      }

      function renderTable() {
        var shown = filtered();
        $("#bp-table").innerHTML = shown.length
          ? '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            "<th></th><th>Title</th><th>Category</th><th>Date</th><th>Status</th><th>Last Updated</th><th>Actions</th>" +
            "</tr></thead><tbody>" +
            shown.map(function (p) {
              var img = p.images && p.images.length ? p.images[0] : "";
              var thumb = img
                ? '<img class="t-thumb" src="' + esc(img) + '" alt="" />'
                : '<div class="t-thumb" style="display:flex;align-items:center;justify-content:center;color:#b6c2d4">▢</div>';
              var pub = p.status === "published";
              return "<tr data-id=\"" + p.id + "\">" +
                "<td>" + thumb + "</td>" +
                "<td><div class='t-title'>" + esc(p.title || "Untitled") + "</div><div class='t-sub'>♥ " + (p.likes || 0) + " · 💬 " + ((p.comments || []).length) + (p.location ? " · 📍 " + esc(p.location) : "") + "</div></td>" +
                '<td><span class="cat-pill">' + esc(p.category || "—") + "</span></td>" +
                "<td>" + esc(fmtDate(p.date)) + "</td>" +
                '<td><span class="badge ' + (pub ? "pub" : "draft") + '"><i></i>' + (pub ? "Published" : "Draft") + "</span></td>" +
                "<td>" + esc(fmtDateTime(p.updatedAt)) + "</td>" +
                '<td><div class="t-actions">' +
                  '<a class="btn-mini" style="text-decoration:none" href="#/blogedit/' + p.id + '">Edit</a>' +
                  '<button type="button" class="btn-mini" data-preview="' + p.id + '">Preview</button>' +
                  '<button type="button" class="btn-mini" data-pub="' + p.id + '">' + (pub ? "Unpublish" : "Publish") + "</button>" +
                  '<button type="button" class="btn-danger" data-del="' + p.id + '">Delete</button>' +
                "</div></td></tr>";
            }).join("") + "</tbody></table></div>"
          : '<div class="card"><p class="empty-note">' + (state.q || state.f !== "all" ? "No posts match this filter." : 'No posts yet — click <b>＋ Create Post</b> to write your first one.') + "</p></div>";

        $$("[data-pub]", $("#bp-table")).forEach(function (b) {
          b.addEventListener("click", function () {
            var p = list.filter(function (x) { return x.id === b.dataset.pub; })[0];
            var toPub = p.status !== "published";
            guard(b, function () {
              return api("/api/admin/posts/" + p.id, "PUT", { status: toPub ? "published" : "draft" })
                .then(function () {
                  p.status = toPub ? "published" : "draft";
                  p.updatedAt = new Date().toISOString();
                  toast(toPub ? "✓ Published successfully — now live on the public Blog" : "Moved to drafts — removed from public site");
                  renderTable();
                });
            }, toPub ? "Publishing…" : "…");
          });
        });
        $$("[data-del]", $("#bp-table")).forEach(function (b) {
          b.addEventListener("click", function () {
            var p = list.filter(function (x) { return x.id === b.dataset.del; })[0];
            if (!confirm('Delete "' + (p.title || "Untitled") + '" permanently? This cannot be undone.')) return;
            guard(b, function () {
              return api("/api/admin/posts/" + p.id, "DELETE").then(function () {
                list = list.filter(function (x) { return x.id !== p.id; });
                toast("✓ Deleted successfully");
                renderTable();
              });
            }, "Deleting…");
          });
        });
        $$("[data-preview]", $("#bp-table")).forEach(function (b) {
          b.addEventListener("click", function () {
            var p = list.filter(function (x) { return x.id === b.dataset.preview; })[0];
            openPreview("Post preview", postPreviewHTML(p));
          });
        });
      }

      $("#bp-search").addEventListener("input", function () { state.q = this.value.trim(); renderTable(); });
      $$("#bp-filters [data-f]").forEach(function (b) {
        b.addEventListener("click", function () {
          $$("#bp-filters [data-f]").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          state.f = b.dataset.f;
          renderTable();
        });
      });
      renderTable();
    });
  });

  /* ---------- BLOG CATEGORIES ---------- */
  register("blogcats", "Blog Categories", function (content) {
    return api("/api/admin/categories").then(function (cats) {
      content.innerHTML =
        '<div class="card"><h3>Add Category</h3><div class="chip-add" style="max-width:420px;margin:0">' +
          '<input type="text" id="bc-new" placeholder="e.g. Technology" />' +
          '<button type="button" id="bc-add">Add</button></div>' +
          '<p class="hint">Categories power the selector in the blog editor and the chips on the public site. Deleting a category never deletes posts.</p></div>' +
        '<div class="card"><h3>All Categories <span class="hint" style="margin:0;font-weight:400">' + cats.length + "</span></h3><div id=\"bc-list\"></div></div>";

      function renderList() {
        $("#bc-list").innerHTML = cats.length ? cats.map(function (c) {
          return '<div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #eef2f7">' +
            '<input type="text" value="' + esc(c) + '" data-bc="' + esc(c) + '" style="flex:1;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:#fbfdff" />' +
            '<button type="button" class="btn-mini" data-save="' + esc(c) + '">Rename ✓</button>' +
            '<button type="button" class="btn-danger" data-del="' + esc(c) + '">Delete</button></div>';
        }).join("") : '<p class="empty-note">No categories yet.</p>';

        $$("[data-save]", $("#bc-list")).forEach(function (b) {
          b.addEventListener("click", function () {
            var v = $('[data-bc="' + b.dataset.save + '"]').value.trim();
            if (!v || v === b.dataset.save) return;
            guard(b, function () {
              return api("/api/admin/categories/" + encodeURIComponent(b.dataset.save), "PUT", { name: v })
                .then(function (next) { cats = next; toast("✓ Renamed"); renderList(); });
            }, "Saving…");
          });
        });
        $$("[data-del]", $("#bc-list")).forEach(function (b) {
          b.addEventListener("click", function () {
            if (!confirm('Delete category "' + b.dataset.del + '"?')) return;
            guard(b, function () {
              return api("/api/admin/categories/" + encodeURIComponent(b.dataset.del), "DELETE")
                .then(function (next) { cats = next; toast("✓ Deleted"); renderList(); });
            }, "Deleting…");
          });
        });
      }
      renderList();

      function add() {
        var v = $("#bc-new").value.trim();
        if (!v) return;
        guard($("#bc-add"), function () {
          return api("/api/admin/categories", "POST", { name: v })
            .then(function (next) { cats = next; $("#bc-new").value = ""; toast("✓ Category added"); renderList(); });
        }, "Adding…");
      }
      $("#bc-add").addEventListener("click", add);
      $("#bc-new").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    });
  });

  /* ---------- MEDIA MANAGER ---------- */
  register("media", "Media Library", function (content) {
    var tab = "image";
    content.innerHTML =
      '<div class="mm-tabs">' +
        '<button type="button" class="mm-tab active" data-tab="image">Images</button>' +
        '<button type="button" class="mm-tab" data-tab="video">Videos</button>' +
      "</div>" +
      '<label class="upload-zone" id="mm-zone">' +
        '<input type="file" id="mm-file" hidden />' +
        '<span class="uz-main">＋ Drag &amp; drop or click to upload</span>' +
        '<span class="uz-sub" id="mm-sub">JPG · JPEG · PNG · WEBP · GIF · SVG — max 10MB each</span>' +
      "</label>" +
      '<div class="media-grid" id="mm-grid"></div>';

    function setTab(t) {
      tab = t;
      $$(".mm-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === t); });
      $("#mm-file").setAttribute("accept", t === "image" ? "image/*" : "video/*");
      $("#mm-sub").textContent = t === "image"
        ? "JPG · JPEG · PNG · WEBP · GIF · SVG — max 10MB each"
        : "MP4 · WEBM · MOV — max 256MB each";
      loadMediaGrid();
    }
    $$(".mm-tab").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.dataset.tab); });
    });

    var zone = $("#mm-zone");
    function handleFiles(files) {
      var arr = Array.prototype.slice.call(files);
      if (!arr.length) return Promise.resolve();
      if (tab === "video") {
        if (arr.length > 1) return Promise.reject(new Error("Upload one video at a time."));
        return uploadVideo(arr[0]).then(function () { toast("✓ Video uploaded successfully"); }).then(loadMediaGrid, function (err) { toast(err.message, true); });
      }
      return uploadFiles(arr).then(loadMediaGrid, function (err) { toast(err.message, true); });
    }
    $("#mm-file").addEventListener("change", function () {
      var input = this;
      if (!input.files.length) return;
      guard(zone, function () {
        return handleFiles(input.files).then(function () { input.value = ""; });
      }, "Uploading…");
    });
    ["dragover", "dragleave", "drop"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        zone.classList.toggle("dragover", ev === "dragover");
        if (ev === "drop") {
          guard(zone, function () { return handleFiles(e.dataTransfer.files); }, "Uploading…");
        }
      });
    });

    loadMediaGrid();

    function loadMediaGrid() {
      api("/api/admin/media").then(function (list) {
        var grid = $("#mm-grid");
        var items = list.filter(function (m) { return (m.type || "image") === tab; });
        grid.innerHTML = items.length ? "" : '<p class="empty-note" style="grid-column:1/-1">No ' + tab + "s uploaded yet.</p>";
        items.forEach(function (m) {
          var tile = document.createElement("div");
          tile.className = "media-tile media-" + (tab === "video" ? "video" : "image");
          if (tab === "video") {
            tile.innerHTML =
              '<div class="mm-video-thumb"><video src="' + esc(m.url) + '" preload="metadata" muted></video><span class="mm-vplay">▶</span></div>' +
              '<button type="button" class="del" data-del="' + esc(m.name) + '" title="Delete video">✕</button>' +
              '<div class="mm-name">' + esc(m.name) + (m.mime ? ' <span class="mm-mime">' + esc(m.mime.replace("video/", "")) + "</span>" : "") + "</div>";
            tile.addEventListener("click", function () { window.open(m.url, "_blank"); });
          } else {
            tile.innerHTML = '<img src="' + esc(m.url) + '" alt="' + esc(m.name) + '" title="' + esc(m.name) + '" />' +
              '<button type="button" class="repl" data-replace="' + esc(m.name) + '" title="Replace this image (same URL everywhere)">⇄</button>' +
              '<button type="button" class="del" data-del="' + esc(m.name) + '" title="Delete image">✕</button>';
            $("img", tile).addEventListener("click", function () { window.open(m.url, "_blank"); });
          }
          $("[data-del]", tile).addEventListener("click", function (e) {
            e.stopPropagation();
            if (!confirm("Delete this " + tab + "? Pages using it will lose it.")) return;
            var btn = this;
            guard(btn, function () {
              return api("/api/admin/media/" + encodeURIComponent(m.name), "DELETE")
                .then(function () { toast("✓ Deleted successfully"); loadMediaGrid(); });
            }, "…");
          });
          if (tab === "image") {
            $("[data-replace]", tile).addEventListener("click", function (e) {
              e.stopPropagation();
              var inp = document.createElement("input");
              inp.type = "file"; inp.accept = "image/" + (m.name.indexOf(".") >= 0 ? m.name.split(".").pop() : "");
              inp.addEventListener("change", function () {
                var file = inp.files[0];
                if (!file) return;
                guard(this, function () {
                  return fileToDataURL(file).then(function (data) {
                    return api("/api/admin/media/replace", "PUT", { name: m.name, data: data });
                  }).then(function () {
                    toast("✓ Image replaced — every page using it now shows the new version");
                    loadMediaGrid();
                  });
                }, "Replacing…");
              });
              inp.click();
            });
          }
          grid.appendChild(tile);
        });
      }, function (err) { toast(err.message, true); });
    }
  });

  /* ---------- MESSAGES ---------- */
  register("messages", "Contact Messages", function (content) {
    return api("/api/admin/messages").then(function (msgs) {
      content.innerHTML = msgs.length ? "" : '<div class="card"><p class="empty-note">No messages yet. Messages sent from the contact form appear here.</p></div>';
      msgs.forEach(function (msg) {
        var div = document.createElement("div");
        div.className = "msg-row" + (msg.read ? "" : " unread");
        div.innerHTML =
          '<div class="msg-head"><strong>' + esc(msg.name) + "</strong>" +
          '<a class="msg-mail" href="mailto:' + esc(msg.email) + '">' + esc(msg.email) + "</a>" +
          (msg.subject ? '<span class="msg-subject">— ' + esc(msg.subject) + "</span>" : "") +
          '<span class="msg-date">' + esc(new Date(msg.date).toLocaleString()) + "</span>" +
          (msg.read ? "" : '<span class="badge unread"><i></i>NEW</span>') + "</div>" +
          '<div class="msg-body">' + esc(msg.message) + "</div>" +
          '<div class="msg-actions">' +
            (msg.read ? "" : '<button type="button" class="btn-mini" data-read="' + msg.id + '">Mark as read</button>') +
            '<a class="btn-mini" style="text-decoration:none" href="mailto:' + esc(msg.email) + '?subject=Re: ' + encodeURIComponent(msg.subject || "") + '">Reply</a>' +
            '<button type="button" class="btn-danger" data-del="' + msg.id + '">Delete</button>' +
          "</div>";
        content.appendChild(div);
      });
      $$("[data-read]", content).forEach(function (b) {
        b.addEventListener("click", function () {
          guard(b, function () {
            return api("/api/admin/messages/" + b.dataset.read + "/read", "PUT")
              .then(function () { refreshMsgPill(); route(); });
          }, "…");
        });
      });
      $$("[data-del]", content).forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this message?")) return;
          guard(b, function () {
            return api("/api/admin/messages/" + b.dataset.del, "DELETE")
              .then(function () { toast("✓ Deleted successfully"); refreshMsgPill(); route(); });
          }, "Deleting…");
        });
      });
    });
  });

  /* ---------- SECTIONS ---------- */
  var SECTION_LABELS = {
    hero: "Hero (home)", experience: "Job Experience", projects: "Projects",
    about: "About", education: "Education", certifications: "Certifications",
    skills: "Skills", blog: "Blog", contact: "Contact"
  };

  register("sections", "Sections Control", function (content) {
    return api("/api/admin/sections").then(function (sec) {
      content.innerHTML =
        '<p class="hint" style="margin-bottom:14px">Disabled sections disappear from the public website instantly. Drag ⠿ or use arrows to change the page order.</p>' +
        '<div id="sec-toggles"></div><div style="height:22px"></div>' +
        '<div class="card"><h3>Page Order</h3><div id="sec-order"></div></div>';

      var toggles = $("#sec-toggles");
      Object.keys(sec.enabled).forEach(function (key) {
        var row = document.createElement("div");
        row.className = "section-toggle-row";
        row.innerHTML = '<span class="name">' + esc(SECTION_LABELS[key] || key) + "</span>" +
          '<label class="switch"><input type="checkbox" data-key="' + key + '"' + (sec.enabled[key] !== false ? " checked" : "") + ' /><span class="slider"></span></label>';
        $("input", row).addEventListener("change", function (e) {
          var patch = {}; patch[key] = e.target.checked;
          api("/api/admin/sections", "PUT", { enabled: patch }).then(function () {
            toast(SECTION_LABELS[key] + (e.target.checked ? " enabled ✓" : " disabled"));
          }, function (err) { toast(err.message, true); });
        });
        toggles.appendChild(row);
      });

      var orderEl = $("#sec-order");
      sec.order.forEach(function (key) {
        var row = document.createElement("div");
        row.className = "section-toggle-row dd-item";
        row.setAttribute("data-key", key);
        row.innerHTML = '<span class="drag-handle">⠿</span><span class="name">' + esc(SECTION_LABELS[key] || key) + "</span>" +
          '<button type="button" class="btn-mini" data-up>↑</button><button type="button" class="btn-mini" data-down>↓</button>';
        orderEl.appendChild(row);
      });

      function persistOrder() {
        var order = $$(".dd-item", orderEl).map(function (n) { return n.getAttribute("data-key"); });
        api("/api/admin/sections", "PUT", { order: order }).then(function () { toast("✓ Page order updated"); },
          function (err) { toast(err.message, true); });
      }
      makeSortable(orderEl, null, persistOrder);
    });
  });

  /* ---------- CONTACT INFORMATION ---------- */
  register("contactinfo", "Contact Information", function (content) {
    return api("/api/admin/contact").then(function (c) {
      var socials = (c.socials || []).slice();
      content.innerHTML =
        '<div class="card"><h3>Contact Details</h3>' +
          field("Email", 'id="ct-email"', c.email) +
          field("Phone", 'id="ct-phone"', c.phone, "Shown with international dial format on the site.") +
          field("Location", 'id="ct-location"', c.location) +
        "</div>" +
        '<div class="card"><h3>Social Links</h3>' +
          '<p class="hint" style="margin-bottom:12px">Icons are shown automatically for GitHub, LinkedIn, Facebook and Instagram; other platforms get a link icon.</p>' +
          '<div id="ct-socials"></div>' +
          '<button type="button" class="btn-mini" id="ct-addsoc">＋ Add Social Link</button></div>' +
        '<div class="form-actions"><button type="button" class="btn-primary" id="ct-save">Save Contact Information</button></div>';

      function renderSoc() {
        $("#ct-socials").innerHTML = socials.map(function (s, i) {
          return '<div style="display:flex;gap:10px;margin-bottom:10px">' +
            '<input type="text" data-so-p="' + i + '" value="' + esc(s.platform) + '" placeholder="Platform (GitHub…)" style="width:180px;padding:10px 13px;border:1px solid var(--line);border-radius:9px" />' +
            '<input type="text" data-so-u="' + i + '" value="' + esc(s.url) + '" placeholder="https://…" style="flex:1;padding:10px 13px;border:1px solid var(--line);border-radius:9px" />' +
            '<button type="button" class="btn-danger" data-sodel="' + i + '">✕</button></div>';
        }).join("");
        $$("[data-sodel]").forEach(function (b) {
          b.addEventListener("click", function () { socials.splice(+b.dataset.sodel, 1); renderSoc(); });
        });
      }
      renderSoc();
      $("#ct-addsoc").addEventListener("click", function () { socials.push({ platform: "", url: "" }); renderSoc(); });

      $("#ct-save").addEventListener("click", function () {
        guard($("#ct-save"), function () {
          var s2 = socials.map(function (_, i) {
            return {
              platform: $('[data-so-p="' + i + '"]').value.trim(),
              url: $('[data-so-u="' + i + '"]').value.trim()
            };
          }).filter(function (x) { return x.platform || x.url; });
          return api("/api/admin/contact", "PUT", {
            email: $("#ct-email").value.trim(),
            phone: $("#ct-phone").value.trim(),
            location: $("#ct-location").value.trim(),
            socials: s2
          }).then(function () { toast("✓ Contact information saved"); });
        }, "Saving…");
      });
    });
  });

  /* ---------- EDUCATION ---------- */
  register("education", "Education", function (content) {
    return api("/api/admin/education").then(function (list) {
      content.innerHTML =
        '<div class="form-actions" style="margin-bottom:18px"><button type="button" class="btn-primary" id="edu-add">＋ Add Education</button></div>' +
        '<p class="hint" style="margin-bottom:14px">Drag ⠿ or use arrows to reorder. Entries marked <b>Hidden</b> do not appear on the site.</p>' +
        '<div id="edu-list"></div>';
      var listEl = $("#edu-list");

      function renderList() {
        listEl.innerHTML = list.map(function (e) {
          var ongoing = e.currentStudying || /pursu|current|ongoing|studying/i.test(e.status || "");
          return '<div class="dd-item" data-id="' + e.id + '">' +
            '<div class="row-item"><span class="drag-handle">⠿</span>' +
              '<div class="row-main"><div class="row-title">' + esc(e.degree || e.institution || "Untitled") +
                (e.level ? ' <span class="badge pub"><i></i>' + esc(e.level) + "</span>" : "") +
                (e.status === "draft" ? ' <span class="badge draft"><i></i>Hidden</span>' : "") +
              '</div><div class="row-sub">' + esc(e.institution || "") + (e.startYear ? " · " + esc(e.startYear) + " – " + esc(ongoing ? "Present" : (e.endYear || "")) : "") + (e.cgpa ? " · CGPA: " + esc(e.cgpa) : "") + (e.gpa ? " · GPA: " + esc(e.gpa) : "") + "</div></div>" +
              '<div class="row-actions">' +
                '<button type="button" class="btn-mini" data-edit="' + e.id + '">Edit</button>' +
                '<button type="button" class="btn-mini" data-vis="' + e.id + '">' + (e.status === "draft" ? "Show" : "Hide") + "</button>" +
                '<button type="button" class="btn-mini" data-up="' + e.id + '">↑</button>' +
                '<button type="button" class="btn-mini" data-down="' + e.id + '">↓</button>' +
                '<button type="button" class="btn-danger" data-del="' + e.id + '">Delete</button>' +
              "</div></div>" +
            '<div class="editor-panel hidden" data-editor="' + e.id + '"></div>' +
          "</div>";
        }).join("") || '<p class="empty-note">No education entries yet. Add your first one.</p>';

        makeSortable(listEl, "education");

        $$("[data-del]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            if (!confirm("Delete this education entry?")) return;
            guard(b, function () {
              return api("/api/admin/education/" + b.dataset.del, "DELETE")
                .then(function () { toast("✓ Deleted successfully"); route(); });
            }, "Deleting…");
          });
        });
        $$("[data-vis]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            var e = find(b.dataset.vis);
            guard(b, function () {
              return api("/api/admin/education/" + e.id, "PUT", { status: e.status === "draft" ? "published" : "draft" })
                .then(route);
            }, "Saving…");
          });
        });
        $$("[data-edit]", listEl).forEach(function (b) {
          b.addEventListener("click", function () { openEditor(find(b.dataset.edit), b.closest(".dd-item")); });
        });
        function find(id) { return list.filter(function (x) { return x.id === id; })[0]; }
      }

      function openEditor(e, wrap) {
        var panel = $("[data-editor]", wrap);
        var isOpen = !panel.classList.contains("hidden");
        $$(".editor-panel").forEach(function (p) { p.classList.add("hidden"); p.innerHTML = ""; });
        if (isOpen) return;
        panel.innerHTML =
          '<div class="grid-2">' +
            field("Degree / Program", 'class="ed-deg"', e.degree) +
            field("Institution", 'class="ed-inst"', e.institution) +
          "</div>" +
          '<div class="grid-2">' +
            '<div class="field"><label>Level</label><select class="ed-level">' +
              ["", "SSC", "Diploma", "BSc", "MSc", "PhD", "Certificate", "Other"].map(function (o) {
                return "<option" + (o === (e.level || "") ? " selected" : "") + ">" + (o || "— Select —") + "</option>";
              }).join("") +
            '</select></div>' +
            '<div class="field"><label>Institution Type</label><select class="ed-insttype">' +
              ["", "School", "College", "Polytechnic Institute", "University", "Other"].map(function (o) {
                return "<option" + (o === (e.institutionType || "") ? " selected" : "") + ">" + (o || "— Select —") + "</option>";
              }).join("") +
            '</select></div>' +
          "</div>" +
          '<div class="grid-2">' +
            field("Department", 'class="ed-dept"', e.department) +
            field("Subject / Major", 'class="ed-subj"', e.subject) +
          "</div>" +
          '<div class="grid-2">' +
            field("Start Year", 'class="ed-sy" placeholder="e.g. 2018"', e.startYear) +
            field("End Year", 'class="ed-ey" placeholder="e.g. 2022"', e.endYear) +
          "</div>" +
          '<label class="check-row"><input type="checkbox" class="ed-cur"' + (e.currentStudying ? " checked" : "") + " /> Currently Studying</label>" +
          '<div class="grid-2" style="margin-top:10px">' +
            field("CGPA", 'class="ed-cgpa" placeholder="e.g. 3.71"', e.cgpa) +
            field("CGPA Scale", 'class="ed-cgpa-scale" placeholder="e.g. 4.00"', e.cgpaScale) +
          "</div>" +
          '<div class="grid-2">' +
            field("GPA", 'class="ed-gpa" placeholder="e.g. 3.50"', e.gpa) +
            field("GPA Scale", 'class="ed-gpa-scale" placeholder="e.g. 4.00"', e.gpaScale) +
          "</div>" +
          field("Location", 'class="ed-loc"', e.location) +
          field("Website", 'class="ed-web" placeholder="https://…"', e.website) +
          textareaField("Description", 'class="ed-desc" rows="3"', e.description) +
          '<div class="field"><label>Institution Logo</label><div class="img-thumbs ed-logo">' + (e.logo ? thumbsHTML([e.logo]) : "") + "</div>" +
          '<div class="form-actions"><button type="button" class="btn-mini ed-logopick">Choose Image</button>' +
          '<button type="button" class="btn-mini ed-logoclear">Remove</button></div></div>' +
          '<label class="check-row"><input type="checkbox" class="ed-showres"' + (e.showResult !== false ? " checked" : "") + " /> Show result on site</label>" +
          '<div class="form-actions"><button type="button" class="btn-primary ed-save">Save Entry</button>' +
          '<button type="button" class="btn-ghost ed-cancel">Cancel</button></div>';

        var logo = e.logo || "";
        bindThumbRemove($(".ed-logo", panel), function () { return [logo]; }, function () {
          $(".ed-logo", panel).innerHTML = logo ? thumbsHTML([logo]) : "";
        });
        $(".ed-logopick", panel).addEventListener("click", function () {
          openPicker(false, function (u) { logo = u; $(".ed-logo", panel).innerHTML = thumbsHTML([u]); });
        });
        $(".ed-logoclear", panel).addEventListener("click", function () { logo = ""; $(".ed-logo", panel).innerHTML = ""; });

        var curCb = $(".ed-cur", panel);
        curCb.addEventListener("change", function () {
          $(".ed-ey", panel).disabled = curCb.checked;
          if (curCb.checked) $(".ed-ey", panel).value = "";
        });

        $(".ed-cancel", panel).addEventListener("click", function () { panel.classList.add("hidden"); panel.innerHTML = ""; });
        $(".ed-save", panel).addEventListener("click", function () {
          var btn = this;
          var patch = {
            degree: $(".ed-deg", panel).value,
            institution: $(".ed-inst", panel).value,
            level: $(".ed-level", panel).value,
            institutionType: $(".ed-insttype", panel).value,
            department: $(".ed-dept", panel).value,
            subject: $(".ed-subj", panel).value,
            startYear: $(".ed-sy", panel).value.trim(),
            endYear: $(".ed-ey", panel).value.trim(),
            currentStudying: curCb.checked,
            cgpa: $(".ed-cgpa", panel).value.trim(),
            cgpaScale: $(".ed-cgpa-scale", panel).value.trim(),
            gpa: $(".ed-gpa", panel).value.trim(),
            gpaScale: $(".ed-gpa-scale", panel).value.trim(),
            location: $(".ed-loc", panel).value.trim(),
            website: $(".ed-web", panel).value.trim(),
            description: $(".ed-desc", panel).value.trim(),
            logo: logo,
            showResult: $(".ed-showres", panel).checked,
            status: e.status || "published"
          };
          if (curCb.checked) { patch.endYear = ""; }
          guard(btn, function () {
            return api("/api/admin/education/" + e.id, "PUT", patch)
              .then(function () { toast("✓ Saved successfully"); route(); });
          });
        });
        panel.classList.remove("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      $("#edu-add").addEventListener("click", function () {
        guard($("#edu-add"), function () {
          return api("/api/admin/education", "POST", {
            level: "University", institution: "", degree: "", subject: "", department: "",
            startYear: "", endYear: "", currentStudying: false, gpa: "", gpaScale: "",
            cgpa: "", cgpaScale: "", description: "", location: "", website: "",
            logo: "", showResult: true, status: "published"
          }).then(route);
        }, "Adding…");
      });

      renderList();
    });
  });

  /* ---------- NAVIGATION ---------- */
  register("navigation", "Navigation", function (content) {
    return api("/api/admin/navigation").then(function (list) {
      content.innerHTML =
        '<div class="form-actions" style="margin-bottom:18px"><button type="button" class="btn-primary" id="nav-add">＋ Add Navigation Item</button></div>' +
        '<p class="hint" style="margin-bottom:14px">Drag ⠿ or use arrows to reorder. Disabled items are hidden from the public site.</p>' +
        '<div id="nav-list"></div>';
      var listEl = $("#nav-list");

      function renderList() {
        listEl.innerHTML = list.map(function (n) {
          return '<div class="dd-item" data-id="' + n.id + '">' +
            '<div class="row-item"><span class="drag-handle">⠿</span>' +
              '<div class="row-main"><div class="row-title">' + esc(n.label || "Untitled") +
                (n.enabled === false ? ' <span class="badge draft"><i></i>Disabled</span>' : "") +
              '</div><div class="row-sub">' + esc(n.url || "#/" + n.key) + (n.newTab ? " · opens in new tab" : "") + "</div></div>" +
              '<div class="row-actions">' +
                '<button type="button" class="btn-mini" data-edit="' + n.id + '">Edit</button>' +
                '<button type="button" class="btn-mini" data-vis="' + n.id + '">' + (n.enabled === false ? "Enable" : "Disable") + "</button>" +
                '<button type="button" class="btn-mini" data-up="' + n.id + '">↑</button>' +
                '<button type="button" class="btn-mini" data-down="' + n.id + '">↓</button>' +
                '<button type="button" class="btn-danger" data-del="' + n.id + '">Delete</button>' +
              "</div></div>" +
            '<div class="editor-panel hidden" data-editor="' + n.id + '"></div>' +
          "</div>";
        }).join("") || '<p class="empty-note">No navigation items yet.</p>';

        makeSortable(listEl, "navigation");

        $$("[data-del]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            if (!confirm("Delete this navigation item?")) return;
            guard(b, function () {
              return api("/api/admin/navigation/" + b.dataset.del, "DELETE")
                .then(function () { toast("✓ Deleted successfully"); route(); });
            }, "Deleting…");
          });
        });
        $$("[data-vis]", listEl).forEach(function (b) {
          b.addEventListener("click", function () {
            var n = find(b.dataset.vis);
            guard(b, function () {
              return api("/api/admin/navigation/" + n.id, "PUT", { enabled: n.enabled === false })
                .then(route);
            }, "Saving…");
          });
        });
        $$("[data-edit]", listEl).forEach(function (b) {
          b.addEventListener("click", function () { openEditor(find(b.dataset.edit), b.closest(".dd-item")); });
        });
        function find(id) { return list.filter(function (x) { return x.id === id; })[0]; }
      }

      function openEditor(n, wrap) {
        var panel = $("[data-editor]", wrap);
        var isOpen = !panel.classList.contains("hidden");
        $$(".editor-panel").forEach(function (p) { p.classList.add("hidden"); p.innerHTML = ""; });
        if (isOpen) return;
        panel.innerHTML =
          '<div class="grid-2">' +
            field("Label (display text)", 'class="nl-label"', n.label) +
            field("Key (route identifier)", 'class="nl-key" placeholder="e.g. blog, about"', n.key) +
          "</div>" +
          field("URL / Route", 'class="nl-url" placeholder="#/blog or https://…"', n.url) +
          '<div class="grid-2">' +
            '<label class="check-row"><input type="checkbox" class="nl-enabled"' + (n.enabled !== false ? " checked" : "") + " /> Enabled (visible on site)</label>" +
            '<label class="check-row"><input type="checkbox" class="nl-newtab"' + (n.newTab ? " checked" : "") + " /> Open in new tab</label>" +
          "</div>" +
          '<p class="hint" style="margin-top:10px">URL examples: <code>#/projects</code>, <code>#/blog</code>, <code>https://github.com/you</code></p>' +
          '<div class="form-actions"><button type="button" class="btn-primary nl-save">Save Entry</button>' +
          '<button type="button" class="btn-ghost nl-cancel">Cancel</button></div>';

        $(".nl-cancel", panel).addEventListener("click", function () { panel.classList.add("hidden"); panel.innerHTML = ""; });
        $(".nl-save", panel).addEventListener("click", function () {
          var btn = this;
          var patch = {
            label: $(".nl-label", panel).value.trim(),
            key: $(".nl-key", panel).value.trim(),
            url: $(".nl-url", panel).value.trim(),
            enabled: $(".nl-enabled", panel).checked,
            newTab: $(".nl-newtab", panel).checked
          };
          if (!patch.label) return toast("Label is required.", true);
          guard(btn, function () {
            return api("/api/admin/navigation/" + n.id, "PUT", patch)
              .then(function () { toast("✓ Saved successfully"); route(); });
          });
        });
        panel.classList.remove("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      $("#nav-add").addEventListener("click", function () {
        guard($("#nav-add"), function () {
          return api("/api/admin/navigation", "POST", {
            key: "", label: "New Item", url: "#/", enabled: true, newTab: false
          }).then(route);
        }, "Adding…");
      });

      renderList();
    });
  });

  /* ---------- APPEARANCE ---------- */
  register("appearance", "Appearance", function (content) {
    return api("/api/admin/settings").then(function (s) {
      var theme = (s && s.theme) || "dark";
      content.innerHTML =
        '<div class="card"><h3>Website Theme</h3>' +
          '<p class="hint" style="margin-bottom:14px">The selected theme is applied as the default for all visitors. Site visitors can still switch between dark and light using the theme toggle in the navbar.</p>' +
          '<div class="theme-options" id="ap-theme">' +
            '<label><input type="radio" name="ap-theme" value="dark"' + (theme === "dark" ? " checked" : "") + ' /><span>🌙 Dark</span></label>' +
            '<label><input type="radio" name="ap-theme" value="light"' + (theme === "light" ? " checked" : "") + ' /><span>☀️ Light</span></label>' +
            '<label><input type="radio" name="ap-theme" value="system"' + (theme === "system" ? " checked" : "") + ' /><span>🖥 System</span></label>' +
          "</div>" +
          '<div class="form-actions"><button type="button" class="btn-primary" id="ap-save">Save Theme</button></div></div>';

      $("#ap-save").addEventListener("click", function () {
        var v = $("#ap-theme input:checked").value;
        guard($("#ap-save"), function () {
          return api("/api/admin/settings", "PUT", { theme: v })
            .then(function () { toast("✓ Theme saved"); });
        }, "Saving…");
      });
    });
  });

  /* ---------- SETTINGS ---------- */
  register("settings", "Settings", function (content) {
    content.innerHTML =
      '<div class="card"><h3>Admin Profile</h3>' +
        '<div class="meta-list"><div>Username: <b>admin</b></div><div>Role: <b>Administrator</b></div><div>Session: <b>7 days</b> (HttpOnly cookie)</div></div></div>' +
      '<div class="card"><h3>Change Password</h3>' +
        '<div class="grid-2">' +
        '<div class="field"><label>Current password</label><input type="password" id="pw-cur" /></div>' +
        '<div class="field"><label>New password (min 6 chars)</label><input type="password" id="pw-next" /></div></div>' +
        '<div class="form-actions"><button type="button" class="btn-primary" id="pw-save">Update Password</button></div></div>' +
      '<div class="card"><h3>Backup</h3><p class="hint" style="margin-bottom:14px">Download a full copy of all website content (JSON).</p>' +
        '<a class="btn-ghost" style="text-decoration:none" href="/api/admin/export" download="portfolio-backup.json">⬇ Download Backup</a></div>' +
      '<div class="card"><h3>Resume / CV</h3><p class="hint" style="margin-bottom:14px">Upload your PDF resume — visitors instantly get a “Download Resume” button on the website.</p>' +
        '<div id="res-state"><p class="hint">Loading…</p></div>' +
        '<div class="form-actions">' +
          '<label class="btn-primary" id="res-upload-label" style="cursor:pointer;display:inline-flex">⬆ Upload PDF<input type="file" id="res-file" accept="application/pdf,.pdf" hidden /></label>' +
          '<span id="res-actions" class="hidden" style="display:inline-flex;gap:10px">' +
            '<button type="button" class="btn-ghost" id="res-preview">👁 Preview</button>' +
            '<a class="btn-ghost" id="res-download" href="/uploads/resume.pdf" download>⬇ Download</a>' +
            '<button type="button" class="btn-danger" id="res-remove">✕ Remove</button>' +
          "</span>" +
        "</div></div>" +
      '<div class="card"><h3>How it works</h3>' +
        '<p class="hint">Everything you save here appears immediately on the public website.<br />' +
        'The public address is <b>/</b> and this panel lives at <b>/admin</b>.<br />' +
        'Keep this URL private — there is no link to it anywhere on the public site. All admin API operations require authentication.</p></div>';

    $("#pw-save").addEventListener("click", function () {
      guard($("#pw-save"), function () {
        return api("/api/admin/password", "POST", { current: $("#pw-cur").value, next: $("#pw-next").value })
          .then(function () { toast("✓ Password changed successfully"); $("#pw-cur").value = ""; $("#pw-next").value = ""; });
      }, "Updating…");
    });

    /* resume / CV */
    function renderRes(r) {
      $("#res-state").innerHTML = r
        ? '<div class="meta-list"><div>Active file: <b>' + esc(r.filename) + "</b></div>" +
          "<div>Uploaded: <b>" + fmtDateTime(r.uploadedAt) + "</b></div>" +
          '<div>Served at: <code>/uploads/resume.pdf</code></div></div>'
        : '<p class="hint">No resume uploaded yet. Upload a PDF to show a “Download Resume” button on the website.</p>';
      $("#res-actions").classList.toggle("hidden", !r);
    }
    function loadRes() { api("/api/admin/resume").then(renderRes); }
    loadRes();

    $("#res-file").addEventListener("change", function () {
      var f = this.files[0];
      this.value = "";
      if (!f) return;
      if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) return toast("Only PDF files are allowed.", true);
      if (f.size > 10 * 1024 * 1024) return toast("PDF too large (max 10MB).", true);
      guard($("#res-upload-label"), function () {
        return fileToDataURL(f).then(function (data) {
          return api("/api/admin/resume", "POST", { filename: f.name, data: data });
        }).then(function () { toast("✓ Resume updated — live on the website"); loadRes(); });
      }, "Uploading…");
    });
    $("#res-preview").addEventListener("click", function () {
      window.open("/uploads/resume.pdf?v=" + Date.now(), "_blank");
    });
    $("#res-remove").addEventListener("click", function () {
      if (!confirm("Remove the active resume from the website?")) return;
      guard($("#res-remove"), function () {
        return api("/api/admin/resume", "DELETE").then(function () {
          toast("Resume removed"); loadRes();
        });
      }, "Removing…");
    });
  });
})();
