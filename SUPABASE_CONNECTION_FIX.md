# URGENT: Supabase Connection Pool Fix

## Problem
Your site is down with error: `MaxClientsInSessionMode: max clients reached`

This happens because Supabase's **Session Pooler** has a limited connection pool, and your application was trying to open too many connections.

## What Was Fixed

### 1. Added Connection Pool Limits in `database.py`

```python
engine = create_async_engine(
    DATABASE_URL, 
    echo=DEBUG,
    pool_size=5,          # Maximum 5 permanent connections
    max_overflow=10,      # Maximum 10 temporary connections
    pool_pre_ping=True,   # Verify connections before using
    pool_recycle=3600     # Recycle connections after 1 hour
)
```

This limits your application to a maximum of **15 concurrent connections** (5 permanent + 10 overflow).

---

## CRITICAL: Update Render Environment Variable

You need to update your `DATABASE_URL` on Render to use the **Transaction Pooler** instead of Session Pooler.

### Current URL (Session Pooler - Port 5432):
```
postgresql://postgres.idlqmdjcglhukxsosqrv:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

### NEW URL (Transaction Pooler - Port 6543):
```
postgresql://postgres.idlqmdjcglhukxsosqrv:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

**Only change:** `5432` → `6543`

### Why Transaction Pooler?

| Feature | Session Pooler (Port 5432) | Transaction Pooler (Port 6543) |
|---------|---------------------------|-------------------------------|
| **Connection Limit** | Very limited | Much higher |
| **Best For** | Long-running connections | Serverless/Web apps |
| **Your Issue** | ❌ Causes "max clients" error | ✅ Solves the problem |

---

## Steps to Fix on Render

1. **Go to Render Dashboard**
   - Navigate to your web service

2. **Update Environment Variable**
   - Go to **Environment** tab
   - Find `DATABASE_URL`
   - Change port from `5432` to `6543`
   - **New value:**
     ```
     postgresql://postgres.idlqmdjcglhukxsosqrv:J%40%2A3mmXxX92XPvm@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
     ```
     *(Note: Password is URL-encoded: `@` → `%40`, `*` → `%2A`)*

3. **Save Changes**
   - Click "Save Changes"
   - Render will automatically redeploy

4. **Verify**
   - Wait for deployment to complete (~2-3 minutes)
   - Test your API endpoints
   - Check logs for any errors

---

## For Local Development

Your local `.env` file should remain unchanged (using direct connection):
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/saturday_smashers
DEBUG=True
```

---

## Verification

After updating on Render, test these endpoints:
- `https://your-backend.onrender.com/health`
- `https://your-backend.onrender.com/health/db`
- `https://your-backend.onrender.com/fund/balances`

All should return HTTP 200 without connection errors.

---

## Additional Notes

- **Connection pooling** is now configured to prevent overwhelming Supabase
- **Transaction pooler** is designed for applications like yours with many short-lived connections
- **pool_pre_ping** ensures stale connections are detected and replaced
- **pool_recycle** prevents long-lived connections from becoming stale

Your site should be back up immediately after updating the Render environment variable! 🚀
