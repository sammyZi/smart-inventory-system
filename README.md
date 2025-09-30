# Smart Inventory & Billing Management System

A comprehensive inventory management system with real-time synchronization, AI-powered forecasting, and multi-location support.

## 🚀 Features

- **Multi-location inventory synchronization** with real-time updates
- **Role-based access control** (Admin, Manager, Staff, Customer)
- **Point of Sale (POS)** system with multiple payment methods
- **AI-powered demand forecasting** using TensorFlow.js
- **Real-time analytics** and reporting dashboards
- **Secure authentication** with Firebase Auth
- **Audit logging** for all transactions
- **Mobile-responsive** design

## 🛠 Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ShadCN UI** components
- **Socket.io** for real-time updates

### Backend
- **Node.js** with Express.js
- **TypeScript**
- **Prisma ORM** with PostgreSQL
- **Firebase Firestore** for real-time data
- **Redis** for caching
- **Socket.io** for real-time communication

### Database
- **PostgreSQL** for transactional data
- **Firebase Firestore** for real-time inventory
- **Redis** for caching and sessions

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database
- Redis server
- Firebase project with Firestore enabled

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd smart-inventory-system
```

### 2. Install dependencies
```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Or install separately
npm run install:frontend
npm run install:backend
```

### 4. Environment Setup

#### Frontend (frontend/.env.local)
```bash
# Copy and configure
cp frontend/.env.example frontend/.env.local
```

#### Backend (backend/.env)
```bash
# Copy and configure
cp backend/.env.example backend/.env
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `JWT_SECRET` - Secret key for JWT tokens (32+ characters)

### 5. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Optional: Run migrations
npm run db:migrate

# Optional: Seed database
npm run db:seed
```

## 🚀 Running the Application

### Development Mode
```bash
# Run both frontend and backend
npm run dev

# Or run separately
npm run dev:frontend   # Frontend only (http://localhost:3000)
npm run dev:backend    # Backend only (http://localhost:3001)
```

### Production Mode
```bash
# Build applications
npm run build

# Start applications
npm start
```

## 📁 Project Structure

```
├── frontend/              # Next.js frontend application
│   ├── app/              # Next.js app directory
│   │   ├── admin/        # Admin dashboard pages
│   │   ├── manager/      # Manager dashboard pages
│   │   ├── pos/          # Point of Sale pages
│   │   └── login/        # Authentication pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility libraries
│   └── package.json      # Frontend dependencies
├── backend/              # Node.js backend API server
│   ├── src/
│   │   ├── config/       # Database and service configs
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helper utilities
│   ├── prisma/           # Database schema and migrations
│   └── package.json      # Backend dependencies
├── .kiro/                # Kiro IDE specifications
└── package.json          # Root workspace configuration
```

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Role-based access control** (RBAC)
- **Input validation** with Joi schemas
- **Rate limiting** to prevent abuse
- **Helmet.js** for security headers
- **Data encryption** for sensitive information
- **Audit logging** for all user actions

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Inventory
- `GET /api/v1/inventory/products` - Get products
- `POST /api/v1/inventory/products` - Create product
- `PUT /api/v1/inventory/products/:id` - Update product
- `POST /api/v1/inventory/stock/update` - Update stock levels

### Transactions
- `POST /api/v1/billing/transactions` - Create transaction
- `GET /api/v1/billing/transactions` - Get transactions
- `POST /api/v1/billing/refunds` - Process refund

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard metrics
- `GET /api/v1/analytics/reports` - Generate reports

## 🔄 Real-time Features

The system uses Socket.io for real-time updates:

- **Inventory synchronization** across locations
- **Live dashboard updates**
- **Transaction notifications**
- **Stock level alerts**

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests
cd server && npm test

# Run with coverage
npm run test:coverage
```

## 📈 Monitoring

- **Winston logging** with file rotation
- **Health check endpoints**
- **Performance metrics**
- **Error tracking** (optional Sentry integration)

## 🚀 Deployment

### Free Tier Options

1. **Vercel + Railway + Firebase**
   - Frontend: Vercel
   - Backend: Railway
   - Database: Firebase Firestore + PostgreSQL

2. **Netlify + Supabase**
   - Frontend: Netlify
   - Backend: Netlify Functions
   - Database: Supabase

3. **AWS Free Tier**
   - Frontend: S3 + CloudFront
   - Backend: Lambda + API Gateway
   - Database: RDS (free tier)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API specifications
- Open an issue on GitHub

---

**Built with ❤️ for efficient inventory management**