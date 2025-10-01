import { prisma } from '../config/database';
import { FirebaseAuthService } from '../config/firebase';
import { connectDatabase } from '../config/database';
import { initializeFirebase } from '../config/firebase';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';
import { UserRole } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...\n');

    // Initialize services
    await connectDatabase();
    await initializeFirebase();

    // Create default locations
    console.log('📍 Creating default locations...');
    
    const mainStore = await prisma.location.upsert({
      where: { id: 'main-store' },
      update: {},
      create: {
        id: 'main-store',
        name: 'Main Store',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        phone: '+1-555-0123',
        email: 'main@smartinventory.com',
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 0.08
      }
    });

    const warehouse = await prisma.location.upsert({
      where: { id: 'warehouse-1' },
      update: {},
      create: {
        id: 'warehouse-1',
        name: 'Main Warehouse',
        address: '456 Industrial Blvd',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        country: 'USA',
        phone: '+1-555-0124',
        email: 'warehouse@smartinventory.com',
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 0.08
      }
    });

    console.log('✅ Locations created');

    // Create tenant 1 (Alice's Business)
    console.log('\n👤 Creating Tenant 1 - Alice\'s Business...');
    
    try {
      // Create Firebase user for Alice
      const aliceFirebaseUser = await FirebaseAuthService.createUser({
        email: 'alice@alicestores.com',
        password: 'alice123456',
        displayName: 'Alice Johnson',
        disabled: false
      });

      // Create Alice as admin (tenant)
      const aliceAdmin = await prisma.user.upsert({
        where: { email: 'alice@alicestores.com' },
        update: {},
        create: {
          id: generateId(),
          firebaseUid: aliceFirebaseUser.uid,
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
      console.log('Password: alice123456');

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Tenant 1 already exists');
      } else {
        throw error;
      }
    }

    // Create manager user
    console.log('\n👨‍💼 Creating manager user...');
    
    try {
      const managerFirebaseUser = await FirebaseAuthService.createUser({
        email: 'manager@smartinventory.com',
        password: 'manager123456',
        displayName: 'Store Manager',
        disabled: false
      });

      await FirebaseAuthService.setCustomClaims(managerFirebaseUser.uid, {
        role: 'MANAGER',
        locationId: mainStore.id
      });

      const managerUser = await prisma.user.upsert({
        where: { email: 'manager@smartinventory.com' },
        update: {},
        create: {
          id: generateId(),
          firebaseUid: managerFirebaseUser.uid,
          email: 'manager@smartinventory.com',
          firstName: 'Store',
          lastName: 'Manager',
          role: UserRole.MANAGER,
          locationId: mainStore.id,
          isActive: true
        }
      });

      console.log('✅ Manager user created');
      console.log('Email: manager@smartinventory.com');
      console.log('Password: manager123456');

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Manager user already exists');
      } else {
        throw error;
      }
    }

    // Create staff user
    console.log('\n👨‍💻 Creating staff user...');
    
    try {
      const staffFirebaseUser = await FirebaseAuthService.createUser({
        email: 'staff@smartinventory.com',
        password: 'staff123456',
        displayName: 'Staff Member',
        disabled: false
      });

      await FirebaseAuthService.setCustomClaims(staffFirebaseUser.uid, {
        role: 'STAFF',
        locationId: mainStore.id
      });

      const staffUser = await prisma.user.upsert({
        where: { email: 'staff@smartinventory.com' },
        update: {},
        create: {
          id: generateId(),
          firebaseUid: staffFirebaseUser.uid,
          email: 'staff@smartinventory.com',
          firstName: 'Staff',
          lastName: 'Member',
          role: UserRole.STAFF,
          locationId: mainStore.id,
          isActive: true
        }
      });

      console.log('✅ Staff user created');
      console.log('Email: staff@smartinventory.com');
      console.log('Password: staff123456');

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Staff user already exists');
      } else {
        throw error;
      }
    }

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
      },
      {
        key: 'LOW_STOCK_THRESHOLD',
        value: '10',
        category: 'INVENTORY',
        description: 'Default low stock threshold'
      },
      {
        key: 'SESSION_TIMEOUT',
        value: '24',
        category: 'SECURITY',
        description: 'Session timeout in hours'
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
    console.log('\n📋 Default Users Created:');
    console.log('Admin: admin@smartinventory.com / admin123456');
    console.log('Manager: manager@smartinventory.com / manager123456');
    console.log('Staff: staff@smartinventory.com / staff123456');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run seeder
seedDatabase();