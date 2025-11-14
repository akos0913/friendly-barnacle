#!/bin/bash

# Multi-Tenant E-commerce Start Script

echo "🚀 Starting Multi-Tenant E-commerce Platform"
echo "==========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run ./deploy.sh first."
    exit 1
fi

# Load environment variables
export $(cat .env | xargs)

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if database is accessible
echo "🔍 Checking database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_HOST" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your .env configuration."
    exit 1
fi

# Start the server
echo "🌟 Starting server..."
echo "   Environment: $NODE_ENV"
echo "   Port: $PORT"
echo "   Database: $DB_NAME"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the application
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Production mode"
    npm start 2>&1 | tee logs/server.log
else
    echo "🔧 Development mode"
    npm run dev 2>&1 | tee logs/server.log
fi