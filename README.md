# Shagor — Portfolio + Admin Panel

Personal portfolio website with a private admin panel (mini CMS), so content
can be edited from the browser without touching any code.

**Zero npm dependencies.** Only Node.js (v16+) is required.

## Run

```bash
npm start
```

(or `node server.js`)

| URL | What |
|---|---|
| http://localhost:3000 | Public site |
| http://localhost:3000/admin | Admin panel |

First run creates `data/db.json` and `uploads/` automatically.

## Default login

- Username: `admin`
- Password: `admin123`

> **Change the password immediately** in *Admin Panel → Settings*.

## Admin panel features

- **Dashboard** — stats (published/drafts included), recent posts, recent activity feed
- **Home** — hero text, buttons, hero image, skill chips
- **About** — intro paragraphs, belief, focus, photos, life items, education, certifications
- **Experience** — add/edit/delete/hide entries, logo upload, drag or arrow reorder, "Present" for current job
- **Projects** — draft → publish workflow, multiple images, GitHub/demo links, contribution
- **Blog** — posts table with thumbnails + search + status filters; full editor with featured image,
  additional images, categories, tags, location, live preview; Save Draft / Publish / Update /
  Unpublish with published & updated timestamps
- **Categories** — manage blog post categories
- **Media Library** — upload (click or drag & drop), replace-in-place (same URL everywhere), delete
- **Messages** — contact-form inbox, read/unread, delete
- **Sections** — enable/disable sections, reorder pages
- **Settings** — admin profile, change password, export full JSON backup

Every admin action gives success/error feedback and can't be double-submitted.
All changes save instantly to `data/db.json` and are live on refresh.

## Data & backups

- All content lives in `data/db.json`; uploaded images in `uploads/`.
- Export/import: use *Admin → Settings → Download backup* for a JSON snapshot.
- To reset everything: stop server, delete `data/` (and optionally `uploads/`).

## Project layout

```
server.js            HTTP server + REST API + auth (no frameworks)
public/              public site (index.html, css/, js/)
public/admin/        admin panel SPA
data/db.json         all content (auto-created)
uploads/             uploaded images (auto-created)
_old-static-version/ previous static-only version (kept for reference)
```

Deploying on a VPS? Run under a process manager, e.g.:

```bash
npm i -g pm2
pm2 start server.js --name portfolio
```

and put nginx/caddy in front for HTTPS.
