# Multi-Tenant E-commerce Platform

A sophisticated multi-tenant e-commerce system that allows multiple storefront websites to run on a single backend infrastructure, similar to the digitec-galaxus model.

## Features

### 🏪 Multi-Store Architecture
- **Multiple Storefronts**: Run multiple stores from a single backend
- **Store-Specific Branding**: Each store can have its own theme, colors, and branding
- **Shared Infrastructure**: Unified product management, user system, and order processing
- **Tenant Isolation**: Secure data separation between stores

### 🛍️ E-commerce Functionality
- **Product Management**: Full CRUD operations with categories, variants, and images
- **Shopping Cart**: Persistent cart functionality for logged-in and guest users
- **Order Processing**: Complete order lifecycle management
- **User Authentication**: Secure JWT-based authentication system
- **Payment Integration**: Stripe payment processing ready

### 🎨 Storefront Examples
- **TechHub**: Modern electronics store with tech-focused design
- **HomeStyle**: Elegant home and lifestyle store with sophisticated styling
- **SportsPro**: Dynamic sports equipment store (template ready)

### 🔧 Technical Features
- **RESTful API**: Clean, well-documented API structure
- **Database**: PostgreSQL with optimized multi-tenant schema
- **Security**: Helmet.js protection, rate limiting, input validation
- **Scalability**: Designed for horizontal scaling
- **Performance**: Redis caching ready, optimized queries

## Architecture

### Backend Structure
```
server.js                 # Main application entry point
├── config/               # Configuration management
├── database/             # Database connection and migrations
├── middleware/           # Authentication, error handling, store detection
├── controllers/          # Business logic for each feature
├── routes/              # API route definitions
└── frontend/            # Storefront websites
    ├── techhub/         # Electronics store
    ├── homestyle/       # Home & lifestyle store
    └── sportspro/       # Sports equipment store
```

### Database Schema
- **Multi-tenant design** with store_id foreign keys
- **Normalized structure** for products, categories, orders, and users
- **Indexed for performance** on frequently queried fields
- **Flexible product variants** and inventory tracking

## Quick Start

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- Redis (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multi-tenant-ecommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb ecommerce_multi
   
   # Run database schema
   psql -d ecommerce_multi -f database-schema.sql
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the stores**
   - TechHub: http://localhost:3000/frontend/techhub/
   - HomeStyle: http://localhost:3000/frontend/homestyle/
   - API: http://localhost:5000/api/

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Store Management
- `GET /api/stores` - List all stores
- `GET /api/stores/:id` - Get store details

### Products
- `GET /api/store/:domain/products` - List products
- `GET /api/store/:domain/products/search` - Search products
- `GET /api/store/:domain/products/featured` - Featured products
- `POST /api/store/:domain/products` - Create product (admin)

### Shopping Cart
- `GET /api/store/:domain/cart` - Get cart
- `POST /api/store/:domain/cart/items` - Add to cart
- `PUT /api/store/:domain/cart/items/:id` - Update item
- `DELETE /api/store/:domain/cart/items/:id` - Remove item

### Orders
- `GET /api/store/:domain/orders` - List orders
- `POST /api/store/:domain/orders` - Create order
- `GET /api/store/:domain/orders/:id` - Get order details

## Store Configuration

Each store is configured through the database with customizable:

- **Branding**: Name, logo, colors
- **Domain**: Subdomain or custom domain
- **Theme**: Template selection (modern, elegant, dynamic)
- **Styling**: Primary, secondary, and accent colors

### Example Store Data
```sql
INSERT INTO stores (name, subdomain, description, primary_color, secondary_color, accent_color, template) 
VALUES 
('TechHub', 'tech', 'Premium electronics', '#2563eb', '#1e40af', '#3b82f6', 'modern'),
('HomeStyle', 'home', 'Modern home products', '#059669', '#047857', '#10b981', 'elegant'),
('SportsPro', 'sports', 'Professional sports gear', '#dc2626', '#b91c1c', '#ef4444', 'dynamic');
```

## Frontend Integration

The platform includes sample frontend implementations demonstrating:

- **Multi-tenant routing**: Automatic store detection
- **Dynamic theming**: Store-specific colors and layouts
- **API integration**: Full shopping cart and checkout flow
- **Responsive design**: Mobile-first approach

### TechHub Store Features
- Modern tech-focused design
- Product search and filtering
- Shopping cart functionality
- User authentication

### HomeStyle Store Features
- Elegant lifestyle branding
- Sophisticated color palette
- Inspiration sections
- Premium product presentation

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Helmet.js**: Security headers protection
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Data sanitization
- **CORS Configuration**: Cross-origin request control
- **Database Security**: Parameterized queries

## Performance Optimizations

- **Database Indexing**: Optimized for common queries
- **Connection Pooling**: Efficient database connections
- **Compression**: Gzip response compression
- **Caching Ready**: Redis integration prepared
- **Query Optimization**: Efficient multi-tenant queries

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Azure Free VM (Ubuntu) Development Setup
Folge der detaillierten Schritt-für-Schritt-Anleitung in [AZURE_VM_DEV_SETUP.md](AZURE_VM_DEV_SETUP.md), um die Plattform auf einer Azure Free Tier VM (Ubuntu 20.04/22.04) einzurichten. Die Anleitung deckt VM-Erstellung, PostgreSQL-Setup, Firewall/NSG-Regeln, Umgebungsvariablen (inkl. `HOST=0.0.0.0`) sowie den Start mit PM2 oder im Entwicklungsmodus ab.

### Docker (Coming Soon)
```bash
docker-compose up
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | ecommerce_multi |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `PORT` | Server port | 5000 |
| `JWT_SECRET` | JWT secret key | - |
| `STRIPE_SECRET_KEY` | Stripe payment key | - |
| `REDIS_HOST` | Redis host | localhost |

### Generating JWT secrets

- `JWT_SECRET` signiert die Access Tokens und `JWT_REFRESH_SECRET` signiert die Refresh Tokens. Beide Werte dürfen **niemals** im Repository liegen und sollten lange, zufällige Strings sein.
- Erzeuge sie lokal oder direkt auf der VM, z. B. mit OpenSSL:

  ```bash
  openssl rand -base64 48  # für JWT_SECRET
  openssl rand -base64 64  # für JWT_REFRESH_SECRET
  ```

- Trage die generierten Werte in deine `.env` ein und halte sie geheim (kein Commit, keine Logs).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Built with ❤️ for modern e-commerce**