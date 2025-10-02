# Quick Setup Guide

## Prerequisites
- Node.js v16+
- PostgreSQL v13+
- npm or yarn

## Setup Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Create `backend/.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/inventory_db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
PORT=3001
NODE_ENV=development
```

### 3. Setup Database
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### 4. Start Server
```bash
npm run dev
```

Server runs on `http://localhost:3001`

## Test the API
```bash
node src/scripts/quickAPITest.js
```

All 8 tests should pass ✅

## Common Issues

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Port Already in Use
- Change PORT in .env
- Or stop the process using port 3001

### Prisma Client Error
```bash
npx prisma generate
```

## Next Steps
- Read [API_ENDPOINTS_FOR_APP.md](backend/API_ENDPOINTS_FOR_APP.md) for API docs
- Check feature guides in `/backend` directory
- Run test scripts to see examples

## TypeScript Errors
The project has some TypeScript warnings but they don't affect runtime. The compiled JavaScript works perfectly. You can safely ignore these warnings or run:
```bash
npm run build
```
to see if there are any blocking errors (there shouldn't be).
