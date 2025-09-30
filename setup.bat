@echo off
REM Smart Inventory System Setup Script for Windows

echo 🚀 Setting up Smart Inventory ^& Billing Management System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install
cd ..

REM Copy environment files
echo 📝 Setting up environment files...
if not exist "frontend\.env.local" (
    copy "frontend\.env.example" "frontend\.env.local"
    echo ✅ Created frontend/.env.local
) else (
    echo ⚠️  frontend/.env.local already exists
)

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo ✅ Created backend/.env
) else (
    echo ⚠️  backend/.env already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Configure your environment variables:
echo    - Edit frontend/.env.local
echo    - Edit backend/.env
echo.
echo 2. Set up your databases:
echo    - PostgreSQL for transactional data
echo    - Redis for caching (optional)
echo    - Firebase Firestore for real-time data
echo.
echo 3. Initialize the database:
echo    npm run db:generate
echo    npm run db:push
echo.
echo 4. Start development servers:
echo    npm run dev
echo.
echo 🌐 URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
echo.
pause