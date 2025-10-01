import { prisma } from '../config/database';
import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';
import { UserRole } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seedDatabaseSimple() {
  try {
    console.log('🌱 Seeding database (Simple - No Firebase)...\n');

    // Initialize database only
    await connectDatabase();

    // Create tenant 1 (Alice's Business) - No Firebase
    console.log('👤 Creating Tenant 1 - Alice\'s Business...');
    
    const aliceAdmin = await prisma.user.upsert({
      where: { email: 'alice@alicestores.com' },
      update: {},
      create: {
        id: generateId(),
        firebaseUid: null, // No Firebase for now
        email: 'alice@alicestores.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: UserRole.ADMIN,
        createdById: null, // Tenant admin
        isActive: true
      }
    });

    // Create Alice's main store
    const aliceStore = await prisma.location.upsert({
      where: { id: 'alice-main-store' },
      update: {},
      create: {
        id: 'alice-main-store',
        name: 'Alice\'s Main Store',
        address: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        adminId: aliceAdmin.id,
        phone: '+1-555-0100',
        email: 'store@alicestores.com'
      }
    });

    // Update Alice's location
    await prisma.user.update({
      where: { id: aliceAdmin.id },
      data: { locationId: aliceStore.id }
    });

    console.log('✅ Tenant 1 created');
    console.log('Email: alice@alicestores.com');
    console.log('Password: Use JWT-only auth for now');

    // Create tenant 2 (Bob's Business)
    console.log('\n👤 Creating Tenant 2 - Bob\'s Business...');
    
    const bobAdmin = await prisma.user.upsert({
      where: { email: 'bob@bobsshop.com' },
      update: {},
      create: {
        id: generateId(),
        firebaseUid: null,
        email: 'bob@bobsshop.com',
        firstName: 'Bob',
        lastName: 'Smith',
        role: UserRole.ADMIN,
        createdById: null,
        isActive: true
      }
    });

    const bobStore = await prisma.location.upsert({
      where: { id: 'bob-main-store' },
      update: {},
      create: {
        id: 'bob-main-store',
        name: 'Bob\'s Electronics Shop',
        address: '456 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        adminId: bobAdmin.id,
        phone: '+1-555-0200',
        email: 'store@bobsshop.com'
      }
    });

    await prisma.user.update({
      where: { id: bobAdmin.id },
      data: { locationId: bobStore.id }
    });

    console.log('✅ Tenant 2 created');
    console.log('Email: bob@bobsshop.com');

    // Create some staff for Alice
    console.log('\n👥 Creating staff for Alice...');
    
    const aliceManager = await prisma.user.upsert({
      where: { email: 'manager@alicestores.com' },
      update: {},
      create: {
        id: generateId(),
        firebaseUid: null,
        email: 'manager@alicestores.com',
        firstName: 'John',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        locationId: aliceStore.id,
        createdById: aliceAdmin.id,
        isActive: true
      }
    });

    const aliceStaff = await prisma.user.upsert({
      where: { email: 'staff@alicestores.com' },
      update: {},
      create: {
        id: generateId(),
        firebaseUid: null,
        email: 'staff@alicestores.com',
        firstName: 'Jane',
        lastName: 'Staff',
        role: UserRole.STAFF,
        locationId: aliceStore.id,
        createdById: aliceAdmin.id,
        isActive: true
      }
    });

    console.log('✅ Staff created');

    // Create system configuration
    console.log('\n⚙️ Creating system configuration...');
    
    const configs = [
      {
        key: 'SYSTEM_NAME',
        value: 'Smart Inventory & Billing Management System',
        category: 'GENERAL',
        description: 'System name displayed in UI'
      },
      {
        key: 'DEFAULT_CURRENCY',
        value: 'USD',
        category: 'GENERAL',
        description: 'Default currency for the system'
      },
      {
        key: 'DEFAULT_TAX_RATE',
        value: '0.08',
        category: 'BILLING',
        description: 'Default tax rate (8%)'
      }
    ];

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {},
        create: {
          id: generateId(),
          ...config,
          isActive: true
        }
      });
    }

    console.log('✅ System configuration created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Tenants Created:');
    console.log('Tenant 1: alice@alicestores.com (Admin)');
    console.log('  - Manager: manager@alicestores.com');
    console.log('  - Staff: staff@alicestores.com');
    console.log('Tenant 2: bob@bobsshop.com (Admin)');
    console.log('\n💡 Note: Use JWT-only authentication for now');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run seeder
seedDatabaseSimple();