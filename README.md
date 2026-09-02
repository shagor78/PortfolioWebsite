# Shagor — Portfolio

Personal portfolio website for Md. Shagor Islam — DevOps & Cloud Engineer.

## Storage architecture

Content published on the site is **permanent** and survives restarts, redeploys, sleeps and rebuilds:

- **Content** → persistent PostgreSQL database (`DATABASE_URL`)
- **Images / videos / PDFs** → persistent Cloudinary storage (`CLOUDINARY_*`)
- Local `/image/` directory is used only when Cloudinary is not configured (fallback for non-ephemeral hosts / local dev)

Published content is **never** deleted automatically, and there are **no limits** on the number of projects, blog posts, education or experience records.

```
Editor → Backend API → Persistent Database + Persistent Image Storage → Permanent Content
```

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a PostgreSQL connection string (Supabase free tier recommended)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (available from your Cloudinary account console)
2. Install dependencies: `npm install`
3. Migrate existing data once: `npm run migrate` (backs up `data/db.json` first, then moves everything to PostgreSQL; existing images are copied into `/image/`, nothing is deleted)
4. Run: `npm start`

```bash
npm start
```

On hosting platforms (Render, Vercel, Railway, etc.) set the same environment variables in the platform settings.
