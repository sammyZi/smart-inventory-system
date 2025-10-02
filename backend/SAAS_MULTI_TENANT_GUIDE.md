# SaaS Multi-Tenant System Guide

## Overview

This Smart Inventory System implements a **true SaaS multi-tenant architecture** where each admin operates as an independent business with complete data isolation. No admin can see or access another admin's data, locations, or staff.

## Architecture

### Tenant Isolation Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    SaaS Platform                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   Tenant A          │    │   Tenant B          │            │
│  │   (Alice's Business)│    │   (Bob's Business)  │            │
│  │                     │    │                     │            │
│  │  Admin: Alice       │    │  Admin: Bob         │            │
│  │  ├─ Main Store      │    │  ├─ Electronics Shop│            │
│  │  ├─ Branch Store    │    │  └─ Warehouse       │            │
│  │  └─ Staff:          │    │  └─ Staff:          │            │
│  │     ├─ Manager John │    │     ├─ Manager Mike │            │
│  │     └─ Staff Jane   │    │     └─ Staff Sarah  │            │
│  └─────────────────────┘    └─────────────────────┘            │
│           │                           │                        │
│           └─── No Cross-Access ───────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Complete Data Isolation**: Each admin can only see their own data
2. **Independent Operations**: Admins operate as separate businesses
3. **Hierarchical Structure**: Admin → Locations → Staff
4. **Secure Boundaries**: Multiple layers of access control

## API Endpoints

### Admin Registration (Public)

**POST** `/api/v1/saas/admin/signup`

Creates a new independent admin tenant with their main location.

