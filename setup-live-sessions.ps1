# Live Sessions Setup Script for CIMA Learn (PowerShell)
# This script will guide you through setting up the live sessions feature

Write-Host ""
Write-Host "🎥 CIMA Learn - Live Sessions Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if CREATE_LIVE_SESSIONS_TABLES.sql exists
if (-not (Test-Path "CREATE_LIVE_SESSIONS_TABLES.sql")) {
    Write-Host "❌ Error: CREATE_LIVE_SESSIONS_TABLES.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Step 1: Zoom API Setup" -ForegroundColor Yellow
Write-Host "-------------------------"
Write-Host "You need to create a Zoom Server-to-Server OAuth app."
Write-Host ""
Write-Host "1. Go to: https://marketplace.zoom.us/develop/create"
Write-Host "2. Click 'Build App' → 'Server-to-Server OAuth'"
Write-Host "3. Fill in app details and activate"
Write-Host "4. Add these scopes:"
Write-Host "   - meeting:write:admin"
Write-Host "   - meeting:read:admin"
Write-Host "   - user:read:admin"
Write-Host ""
Write-Host "Press Enter when you have your credentials..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "Please enter your Zoom credentials:" -ForegroundColor Yellow
Write-Host ""

# Get Zoom credentials
$ZOOM_ACCOUNT_ID = Read-Host "Zoom Account ID"
$ZOOM_CLIENT_ID = Read-Host "Zoom Client ID"
$ZOOM_CLIENT_SECRET = Read-Host "Zoom Client Secret"

# Update .env file
Write-Host ""
Write-Host "📝 Updating .env file..." -ForegroundColor Yellow

$envContent = Get-Content .env -Raw

if ($envContent -match "ZOOM_ACCOUNT_ID") {
    # Update existing values
    $envContent = $envContent -replace "ZOOM_ACCOUNT_ID=.*", "ZOOM_ACCOUNT_ID=$ZOOM_ACCOUNT_ID"
    $envContent = $envContent -replace "ZOOM_CLIENT_ID=.*", "ZOOM_CLIENT_ID=$ZOOM_CLIENT_ID"
    $envContent = $envContent -replace "ZOOM_CLIENT_SECRET=.*", "ZOOM_CLIENT_SECRET=$ZOOM_CLIENT_SECRET"
    Set-Content .env -Value $envContent
    Write-Host "✅ Updated Zoom credentials in .env" -ForegroundColor Green
} else {
    # Append new values
    Add-Content .env "`n# Zoom API Integration (for Live Sessions)"
    Add-Content .env "ZOOM_ACCOUNT_ID=$ZOOM_ACCOUNT_ID"
    Add-Content .env "ZOOM_CLIENT_ID=$ZOOM_CLIENT_ID"
    Add-Content .env "ZOOM_CLIENT_SECRET=$ZOOM_CLIENT_SECRET"
    Write-Host "✅ Added Zoom credentials to .env" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Step 2: Database Migration" -ForegroundColor Yellow
Write-Host "----------------------------"
Write-Host "The database migration will create 3 tables:"
Write-Host "  - live_sessions"
Write-Host "  - session_participants"
Write-Host "  - session_notifications"
Write-Host ""
Write-Host "Opening Supabase SQL Editor in your browser..." -ForegroundColor Green
Start-Process "https://supabase.com/dashboard/project/emvibxbcrvritkwkguya/sql"
Write-Host ""
Write-Host "📋 Copy this file and paste in SQL Editor: CREATE_LIVE_SESSIONS_TABLES.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter when migration is complete..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "🚀 Step 3: Restart Server" -ForegroundColor Yellow
Write-Host "------------------------"
Write-Host "The server needs to be restarted to load the new Zoom configuration."
Write-Host ""
Write-Host "Run: npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 What's Next?" -ForegroundColor Cyan
Write-Host "---------------"
Write-Host "1. Login as instructor or admin"
Write-Host "2. Click 'Schedule Live Session' button"
Write-Host "3. Fill out the form and create your first session"
Write-Host "4. Check your dashboard to see the upcoming session"
Write-Host ""
Write-Host "📍 Where to find features:" -ForegroundColor Yellow
Write-Host "  - Student Dashboard: 'Upcoming Live Sessions' card"
Write-Host "  - Sessions Page: /sessions"
Write-Host "  - Create Session: Instructor/Admin dashboard"
Write-Host ""
Write-Host "Happy teaching! 🎓" -ForegroundColor Green
