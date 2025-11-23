# Deployment Guide: Render + GitHub Pages

This guide will walk you through deploying your **FastAPI Backend** and **PostgreSQL Database** to Render, and then connecting it to your **React Frontend** on GitHub Pages.

## Phase 1: Deploy Backend & Database on Render

We will use [Render](https://render.com/) because it offers a free tier for both web services and PostgreSQL.

### Step 1: Sign Up & Connect
1.  Go to [dashboard.render.com](https://dashboard.render.com/) and sign up (you can use your GitHub account).
2.  Click **"New +"** and select **PostgreSQL**.

### Step 2: Create Database
1.  **Name**: `saturday-smashers-db` (or similar).
2.  **Region**: Choose one close to you (e.g., Singapore, Frankfurt).
3.  **Plan**: Select **Free**.
4.  Click **Create Database**.
5.  **Wait** for it to be created. Once done, find the **"Internal Database URL"** and **"External Database URL"**. Keep this page open.

### Step 3: Create Backend Web Service
1.  Go back to the Dashboard and click **"New +"** -> **Web Service**.
2.  Select **"Build and deploy from a Git repository"**.
3.  Connect your `saturday_smashers_grouping` repository.
4.  **Name**: `saturday-smashers-api`.
5.  **Region**: Same as your database.
6.  **Branch**: `main`.
7.  **Root Directory**: `.` (leave as is).
8.  **Runtime**: `Python 3`.
9.  **Build Command**: `pip install -r backend/requirements.txt`
10. **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
11. **Plan**: Free.
12. **Environment Variables** (Scroll down to "Advanced"):
    *   Key: `DATABASE_URL`
    *   Value: Paste the **Internal Database URL** from Step 2. (It looks like `postgres://user:pass@hostname...`)
    *   *Note: If the Internal URL doesn't work during build, try the External one, but Internal is faster/cheaper within Render.*
13. Click **Create Web Service**.

### Step 4: Wait for Build
Render will now clone your repo, install Python dependencies, and start the server.
*   Watch the logs. If you see "Application startup complete", it works!
*   Copy your **Backend URL** from the top left (e.g., `https://saturday-smashers-api.onrender.com`).

---

## Phase 2: Configure Frontend (GitHub)

Now we need to tell your React app where the backend is.

1.  Go to your GitHub Repository for `saturday_smashers_grouping`.
2.  Click **Settings** (top tab).
3.  On the left sidebar, click **Secrets and variables** -> **Actions**.
4.  Click the **Variables** tab (next to Secrets).
5.  Click **New repository variable**.
    *   **Name**: `VITE_API_URL`
    *   **Value**: Your Render Backend URL (e.g., `https://saturday-smashers-api.onrender.com`).
    *   *Important: Do not add a trailing slash `/`.*
6.  Click **Add variable**.

---

## Phase 3: Trigger Deployment

1.  I have already updated your `.github/workflows/deploy.yml` to use this new variable.
2.  Simply **push any change** to the `main` branch (or manually re-run the workflow in the "Actions" tab).
3.  GitHub Actions will:
    *   Build your React app.
    *   Inject the `VITE_API_URL`.
    *   Deploy to GitHub Pages.

## Phase 4: Database Migration (Production)

Your Render database is currently empty. You need to run the migration script *on the production server*.

**Option A: Run via Render Shell (Easiest)**
1.  Go to your **Web Service** in Render Dashboard.
2.  Click the **"Shell"** tab.
3.  Run:
    ```bash
    python backend/migrate_data.py
    ```
    *Note: This might fail if `history.json` isn't found or if paths are tricky. If it fails, try Option B.*

**Option B: Connect Locally**
1.  Get the **External Database URL** from Render.
2.  Update your local `.env` file to use this External URL (temporarily).
3.  Run `python backend/migrate_data.py` on your **local machine**.
4.  This will push your local `history.json` data to the remote Render database.
5.  Revert your local `.env` to localhost afterwards.

---

## Done! 🚀
Your app should now be live on GitHub Pages, talking to your Render backend!
