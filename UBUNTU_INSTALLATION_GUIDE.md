# Ubuntu Installation Guide - Multi-Tenant E-commerce Platform

This guide will walk you through installing and running the multi-tenant e-commerce platform on an Ubuntu VM.

## 📋 Prerequisites

### System Requirements
- **Ubuntu Version**: 20.04 LTS or 22.04 LTS (recommended)
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Internet connection for downloads

### Required Software
- **Node.js**: 16.x or higher
- **PostgreSQL**: 12.x or higher
- **Git**: For cloning the repository
- **curl/wget**: For downloading files

## 🚀 Quick Installation

### Step 1: Update System
```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### Step 2: Install Node.js
```bash
# Install Node.js using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Install PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### Step 4: Install Git
```bash
# Install Git
sudo apt install git -y

# Verify installation
git --version
```

### Step 5: Clone and Setup the Project
```bash
# Navigate to home directory
cd ~

# Clone the repository (replace with your repository URL)
git clone <your-repository-url> ecommerce-platform
cd ecommerce-platform

# Install dependencies
npm install
```

### Step 6: Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE ecommerce_multi;

# Create user (optional, can use postgres user)
CREATE USER ecommerce_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_multi TO ecommerce_user;
GRANT ALL ON SCHEMA public TO ecommerce_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ecommerce_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ecommerce_user;

# Exit PostgreSQL
\q
```

### Step 7: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

Update the following in `.env` file:
```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_multi
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# If you created a separate user:
# DB_USER=ecommerce_user
# DB_PASSWORD=your_secure_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration (Generate secure keys)
JWT_SECRET=your-super-secure-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

### Step 8: Run Database Migrations
```bash
# Run database schema
sudo -u postgres psql -d ecommerce_multi -f database-schema.sql

# Or if using custom user:
# PGPASSWORD="your_password" psql -h localhost -U ecommerce_user -d ecommerce_multi -f database-schema.sql
```

### Step 9: Start the Application
```bash
# Development mode
npm run dev

# Or production mode
npm start
```

## 🔧 Alternative Installation Methods

### Method 1: Using the Deployment Script
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

### Method 2: Using Docker (Coming Soon)
```bash
# Install Docker
sudo apt install docker.io docker-compose -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## 📁 File Structure After Installation

```
/home/username/ecommerce-platform/
├── server.js                 # Main application
├── package.json              # Dependencies
├── database-schema.sql       # Database schema
├── deploy.sh                 # Deployment script
├── start.sh                  # Start script
├── .env                      # Environment configuration
├── frontend/                 # Storefront websites
│   ├── admin/               # Admin dashboard
│   ├── techhub/             # Electronics store
│   ├── homestyle/           # Home & lifestyle store
│   └── sportspro/           # Sports equipment store
├── backend/                  # API and business logic
│   ├── controllers/         # Business logic
│   ├── routes/              # API endpoints
│   ├── middleware/          # Express middleware
│   └── database/            # Database connection
└── README.md                # Documentation
```

## 🌐 Accessing the Application

Once the server is running, you can access:

### Storefronts
- **TechHub**: http://localhost:3000/frontend/techhub/
- **HomeStyle**: http://localhost:3000/frontend/homestyle/
- **SportsPro**: http://localhost:3000/frontend/sportspro/

### Admin Dashboard
- **Admin Panel**: http://localhost:3000/frontend/admin/

### API Endpoints
- **Health Check**: http://localhost:5000/api/health
- **API Base**: http://localhost:5000/api/

## 🔐 Security Configuration

### Firewall Setup (Optional but Recommended)
```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install ufw -y

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application port
sudo ufw allow 5000
sudo ufw allow 3000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Nginx Reverse Proxy (Recommended for Production)
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ecommerce
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🚀 Production Deployment

### Using PM2 Process Manager
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application with PM2
pm2 start server.js --name "ecommerce-platform"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Creating a System Service
```bash
# Create systemd service file
sudo nano /etc/systemd/system/ecommerce-platform.service
```

Add the following content:
```ini
[Unit]
Description=Multi-Tenant E-commerce Platform
After=network.target postgresql.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/ecommerce-platform
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ecommerce-platform
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable ecommerce-platform

# Start service
sudo systemctl start ecommerce-platform

# Check status
sudo systemctl status ecommerce-platform
```

## 📊 Monitoring and Logs

### Application Logs
```bash
# View application logs
tail -f logs/server.log

# Or if using systemd
sudo journalctl -u ecommerce-platform -f

# Or if using PM2
pm2 logs ecommerce-platform
```

### Database Logs
```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### System Monitoring
```bash
# System resources
htop

# Network connections
netstat -tlnp

# Disk usage
df -h
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :3000

# Kill the process if needed
sudo kill -9 <PID>
```

2. **Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

3. **Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER /home/$USER/ecommerce-platform
chmod +x deploy.sh
chmod +x start.sh
```

4. **Node.js Version Issues**
```bash
# Update Node.js to latest version
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=* npm start

# Or use Node.js inspect
node --inspect server.js
```

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Restart the application
pm2 restart ecommerce-platform
# or
sudo systemctl restart ecommerce-platform
```

### Database Backups
```bash
# Create database backup
sudo -u postgres pg_dump ecommerce_multi > backup_$(date +%Y%m%d).sql

# Restore from backup
sudo -u postgres psql -d ecommerce_multi < backup_20240101.sql
```

## 🛡️ Security Best Practices

1. **Use Strong Passwords**: For database and JWT secrets
2. **Keep System Updated**: Regular security updates
3. **Use HTTPS**: For production deployment
4. **Configure Firewall**: Limit access to necessary ports
5. **Monitor Logs**: Watch for suspicious activity
6. **Regular Backups**: Database and file system backups

## 📚 Additional Resources

- **README.md**: Complete system documentation
- **SYSTEM_OVERVIEW.md**: Technical architecture details
- **API Documentation**: Available at `/api/` endpoints
- **Frontend Examples**: Three complete storefront implementations

## 🆘 Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Verify all services are running
3. Ensure database connectivity
4. Check file permissions
5. Review environment configuration

For specific issues, please refer to the documentation or create an issue in the repository.

---

**🎉 Your multi-tenant e-commerce platform is now ready!**

Start exploring the different storefronts and admin dashboard. The system is production-ready and can handle multiple stores with unique branding from a single backend infrastructure.