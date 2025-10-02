# Smart Inventory Management System

A comprehensive, enterprise-grade inventory management system with multi-tenant SaaS architecture, real-time synchronization, and advanced analytics.

## 🚀 Features

### Core Functionality
- **Multi-Tenant SaaS Architecture**: Complete tenant isolation with independent data scopes
- **Inventory Management**: Real-time stock tracking, transfers, and alerts
- **Point of Sale (POS)**: Quick sales, invoicing, and payment processing
- **Product Catalog**: Comprehensive product management with categories and variants
- **Analytics & Reporting**: Sales analytics, inventory insights, and business intelligence
- **User Management**: Role-based access control (Admin, Manager, Staff)
- **Real-time Sync**: Live updates across all connected clients
- **Audit Logging**: Complete audit trail for all operations

### Technical Highlights
- **TypeScript**: Full type safety across the codebase
- **Prisma ORM**: Type-safe database access with PostgreSQL
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive request validation with Joi
- **Error Handling**: Centralized error handling and logging
- **RESTful API**: Clean, well-documented API endpoints

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd smart-inventory-system
```

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Set up environment variables
Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/inventory_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# Server
PORT=3001
NODE_ENV=development

# Optional: Firebase (for real-time features)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-client-email"
FIREBASE_PRIVATE_KEY="your-private-key"
```

### 4. Set up the database
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with sample data
npm run seed
```

### 5. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3001`

## 🧪 Testing

### Run API Tests
```bash
# Quick API test (tests all core endpoints)
node src/scripts/quickAPITest.js

# Comprehensive feature verification
npm run test:features
```

### Test Individual Features
```bash
# Test SaaS multi-tenancy
npm run test:saas

# Test inventory management
npm run test:inventory

# Test billing system
npm run test:billing

# Test real-time sync
npm run test:realtime
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Key Endpoints

#### Authentication & Tenant Management
- `POST /saas/admin/signup` - Register new admin tenant
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

#### Location Management
- `POST /saas/locations` - Create new location
- `GET /saas/locations` - Get all locations
- `GET /saas/tenant/info` - Get tenant information

#### Staff Management
- `POST /saas/staff` - Create staff user
- `GET /saas/staff` - Get all staff
- `PUT /saas/staff/:staffId` - Update staff
- `DELETE /saas/staff/:staffId` - Deactivate staff

#### Product Management
- `POST /products` - Create product
- `GET /products` - List products
- `GET /products/:id` - Get product details
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Inventory Management
- `GET /inventory/stock` - Get stock levels
- `PUT /inventory/stock/update` - Update stock level
- `GET /inventory/movements` - Get stock movement history
- `POST /inventory/transfer` - Create stock transfer
- `GET /inventory/alerts` - Get inventory alerts

#### Billing & Sales
- `POST /billing/quick-sale` - Create quick sale
- `POST /billing/invoice` - Create invoice
- `GET /billing/transactions` - Get transactions
- `GET /billing/analytics` - Get sales analytics

For complete API documentation, see [API_ENDPOINTS_FOR_APP.md](backend/API_ENDPOINTS_FOR_APP.md)

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT (Access + Refresh tokens)
- **Validation**: Joi
- **Logging**: Winston
- **Real-time**: Firebase (optional)

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── index.ts         # Application entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── scripts/             # Utility scripts
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **Tenant Isolation**: Complete data separation between tenants
- **Audit Logging**: Full audit trail of all operations
- **CORS**: Configurable cross-origin resource sharing

## 📊 Database Schema

The system uses PostgreSQL with the following main entities:
- Users (Admin, Manager, Staff)
- Locations (Stores/Warehouses)
- Products
- Stock Levels
- Stock Movements
- Stock Transfers
- Transactions
- Invoices
- Audit Logs

See [prisma/schema.prisma](backend/prisma/schema.prisma) for the complete schema.

## 🚀 Deployment

### Production Checklist
1. Set strong JWT secrets in environment variables
2. Use production database credentials
3. Enable HTTPS/SSL
4. Configure CORS for your domain
5. Set up database backups
6. Configure logging and monitoring
7. Set NODE_ENV=production
8. Use a process manager (PM2, systemd)

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="<strong-random-secret>"
JWT_REFRESH_SECRET="<strong-random-secret>"
PORT=3001
CORS_ORIGIN="https://yourdomain.com"
```

## 📖 Additional Documentation

- [SaaS Multi-Tenant Guide](backend/SAAS_MULTI_TENANT_GUIDE.md)
- [Inventory Management Guide](backend/INVENTORY_MANAGEMENT_GUIDE.md)
- [Billing System Guide](backend/BILLING_SYSTEM_GUIDE.md)
- [Real-time Sync Guide](backend/REALTIME_SYNC_GUIDE.md)
- [API Endpoints for Apps](backend/API_ENDPOINTS_FOR_APP.md)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ✅ Testing Status

All core features tested and working:
- ✅ Admin registration and authentication
- ✅ Location management
- ✅ Staff management
- ✅ Product catalog
- ✅ Inventory tracking
- ✅ Stock transfers
- ✅ Point of sale
- ✅ Sales analytics
- ✅ Audit logging

---

Built with TypeScript, Node.js, and PostgreSQL
