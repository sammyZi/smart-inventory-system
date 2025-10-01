import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { FirestoreService } from '../config/firestore';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting comprehensive database seeding...');

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
      },
      {
        id: 'branch-store',
        name: 'Branch Store',
        address: '789 Commerce Ave',
        city: 'Brooklyn',
        state: 'NY',
        zipCode: '11201',
        country: 'USA',
        adminId: adminUser.id,
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 0.08,
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
      {
        email: 'staff2@inventory.com',
        firstName: 'Bob',
        lastName: 'Worker',
        role: 'STAFF' as const,
        locationId: 'warehouse-1',
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
    const suppliers = [
      {
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
      {
        name: 'Office Essentials Ltd.',
        contactName: 'Mike Chen',
        email: 'sales@officeessentials.com',
        phone: '+1-555-0456',
        address: '200 Business Center',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        paymentTerms: 'Net 15',
      },
    ];

    const createdSuppliers = [];
    for (const supplierData of suppliers) {
      const supplier = await prisma.supplier.create({
        data: supplierData,
      });
      createdSuppliers.push(supplier);
    }

    logger.info('Suppliers created');

    // Create product categories and products
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
      {
        sku: 'DESK-001',
        name: 'Standing Desk',
        description: 'Adjustable height standing desk',
        category: 'Furniture',
        brand: 'OfficePro',
        price: 599.99,
        cost: 399.99,
        weight: 45.0,
        dimensions: { length: 150, width: 75, height: 120, unit: 'cm' },
        trackingCodes: { 
          barcode: '1234567890125',
          qr: 'QR-DESK-001'
        },
        specifications: {
          material: 'Bamboo top, Steel frame',
          height_range: '70-120cm',
          weight_capacity: '80kg'
        },
        images: ['desk-001-1.jpg', 'desk-001-2.jpg'],
      },
      {
        sku: 'CHAIR-001',
        name: 'Ergonomic Office Chair',
        description: 'Comfortable ergonomic chair with lumbar support',
        category: 'Furniture',
        brand: 'OfficePro',
        price: 399.99,
        cost: 249.99,
        weight: 25.0,
        dimensions: { length: 70, width: 70, height: 120, unit: 'cm' },
        trackingCodes: { 
          barcode: '1234567890126',
          qr: 'QR-CHAIR-001'
        },
        specifications: {
          material: 'Mesh back, Fabric seat',
          adjustable: 'Height, Armrests, Lumbar',
          weight_capacity: '120kg'
        },
        images: ['chair-001-1.jpg'],
      },
      {
        sku: 'PEN-001',
        name: 'Premium Ballpoint Pen Set',
        description: 'Set of 12 premium ballpoint pens',
        category: 'Office Supplies',
        brand: 'WriteWell',
        price: 24.99,
        cost: 12.99,
        weight: 0.2,
        dimensions: { length: 15, width: 1, height: 1, unit: 'cm' },
        trackingCodes: { 
          barcode: '1234567890127',
          qr: 'QR-PEN-001'
        },
        specifications: {
          ink_color: 'Blue',
          tip_size: '1.0mm',
          quantity: '12 pens'
        },
        images: ['pen-001-1.jpg'],
      },
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData,
      });
      createdProducts.push(product);
      
      // Sync to Firestore
      try {
        await FirestoreService.syncProduct(product);
      } catch (error) {
        logger.warn('Failed to sync product to Firestore:', error);
      }
    }

    logger.info('Products created and synced to Firestore');

    // Create stock levels for each product at each location
    const stockLevels = [];
    for (const product of createdProducts) {
      for (const location of locations) {
        const baseQuantity = Math.floor(Math.random() * 100) + 20; // 20-120 units
        const stockLevel = await prisma.stockLevel.create({
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
        stockLevels.push(stockLevel);
        
        // Sync to Firestore
        try {
          await FirestoreService.syncStockLevel(stockLevel);
        } catch (error) {
          logger.warn('Failed to sync stock level to Firestore:', error);
        }
      }
    }

    logger.info('Stock levels created and synced to Firestore');

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
      {
        deviceId: 'RFID-READER-001',
        locationId: 'main-store',
        sensorType: 'RFID_READER' as const,
        name: 'Main Store RFID Reader',
        description: 'RFID reader for product tracking',
        position: { x: 0, y: 0, z: 2, zone: 'Entrance' },
        configuration: { 
          frequency: '13.56MHz',
          read_range: '10cm',
          protocol: 'ISO14443A'
        },
        batteryLevel: 78.9,
        firmwareVersion: '1.5.2',
      },
    ];

    for (const sensorData of sensors) {
      await prisma.ioTSensor.create({
        data: sensorData,
      });
    }

    logger.info('IoT sensors created');

    // Create sample transactions
    const managerUser = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    });

    if (managerUser) {
      const sampleTransaction = await prisma.transaction.create({
        data: {
          transactionNo: 'TXN-001',
          locationId: 'main-store',
          staffId: managerUser.id,
          subtotal: 1349.98,
          taxAmount: 107.99,
          discountAmount: 0,
          totalAmount: 1457.97,
          paymentMethod: 'CREDIT_CARD',
          paymentStatus: 'COMPLETED',
          status: 'COMPLETED',
          completedAt: new Date(),
          items: {
            create: [
              {
                productId: createdProducts[0].id, // Laptop
                productName: createdProducts[0].name,
                productSku: createdProducts[0].sku,
                quantity: 1,
                unitPrice: 1299.99,
                totalPrice: 1299.99,
                taxAmount: 103.99,
              },
              {
                productId: createdProducts[1].id, // Mouse
                productName: createdProducts[1].name,
                productSku: createdProducts[1].sku,
                quantity: 1,
                unitPrice: 49.99,
                totalPrice: 49.99,
                taxAmount: 4.00,
              },
            ],
          },
        },
      });

      logger.info('Sample transaction created');

      // Update stock levels after transaction
      for (const item of [
        { productId: createdProducts[0].id, quantity: 1 },
        { productId: createdProducts[1].id, quantity: 1 }
      ]) {
        const stockLevel = await prisma.stockLevel.findFirst({
          where: {
            productId: item.productId,
            locationId: 'main-store'
          }
        });

        if (stockLevel) {
          const updatedStockLevel = await prisma.stockLevel.update({
            where: { id: stockLevel.id },
            data: {
              quantity: stockLevel.quantity - item.quantity,
            },
          });

          // Create stock movement record
          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              locationId: 'main-store',
              movementType: 'SALE',
              quantity: -item.quantity,
              previousQty: stockLevel.quantity,
              newQty: stockLevel.quantity - item.quantity,
              reference: sampleTransaction.id,
              reason: 'Sale transaction',
              performedBy: managerUser.id,
            },
          });

          // Sync updated stock level to Firestore
          try {
            await FirestoreService.syncStockLevel(updatedStockLevel);
          } catch (error) {
            logger.warn('Failed to sync updated stock level to Firestore:', error);
          }
        }
      }
    }

    // Create system configuration
    const configs = [
      { key: 'app_name', value: 'Smart Inventory System', category: 'general', description: 'Application name' },
      { key: 'default_currency', value: 'USD', category: 'general', description: 'Default currency for pricing' },
      { key: 'low_stock_threshold', value: '10', category: 'inventory', description: 'Default low stock threshold' },
      { key: 'auto_reorder_enabled', value: 'true', category: 'inventory', description: 'Enable automatic reordering' },
      { key: 'tax_calculation_enabled', value: 'true', category: 'billing', description: 'Enable tax calculation' },
      { key: 'receipt_template', value: 'default', category: 'billing', description: 'Receipt template to use' },
      { key: 'backup_frequency', value: 'daily', category: 'system', description: 'Database backup frequency' },
      { key: 'session_timeout', value: '3600', category: 'security', description: 'Session timeout in seconds' },
      { key: 'max_login_attempts', value: '5', category: 'security', description: 'Maximum login attempts before lockout' },
      { key: 'ai_forecasting_enabled', value: 'true', category: 'ai', description: 'Enable AI demand forecasting' },
      { key: 'blockchain_enabled', value: 'false', category: 'blockchain', description: 'Enable blockchain tracking' },
      { key: 'iot_enabled', value: 'true', category: 'iot', description: 'Enable IoT sensor integration' },
    ];

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: config,
      });
    }

    logger.info('System configuration seeded');

    // Create sample daily sales records
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.dailySales.create({
      data: {
        locationId: 'main-store',
        date: yesterday,
        totalTransactions: 5,
        totalRevenue: 2500.00,
        totalTax: 200.00,
        totalDiscount: 50.00,
        averageOrderValue: 500.00,
      },
    });

    logger.info('Sample analytics data created');

    // Initialize Firestore sync status for all locations
    for (const location of locations) {
      try {
        await FirestoreService.updateSyncStatus(location.id, 'synced');
      } catch (error) {
        logger.warn(`Failed to update sync status for location ${location.id}:`, error);
      }
    }

    logger.info('Firestore sync status initialized');

    logger.info('Comprehensive database seeding completed successfully!');
    logger.info('Created:');
    logger.info(`- ${locations.length} locations`);
    logger.info(`- ${staffUsers.length + 1} users (including admin)`);
    logger.info(`- ${createdSuppliers.length} suppliers`);
    logger.info(`- ${products.length} products`);
    logger.info(`- ${stockLevels.length} stock level records`);
    logger.info(`- ${sensors.length} IoT sensors`);
    logger.info('- 1 sample transaction with items');
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