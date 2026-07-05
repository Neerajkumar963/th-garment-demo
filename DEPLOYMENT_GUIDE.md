# Demo Hosting & Deployment Guide

Welcome to the Demo version of TH Garments ERP! This folder is a sandboxed copy of the codebase designed for hosting a demo without risking client production data or breaking original code.

---

## 1. Database Setup (Cloud MySQL)

Since the project uses MySQL, host it on a free cloud MySQL provider (such as Aiven, Clever Cloud, or Tidb Cloud). Once you get your credentials:

1. **Create Database**: Create a new database named `th_garments_demo` (or any custom name).
2. **Execute Schema & Data Scripts** in the following order:
   * **`production_schema.sql`** (Creates base tables)
   * **`migration_post_restore.sql`** (Alters schema to support `articles` junction-mappings)
   * **`demo_seed_data.sql`** (Clears any tables and seeds dummy employees, clients, items, fabric rolls, articles, prices, and default admin user)

---

## 2. Backend Deployment on Render

1. Go to [Render](https://render.com/), create a new **Web Service**, and link your demo repository.
2. Configure settings:
   * **Root Directory**: `th-garments/server`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
3. Add the following **Environment Variables** in Render Dashboard under the "Environment" tab:
   * `NODE_ENV` = `production`
   * `DB_HOST` = `<Your Cloud MySQL Host>`
   * `DB_USER` = `<Your Cloud MySQL User>`
   * `DB_PASSWORD` = `<Your Cloud MySQL Password>`
   * `DB_NAME` = `<Your Cloud MySQL Database Name>`
   * `DB_PORT` = `3306`
   * `DB_SSL` = `true` (Enable if database hosting requires secure connection, like Aiven)
   * `JWT_SECRET` = `any_secure_token_for_demo_session`
   * `FRONTEND_URL` = `https://your-demo-app.vercel.app` (Add Vercel domain once built)
   * `CORS_ORIGIN` = `https://your-demo-app.vercel.app`

---

## 3. Frontend Deployment on Vercel

1. Go to [Vercel](https://vercel.com/), import your demo repository.
2. Select **Root Directory**: `th-garments/client`
3. Vercel automatically detects the Vite config. In **Environment Variables**, add:
   * `VITE_API_URL` = `https://your-render-backend-url.onrender.com/api` (Point to your Render backend URL, suffix it with `/api`)
4. Click **Deploy**. Vercel will build your static files and generate your live demo link.
5. **CORS sync**: Copy this Vercel link and paste it into the backend Render Environment Variables (`FRONTEND_URL` and `CORS_ORIGIN`), then redeploy the backend.

---

## 4. Default Login Credentials (Demo)

Once live, you can log in using these pre-seeded administrator details:
* **Email**: `admin@demo.com`
* **Password**: `admin123`

---

## 5. Directory Safety Note

* Your local development path `new garment inventory/` (containing client production configs and database backups) remains **100% untouched** and completely safe.
* Feel free to push the `garments-erp-demo` folder to GitHub. The `.env` files are ignored by default via `.gitignore`, protecting your database credentials.
