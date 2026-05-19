# Deployment Guide — Prowider Mini

## Overview

This guide covers deploying Prowider Mini to production using:
- **Railway** for PostgreSQL database (free tier available)
- **Vercel** for Next.js application (free tier)

---

## 1. Set Up PostgreSQL on Railway

### 1.1 Create a Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up or log in with GitHub
3. Click **"New Project"**
4. Select **"Add Plugins"**
5. Choose **"PostgreSQL"**
6. Railway will automatically create a PostgreSQL instance

### 1.2 Retrieve the DATABASE_URL

1. In your Railway project, click on the **PostgreSQL** plugin
2. Go to the **"Connect"** tab
3. Copy the **Database URL** (it looks like `postgresql://user:password@host:port/dbname`)
4. Save this securely — you'll need it for Vercel environment variables

### 1.3 Verify the Connection (Optional)

Test the connection locally before deploying:

```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

---

## 2. Prepare and Deploy the Next.js App

### 2.1 Ensure All Code Is Committed

Make sure all Phase 2 and Phase 3 code is committed to your GitHub repository:

```bash
git add .
git commit -m "Complete Phase 3: Dashboard with SSE and deployment"
git push origin main
```

### 2.2 Create a Vercel Account and Connect GitHub

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in
3. Click **"Import Project"**
4. Select your GitHub repository (the one containing Prowider)
5. Vercel will auto-detect it as a Next.js project
6. Click **"Import"**

### 2.3 Add Environment Variables

In the Vercel import dialog (or dashboard → Settings → Environment Variables):

1. Add the following environment variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Paste the PostgreSQL URL from Railway

2. Make sure all environments (Production, Preview, Development) have the variable set

### 2.4 Click Deploy

1. Click the **"Deploy"** button
2. Vercel will:
   - Clone your repository
   - Install dependencies
   - Run `npm run build`
   - Deploy the Next.js app to Vercel's global edge network

Wait for the deployment to complete (typically 2–5 minutes).

---

## 3. Run Database Migrations on Production

Once the deployment is complete, the database is still empty. You need to run migrations and seeding.

### 3.1 Option A: Use Vercel CLI (Recommended)

```bash
npm install -g vercel
vercel env pull
npx prisma migrate deploy
npx prisma db seed
```

### 3.2 Option B: Run via Prisma Studio or Vercel Functions

If Option A doesn't work, you can manually trigger the seed by:

1. Creating a temporary API route `app/api/admin/seed/route.ts` that runs the seed (not recommended for production)
2. Or, using Prisma Migrate to apply schema changes:
   ```bash
   DATABASE_URL="..." npx prisma migrate deploy
   DATABASE_URL="..." npx prisma db seed
   ```

Replace `DATABASE_URL` with your actual Railway connection string.

---

## 4. Verify the Production Deployment

### 4.1 Visit the Live Application

Visit your Vercel deployment URL (e.g., `https://prowider-mini.vercel.app`). You should see:
- Navigation bar with "Submit Request", "Provider Dashboard", "Test Tools"
- Home page (or redirect to /request-service)

### 4.2 Test Lead Submission

1. Go to `/request-service`
2. Submit a lead for **Service 1** with sample details:
   - Name: "John Doe"
   - Phone: "9000000001"
   - City: "San Francisco"
   - Description: "Test lead"
3. You should see a success response with assigned providers

### 4.3 Test Real-Time Dashboard

1. Open `/dashboard` in one browser tab
2. In another tab, go to `/request-service` and submit another lead
3. **Within 3–5 seconds**, the Dashboard tab should update to show the new lead
4. Verify the green "Live" indicator is pulsing

### 4.4 Test Concurrency (Optional)

1. Go to `/test-tools`
2. Click **"Generate 10 Leads Simultaneously"**
3. Verify all 10 leads are created with status 201
4. Check the Dashboard — all 10 should appear within a few seconds

### 4.5 Test Webhook Idempotency (Optional)

1. Go to `/test-tools`
2. Click **"Call Webhook 5 Times (Test Idempotency)"**
3. Verify:
   - First response: "Quota reset successfully"
   - Responses 2–5: "Already processed"

---

## 5. Troubleshooting

### 5.1 Database Connection Error

**Error:** "Can't reach database server"

**Solution:**
- Verify the `DATABASE_URL` in Vercel environment variables
- Check that the Railway PostgreSQL instance is running
- Ensure the URL format is correct: `postgresql://user:password@host:port/dbname`

### 5.2 Build Fails with TypeScript Errors

**Error:** TypeScript compilation errors during deploy

**Solution:**
- Run `npm run build` locally to catch errors before pushing
- Fix any type errors and commit again

### 5.3 Dashboard Not Updating

**Error:** SSE stream not connecting or data not refreshing

**Solution:**
- Open browser DevTools → Network tab → filter by `stream`
- Verify the EventSource connection is open (should see `200` response)
- Check for CORS or CSP issues in the console

### 5.4 Seed Not Applied

**Error:** Providers and services not in the database after deploy

**Solution:**
- Run migrations and seed manually:
  ```bash
  npx prisma migrate deploy
  npx prisma db seed
  ```
- Or, temporarily add a public API endpoint that triggers seeding (not recommended for production)

---

## 6. Post-Deployment Monitoring

### 6.1 Enable Vercel Analytics

1. In your Vercel dashboard, go to your project
2. Go to **Settings → Analytics**
3. Enable Web Analytics to monitor performance

### 6.2 Monitor Railway PostgreSQL

1. In your Railway project, go to **PostgreSQL plugin**
2. View the **Metrics** tab to monitor CPU, memory, and connection count
3. Set up alerts if needed (paid Railway tier)

### 6.3 Check Application Logs

In Vercel:
1. Go to **Deployments**
2. Click on the latest deployment
3. Go to **Logs** to view real-time application logs

---

## 7. Scale and Maintenance

### 7.1 Increase Database Capacity (If Needed)

If you exceed Railway's free tier:
1. Upgrade to a paid Railway plan
2. Or, migrate to AWS RDS or Neon for more capacity

### 7.2 Update the Application

To push a new version:
1. Make changes locally
2. Commit and push to GitHub
3. Vercel will automatically redeploy
4. Runs migrations automatically if `prisma/migrations` changed

### 7.3 Secrets and Environment Management

For sensitive data (API keys, etc.):
1. Add to Vercel Environment Variables (not in code)
2. Use `.env.local` for local development
3. Add `.env*.local` to `.gitignore`

---

## Summary

| Step | Tool | Time |
|------|------|------|
| PostgreSQL setup | Railway | 2 min |
| GitHub integration | Vercel | 1 min |
| Environment variables | Vercel | 1 min |
| Deploy app | Vercel | 2–5 min |
| Run migrations | Prisma CLI | 1 min |
| Seed database | Prisma CLI | 1 min |
| **Total** | — | **8–11 min** |

Your Prowider Mini app is now live on Vercel with a PostgreSQL database on Railway. The dashboard will update in real-time as leads are submitted. 🚀
