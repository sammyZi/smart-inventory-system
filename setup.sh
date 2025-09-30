#!/bin/bash

# Smart Inventory System Setup Script

echo "🚀 Setting up Smart Inventory & Billing Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Copy environment files
echo "📝 Setting up environment files..."
if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.example frontend/.env.local
    echo "✅ Created frontend/.env.local"
else
    echo "⚠️  frontend/.env.local already exists"
fi

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
else
    echo "⚠️  backend/.env already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your environment variables:"
echo "   - Edit frontend/.env.local"
echo "   - Edit backend/.env"
echo ""
echo "2. Set up your databases:"
echo "   - PostgreSQL for transactional data"
echo "   - Redis for caching (optional)"
echo "   - Firebase Firestore for real-time data"
echo ""
echo "3. Initialize the database:"
echo "   npm run db:generate"
echo "   npm run db:push"
echo ""
echo "4. Start development servers:"
echo "   npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""