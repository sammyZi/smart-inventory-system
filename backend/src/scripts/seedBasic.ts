import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting basic database seeding...');

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@inventory.com' },
      update: {},
      create: {
        email: 'admin@inventory.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
      },
    });

    logger.info('Admin user created:', adminUser.email);

    // Create locations
    const locations = [
      {
        id: 'main-store',
        name: 'Main Store',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        adminId: adminUser.id,
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 0.08,
      },
      {
        id: 'warehouse-1',
        name: 'Central Warehouse',
        address: '456 Industrial Blvd',
        city: 'Newark',
        state: 'NJ',
        zipCode: '07102',
        country: 'USA',
        adminId: adminUser.id,
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 0.06625,
      }
    ];

    for (const locationData of locations) {
      await prisma.location.upsert({
        where: { id: locationData.id },
        update: {},
        create: locationData,
      });
    }

    logger.info('Locations created');

    // Create staff users
    const staffUsers = [
      {
        email: 'manager@inventory.com',
        firstName: 'John',
        lastName: 'Manager',
        role: 'MANAGER' as const,
        locationId: 'main-store',
      },
      {
        email: 'staff1@inventory.com',
        firstName: 'Alice',
        lastName: 'Staff',
        role: 'STAFF' as const,
        locationId: 'main-store',
      },
    ];

    for (const userData of staffUsers) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          ...userData,
          createdById: adminUser.id,
          isActive: true,
        },
      });
    }

    logger.info('Staff users created');

    // Create suppliers
    await prisma.supplier.create({
      data: {
        name: 'Tech Supplies Inc.',
        contactName: 'Sarah Johnson',
        email: 'orders@techsupplies.com',
        phone: '+1-555-0123',
        address: '100 Tech Park Drive',
        city: 'San Jose',
        state: 'CA',
        zipCode: '95110',
        country: 'USA',
        paymentTerms: 'Net 30',
      },
    });

    logger.info('Supplier created');

    // Create products
    const products = [
      {
        sku: 'LAPTOP-001',
        name: 'Business Laptop Pro',
        description: 'High-performance laptop for business use',
        category: 'Electronics',
        brand: 'TechBrand',
        price: 1299.99,
        cost: 899.99,
        weight: 2.5,
        dimensions: { length: 35, width: 25, height: 2, unit: 'cm' },
        trackingCodes: { 
          barcode: '1234567890123',
          qr: 'QR-LAPTOP-001'
        },
        specifications: {
          processor: 'Intel i7',
          memory: '16GB RAM',
          storage: '512GB SSD',
          display: '15.6 inch'
        },
        images: ['laptop-001-1.jpg', 'laptop-001-2.jpg'],
      },
      {
        sku: 'MOUSE-001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        category: 'Electronics',
        brand: 'TechBrand',
        price: 49.99,
        cost: 25.99,
        weight: 0.1,
        dimensions: { length: 12, width: 7, height: 4, unit: 'cm' },
        trackingCodes: { 
          barcode: '1234567890124',
          qr: 'QR-MOUSE-001'
        },
        specifications: {
          connectivity: 'Wireless 2.4GHz',
          battery: 'AA x 2',
          dpi: '1600'
        },
        images: ['mouse-001-1.jpg'],
      },
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData,
      });
      createdProducts.push(product);
    }

    logger.info('Products created');

    // Create stock levels for each product at each location
    for (const product of createdProducts) {
      for (const location of locations) {
        const baseQuantity = Math.floor(Math.random() * 100) + 20; // 20-120 units
        await prisma.stockLevel.create({
          data: {
            productId: product.id,
            locationId: location.id,
            quantity: baseQuantity,
            reservedQuantity: Math.floor(baseQuantity * 0.1), // 10% reserved
            minThreshold: Math.floor(baseQuantity * 0.2), // 20% of base as min
            maxThreshold: baseQuantity * 2, // 200% of base as max
            reorderPoint: Math.floor(baseQuantity * 0.3), // 30% as reorder point
            reorderQuantity: baseQuantity, // Reorder to base quantity
            lastCountDate: new Date(),
          },
        });
      }
    }

    logger.info('Stock levels created');

    // Create IoT sensors
    const sensors = [
      {
        deviceId: 'WEIGHT-SENSOR-001',
        locationId: 'main-store',
        sensorType: 'WEIGHT' as const,
        name: 'Main Store Weight Scale',
        description: 'Digital weight scale for inventory counting',
        position: { x: 10, y: 5, z: 1, zone: 'Storage Area A' },
        configuration: { 
          unit: 'kg',
          precision: 0.1,
          max_weight: 500
        },
        batteryLevel: 85.5,
        firmwareVersion: '1.2.3',
      },
      {
        deviceId: 'TEMP-SENSOR-001',
        locationId: 'warehouse-1',
        sensorType: 'TEMPERATURE' as const,
        name: 'Warehouse Temperature Monitor',
        description: 'Temperature and humidity sensor for warehouse',
        position: { x: 50, y: 30, z: 3, zone: 'Cold Storage' },
        configuration: { 
          temp_unit: 'celsius',
          humidity_enabled: true,
          alert_threshold_low: 2,
          alert_threshold_high: 8
        },
        batteryLevel: 92.3,
        firmwareVersion: '2.1.0',
      },
    ];

    for (const sensorData of sensors) {
      await prisma.ioTSensor.create({
        data: sensorData,
      });
    }

    logger.info('IoT sensors created');

    // Create system configuration
    const configs = [
      { key: 'app_name', value: 'Smart Inventory System', category: 'general', description: 'Application name' },
      { key: 'default_currency', value: 'USD', category: 'general', description: 'Default currency for pricing' },
      { key: 'low_stock_threshold', value: '10', category: 'inventory', description: 'Default low stock threshold' },
      { key: 'auto_reorder_enabled', value: 'true', category: 'inventory', description: 'Enable automatic reordering' },
      { key: 'tax_calculation_enabled', value: 'true', category: 'billing', description: 'Enable tax calculation' },
      { key: 'session_timeout', value: '3600', category: 'security', description: 'Session timeout in seconds' },
      { key: 'max_login_attempts', value: '5', category: 'security', description: 'Maximum login attempts before lockout' },
    ];

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: config,
      });
    }

    logger.info('System configuration seeded');

    logger.info('Basic database seeding completed successfully!');
    logger.info('Created:');
    logger.info(`- ${locations.length} locations`);
    logger.info(`- ${staffUsers.length + 1} users (including admin)`);
    logger.info('- 1 supplier');
    logger.info(`- ${products.length} products`);
    logger.info(`- ${products.length * locations.length} stock level records`);
    logger.info(`- ${sensors.length} IoT sensors`);
    logger.info(`- ${configs.length} system configuration entries`);

  } catch (error) {
    logger.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});