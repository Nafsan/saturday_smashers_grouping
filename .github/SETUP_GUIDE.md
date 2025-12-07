# GitHub Actions Keep-Alive Setup Guide

This guide explains how to configure and use the GitHub Actions workflows to keep your Render backend active and monitor Supabase database health.

## What Was Created

### 1. Health Check Endpoints (in `backend/main.py`)

- **`GET /health`** - Simple health check for keep-alive pings
  - Returns: `{"status": "healthy", "timestamp": "..."}`
  
- **`GET /health/db`** - Database connectivity check
  - Returns: `{"status": "healthy", "database": "connected", "response_time_ms": 45, "timestamp": "..."}`

### 2. GitHub Actions Workflows

- **`.github/workflows/keep-backend-alive.yml`** - Pings backend every 5 minutes
- **`.github/workflows/check-database-health.yml`** - Checks database daily at 3:17 AM UTC

---

## Setup Instructions

### Step 1: Update Backend URL in Workflows

Both workflow files contain a placeholder URL that needs to be updated with your actual Render backend URL.

**Files to update:**
- `.github/workflows/keep-backend-alive.yml` (line 18)
- `.github/workflows/check-database-health.yml` (line 17)

**Replace:**
```yaml
https://your-render-backend-url.onrender.com/health
```

**With your actual Render URL:**
```yaml
https://saturday-smashers-backend.onrender.com/health
```

> **Note:** Your Render backend URL can be found in your Render dashboard under your web service settings.

### Step 2: Push to GitHub

```bash
cd d:\pet_project\saturday_smashers_grouping
git add .
git commit -m "Add health check endpoints and GitHub Actions workflows"
git push origin main
```

### Step 3: Enable GitHub Actions (if needed)

1. Go to your GitHub repository
2. Click on the **"Actions"** tab
3. If prompted, click **"I understand my workflows, go ahead and enable them"**

### Step 4: Verify Workflows

1. Go to **Actions** tab in your GitHub repository
2. You should see two workflows:
   - "Keep Backend Alive"
   - "Database Health Check"
3. Click **"Run workflow"** → **"Run workflow"** to manually trigger a test run
4. Check the logs to ensure they complete successfully

---

## How It Works

### Backend Keep-Alive Workflow

- **Frequency:** Every 5 minutes
- **Purpose:** Prevents Render from spinning down your backend due to inactivity
- **What it does:**
  1. Sends HTTP GET request to `/health` endpoint
  2. Checks if response is HTTP 200
  3. Logs success or failure

### Database Health Check Workflow

- **Frequency:** Daily at 3:17 AM UTC
- **Purpose:** Monitors Supabase database connectivity
- **What it does:**
  1. Sends HTTP GET request to `/health/db` endpoint
  2. Verifies database connection status
  3. Logs response time
  4. Alerts if database is unreachable

---

## Monitoring & Troubleshooting

### View Workflow Runs

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. Select a workflow to see run history
4. Click on a specific run to view detailed logs

### Common Issues

**Issue: Workflow fails with HTTP error**
- **Solution:** Verify your Render backend URL is correct in the workflow files
- Check if your backend is deployed and running on Render

**Issue: Database health check fails**
- **Solution:** Verify Supabase connection string in your `.env` file
- Check Supabase dashboard to ensure database is not paused
- Review backend logs on Render for database connection errors

**Issue: Workflows not running on schedule**
- **Solution:** GitHub Actions scheduled workflows can have delays during high-demand periods
- Workflows run in UTC timezone
- First scheduled run may take up to 1 hour after pushing to GitHub

### GitHub Actions Usage Limits

- **Public repositories:** Unlimited minutes (completely free)
- **Private repositories:** 2,000 free minutes/month
- **Your estimated usage:** ~20 minutes/month (well within limits)

---

## Testing Locally

Before pushing to GitHub, test the health endpoints locally:

```bash
# Start your backend
cd d:\pet_project\saturday_smashers_grouping
uvicorn backend.main:app --reload

# In another terminal, test the endpoints
curl http://localhost:8000/health
curl http://localhost:8000/health/db
```

Expected responses:
```json
// /health
{"status": "healthy", "timestamp": "2025-12-06T17:30:00.123456"}

// /health/db
{"status": "healthy", "database": "connected", "response_time_ms": 45.23, "timestamp": "2025-12-06T17:30:00.123456"}
```

---

## Next Steps

1. ✅ Update Render backend URL in both workflow files
2. ✅ Test health endpoints locally
3. ✅ Push to GitHub
4. ✅ Manually trigger workflows to verify they work
5. ✅ Monitor workflow runs for the first few days

Your Render backend will now stay active 24/7, and you'll have daily monitoring of your Supabase database health!
