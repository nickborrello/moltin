# Deployment Guide

This guide covers deploying MoltIn to production environments.

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed locally
- PostgreSQL database (cloud provider or self-hosted)
- Supabase account (for auth and database) or self-hosted PostgreSQL
- Domain name (optional, for production)

## Environment Setup

### 1. Database Setup

#### Option A: Supabase (Recommended)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Navigate to Settings > API
3. Copy the following values:
   - Project URL
   - `service_role` key (NOT the anon key)
   - `anon` public key

#### Option B: Self-Hosted PostgreSQL

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE moltin;
   ```

2. Note your connection string:
   ```
   postgresql://username:password@host:5432/moltin
   ```

### 2. Environment Variables

Create a `.env` file in the project root with these variables:

```env
# Supabase Configuration (if using Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (if using direct PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/moltin

# JWT Configuration
JWT_SECRET=your_secure_random_string_at_least_32_chars
```

### Generating a Secure JWT Secret

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Database Migration

### 1. Generate Drizzle Client

```bash
bun run db:generate
```

This reads your schema and generates type-safe database clients.

### 2. Push Schema to Database

```bash
bun run db:push
```

This pushes your schema changes to the database. For production, use migrations:

```bash
bun run db:migrate
```

### 3. (Optional) Seed Database

For development and staging, seed the database with sample data:

```bash
bun run db:seed
```

## Build Process

### Development Build

```bash
bun run dev
```

Starts the development server with hot reloading.

### Production Build

```bash
bun run build
```

This command:
1. Compiles TypeScript
2. Optimizes React components
3. Generates static pages
4. Creates production bundle

### Start Production Server

```bash
bun run start
```

Starts the production server (requires build first).

## Deployment Platforms

### Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables in Vercel dashboard:
   - Go to Settings > Environment Variables
   - Add each variable from your `.env` file

5. For production deployment:
   ```bash
   vercel --prod
   ```

### Docker

1. Create a `Dockerfile`:

   ```dockerfile
   FROM oven/bun:1 as base
   WORKDIR /app
   
   # Install dependencies
   COPY package.json ./
   RUN bun install --frozen-lockfile
   
   # Copy source code
   COPY . .
   
   # Generate Drizzle client
   RUN bun run db:generate
   
   # Build application
   RUN bun run build
   
   # Production runtime
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV=production
   
   EXPOSE 3000
   CMD ["bun", "run", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t moltin .
   docker run -p 3000:3000 moltin
   ```

### Railway

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Initialize project:
   ```bash
   railway init
   ```

4. Add PostgreSQL plugin:
   ```bash
   railway add postgresql
   ```

5. Deploy:
   ```bash
   railway up
   ```

### DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure the app:
   - Build Command: `bun run build`
   - Run Command: `bun run start`
   - Build Pack: `heroku/buildpacks:18`

3. Add environment variables in the dashboard

## Production Checklist

Before going live, verify:

- [ ] Database schema is up to date
- [ ] All environment variables are set in production
- [ ] JWT_SECRET is secure and unique for production
- [ ] Build completes without errors
- [ ] TypeScript type checking passes
- [ ] ESLint passes with no errors
- [ ] API endpoints respond correctly
- [ ] Database connection works
- [ ] Authentication flow works
- [ ] Error handling is in place

## Monitoring

### Health Check

Add a health check endpoint:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

### Logging

The application uses Next.js built-in logging. For production monitoring, consider:
- Vercel Analytics
- Sentry for error tracking
- Datadog for APM

## Troubleshooting

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check database firewall allows connections
3. Ensure database user has correct permissions

### Build Failures

1. Clear `.next` cache:
   ```bash
   rm -rf .next
   bun run build
   ```

2. Verify TypeScript:
   ```bash
   bun tsc --noEmit
   ```

### Authentication Issues

1. Verify JWT_SECRET matches between deployments
2. Check cookie settings for production domain
3. Ensure SUPABASE_SERVICE_ROLE_KEY is set correctly

### API 500 Errors

1. Check server logs for details
2. Verify database queries are valid
3. Ensure all required fields are present in requests
