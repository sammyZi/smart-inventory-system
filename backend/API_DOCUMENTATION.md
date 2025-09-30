# Smart Inventory System - API Documentation

## 🔐 Enhanced Authentication System

### Overview
Our authentication system uses **short-lived access tokens (15 minutes)** with **automatic refresh** for optimal security and user experience.

### Token Strategy
- **Access Token**: 15 minutes (JWT)
- **Refresh Token**: Role-based duration (8h - 30 days)
- **Session Management**: Redis-based with activity tracking
- **Auto-refresh**: Seamless token renewal

## 🚀 Authentication Endpoints

### POST `/api/v1/auth/login`
Enhanced login with session management and device tracking.

**Rate Limit**: 5 attempts per 15 minutes per IP/email

**Request Body**:
```json
{
  "email": "admin@smartinventory.com",
  "password": "admin123456",
  "rememberMe": false,
  "deviceId": "mobile-app-v1"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "admin@smartinventory.com",
      "firstName": "System",
      "lastName": "Administrator",
      "role": "ADMIN",
      "locationId": "main-store",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "sessionId": "session-id",
    "expiresAt": "2025-01-01T12:00:00.000Z",
    "sessionInfo": {
      "rememberMe": false,
      "deviceId": "mobile-app-v1",
      "maxInactiveTime": "30m"
    }
  },
  "message": "Enhanced login successful"
}
```

### POST `/api/v1/auth/firebase-login`
Login using Firebase ID token.

**Request Body**:
```json
{
  "idToken": "firebase-id-token",
  "rememberMe": true,
  "deviceId": "web-browser-v1"
}
```

### POST `/api/v1/auth/register`
Register new user with role-based permissions.

**Rate Limit**: 3 registrations per hour per IP

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-0123",
  "role": "STAFF",
  "locationId": "main-store"
}
```

### POST `/api/v1/auth/logout`
Secure logout with session cleanup.

**Headers**: `Authorization: Bearer <access-token>`
**Headers**: `X-Session-ID: <session-id>`

### POST `/api/v1/auth/refresh`
Automatic token refresh (handled by middleware).

**Request**: Refresh token in HTTP-only cookie or body
**Response**: New access token

### GET `/api/v1/auth/profile`
Get user profile information.

**Headers**: `Authorization: Bearer <access-token>`

### PUT `/api/v1/auth/profile`
Update user profile.

**Headers**: `Authorization: Bearer <access-token>`

**Request Body**:
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "phone": "+1-555-9999"
}
```

### GET `/api/v1/auth/sessions`
Get user's active sessions.

**Headers**: `Authorization: Bearer <access-token>`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "session-1",
      "loginTime": "2025-01-01T08:00:00.000Z",
      "lastActivity": "2025-01-01T10:30:00.000Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "isActive": true
    }
  ]
}
```

### POST `/api/v1/auth/logout-all`
Logout from all devices.

**Headers**: `Authorization: Bearer <access-token>`

## 🛡️ Security Features

### Rate Limiting
- **Login**: 5 attempts per 15 minutes
- **Registration**: 3 per hour
- **API**: 1000 requests per 15 minutes
- **Transactions**: 30 per minute
- **Reports**: 10 per 5 minutes

### Security Headers
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy

### Input Sanitization
- XSS prevention
- SQL injection protection
- Request size limiting
- Suspicious activity detection

### Session Security
- HTTP-only cookies for refresh tokens
- Secure flag in production
- SameSite: strict
- Session activity tracking
- Inactivity timeout (30 minutes)

## 🔄 Auto Token Refresh

### Client Implementation
The system automatically refreshes tokens when they're close to expiry:

```javascript
// Frontend axios interceptor example
axios.interceptors.response.use(
  (response) => {
    // Check for new token in response headers
    const newToken = response.headers['x-new-access-token'];
    if (newToken) {
      // Update stored access token
      localStorage.setItem('accessToken', newToken);
      // Update axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Response Headers
When token is auto-refreshed:
- `X-New-Access-Token`: New access token
- `X-Token-Refreshed`: "true"

## 📊 Session Management

### Session Duration by Role
| Role | Regular Session | Remember Me |
|------|----------------|-------------|
| Admin | 8 hours | 30 days |
| Manager | 12 hours | 30 days |
| Staff | 8 hours | 30 days |
| Customer | 24 hours | 30 days |

### Session Features
- **Multi-device support**: Up to 5 active sessions
- **Activity tracking**: Last activity timestamp
- **Inactivity timeout**: 30 minutes
- **Device fingerprinting**: Track device info
- **Geolocation logging**: IP-based location tracking

## 🔍 Audit Logging

All authentication events are logged:
- Login attempts (success/failure)
- Token refresh events
- Logout events
- Session creation/destruction
- Suspicious activity detection

### Audit Log Format
```json
{
  "userId": "user-id",
  "action": "LOGIN",
  "resource": "USER_AUTH",
  "timestamp": "2025-01-01T10:00:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "details": {
    "email": "user@example.com",
    "rememberMe": false,
    "deviceId": "mobile-app"
  }
}
```

## 🚨 Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "timestamp": "2025-01-01T10:00:00.000Z",
    "requestId": "req-12345"
  }
}
```

### Common Error Codes
- `INVALID_CREDENTIALS`: Wrong email/password
- `ACCOUNT_DEACTIVATED`: User account disabled
- `TOKEN_EXPIRED`: Access token expired
- `INVALID_TOKEN`: Malformed or invalid token
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SESSION_EXPIRED`: Session expired due to inactivity
- `INSUFFICIENT_PERMISSIONS`: Role-based access denied

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-token-secret-key"
JWT_REFRESH_EXPIRES_IN="30d"

# Session Configuration
SESSION_TIMEOUT_ADMIN="8h"
SESSION_TIMEOUT_MANAGER="12h"
SESSION_TIMEOUT_STAFF="8h"
SESSION_TIMEOUT_CUSTOMER="24h"
REMEMBER_ME_DURATION="30d"
IDLE_TIMEOUT="30m"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="1000"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key-here"
BCRYPT_SALT_ROUNDS="12"
```

## 🧪 Testing

### Test Users
```bash
# Admin User
Email: admin@smartinventory.com
Password: admin123456
Role: ADMIN

# Manager User  
Email: manager@smartinventory.com
Password: manager123456
Role: MANAGER

# Staff User
Email: staff@smartinventory.com
Password: staff123456
Role: STAFF
```

### Testing Commands
```bash
# Run authentication tests
npm run test:auth

# Test token refresh
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
```

This enhanced authentication system provides **enterprise-grade security** with **excellent user experience** - perfect for your Smart Inventory System! 🚀