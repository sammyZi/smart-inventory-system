# 📱 API Endpoints for Mobile/Web App Integration

## 🚀 Server Status: **WORKING** ✅
- **Base URL**: `http://localhost:3001/api/v1`
- **Database**: PostgreSQL connected ✅
- **Server**: Express.js running on port 3001 ✅

---

## 🔐 **Authentication System**

### **Admin Registration (First Step)**
```http
POST /api/v1/saas/admin/signup
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "My Company Ltd"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "admin_user_id",
      "email": "admin@company.com",
      "role": "ADMIN",
      "companyName": "My Company Ltd"
    }
  }
}
```

### **Admin Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePassword123!"
}
```

### **Create Manager/Staff Users (Admin Only)**
```http
POST /api/v1/saas/staff
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "manager@company.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "MANAGER",
  "locationId": "location_id_here"
}
```

### **Staff/Manager Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "manager@company.com",
  "password": "temporary_password_from_email"
}
```

---

## 🏢 **Location Management**

### **Create Location (Admin Only)**
```http
POST /api/v1/saas/locations
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Main Store",
  "address": "123 Business Street",
  "city": "Business City",
  "state": "BC",
  "zipCode": "12345",
  "phone": "+1234567890"
}
```

### **Get All Locations**
```http
GET /api/v1/saas/locations
Authorization: Bearer {token}
```

---

## 📦 **Product Management**

### **Create Product**
```http
POST /api/v1/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "sku": "PROD-001",
  "name": "Sample Product",
  "description": "Product description",
  "category": "Electronics",
  "price": 29.99,
  "cost": 15.00
}
```

### **Get All Products**
```http
GET /api/v1/products
Authorization: Bearer {token}
```

### **Search Products**
```http
GET /api/v1/products/search?q=sample
Authorization: Bearer {token}
```

### **Get Product by ID**
```http
GET /api/v1/products/{product_id}
Authorization: Bearer {token}
```

---

## 📊 **Inventory Management**

### **Get Stock Levels**
```http
GET /api/v1/inventory/stock
Authorization: Bearer {token}
```

### **Update Stock Level**
```http
PUT /api/v1/inventory/stock/update
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "locationId": "location_id_here",
  "quantity": 100,
  "reason": "Stock adjustment"
}
```

### **Get Inventory Summary**
```http
GET /api/v1/inventory/summary
Authorization: Bearer {token}
```

### **Get Stock Movements**
```http
GET /api/v1/inventory/movements
Authorization: Bearer {token}
```

---

## 💰 **Point of Sale & Billing**

### **Create Transaction**
```http
POST /api/v1/billing/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "locationId": "location_id_here",
  "items": [
    {
      "productId": "product_id_here",
      "quantity": 2,
      "unitPrice": 29.99
    }
  ],
  "paymentMethod": "CASH"
}
```

### **Process Payment**
```http
POST /api/v1/billing/payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": "transaction_id_here",
  "paymentMethod": "CASH",
  "amount": 59.98
}
```

### **Quick Sale (All-in-One)**
```http
POST /api/v1/billing/quick-sale
Authorization: Bearer {token}
Content-Type: application/json

{
  "locationId": "location_id_here",
  "items": [
    {
      "productId": "product_id_here",
      "quantity": 1,
      "unitPrice": 29.99
    }
  ],
  "paymentMethod": "CASH"
}
```

### **Get Sales Analytics**
```http
GET /api/v1/billing/analytics?period=today
Authorization: Bearer {token}
```

### **Get Billing Dashboard**
```http
GET /api/v1/billing/dashboard
Authorization: Bearer {token}
```

---

## 📈 **Real-time Features**

### **Get Real-time Health**
```http
GET /api/v1/realtime/health
Authorization: Bearer {token}
```

### **Ping Test**
```http
POST /api/v1/realtime/ping
Authorization: Bearer {token}
Content-Type: application/json

{
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 🔍 **System Health**

### **API Health Check**
```http
GET /api/v1/health
```

### **Get Tenant Info**
```http
GET /api/v1/saas/tenant/info
Authorization: Bearer {admin_token}
```

---

## 🔑 **Authentication Flow for Your Friend's App**

### **Step 1: Admin Setup**
1. Admin registers company using `/saas/admin/signup`
2. Admin creates locations using `/saas/locations`
3. Admin creates staff/managers using `/saas/staff`

### **Step 2: Staff Login**
1. Staff/Manager logs in using `/auth/login`
2. Gets JWT token for authenticated requests
3. Can access location-specific data only

### **Step 3: Daily Operations**
1. View products: `/products`
2. Check inventory: `/inventory/stock`
3. Process sales: `/billing/quick-sale`
4. View analytics: `/billing/dashboard`

---

## 🛡️ **Security Features**

- **JWT Authentication**: All endpoints require valid token
- **Role-based Access**: Admin, Manager, Staff permissions
- **Tenant Isolation**: Each company sees only their data
- **Input Validation**: All requests validated
- **Rate Limiting**: Prevents API abuse

---

## 📱 **Mobile App Integration Notes**

### **Headers Required**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### **Error Handling**
All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### **Success Response Format**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

---

## 🧪 **Testing the APIs**

I'll create a test script to verify all endpoints are working...