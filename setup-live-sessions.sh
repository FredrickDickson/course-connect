#!/bin/bash

# Live Sessions Setup Script for CIMA Learn
# This script will guide you through setting up the live sessions feature

echo "🎥 CIMA Learn - Live Sessions Setup"
echo "===================================="
echo ""

# Check if CREATE_LIVE_SESSIONS_TABLES.sql exists
if [ ! -f "CREATE_LIVE_SESSIONS_TABLES.sql" ]; then
    echo "❌ Error: CREATE_LIVE_SESSIONS_TABLES.sql not found!"
    exit 1
fi

echo "📋 Step 1: Zoom API Setup"
echo "-------------------------"
echo "You need to create a Zoom Server-to-Server OAuth app."
echo ""
echo "1. Go to: https://marketplace.zoom.us/develop/create"
echo "2. Click 'Build App' → 'Server-to-Server OAuth'"
echo "3. Fill in app details and activate"
echo "4. Add these scopes:"
echo "   - meeting:write:admin"
echo "   - meeting:read:admin"
echo "   - user:read:admin"
echo ""
echo "Ready to continue? (Press Enter when you have your credentials)"
read

echo ""
echo "Please enter your Zoom credentials:"
echo ""

# Get Zoom credentials
read -p "Zoom Account ID: " ZOOM_ACCOUNT_ID
read -p "Zoom Client ID: " ZOOM_CLIENT_ID
read -p "Zoom Client Secret: " ZOOM_CLIENT_SECRET

# Update .env file
echo ""
echo "📝 Updating .env file..."

# Check if Zoom credentials already exist in .env
if grep -q "ZOOM_ACCOUNT_ID" .env; then
    # Update existing values
    sed -i.bak "s|ZOOM_ACCOUNT_ID=.*|ZOOM_ACCOUNT_ID=$ZOOM_ACCOUNT_ID|" .env
    sed -i.bak "s|ZOOM_CLIENT_ID=.*|ZOOM_CLIENT_ID=$ZOOM_CLIENT_ID|" .env
    sed -i.bak "s|ZOOM_CLIENT_SECRET=.*|ZOOM_CLIENT_SECRET=$ZOOM_CLIENT_SECRET|" .env
    rm .env.bak 2>/dev/null
    echo "✅ Updated Zoom credentials in .env"
else
    # Append new values
    echo "" >> .env
    echo "# Zoom API Integration (for Live Sessions)" >> .env
    echo "ZOOM_ACCOUNT_ID=$ZOOM_ACCOUNT_ID" >> .env
    echo "ZOOM_CLIENT_ID=$ZOOM_CLIENT_ID" >> .env
    echo "ZOOM_CLIENT_SECRET=$ZOOM_CLIENT_SECRET" >> .env
    echo "✅ Added Zoom credentials to .env"
fi

echo ""
echo "📊 Step 2: Database Migration"
echo "----------------------------"
echo "The database migration will create 3 tables:"
echo "  - live_sessions"
echo "  - session_participants"
echo "  - session_notifications"
echo ""
echo "Continue with migration? (y/n)"
read -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Applying migration to Supabase..."
    echo ""
    echo "Please run this SQL in your Supabase SQL Editor:"
    echo "https://supabase.com/dashboard/project/emvibxbcrvritkwkguya/sql"
    echo ""
    echo "Copy the contents of: CREATE_LIVE_SESSIONS_TABLES.sql"
    echo ""
    echo "Press Enter when done..."
    read
fi

echo ""
echo "🚀 Step 3: Restart Server"
echo "------------------------"
echo "The server needs to be restarted to load the new Zoom configuration."
echo ""
echo "Run: npm run dev"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "🎉 What's Next?"
echo "---------------"
echo "1. Login as instructor or admin"
echo "2. Click 'Schedule Live Session' button"
echo "3. Fill out the form and create your first session"
echo "4. Check your dashboard to see the upcoming session"
echo ""
echo "📍 Where to find features:"
echo "  - Student Dashboard: 'Upcoming Live Sessions' card"
echo "  - Sessions Page: /sessions"
echo "  - Create Session: Instructor/Admin dashboard"
echo ""
echo "Happy teaching! 🎓"
