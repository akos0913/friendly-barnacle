# Azure Deployment Guide - Multi-Tenant E-commerce Platform

This guide will walk you through deploying the multi-tenant e-commerce platform on a Microsoft Azure free VM.

## 🎯 Azure Free Tier Setup

### What You Get with Azure Free Tier
- **750 hours/month** of B1S Windows or Linux VM for 12 months
- **5GB LRS-Hot Blob Storage** for 12 months
- **5GB File Storage** for 12 months
- **250GB SQL Database** for 12 months
- **15GB Bandwidth** per month

### Recommended Azure Configuration
- **VM Size**: Standard B1s (1 vCPU, 1GB RAM)
- **Operating System**: Ubuntu 20.04 LTS or 22.04 LTS
- **Region**: Choose closest to your target audience
- **Storage**: Premium SSD (minimum 10GB)

## 🔧 Step-by-Step Azure Setup

### Step 1: Create Azure Account
1. Go to [Azure Portal](https://portal.azure.com)
2. Sign up for Azure Free Account
3. Complete verification process
4. Access Azure Portal

### Step 2: Create Virtual Machine
1. **Search "Virtual Machines"** in Azure Portal
2. **Click "Create"** → "Virtual Machine"
3. **Basic Settings**:
   - **Subscription**: Select your free subscription
   - **Resource Group**: Create new (e.g., "ecommerce-rg")
   - **Virtual Machine Name**: "ecommerce-vm"
   - **Region**: Choose closest to you (e.g., East US, West Europe)
   - **Availability Options**: No redundancy required
   - **Security Type**: Standard
   - **Image**: Ubuntu 20.04 LTS or 22.04 LTS
   - **Size**: Standard_B1s (Free Tier eligible)
   - **Authentication Type**: SSH public key
   - **Username**: Choose username (e.g., "ecommerce")
   - **SSH Public Key**: Generate new or use existing

4. **Disks Settings**:
   - **OS Disk Type**: Premium SSD
   - **Size**: 10GB (minimum)

5. **Networking Settings**:
   - **Virtual Network**: Create new
   - **Subnet**: Default
   - **Public IP**: Create new
   - **NIC Network Security Group**: Basic
   - **Public Inbound Ports**: Allow selected ports
   - **Select Inbound Ports**: HTTP (80), HTTPS (443), SSH (22)

6. **Management Settings**:
   - **Boot Diagnostics**: Enable with managed storage account
   - **Identity**: None
   - **Auto-shutdown**: Disable or configure as needed

7. **Advanced & Tags**: Leave default or add tags

8. **Review & Create**: Click "Create"

### Step 3: Connect to VM
1. **Wait for deployment** to complete (2-3 minutes)
2. **Go to Virtual Machines** → Select your VM
3. **Copy Public IP Address**
4. **Connect via SSH**:
   ```bash
   ssh ecommerce@YOUR_VM_IP_ADDRESS
   ```

## 🚀 VM Setup and Installation

### Step 1: System Updates
```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y

# Install essential tools
sudo apt install build-essential curl wget git -y
```

### Step 2: Install Node.js
```bash
# Install Node.js 18.x (recommended for production)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
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

### Step 4: Setup Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE ecommerce_multi;

# Create user (recommended for security)
CREATE USER ecommerce_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_multi TO ecommerce_user;

# Exit PostgreSQL
\q
```

### Step 5: Clone and Setup Project
```bash
# Navigate to home directory
cd ~

# Clone the repository (replace with your actual repository URL)
git clone https://github.com/yourusername/multi-tenant-ecommerce.git ecommerce-platform
cd ecommerce-platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Step 6: Configure Environment
```bash
# Edit environment file
nano .env
```

Update the `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_multi
DB_USER=ecommerce_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# Server Configuration
HOST=0.0.0.0
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_VM_IP_ADDRESS

# JWT Configuration (Generate secure keys)
JWT_SECRET=your-super-secure-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-ecommerce.com

# Payment Configuration (Stripe - Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

> 💡 Generate the JWT values with strong randomness (for example `openssl rand -base64 48` for `JWT_SECRET` and `openssl rand -base64 64` for `JWT_REFRESH_SECRET`) and keep them out of version control.

> 💡 **Hinweis:** `HOST=0.0.0.0` stellt sicher, dass Node.js auch über die öffentliche Azure-IP erreichbar ist. Passe `ALLOWED_ORIGINS` so an, dass sie deine öffentliche IP oder Domain enthalten, damit CORS-Anfragen vom Browser erlaubt sind.

### Step 7: Run Database Schema
```bash
# Run database schema
sudo -u postgres psql -d ecommerce_multi -f database-schema.sql

# If using custom user:
# PGPASSWORD="your_secure_password_here" psql -h localhost -U ecommerce_user -d ecommerce_multi -f database-schema.sql
```

### Step 8: Create Directories
```bash
# Create necessary directories
mkdir -p uploads/products
mkdir -p uploads/stores
mkdir -p logs

# Set permissions
chmod 755 uploads logs
```

## 🌐 Network Configuration

### Configure Azure Network Security Group

1. **Go to your Resource Group**
2. **Find Network Security Group** (usually named like "ecommerce-vm-nsg")
3. **Add Inbound Security Rules**:

   **Rule 1: HTTP**
   - **Name**: HTTP
   - **Priority**: 100
   - **Source**: Any
   - **Protocol**: TCP
   - **Source Port Range**: *
   - **Destination Port Range**: 80
   - **Action**: Allow

   **Rule 2: Custom API Port**
   - **Name**: API_Port_5000
   - **Priority**: 110
   - **Source**: Any
   - **Protocol**: TCP
   - **Source Port Range**: *
   - **Destination Port Range**: 5000
   - **Action**: Allow

   **Rule 3: Development Server**
   - **Name**: Dev_Server_3000
   - **Priority**: 120
   - **Source**: Any
   - **Protocol**: TCP
   - **Source Port Range**: *
   - **Destination Port Range**: 3000
   - **Action**: Allow

## 🚀 Starting the Application

### Development Mode
```bash
# Start in development mode
npm run dev

# Or using PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name "ecommerce-platform"
pm2 logs  # View logs
```

### Production Mode
```bash
# Set production environment
export NODE_ENV=production

# Start application
npm start

# Or using PM2
pm2 start server.js --name "ecommerce-platform" --env production
```

## 🔧 Production Setup with Nginx

### Install Nginx
```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ecommerce
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name YOUR_VM_IP_ADDRESS;

    # Frontend static files
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
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

## 🔐 Security Hardening

### Configure Firewall
```bash
# Install UFW if not already installed
sudo apt install ufw -y

# Reset UFW to default
sudo ufw reset

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow http
sudo ufw allow https

# Allow specific ports if needed
sudo ufw allow 5000
sudo ufw allow 3000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### SSL Certificate with Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## 📊 Monitoring and Management

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop -y

# View system resources
htop

# View disk usage
df -h

# View memory usage
free -h
```

### Application Logs
```bash
# Create logs directory
mkdir -p logs

# View application logs
tail -f logs/server.log

# If using PM2
pm2 logs ecommerce-platform

# If using systemd
sudo journalctl -u ecommerce-platform -f
```

### Database Monitoring
```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check database size
sudo -u postgres psql -d ecommerce_multi -c "SELECT pg_database_size('ecommerce_multi');"
```

## 🔄 Setting Up as a Service

### Create Systemd Service
```bash
# Create service file
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
StandardOutput=append:/home/your-username/ecommerce-platform/logs/server.log
StandardError=append:/home/your-username/ecommerce-platform/logs/server.log
SyslogIdentifier=ecommerce-platform
Environment=NODE_ENV=production
Environment=PORT=5000

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

# View logs
sudo journalctl -u ecommerce-platform -f
```

## 🌍 Accessing Your Application

Once everything is set up, you can access your e-commerce platform:

### Storefronts
- **TechHub**: http://YOUR_VM_IP_ADDRESS/frontend/techhub/
- **HomeStyle**: http://YOUR_VM_IP_ADDRESS/frontend/homestyle/
- **SportsPro**: http://YOUR_VM_IP_ADDRESS/frontend/sportspro/

### Admin Dashboard
- **Admin Panel**: http://YOUR_VM_IP_ADDRESS/frontend/admin/

### API Endpoints
- **Health Check**: http://YOUR_VM_IP_ADDRESS:5000/api/health
- **API Documentation**: Accessible through the application

## 📈 Azure Cost Optimization

### Free Tier Limits
- **750 hours/month** B1S VM (enough for full month)
- **5GB Storage** included
- **15GB Bandwidth** included
- **Monitor usage** in Azure Portal

### Cost Management Tips
1. **Auto-shutdown Schedule**: Configure VM to shutdown during off-hours
2. **Monitor Usage**: Keep track of resource consumption
3. **Clean Up Resources**: Delete unused resources
4. **Use Azure Calculator**: Estimate costs before scaling

## 🆘 Troubleshooting Azure-Specific Issues

### VM Connection Issues
```bash
# Check VM status
az vm list --resource-group ecommerce-rg --show-details

# Reset SSH configuration if needed
az vm user reset-ssh --resource-group ecommerce-rg --name ecommerce-vm

# Check network security group
az network nsg list --resource-group ecommerce-rg
```

### Port Access Issues
1. **Check Network Security Group** rules
2. **Verify VM firewall** (UFW/iptables)
3. **Test connectivity** using `telnet` or `nc`
4. **Check application logs** for binding errors

### Performance Issues
1. **Monitor VM metrics** in Azure Portal
2. **Check resource utilization** using `htop`
3. **Review application logs** for bottlenecks
4. **Consider upgrading** VM size if needed

## 🔄 Backup and Recovery

### Database Backups
```bash
# Create backup
sudo -u postgres pg_dump ecommerce_multi > backup_$(date +%Y%m%d_%H%M%S).sql

# Download backup to local machine
scp ecommerce@YOUR_VM_IP_ADDRESS:/home/ecommerce/backup_*.sql ./

# Restore from backup
sudo -u postgres psql -d ecommerce_multi < backup_file.sql
```

### Application Backups
```bash
# Create application backup
tar -czf ecommerce_backup_$(date +%Y%m%d_%H%M%S).tar.gz /home/ecommerce/ecommerce-platform

# Download backup
scp ecommerce@YOUR_VM_IP_ADDRESS:/home/ecommerce/ecommerce_backup_*.tar.gz ./
```

## 🚀 Scaling on Azure

### Vertical Scaling
```bash
# Stop VM
az vm deallocate --resource-group ecommerce-rg --name ecommerce-vm

# Resize VM
az vm resize --resource-group ecommerce-rg --name ecommerce-vm --size Standard_B2s

# Start VM
az vm start --resource-group ecommerce-rg --name ecommerce-vm
```

### Horizontal Scaling
1. **Azure Load Balancer**: Distribute traffic across multiple VMs
2. **Azure Database for PostgreSQL**: Managed database service
3. **Azure Cache for Redis**: Improve performance
4. **Azure CDN**: Global content delivery

## 📊 Monitoring on Azure

### Azure Monitor
1. **VM Insights**: Monitor VM performance
2. **Application Insights**: Monitor application performance
3. **Log Analytics**: Centralized logging
4. **Alerts**: Set up notifications for issues

### Basic Monitoring Commands
```bash
# Check VM metrics
az vm show --resource-group ecommerce-rg --name ecommerce-vm --show-details

# Check network usage
az network nic list --resource-group ecommerce-rg

# Monitor costs
az consumption usage list --start-date 2024-01-01 --end-date 2024-01-31
```

## 🎉 Success!

Once you've completed all these steps, your multi-tenant e-commerce platform will be running on Microsoft Azure! You can:

- **Access multiple storefronts** with unique branding
- **Manage all stores** from a single admin dashboard
- **Scale as needed** within Azure's free tier limits
- **Monitor performance** using Azure's built-in tools

The platform is production-ready and can handle real traffic while providing a solid foundation for your e-commerce business.

---

**🚀 Your Azure-powered e-commerce platform is ready to go!**

Start exploring the different storefronts and admin features. The system demonstrates enterprise-grade architecture while remaining cost-effective on Azure's free tier.