# Vercel Environment Setup Guide

This guide explains how to set up and use the three Vercel environments for the CIMA Learning Platform.

## 🏠 Local Environment Setup

### Prerequisites
- Node.js installed
- Vercel CLI installed: `npm i -g vercel`
- Git repository initialized

### Setup Steps

1. **Link your project to Vercel**
   ```bash
   vercel link
   ```

2. **Create local environment file**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Pull environment variables from Vercel**
   ```bash
   vercel env pull
   ```

4. **Update your local `.env.local` with your specific values**
   - Use your local Supabase project for development
   - Use test Paystack keys
   - Set `VITE_APP_URL=http://localhost:5173`

5. **Start local development**
   ```bash
   npm run dev
   ```

### Local Environment Variables
- `NODE_ENV=development`
- `VITE_APP_URL=http://localhost:5173`
- `VITE_DEBUG_MODE=true`
- `VITE_ENABLE_MOCK_PAYMENTS=true`

## 🧪 Preview Environment Setup

Preview environments are created automatically when you:
- Push to a non-main branch
- Open a pull request
- Run `vercel` without `--prod`

### Configuration
Preview environments use these environment variables automatically:
- `NODE_ENV=preview`
- `VITE_DEBUG_MODE=true`
- `VITE_ENABLE_MOCK_PAYMENTS=false`
- `VITE_ENVIRONMENT=preview`

### Setting Up Preview Environment Variables in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add the following variables for **Preview**, **Development**, and **Production**:

#### Required Variables
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
SESSION_SECRET
PAYSTACK_SECRET_KEY
VITE_PAYSTACK_PUBLIC_KEY
FRONTEND_URL
```

#### Optional Variables
```
RESEND_API_KEY
GOOGLE_CLOUD_STORAGE_BUCKET
```

### Preview URLs
- Branch URL: `https://your-app-git-branch-name.vercel.app`
- Commit URL: `https://your-app-git-commit-hash.vercel.app`

## 🌍 Production Environment Setup

### Deployment
Production deployments happen when:
- You merge to the main branch
- You run `vercel --prod`

### Production Environment Variables
Set these in Vercel dashboard with **Production** scope:
- `NODE_ENV=production`
- `VITE_DEBUG_MODE=false`
- `VITE_ENABLE_MOCK_PAYMENTS=false`
- `VITE_ENVIRONMENT=production`

### Production Checklist
- [ ] Use live Paystack keys (`sk_live_...` and `pk_live_...`)
- [ ] Use production Supabase project
- [ ] Set correct domain in `VITE_APP_URL` and `FRONTEND_URL`
- [ ] Generate secure `SESSION_SECRET`
- [ ] Configure proper CORS origins

## 🔄 Environment Variable Management

### Adding New Environment Variables

1. **Local Development**
   Add to `.env.local` (never commit this file)

2. **Vercel Dashboard**
   - Go to Project → Settings → Environment Variables
   - Add variable with appropriate scope(s):
     - **Production**: Live environment only
     - **Preview**: Preview deployments
     - **Development**: Local development

3. **Pull to Local**
   ```bash
   vercel env pull
   ```

### Environment-Specific Configurations

#### Supabase Projects
- **Local**: Your development Supabase project
- **Preview**: Staging Supabase project
- **Production**: Live Supabase project

#### Paystack Keys
- **Local/Preview**: Test keys (`sk_test_...`, `pk_test_...`)
- **Production**: Live keys (`sk_live_...`, `pk_live_...`)

#### URLs
- **Local**: `http://localhost:5173`
- **Preview**: `https://your-app-git-branch.vercel.app`
- **Production**: `https://your-domain.com`

## 🚀 Deployment Workflow

### Feature Development
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit: `git commit -m "Add new feature"`
3. Push branch: `git push origin feature/new-feature`
4. Vercel creates preview deployment automatically
5. Test preview URL
6. Create pull request for review

### Production Deployment
1. Merge feature branch to main
2. Vercel automatically deploys to production
3. Or manually deploy: `vercel --prod`

## 🛠️ Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Clear Vercel cache
vercel env pull

# Restart development server
npm run dev
```

#### Preview Deployment Fails
- Check that all required environment variables are set for Preview scope
- Verify Supabase connection string
- Ensure build passes locally first

#### Production Issues
- Verify live API keys are correct
- Check CORS settings
- Ensure domain is properly configured

### Debug Commands

```bash
# Check current environment
vercel env ls

# Pull latest environment variables
vercel env pull

# Check linked project
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 📋 Environment Variable Reference

| Variable | Local | Preview | Production | Description |
|----------|-------|---------|------------|-------------|
| `NODE_ENV` | `development` | `preview` | `production` | Environment mode |
| `VITE_APP_URL` | `http://localhost:5173` | Auto-generated | Your domain | App URL |
| `VITE_DEBUG_MODE` | `true` | `true` | `false` | Debug features |
| `VITE_ENABLE_MOCK_PAYMENTS` | `true` | `false` | `false` | Mock payment testing |
| `VITE_SUPABASE_URL` | Dev project | Staging project | Production project | Supabase URL |
| `PAYSTACK_SECRET_KEY` | Test key | Test key | Live key | Paystack secret |
| `VITE_PAYSTACK_PUBLIC_KEY` | Test key | Test key | Live key | Paystack public |
