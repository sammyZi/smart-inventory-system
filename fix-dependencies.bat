@echo off
echo 🔧 Fixing dependency conflicts...

echo 📦 Installing frontend dependencies with legacy peer deps...
cd frontend
npm install --legacy-peer-deps
cd ..

echo 📦 Installing backend dependencies...
cd backend
npm install
cd ..

echo ✅ Dependencies fixed! You can now run:
echo npm run dev
pause