# Azure Free VM (Ubuntu) Development Setup

Dieses Handbuch führt dich Schritt für Schritt durch die Einrichtung der Multi-Tenant-E-Commerce-Plattform auf einer **Azure Free Tier Ubuntu-VM (B1s)** für Entwicklungszwecke. Alle Befehle wurden für Ubuntu 20.04/22.04 getestet.

## 1) Voraussetzungen
- Azure Free-Abonnement mit VM-Größe **Standard_B1s (1 vCPU, 1GB RAM)**
- Image: **Ubuntu 20.04 LTS** oder **Ubuntu 22.04 LTS**
- Öffentlich erreichbare Ports in der NSG: **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)** sowie **5000** (API) und optional **3000** (statische Frontends)
- Mindestens **10GB** Speicherplatz

## 2) VM erstellen (Azure Portal)
1. Ressourcengruppe z. B. `ecommerce-rg` anlegen.
2. VM erstellen: **Standard_B1s**, Region nahe deinem Standort, Authentifizierung via **SSH-Public-Key**.
3. Netzwerk-Sicherheitsgruppe (NSG) mit eingehenden Regeln für **22, 80, 443, 5000, 3000** anlegen.
4. Deployment starten und die **Public IP** notieren.

## 3) Mit der VM verbinden
```bash
ssh <username>@<VM_PUBLIC_IP>
```
Optional neuen Benutzer mit Sudo-Rechten anlegen:
```bash
sudo adduser ecommerce
sudo usermod -aG sudo ecommerce
su - ecommerce
```

## 4) System vorbereiten
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl wget git ufw
```
Für 1GB-RAM-VMs ist Swap hilfreich:
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 5) Node.js installieren
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 6) PostgreSQL installieren und konfigurieren
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql <<'SQL'
CREATE DATABASE ecommerce_multi;
CREATE USER ecommerce_user WITH PASSWORD 'change_me';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_multi TO ecommerce_user;
GRANT ALL ON SCHEMA public TO ecommerce_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ecommerce_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ecommerce_user;
SQL
```

## 7) Repository klonen und Abhängigkeiten installieren
```bash
cd ~
git clone <DEIN-REPO-URL> ecommerce-platform
cd ecommerce-platform
npm install
```

## 8) Umgebungsvariablen setzen
```bash
cp .env.example .env
nano .env
```
Wichtige Werte für die Azure-VM:
- `HOST=0.0.0.0` (damit der Server auf alle Interfaces hört)
- `DB_HOST=localhost`
- `DB_NAME=ecommerce_multi`
- `DB_USER=ecommerce_user`
- `DB_PASSWORD=change_me`
- `ALLOWED_ORIGINS=http://<VM_PUBLIC_IP>:3000,http://<VM_PUBLIC_IP>`
- Sichere Secrets für `JWT_SECRET` und `JWT_REFRESH_SECRET` vergeben.

## 9) Datenbankschema anwenden
```bash
PGPASSWORD="change_me" psql -h localhost -U ecommerce_user -d ecommerce_multi -f database-schema.sql
```

Falls ein Aufruf von `psql` ohne `-d` mit `database "ecommerce" does not exist` scheitert, verbinde dich explizit mit der App-Datenbank:
```bash
psql -d ecommerce_multi
```
Oder lege sie (falls noch nicht vorhanden) an:
```bash
createdb ecommerce_multi
```

## 10) Anwendung starten
```bash
# Entwicklungsmodus (Frontend-Assets lokal ausliefern)
npm run dev

# oder Produktion/Service mit PM2
sudo npm install -g pm2
pm2 start server.js --name ecommerce -- --max-http-header-size=80000
pm2 save
pm2 startup systemd   # folgt den Anweisungen
```
Die API ist unter `http://<VM_PUBLIC_IP>:5000/api/health` erreichbar, die statischen Frontends unter `http://<VM_PUBLIC_IP>:3000/frontend/...` wenn Port 3000 freigegeben ist.

## 11) Firewall (UFW) auf der VM
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000
sudo ufw allow 3000
sudo ufw enable
sudo ufw status
```

## 12) Optional: Nginx-Reverse-Proxy
```bash
sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/ecommerce > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 13) Troubleshooting
- **Port nicht erreichbar**: NSG-Regeln (Azure) und `ufw status` prüfen.
- **RAM knapp**: Swap aktivieren (siehe Schritt 4) oder PM2-Startparameter reduzieren.
- **Datenbankverbindung**: `PGPASSWORD="..." psql -h localhost -U ecommerce_user -d ecommerce_multi -c "SELECT 1;"` testen.
- **Logs**: `pm2 logs ecommerce` oder `tail -f logs/server.log` prüfen.

Damit ist die Entwicklungsumgebung auf der Azure Free VM einsatzbereit.
