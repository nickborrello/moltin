# Supabase Docker Setup
# Option 1: Using Supabase CLI (Recommended)
# 
# 1. Install Supabase CLI:
#    npm install -g supabase
#    # or
#    brew install supabase/tap/supabase
#
# 2. Initialize Supabase in your project:
#    supabase init
#
# 3. Start local Supabase:
#    supabase start
#
# 4. Get credentials from:
#    supabase status
#
# Option 2: Using Docker Compose (Above)
#
# 1. Set password in .env.local:
#    POSTGRES_PASSWORD=your_secure_password
#
# 2. Start services:
#    docker-compose up -d
#
# 3. Connect using:
#    postgresql://postgres:your_password@localhost:5432/postgres

# Quick start with Supabase CLI:
# =================================
# supabase init
# supabase start
#
# This will start:
# - PostgreSQL on port 5432
# - Kong API gateway on ports 8000 (HTTP) and 8443 (HTTPS)
# - Studio (DB UI) on port 54323
# - PostgREST on port 54321
# - GoTrue on port 9999 (Auth)
# - Storage on port 5000