```json
{
  "email": "admin@company.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "John's Retail Store",
  "businessType": "retail",
  "timezone": "America/New_York",
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "data": {
    "admin": {
      "id": "admin_123",
      "email": "admin@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN"
    },
    "mainLocation": {
      "id": "location_456",
      "name": "John's Retail Store - Main Location"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### Location Management (Admin Only)

**POST** `/api/v1/saas/locations`

Creates a new location under the admin's tenant.

```json
{
  "name": "Branch Store",
  "address": "123 Branch Ave",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "phone": "+1-555-0123",
  "email": "branch@company.com"
}
```

**GET** `/api/v1/saas/locations`

Gets all locations owned by the authenticated admin.

### Staff Management (Admin Only)

**POST** `/api/v1/saas/staff`

Creates staff/manager under the admin's tenant, linked to a specific location.

```json
{
  "email": "manager@company.com",
  "firstName": "Jane",
  "lastName": "Manager",
  "role": "MANAGER",
  "locationId": "location_456",
  "phone": "+1-555-0124"
}
```

**GET** `/api/v1/saas/staff`

Gets all staff under the admin's tenant.

**GET** `/api/v1/saas/staff?locationId=location_456`

Gets staff for a specific location (admin must own the location).

**PUT** `/api/v1/saas/staff/:staffId`

Updates staff user (admin can only update their own staff).

**DELETE** `/api/v1/saas/staff/:staffId`

Deactivates staff user (soft delete).

### Tenant Information

**GET** `/api/v1/saas/tenant/info`

Gets complete tenant information for the authenticated admin.

```json
{
  "success": true,
  "data": {
    "admin": { /* admin details */ },
    "locations": [ /* all locations */ ],
    "staffCount": 5,
    "companyName": "John's Retail Store",
    "businessType": "retail",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## Security Features

### 1. Tenant Isolation

- **Database Level**: All queries are scoped by admin ID
- **API Level**: Middleware enforces tenant boundaries
- **Token Level**: JWT tokens include tenant context

### 2. Access Control Layers

```typescript
// Layer 1: Authentication
router.use(authenticateJWT);

// Layer 2: Admin Role Check
router.use(requireAdmin);

// Layer 3: Tenant Isolation
router.use(enforceTenantIsolation);

// Layer 4: Location Ownership
router.use(verifyLocationAccess);
```

### 3. Data Relationships

```sql
-- Every user (except admins) has createdById pointing to their admin
users.createdById → admin.id

-- Every location has adminId pointing to the owner
locations.adminId → admin.id

-- Every staff user has locationId pointing to their workplace
users.locationId → locations.id
```

### 4. Validation Rules

- ✅ Admin can only create staff in their own locations
- ✅ Admin can only view/edit their own staff
- ✅ Staff can only access their assigned location
- ✅ No cross-tenant data access allowed
- ✅ Location ownership verified on every request

## Usage Examples

### 1. New Business Signup

```typescript
// Business owner signs up
const response = await fetch('/api/v1/saas/admin/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'owner@mybusiness.com',
    password: 'SecurePass123!',
    firstName: 'Business',
    lastName: 'Owner',
    companyName: 'My Retail Business'
  })
});

const { accessToken } = response.data.data;
// Store token for subsequent requests
```

### 2. Adding Staff

```typescript
// Admin adds a manager to their main store
const response = await fetch('/api/v1/saas/staff', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'manager@mybusiness.com',
    firstName: 'Store',
    lastName: 'Manager',
    role: 'MANAGER',
    locationId: mainLocationId
  })
});
```

### 3. Creating Additional Locations

```typescript
// Admin creates a branch store
const response = await fetch('/api/v1/saas/locations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Downtown Branch',
    address: '456 Downtown St',
    city: 'New York',
    state: 'NY'
  })
});
```

## Database Schema

### Key Tables

```sql
-- Users table with tenant relationships
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  role user_role NOT NULL,
  location_id VARCHAR REFERENCES locations(id),
  created_by_id VARCHAR REFERENCES users(id), -- Points to admin
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Locations table with admin ownership
CREATE TABLE locations (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  admin_id VARCHAR NOT NULL REFERENCES users(id), -- Owner admin
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System config for tenant-specific settings
CREATE TABLE system_config (
  id VARCHAR PRIMARY KEY,
  key VARCHAR UNIQUE NOT NULL,
  value VARCHAR NOT NULL,
  category VARCHAR,
  description VARCHAR
);
```

### Tenant Isolation Queries

```sql
-- Get all staff for an admin
SELECT * FROM users 
WHERE created_by_id = $adminId 
AND role IN ('MANAGER', 'STAFF') 
AND is_active = true;

-- Get all locations for an admin
SELECT * FROM locations 
WHERE admin_id = $adminId 
AND is_active = true;

-- Verify location ownership
SELECT COUNT(*) FROM locations 
WHERE id = $locationId 
AND admin_id = $adminId;
```

## Testing

Run the comprehensive test suite:

```bash
npm run test:saas
# or
npx ts-node src/scripts/testSaaSAPI.ts
```

The test creates two independent tenants and verifies:
- ✅ Complete data isolation
- ✅ Location ownership enforcement
- ✅ Staff creation restrictions
- ✅ Cross-tenant access prevention

## Best Practices

### 1. Always Verify Ownership

```typescript
// Before any operation, verify the resource belongs to the admin
const hasAccess = await SaaSService.verifyLocationOwnership(adminId, locationId);
if (!hasAccess) {
  throw new Error('Access denied');
}
```

### 2. Use Middleware Layers

```typescript
// Stack multiple middleware for defense in depth
router.use(authenticateJWT);           // Authentication
router.use(requireAdmin);              // Role check
router.use(enforceTenantIsolation);    // Tenant boundary
router.use(verifyLocationAccess);      // Resource ownership
```

### 3. Audit All Actions

```typescript
// Log all tenant operations for security auditing
await AuditService.logAction({
  userId: adminId,
  action: 'CREATE',
  resource: 'staff_user',
  resourceId: staffId,
  newValues: staffData
});
```

### 4. Validate Input Thoroughly

```typescript
// Use Joi schemas for comprehensive validation
const createStaffSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  role: Joi.string().valid('MANAGER', 'STAFF').required(),
  locationId: Joi.string().required()
});
```

## Deployment Considerations

### Environment Variables

```bash
# JWT secrets for token generation
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=24h

# Database connection
DATABASE_URL=postgresql://user:pass@localhost:5432/inventory

# Optional: Email service for staff invitations
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Production Security

1. **Rate Limiting**: Implement strict rate limits on signup endpoints
2. **Email Verification**: Require email verification for admin accounts
3. **Password Policy**: Enforce strong password requirements
4. **Audit Logging**: Log all admin and staff actions
5. **Backup Strategy**: Regular backups with tenant-aware restore
6. **Monitoring**: Alert on suspicious cross-tenant access attempts

## Conclusion

This SaaS multi-tenant system provides:

- ✅ **Complete Isolation**: Each business operates independently
- ✅ **Scalable Architecture**: Supports unlimited tenants
- ✅ **Security First**: Multiple layers of access control
- ✅ **Easy Management**: Simple APIs for tenant operations
- ✅ **Audit Trail**: Complete logging for compliance
- ✅ **Production Ready**: Comprehensive error handling and validation

The system ensures that each admin can only manage their own business data, creating a secure and scalable SaaS platform for inventory management.