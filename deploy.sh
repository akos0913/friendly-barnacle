#!/bin/bash

# Multi-Tenant E-commerce Deployment Script

echo "🚀 Starting Multi-Tenant E-commerce Platform Deployment"
echo "======================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 12+ first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your database credentials before continuing."
    echo "   Press any key when ready..."
    read -n 1 -s
fi

# Check database connection
echo "🔍 Checking database connection..."
DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2)
DB_PORT=$(grep DB_PORT .env | cut -d '=' -f2)
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)

if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your .env configuration."
    echo "   Attempting to create database..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database. Please create it manually."
        exit 1
    fi
fi

# Run database migrations
echo "🏗️  Setting up database schema..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database-schema.sql > /dev/null 2>&1; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

# Create directories for uploads
echo "📁 Creating upload directories..."
mkdir -p uploads/products
mkdir -p uploads/stores
mkdir -p logs

# Set permissions
chmod 755 uploads
chmod 755 logs

echo ""
echo "🎉 Deployment completed successfully!"
echo "======================================"
echo ""
echo "📋 Next steps:"
echo "1. Review and update your .env file with correct credentials"
echo "2. Start the server: npm start"
echo "3. Access the stores:"
echo "   • TechHub: http://localhost:3000/frontend/techhub/"
echo "   • HomeStyle: http://localhost:3000/frontend/homestyle/"
echo "   • API: http://localhost:5000/api/health"
echo ""
echo "🔧 For development:"
echo "   npm run dev"
echo ""
echo "📚 Documentation: See README.md for detailed usage instructions"
echo ""
echo "Happy selling! 🛍️"
