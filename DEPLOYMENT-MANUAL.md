# Start POS Deployment Manual

**Complete step-by-step guide from scratch to production.**  
Follow this manual from top to bottom - each step builds on the previous one.

---

## ⏱️ Time Estimate

- **Local Development Setup**: 30-45 minutes
- **Production Deployment**: 1-2 hours
- **Total First-Time Setup**: 2-3 hours

---

## 📋 What You'll Need

Before starting, gather these accounts and tools:

### Required Tools (Install First)
- [ ] **Node.js 22+** - [Download](https://nodejs.org/)
- [ ] **pnpm 10+** - Run: `npm install -g pnpm`
- [ ] **Git** - [Download](https://git-scm.com/)
- [ ] **Docker Desktop** (for local dev) - [Download](https://www.docker.com/products/docker-desktop)

### Required Accounts (Sign up if needed)
- [ ] **GitHub** - For source code - [Sign up](https://github.com/signup)
- [ ] **Vercel** - For hosting - [Sign up](https://vercel.com/signup)
- [ ] **Supabase** - For PostgreSQL database - [Sign up](https://supabase.com) (Free tier available)

### Optional Accounts (Can add later)
- [ ] **Stripe** - For payments - [Sign up](https://stripe.com)
- [ ] **Resend** - For emails - [Sign up](https://resend.com)
- [ ] **Google Cloud** - For Google OAuth - [Sign up](https://console.cloud.google.com)
- [ ] **Facebook Developers** - For Facebook login - [Sign up](https://developers.facebook.com)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│  ┌────────────┐                        ┌────────────┐       │
│  │ dev branch │                        │prod branch │       │
│  └──────┬─────┘                        └──────┬─────┘       │
└─────────┼────────────────────────────────────┼─────────────┘
          │ Push triggers                       │ Push triggers
          │ GitHub Actions                      │ GitHub Actions
          ▼                                     ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Dev Environment   │            │  Prod Environment   │
├─────────────────────┤            ├─────────────────────┤
│ 1. DB Migration     │            │ 1. DB Migration     │
│ 2. Deploy Web App   │            │ 2. Deploy Web App   │
│ 3. Deploy Admin App │            │ 3. Deploy Admin App │
└─────────────────────┘            └─────────────────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Dev PostgreSQL    │            │  Prod PostgreSQL    │
│   Vercel Web (Dev)  │            │  Vercel Web (Prod)  │
│  Vercel Admin (Dev) │            │ Vercel Admin (Prod) │
└─────────────────────┘            └─────────────────────┘
```

**What gets deployed:**
- **2 Applications**: Web (POS) + Admin (Management)
- **2 Environments**: Dev + Production
- **Total Vercel Projects**: 4 (web-dev, web-prod, admin-dev, admin-prod)

---

# PART 1: LOCAL DEVELOPMENT SETUP

Follow these steps to get a working local development environment.

---

## Step 1: Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/start-pos.git
cd start-pos

# Install all dependencies
pnpm install
```

**⏱️ Time**: ~3 minutes (depending on internet speed)

---

## Step 2: Configure Root Environment Files

### Step 2a. Create Root `.env` File

```bash
# Copy template
cp .env.example .env

# Open in editor
nano .env
# Or use: code .env (VS Code)
# Or use: notepad .env (Windows)
```

**Fill in these values:**

```bash
# =============================================================================
# ROOT .env - Shared Configuration (Local Development)
# =============================================================================

# PostgreSQL infrastructure (for Docker local development)
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_HOST_PORT=5434
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres

# Authentication Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=
```

**Important:** Leave `DATABASE_URL` commented out (or don't add it) for local development. You'll add it later during production deployment setup.

**Example of filled values:**
```bash
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_HOST_PORT=5434
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
BETTER_AUTH_SECRET=xK9$mN2pL5qR8tY3vZ7wA4bC6dE1fGhI=
```

**Save and close** (Ctrl+X, then Y, then Enter)

### 3b. Create Root `.env.config` File

```bash
# Copy template
cp .env.config.example .env.config

# Open in editor
nano .env.config
```

**Fill in these values:**

```bash
# =============================================================================
# ROOT .env.config - Build Configuration
# =============================================================================

# Skip interactive prompts
SCHEMA_AUTO_CONFIRM=yes

# Choose your deployment country
# OPTIONS: PH (Philippines), SG (Singapore), US (United States)
DEPLOYMENT_COUNTRY=__YOUR_COUNTRY__   # Example: PH

# Optional: Seed configuration
SEED_AUTO_CONFIRM=yes
SEED_FOLDER=examples
```

**⏱️ Time**: ~3 minutes

---

## Step 3: Generate .env.config File

Run the automation script to generate `.env.config` and app `.env` files:

```bash
# Generate .env files for apps/web and apps/admin
pnpm env:generate
```

**What this does:**
- ✅ Reads your root `.env`
- ✅ Generates `.env.config` from templates
- ✅ Merges with `apps/web/.env.example`
- ✅ Merges with `apps/admin/.env.example`
- ✅ Creates final `apps/web/.env` and `apps/admin/.env`
- ✅ **Automatically copies shared variables to both apps**

**Expected Output:**
```
🔧 Generating env files...

  ✓  apps/web/.env (7 shared + 40 app-specific vars)
  ✓  apps/admin/.env (7 shared + 40 app-specific vars)

✅ Done.
```

**What gets generated:**
- `.env.config` - Shared configuration
- `apps/web/.env` - Web app configuration
- `apps/admin/.env` - Admin app configuration

**Note**: All shared variables from root `.env` (including `BETTER_AUTH_SECRET`) are automatically copied to both app `.env` files.

**⏱️ Time**: ~30 seconds

---

## Step 4: Setup Stripe (Optional - Can Skip)

**Skip this step if you're not using payments yet. You can add it later.**

### 4a. Get Stripe Test API Key

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or login
3. Toggle **"Test mode" ON** (top right corner)
4. Go to **Developers → API keys**
5. Copy the **Secret key** (starts with `sk_test_`)

### 7b. Add Stripe Key to Root .env

```bash
# Open root .env
nano .env
```

**Add this line at the end:**
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

**Save and close**

### 7c. Regenerate App .env Files

```bash
# Regenerate to include Stripe key
pnpm env:generate
```

Now both `apps/web/.env` and `apps/admin/.env` will have the `STRIPE_SECRET_KEY` automatically.

### 7d. Run Automated Stripe Setup

```bash
# Creates 25+ products/prices in Stripe and writes IDs to .env
pnpm stripe:setup
```

**⚠️ Important: This script is idempotent!**
- Safe to run multiple times
- Will **reuse existing products** instead of creating duplicates
- If you need to re-run it, just run the command again

**What this script does:**
1. Connects to Stripe using your test key
2. Creates all subscription plans (Trial, Starter, Growth, Premium)
3. Creates annual plan variants (with 20% discount)
4. Creates all credit packages
5. Creates all transaction addons
6. Creates all monthly recurring addons
7. Writes all price IDs to `apps/stripe/env/stripe.env`
8. Merges price IDs into `apps/web/.env` automatically

**Expected Output:**
```
[stripe-catalog] Reconciling Stripe catalog...

STRIPE_PLAN_TRIAL_PRICE_ID                         created  price_1ABC123...
STRIPE_PLAN_STARTER_PRICE_ID                       created  price_1DEF456...
STRIPE_PLAN_GROWTH_PRICE_ID                        created  price_1GHI789...
STRIPE_PLAN_PREMIUM_PRICE_ID                       created  price_1JKL012...
STRIPE_PLAN_STARTER_ANNUAL_PRICE_ID                created  price_1MNO345...
STRIPE_PLAN_GROWTH_ANNUAL_PRICE_ID                 created  price_1PQR678...
STRIPE_PLAN_PREMIUM_ANNUAL_PRICE_ID                created  price_1STU901...
STRIPE_BRANCH_CREDIT_10_PRICE_ID                   created  price_1VWX234...
STRIPE_BRANCH_CREDIT_50_PRICE_ID                   created  price_1YZA567...
STRIPE_BRANCH_CREDIT_100_PRICE_ID                  created  price_1BCD890...
STRIPE_BRANCH_CREDIT_500_PRICE_ID                  created  price_1EFG123...
STRIPE_BRANCH_CREDIT_1000_PRICE_ID                 created  price_1HIJ456...
STRIPE_TX_ADDON_500_PRICE_ID                       created  price_1KLM789...
STRIPE_TX_ADDON_1000_PRICE_ID                      created  price_1NOP012...
STRIPE_TX_ADDON_5000_PRICE_ID                      created  price_1QRS345...
STRIPE_ADDON_ANALYTICS_PRICE_ID                    created  price_1TUV678...
STRIPE_ADDON_API_PRICE_ID                          created  price_1WXY901...
STRIPE_ADDON_BRANCH_PRICE_ID                       created  price_1ZAB234...
STRIPE_ADDON_EMPLOYEE_PRICE_ID                     created  price_1CDE567...
STRIPE_ADDON_TX_RECURRING_500_PRICE_ID             created  price_1FGH890...
STRIPE_ADDON_TX_RECURRING_1000_PRICE_ID            created  price_1IJK123...
STRIPE_ADDON_TX_RECURRING_5000_PRICE_ID            created  price_1LMN456...

[stripe-catalog] Done.
```

**Verify in Stripe dashboard:**
1. Go to https://dashboard.stripe.com/test/products
2. You should see all 22+ products created

**⏱️ Time**: ~2-3 minutes

---

## Step 5: Start Docker Services

Start all Docker services including PostgreSQL database:

```bash
# Start PostgreSQL, Redis, and other services
pnpm docker:all
```

**What this does:**
- ✅ Starts Docker containers (PostgreSQL, Redis, etc.)
- ✅ **Automatically regenerates .env files** (no need to run `pnpm env:generate`)
- ✅ PostgreSQL will be available on `localhost:5434`
- ✅ All services configured and ready

**Expected Output:**
```
[+] Running 3/3
 ✔ Container start-pos-db-1     Started
 ✔ Container start-pos-redis-1  Started
 ✔ Container start-pos-app-1    Started

🔧 Regenerating env files...
  ✓  apps/web/.env
  ✓  apps/admin/.env
✅ Docker services started
```

**⏱️ Time**: ~1 minute (first time may download images)

**To stop Docker services later:**
```bash
pnpm docker:down
```

---

## Step 6: Initialize Database Schema

Generate Prisma client and push schema to local Docker database:

```bash
# Step 1: Generate Prisma client from schema
pnpm db:generate

# Step 2: Reset database and push schema (creates all tables)
pnpm db:reset

# Step 3: Seed with sample data
pnpm db:seed
```

**What `db:reset` does:**
1. **Asks for confirmation** (to prevent accidents)
2. Drops existing database schema (if any)
3. Pushes the complete schema to your local Docker database
4. Creates all tables (users, businesses, products, transactions, etc.)

**What `db:seed` does:**
1. **Asks for confirmation** (to prevent accidents)
2. Populates database with sample data
3. Creates example businesses, products, transactions
4. Useful for testing and development

**⚠️ Warning:** Both commands are destructive!
- `db:reset` - Deletes all schema and data
- `db:seed` - Can overwrite existing data
- You'll see confirmation prompts before they run
- Safe to confirm during initial setup

**✅ Database initialized!** Your local Docker database now has the complete schema and sample data.

**⏱️ Time**: ~3 minutes

---
```

Now you're working with local data and won't affect your Supabase database.

**To switch back to Supabase:** Uncomment `DATABASE_URL`, stop Docker with `pnpm docker:down`, then restart with `pnpm docker:all`.

---

## Step 7: Start Development Server

Choose your preferred method:

### Method A: Docker (Full Stack with Database)

```bash
# Start everything (PostgreSQL + Web + Admin)
pnpm docker:all

# Wait for services to start (~30 seconds)
```

**Access your apps:**
- **Web App (POS)**: http://localhost:3200
- **Admin App**: http://localhost:3201
- **Database**: localhost:5434

### Method B: Local Development (No Docker)

**Terminal 1 - Web App:**
```bash
pnpm dev:web
```

**Terminal 2 - Admin App:**
```bash
pnpm dev:admin
```

**Access your apps:**
- **Web App (POS)**: http://localhost:3000
- **Admin App**: http://localhost:3001

**⏱️ Time**: ~1 minute

---

## Step 10: Setup Stripe Webhooks (Optional)

**Only needed if you're testing Stripe payments locally.**

Open a **third terminal** and run:

```bash
# Start webhook forwarding
pnpm stripe:webhook

# Leave this running
```

**What this does:**
- ✅ Forwards Stripe webhooks to your local app
- ✅ Auto-captures webhook signing secret
- ✅ Writes `STRIPE_WEBHOOK_SECRET` to `.env` automatically

**Output:**
```
[stripe-webhook] Forwarding → http://localhost:3200/api/stripe/webhook
[stripe-webhook] Your webhook signing secret is whsec_xxxxx
[stripe-webhook] ✓ STRIPE_WEBHOOK_SECRET → apps/web/.env
```

**⏱️ Time**: ~1 minute

---

## ✅ Local Development Complete!

You now have:
- ✅ Local Docker PostgreSQL database with schema
- ✅ Web app running on localhost:3200
- ✅ Admin app running on localhost:3201
- ✅ Sample data for testing
- ✅ Stripe products created (if configured)
- ✅ Webhooks forwarding (if configured)

**Test your setup:**
1. Open http://localhost:3200
2. Click "Sign Up" or "Register"
3. Create a test account
4. Explore the POS system

**You're now ready for local development!**

---

# PART 2: PRODUCTION DEPLOYMENT SETUP

Follow these steps to deploy to production.

---

## Step 8: Create Production Database with Supabase

Now that local development is working, let's set up a remote database for production (and optionally for dev environment).

### 8a. Create Supabase Project

1. **Sign up**: Go to [supabase.com](https://supabase.com) and create an account

2. **Create new project**:
   - Click "New Project"
   - **Name**: `start-pos-prod` (or `start-pos-dev` for development database)
   - **Database Password**: Click "Generate a password" and **SAVE IT SECURELY**
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free
   - Click "Create new project"
   - Wait ~2 minutes for project to be ready

### 8b. Get Connection String

3. **Get connection string**:
   - Go to **Project Settings** (gear icon in sidebar)
   - Click **Database** section
   - Scroll to **Connection string**
   - Select **URI** tab
   - Choose **Transaction mode** (not Session mode)
   - Click to copy the connection string
   
   **String format:**
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:5432/postgres
   ```
   
4. **Replace password in connection string**:
   - Replace `[YOUR-PASSWORD]` with the password you saved in step 2
   
   **Example:**
   ```
   postgresql://postgres.abcdefgh:MySecurePass123@aws-0-us-west-1.pooler.supabase.com:5432/postgres
   ```
   
5. **Save this connection string** - You'll need it for:
   - GitHub Secrets (for CI/CD migrations)
   - Vercel environment variables (for app deployment)
   - Optional: Local development if you want to work with remote database

**⏱️ Time**: ~5 minutes

**Why Supabase:**
- ✅ Generous free tier (500 MB database)
- ✅ Includes Auth, Storage, and APIs (might use later)
- ✅ Easy upgrade path to Pro ($25/month when needed)
- ✅ Daily automatic backups
- ✅ Great dashboard for viewing data

---

## Step 9: Initialize Production Database

Now push your schema to the remote Supabase database.

### 9a. Add DATABASE_URL to Root .env

```bash
# Open root .env
nano .env
# Or: code .env
```

**Add your Supabase connection string:**

```bash
# Add this line (uncomment if it exists)
DATABASE_URL=postgresql://postgres.abcdefgh:MySecurePass123@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**Save and close**

### 9b. Regenerate App .env Files

```bash
# This copies DATABASE_URL to both apps
pnpm env:generate
```

### 9c. Push Schema to Supabase

```bash
# Stop Docker first (to prevent conflicts)
pnpm docker:down

# Initialize remote database
pnpm db:generate
pnpm db:reset   # Will ask for confirmation - this pushes to Supabase!
pnpm db:seed    # Will ask for confirmation - adds sample data
```

**⚠️ Important:** When you confirm `db:reset` and `db:seed`, they will run against your **Supabase database** (because `DATABASE_URL` is set).

**✅ Done!** Your Supabase database now has:
- Complete schema (all tables)
- Sample data (if you ran seed)

### 9d. Switch Back to Local Development

After setting up production database, you'll want to work locally again:

```bash
# 1. Comment out DATABASE_URL in root .env
nano .env
# Add # in front of DATABASE_URL:
# DATABASE_URL=postgresql://...

# 2. Start Docker (will auto-regenerate .env files)
pnpm docker:all

# 3. Your local development is now using Docker PostgreSQL again
```

**⏱️ Time**: ~5 minutes

---

## Step 10: Create Vercel Projects

You need to create **4 Vercel projects** (2 apps × 2 environments).

### Install Vercel CLI

```bash
pnpm add -g vercel@latest
vercel login
```

### Create Project 1: Web App - Development

```bash
cd apps/web
vercel link

# When prompted:
# - Scope: Choose your team/account
# - Link to existing project? NO
# - Project name: start-pos-web-dev
```

**Copy the Project ID** shown in output:
```
Linked to your-team/start-pos-web-dev (created .vercel/project.json)
Project ID: prj_ABC123DEF456
```

**Save**: `VERCEL_WEB_PROJECT_ID_DEV=prj_ABC123DEF456`

### Create Project 2: Web App - Production

```bash
# Still in apps/web directory
vercel link --yes

# When prompted:
# - Link to existing project? NO
# - Project name: start-pos-web-prod
```

**Save**: `VERCEL_WEB_PROJECT_ID_PROD=prj_XYZ789GHI012`

### Create Project 3: Admin App - Development

```bash
cd ../admin
vercel link

# When prompted:
# - Project name: start-pos-admin-dev
```

**Save**: `VERCEL_ADMIN_PROJECT_ID_DEV=prj_JKL345MNO678`

### Create Project 4: Admin App - Production

```bash
# Still in apps/admin directory
vercel link --yes

# When prompted:
# - Project name: start-pos-admin-prod
```

**Save**: `VERCEL_ADMIN_PROJECT_ID_PROD=prj_PQR901STU234`

**⏱️ Time**: ~10 minutes

---

## Step 11: Get Vercel Organization ID

```bash
# List your teams
vercel teams list

# Copy the team ID (format: team_xxxxxxxxxxxx)
```

**Save**: `VERCEL_ORG_ID=team_xxxxxxxxxxxx`

**⏱️ Time**: ~1 minute

---

## Step 12: Get Vercel Access Token

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Name: `GitHub Actions`
4. Scope: Choose your team
5. Click **"Create"**
6. **Copy the token** (only shown once!)

**Save**: `VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx`

**⏱️ Time**: ~2 minutes

---

## Step 13: Create GitHub Repository

```bash
# Go back to project root
cd ../..

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub
# Go to github.com → New repository → Create

# Add remote and push
git remote add origin https://github.com/your-org/start-pos.git
git push -u origin main
```

**⏱️ Time**: ~3 minutes

---

## Step 14: Configure GitHub Secrets

Go to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

Add these **8 secrets** (use values you saved earlier):

```bash
# 1. Vercel Authentication
Name: VERCEL_TOKEN
Value: <from Step 14>

# 2. Vercel Organization ID
Name: VERCEL_ORG_ID
Value: <from Step 13>

# 3-6. Vercel Project IDs
Name: VERCEL_WEB_PROJECT_ID_DEV
Value: <from Step 12>

Name: VERCEL_WEB_PROJECT_ID_PROD
Value: <from Step 12>

Name: VERCEL_ADMIN_PROJECT_ID_DEV
Value: <from Step 12>

Name: VERCEL_ADMIN_PROJECT_ID_PROD
Value: <from Step 12>

# 7. Development Database URL
Name: DEV_DATABASE_URL
Value: <dev database connection string from Step 2>

# 8. Production Database URL
Name: PROD_DATABASE_URL
Value: <prod database connection string from Step 11>
```

**⏱️ Time**: ~5 minutes

---

## Step 15: Configure Vercel Environment Variables

**For EACH of the 4 Vercel projects**, add environment variables:

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

### For Development Projects (web-dev, admin-dev):

Use **Preview** environment:

```bash
# Required Core Variables
DATABASE_URL=<dev database connection string>
NODE_ENV=development
BETTER_AUTH_SECRET=<generate new: openssl rand -base64 32>
BETTER_AUTH_URL=https://start-pos-web-dev.vercel.app
CANONICAL_URL=https://start-pos-web-dev.vercel.app
LOCAL_DB_NAME=start_pos_dev_storage

# Feature Flags
ENABLE_EMAIL_VERIFICATION=false

# Payment Provider (dev)
PAYMENT_PROVIDER_MANUAL_ENABLED=true
PAYMENT_PROVIDER_MANUAL_PAYMENT_METHOD=GCash
PAYMENT_PROVIDER_MANUAL_ACCOUNT_NAME=startPOS Dev
PAYMENT_PROVIDER_MANUAL_ACCOUNT_NUMBER=09171234567

# Stripe (Test Mode) - Optional
STRIPE_SECRET_KEY=sk_test_<your_test_key>
STRIPE_WEBHOOK_SECRET=whsec_<from local setup>
VITE_STRIPE_PUBLIC_KEY=pk_test_<your_test_key>

# All STRIPE_*_PRICE_ID variables (copy from apps/web/.env)
# ... (all 25 price IDs from local setup)
```

### For Production Projects (web-prod, admin-prod):

Use **Production** environment:

```bash
# Required Core Variables
DATABASE_URL=<prod database connection string>
NODE_ENV=production
BUILD_ID=1
BETTER_AUTH_SECRET=<DIFFERENT from dev: openssl rand -base64 32>
BETTER_AUTH_URL=https://app.yourdomain.com
CANONICAL_URL=https://app.yourdomain.com
LOCAL_DB_NAME=start_pos_prod_storage

# Feature Flags
ENABLE_EMAIL_VERIFICATION=true

# Payment Provider (prod)
PAYMENT_PROVIDER_MANUAL_ENABLED=false

# Email (Required in prod)
RESEND_API_KEY=re_live_<your_key>
EMAIL_FROM=noreply@yourdomain.com

# Stripe (Live Mode) - Optional
# Switch Stripe dashboard to LIVE mode first!
STRIPE_SECRET_KEY=sk_live_<your_live_key>
STRIPE_WEBHOOK_SECRET=whsec_<create new webhook in live mode>
VITE_STRIPE_PUBLIC_KEY=pk_live_<your_live_key>

# All STRIPE_*_PRICE_ID variables (LIVE versions)
# Run pnpm stripe:setup again with live key to create live prices
# ... (all 25 price IDs with live mode)

# Cron
CRON_SECRET=<generate: openssl rand -hex 32>
```

**⏱️ Time**: ~20 minutes (tedious but important!)

---

## Step 16: Setup Production Stripe (Optional)

**Only if you configured Stripe in development.**

### Switch to Live Mode

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle **"Live mode" ON** (top right)
3. Go to **Developers → API keys**
4. Copy the **Live Secret key** (starts with `sk_live_`)

### Create Production Products

```bash
# Edit apps/web/.env temporarily
nano apps/web/.env

# Replace with LIVE key:
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE

# Run setup script
pnpm stripe:setup

# This creates LIVE versions of all products
# Copy all price IDs to Vercel production environment variables
```

### Setup Production Webhook

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://app.yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Click **"Reveal"** on Signing secret
7. Copy `whsec_...` and add to Vercel production environment

**⏱️ Time**: ~10 minutes

---

## Step 17: Create Deployment Branches

```bash
# Create dev branch
git checkout -b dev
git push -u origin dev

# Create prod branch
git checkout main
git checkout -b prod
git push -u origin prod

# Return to main
git checkout main
```

**⏱️ Time**: ~1 minute

---

## Step 18: Setup Branch Protection (Optional)

Go to **GitHub → Settings → Branches**

Add protection rules for `dev` and `prod`:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging

**⏱️ Time**: ~3 minutes

---

## Step 19: Deploy to Development

```bash
# Switch to dev branch
git checkout dev

# Make a change (or just push)
git push origin dev
```

**GitHub Actions will automatically:**
1. ✅ Run database migrations on dev database
2. ✅ Deploy web app to dev Vercel project
3. ✅ Deploy admin app to dev Vercel project

**Monitor deployment:**
- Go to GitHub → Actions tab
- Watch the "Deploy" workflow
- Takes ~5-10 minutes

**Access your dev deployment:**
- Web: `https://start-pos-web-dev.vercel.app`
- Admin: `https://start-pos-admin-dev.vercel.app`

**⏱️ Time**: ~10 minutes

---

## Step 20: Test Development Deployment

1. Visit your dev web URL
2. Create a test account
3. Test core features:
   - Register/login
   - Create business
   - Add product
   - Make test transaction
4. Check database has data
5. Test admin portal

**⏱️ Time**: ~10 minutes

---

## Step 21: Deploy to Production

**Only after testing dev thoroughly!**

```bash
# Merge dev to prod
git checkout prod
git merge dev --no-ff
git push origin prod
```

**GitHub Actions will automatically:**
1. ✅ Run database migrations on **prod** database
2. ✅ Deploy web app to **prod** Vercel project
3. ✅ Deploy admin app to **prod** Vercel project

**Monitor deployment:**
- Go to GitHub → Actions tab
- Watch the "Deploy" workflow

**⏱️ Time**: ~10 minutes

---

## ✅ Production Deployment Complete!

You now have:
- ✅ Development environment (auto-deploys from `dev` branch)
- ✅ Production environment (auto-deploys from `prod` branch)
- ✅ Automated CI/CD pipeline
- ✅ Database migrations run automatically
- ✅ Both apps deployed and accessible

---

# PART 3: ONGOING DEPLOYMENT WORKFLOW

## Development Workflow

```bash
# 1. Create feature branch
git checkout dev
git pull origin dev
git checkout -b feature/new-feature

# 2. Make changes, commit
git add .
git commit -m "feat: add new feature"

# 3. Push feature branch
git push origin feature/new-feature

# 4. Create Pull Request to dev
# Go to GitHub → Create PR → feature/new-feature → dev

# 5. After approval, merge PR
# Automatic deployment to dev environment!

# 6. Test in dev environment

# 7. When ready for production:
git checkout prod
git merge dev --no-ff
git push origin prod
# Automatic deployment to prod environment!
```

---

# PART 4: TROUBLESHOOTING

## Common Issues & Solutions

### Issue: `pnpm env:generate` fails

**Solution:**
```bash
# Check root .env exists
ls -la .env

# If missing, create it
cp .env.example .env

# Try again
pnpm env:generate
```

---

### Issue: `pnpm stripe:setup` fails

**Symptoms**: "STRIPE_SECRET_KEY is empty"

**Solution:**
```bash
# Check key is in .env
grep STRIPE_SECRET_KEY apps/web/.env

# If empty, add your key:
nano apps/web/.env
# Add: STRIPE_SECRET_KEY=sk_test_YOUR_KEY

# Try again
pnpm stripe:setup
```

---

### Issue: Database connection fails

**Symptoms**: "Connection refused" or "connect ECONNREFUSED"

**Solutions:**

**Check which database you're trying to connect to:**

```bash
# Check root .env
cat .env | grep DATABASE_URL

# If DATABASE_URL is uncommented:
# → You're connecting to REMOTE database (Supabase/production/dev)
# → Check internet connection and Supabase credentials

# If DATABASE_URL is commented out:
# → You're connecting to LOCAL Docker database
# → Check Docker is running: docker compose ps db
```

**For Supabase (Remote):**
```bash
# Test connection
psql "postgresql://user:pass@host/db" -c "SELECT 1;"

# Check connection string is correct in root .env
cat .env | grep DATABASE_URL

# Verify password was replaced (not [YOUR-PASSWORD])
```

**For Docker (Local):**
```bash
# Check database container is running
docker compose ps db

# Should show "Up" status

# Check logs
docker compose logs db

# If not running, start Docker services
pnpm docker:all
```

**Accidentally connecting to wrong database?**
```bash
# To use LOCAL: Comment out DATABASE_URL in root .env
nano .env
# Add # in front: # DATABASE_URL=...
pnpm env:generate

# To use REMOTE: Uncomment DATABASE_URL in root .env
nano .env
# Remove # from: DATABASE_URL=...
pnpm env:generate
```

---

### Issue: Port already in use

**Symptoms**: "Port 3200 is already in use"

**Solution:**
```bash
# Windows: Find what's using port
netstat -ano | findstr :3200

# Kill the process or change port in .env
nano .env
# Change: PUBLIC_PORT=3300

# Restart
pnpm docker:down
pnpm docker:all
```

---

### Issue: Vercel deployment fails

**Symptoms**: Build fails in GitHub Actions

**Solutions:**

1. **Check environment variables in Vercel:**
   - Go to Vercel project → Settings → Environment Variables
   - Ensure `DATABASE_URL` is set
   - Ensure `BETTER_AUTH_SECRET` is set

2. **Check deployment logs:**
   ```bash
   vercel logs --prod
   ```

3. **Test build locally:**
   ```bash
   cd apps/web
   pnpm build
   ```

---

### Issue: Migration fails during deployment

**Symptoms**: "Migration failed" in GitHub Actions

**Solutions:**

1. **Check database is accessible:**
   ```bash
   # Test from local machine
   psql $PROD_DATABASE_URL -c "SELECT 1;"
   ```

2. **Check migration status:**
   ```bash
   # Connect to database
   psql $PROD_DATABASE_URL

   # Check migrations table
   SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
   ```

3. **Manual migration (if needed):**
   ```bash
   # Set DATABASE_URL temporarily
   export DATABASE_URL="<your_prod_db_url>"

   # Run migrations
   pnpm --filter @startpos/platform db:migrate
   ```

---

### Issue: Stripe webhook not working locally

**Symptoms**: Payments don't trigger events locally

**Solution:**
```bash
# Make sure webhook listener is running
pnpm stripe:webhook

# Check output shows:
# "Forwarding → http://localhost:3200/api/stripe/webhook"

# Test webhook:
# Make a test payment in Stripe dashboard
# Check terminal for webhook events
```

---

### Issue: "jq not found" in Stripe setup

**Solution:**
```bash
# Install jq

# Windows (with Chocolatey):
choco install jq

# Mac:
brew install jq

# Linux:
sudo apt-get install jq

# Try again
pnpm stripe:setup
```

---

# PART 5: MAINTENANCE

## Regular Tasks

### Weekly
- [ ] Review deployment logs in GitHub Actions
- [ ] Check database size and performance
- [ ] Monitor error rates in Vercel logs
- [ ] Review Stripe webhooks for failures

### Monthly
- [ ] Backup production database
- [ ] Update dependencies: `pnpm update`
- [ ] Review and rotate secrets
- [ ] Check SSL certificate expiration

### Quarterly
- [ ] Major dependency updates
- [ ] Security audit
- [ ] Performance optimization review

---

## Database Backup

### Automatic Backups (Neon/Supabase)

Both providers have automatic backups:
- **Neon**: 7-day retention
- **Supabase**: 7-day retention

### Manual Backup

```bash
# Backup production database
pg_dump $PROD_DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
psql $PROD_DATABASE_URL < backup-20260919-120000.sql
```

---

## Updating Environment Variables

### Local Development

```bash
# Edit .env files
nano .env
nano apps/web/.env

# Regenerate
pnpm env:generate

# Restart app
pnpm docker:down
pnpm docker:all
```

### Production

```bash
# Update in Vercel Dashboard
# Go to Project → Settings → Environment Variables

# Then redeploy
vercel --prod
```

---

# PART 6: REFERENCE

## All Environment Variables

### Total Count: ~50 variables

**Categories:**
- Core (10): Database, auth, app config
- Stripe (28): API keys + 25 price IDs
- Email (2): Resend
- OAuth (4): Google + Facebook
- Build (4): Schema generation
- GitHub (8): CI/CD secrets

### Where Each Variable Comes From

| Variable | Source | How to Get |
|----------|--------|------------|
| `POSTGRES_*` | You choose | Create when setting up DB |
| `DATABASE_URL` | Database provider | Neon/Supabase dashboard |
| `BETTER_AUTH_SECRET` | Generated | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Your domain | Choose your URL |
| `STRIPE_SECRET_KEY` | Stripe | dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Auto-captured | `pnpm stripe:webhook` |
| `STRIPE_*_PRICE_ID` | Auto-generated | `pnpm stripe:setup` |
| `RESEND_API_KEY` | Resend | resend.com/api-keys |
| `GOOGLE_CLIENT_ID` | Google Cloud | console.cloud.google.com |
| `FACEBOOK_CLIENT_ID` | Facebook | developers.facebook.com |
| `VERCEL_TOKEN` | Vercel | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel | `vercel teams list` |
| `VERCEL_*_PROJECT_ID` | Vercel | `vercel link` output |

---

## Port Reference

| Service | Default | Docker | Public |
|---------|---------|--------|--------|
| PostgreSQL | 5432 | 5432 | 5434 |
| Web App | 3000 | 3000 | 3200 |
| Admin App | 3001 | 3001 | 3201 |

---

## Command Reference

### Environment
```bash
pnpm env:generate              # Generate app .env files
pnpm env:generate apps/web     # Generate specific app
```

### Stripe
```bash
pnpm stripe:setup     # Create products/prices
pnpm stripe:webhook   # Start webhook forwarding
pnpm stripe:start     # Run both
pnpm stripe:down      # Stop webhook
```

### Database
```bash
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema (dev only)
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed data
pnpm db:reset       # Reset database
pnpm db:studio      # Open Prisma Studio
```

### Development
```bash
pnpm dev              # Start all apps
pnpm dev:web          # Web app only
pnpm dev:admin        # Admin app only
pnpm docker:all       # Docker full stack
pnpm docker:down      # Stop Docker
```

### Build & Test
```bash
pnpm build            # Build all apps
pnpm test             # Run tests
pnpm test:integration # Integration tests
pnpm type-check       # TypeScript check
```

### Deployment
```bash
vercel --prod         # Deploy to production
vercel logs --prod    # View logs
vercel ls             # List deployments
vercel rollback       # Rollback deployment
```

---

## Support Resources

- **Documentation**: This file
- **GitHub Issues**: Report bugs
- **Stripe Docs**: https://stripe.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://prisma.io/docs
- **PostgreSQL Docs**: https://postgresql.org/docs

---

## Checklist: Did You Complete Everything?

### Local Development
- [ ] Installed Node.js 22+, pnpm 10+, Git, Docker
- [ ] Cloned repository and installed dependencies
- [ ] Created root `.env` and `.env.config`
- [ ] Generated app `.env` files with `pnpm env:generate`
- [ ] Configured database connection
- [ ] Set BETTER_AUTH_SECRET
- [ ] (Optional) Setup Stripe with `pnpm stripe:setup`
- [ ] Generated Prisma client with `pnpm db:generate`
- [ ] Ran migrations with `pnpm db:migrate`
- [ ] Started dev server
- [ ] Tested app in browser

### Production Deployment
- [ ] Created production database
- [ ] Created 4 Vercel projects
- [ ] Got Vercel organization ID and token
- [ ] Created GitHub repository
- [ ] Added 8 GitHub secrets
- [ ] Configured environment variables in all 4 Vercel projects
- [ ] (Optional) Setup production Stripe
- [ ] Created `dev` and `prod` branches
- [ ] Deployed to dev and tested
- [ ] Deployed to prod

---

**🎉 Congratulations! You've completed the full deployment setup.**

**Questions?** Re-read the relevant section or check the Troubleshooting guide.

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-09-19  
**Maintained By**: Development Team
