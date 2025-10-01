import express from 'express';
import { prisma } from '../config/database';
import { generateTokenPair } from '../utils/jwt';
import { createResponse } from '../utils/helpers';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/test/token/:email - Generate test JWT token for seeded users
router.get('/token/:email', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email } = req.params;
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { location: true }
  });

  if (!user) {
    return res.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Generate JWT token
  const tokens = generateTokenPair(
    user.id,
    user.firebaseUid || '',
    user.email,
    user.role,
    user.locationId || undefined
  );

  res.json(createResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locationId: user.locationId,
      location: user.location ? {
        id: user.location.id,
        name: user.location.name
      } : null
    },
    tokens,
    instructions: {
      usage: 'Use the accessToken in Authorization header: Bearer <token>',
      testEndpoints: [
        'GET /api/v1/tenant/info (Admin only)',
        'GET /api/v1/tenant/locations (Admin only)',
        'GET /api/v1/tenant/staff (Admin only)'
      ]
    }
  }, 'Test JWT token generated successfully'));
}));

// GET /api/v1/test/users - List all seeded users for testing
router.get('/users', asyncHandler(async (req: express.Request, res: express.Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      locationId: true,
      location: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: [
      { role: 'asc' },
      { email: 'asc' }
    ]
  });

  res.json(createResponse({
    users,
    testInstructions: {
      generateToken: 'GET /api/v1/test/token/{email}',
      availableUsers: users.map(u => u.email)
    }
  }, 'Test users retrieved successfully'));
}));

export default router;