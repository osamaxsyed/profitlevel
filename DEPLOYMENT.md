# ProfitLevel Deployment Guide

## ✅ Completed Setup

- ✅ Migrated from better-sqlite3 to Turso (@libsql/client)
- ✅ Converted all API routes to async
- ✅ Migrated all production data to Turso cloud database
- ✅ Tested locally with Turso connection

## 🚀 Deploy to Vercel

### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts and deploy to production
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your `profitlevel` Git repository
4. Add environment variables (see below)
5. Click "Deploy"

## 🔑 Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```
TURSO_URL=libsql://profitlevel-osamaxsyed.aws-us-east-1.turso.io
TURSO_TOKEN=<rotated 2026-10-22 — never commit the value; it lives in Vercel (sensitive) and the VM env only>
```

## 🌐 Configure Custom Domain

1. In Vercel Dashboard → Project Settings → Domains
2. Add custom domain: `app.eastbrunswickhandyman.com`
3. Follow Vercel's DNS configuration instructions
4. Add CNAME record in your domain registrar:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

## 📊 Data

Your database is hosted on Turso cloud:
- **8 jobs** migrated
- **20 materials** migrated
- **4 labor entries** migrated
- **6 mileage entries** migrated
- **36 overhead entries** migrated
- All settings and IRS rates preserved

## 🔒 Optional: Password Protection

To add password protection in Vercel:

1. Go to Project Settings → Deployment Protection
2. Enable "Password Protection"
3. Set a password for admin access

## 📝 After Deployment

Once deployed, the Admin link will be added to the logo-handy-makeover website header pointing to:
```
https://app.eastbrunswickhandyman.com
```

## 🛠️ Local Development

Continue using Turso for local development:
```bash
npm run dev
```

Environment variables are loaded from `.env.local` (already configured).
