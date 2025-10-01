/**
 * Database Migration Script
 * Handles database schema migrations and data transformations
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { FirestoreService } from '../config/firestore';

const prisma = new PrismaClient();

interface MigrationStep {
  version: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

/**
 * Migration steps in chronological order
 */
const migrations: MigrationStep[] = [
  {
    version: '001',
    description: 'Initialize core tables and indexes',
    up: async () => {
      logger.info('Creating database indexes for performance optimization...');
      
      // Create indexes for frequently queried fields
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location_id ON users(location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku ON products(sku);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category ON products(category);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_levels_product_location ON stock_levels(product_id, location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_levels_location ON stock_levels(location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_location ON stock_movements(location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_timestamp ON stock_movements(timestamp);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_location ON transactions(location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_staff ON transactions(staff_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_iot_sensors_location ON iot_sensors(location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_iot_sensors_device_id ON iot_sensors(device_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sensor_readings_sensor ON sensor_readings(sensor_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_location ON audit_logs(location_id);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      `;
      
      logger.info('Database indexes created successfully');
    },
    down: async () => {
      logger.info('Dropping database indexes...');
      
      const indexes = [
        'idx_users_email',
        'idx_users_firebase_uid',
        'idx_users_location_id',
        'idx_products_sku',
        'idx_products_category',
        'idx_stock_levels_product_location',
        'idx_stock_levels_location',
        'idx_stock_movements_product',
        'idx_stock_movements_location',
        'idx_stock_movements_timestamp',
        'idx_transactions_location',
        'idx_transactions_staff',
        'idx_transactions_created_at',
        'idx_iot_sensors_location',
        'idx_iot_sensors_device_id',
        'idx_sensor_readings_sensor',
        'idx_sensor_readings_timestamp',
        'idx_audit_logs_user',
        'idx_audit_logs_location',
        'idx_audit_logs_timestamp',
      ];
      
      for (const index of indexes) {
        await prisma.$executeRaw`DROP INDEX IF EXISTS ${index};`;
      }
      
      logger.info('Database indexes dropped successfully');
    }
  },
  
  {
    version: '002',
    description: 'Add full-text search capabilities',
    up: async () => {
      logger.info('Adding full-text search capabilities...');
      
      // Add GIN indexes for full-text search on products
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search 
        ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || category));
      `;
      
      // Add search function for products
      await prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION search_products(search_query text)
        RETURNS TABLE(
          id text,
          sku text,
          name text,
          description text,
          category text,
          price numeric,
          rank real
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            p.id,
            p.sku,
            p.name,
            p.description,
            p.category,
            p.price,
            ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || p.category), plainto_tsquery('english', search_query)) as rank
          FROM products p
          WHERE to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || p.category) @@ plainto_tsquery('english', search_query)
          AND p.is_active = true
          ORDER BY rank DESC;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      logger.info('Full-text search capabilities added successfully');
    },
    down: async () => {
      logger.info('Removing full-text search capabilities...');
      
      await prisma.$executeRaw`DROP FUNCTION IF EXISTS search_products(text);`;
      await prisma.$executeRaw`DROP INDEX IF EXISTS idx_products_search;`;
      
      logger.info('Full-text search capabilities removed successfully');
    }
  },
  
  {
    version: '003',
    description: 'Add database triggers for audit logging',
    up: async () => {
      logger.info('Adding database triggers for audit logging...');
      
      // Create audit trigger function
      await prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION audit_trigger_function()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (action, resource, resource_id, new_values, timestamp)
            VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), NOW());
            RETURN NEW;
          ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_logs (action, resource, resource_id, old_values, new_values, timestamp)
            VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), NOW());
            RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO audit_logs (action, resource, resource_id, old_values, timestamp)
            VALUES (TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD), NOW());
            RETURN OLD;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Add triggers to important tables
      const auditTables = [
        'products',
        'stock_levels',
        'transactions',
        'stock_transfers',
        'purchase_orders'
      ];
      
      for (const table of auditTables) {
        await prisma.$executeRaw`
          DROP TRIGGER IF EXISTS audit_trigger_${table} ON ${table};
        `;
        
        await prisma.$executeRaw`
          CREATE TRIGGER audit_trigger_${table}
          AFTER INSERT OR UPDATE OR DELETE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
        `;
      }
      
      logger.info('Database audit triggers added successfully');
    },
    down: async () => {
      logger.info('Removing database audit triggers...');
      
      const auditTables = [
        'products',
        'stock_levels',
        'transactions',
        'stock_transfers',
        'purchase_orders'
      ];
      
      for (const table of auditTables) {
        await prisma.$executeRaw`DROP TRIGGER IF EXISTS audit_trigger_${table} ON ${table};`;
      }
      
      await prisma.$executeRaw`DROP FUNCTION IF EXISTS audit_trigger_function();`;
      
      logger.info('Database audit triggers removed successfully');
    }
  },
  
  {
    version: '004',
    description: 'Initialize Firestore collections and sync',
    up: async () => {
      logger.info('Initializing Firestore collections...');
      
      await FirestoreService.initializeCollections();
      
      // Sync existing data to Firestore
      logger.info('Syncing existing data to Firestore...');
      
      // Sync locations
      const locations = await prisma.location.findMany({
        where: { isActive: true }
      });
      
      for (const location of locations) {
        await FirestoreService.updateSyncStatus(location.id, 'syncing');
      }
      
      // Sync products
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 100 // Limit initial sync
      });
      
      for (const product of products) {
        await FirestoreService.syncProduct(product);
      }
      
      // Sync stock levels
      const stockLevels = await prisma.stockLevel.findMany({
        take: 100 // Limit initial sync
      });
      
      for (const stockLevel of stockLevels) {
        await FirestoreService.syncStockLevel(stockLevel);
      }
      
      // Update sync status
      for (const location of locations) {
        await FirestoreService.updateSyncStatus(location.id, 'synced');
      }
      
      logger.info('Firestore initialization and sync completed successfully');
    },
    down: async () => {
      logger.info('Firestore rollback not implemented - manual cleanup required');
    }
  }
];

/**
 * Migration tracking table
 */
async function createMigrationTable(): Promise<void> {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS _migrations (
      version VARCHAR(10) PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

/**
 * Get applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const result = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version FROM _migrations ORDER BY version;
    `;
    return result.map(row => row.version);
  } catch (error) {
    // Table doesn't exist yet
    return [];
  }
}

/**
 * Mark migration as applied
 */
async function markMigrationApplied(version: string, description: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO _migrations (version, description) VALUES (${version}, ${description});
  `;
}

/**
 * Mark migration as reverted
 */
async function markMigrationReverted(version: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM _migrations WHERE version = ${version};
  `;
}

/**
 * Run pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');
    
    await createMigrationTable();
    const appliedMigrations = await getAppliedMigrations();
    
    const pendingMigrations = migrations.filter(
      migration => !appliedMigrations.includes(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations found');
      return;
    }
    
    logger.info(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      logger.info(`Running migration ${migration.version}: ${migration.description}`);
      
      try {
        await migration.up();
        await markMigrationApplied(migration.version, migration.description);
        logger.info(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        logger.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration process failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Rollback last migration
 */
export async function rollbackMigration(): Promise<void> {
  try {
    logger.info('Starting migration rollback...');
    
    await createMigrationTable();
    const appliedMigrations = await getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }
    
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const migration = migrations.find(m => m.version === lastMigration);
    
    if (!migration) {
      throw new Error(`Migration ${lastMigration} not found in migration list`);
    }
    
    if (!migration.down) {
      throw new Error(`Migration ${lastMigration} does not support rollback`);
    }
    
    logger.info(`Rolling back migration ${migration.version}: ${migration.description}`);
    
    try {
      await migration.down();
      await markMigrationReverted(migration.version);
      logger.info(`Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      logger.error(`Migration rollback ${migration.version} failed:`, error);
      throw error;
    }
    
    logger.info('Migration rollback completed successfully');
  } catch (error) {
    logger.error('Migration rollback process failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  applied: Array<{ version: string; description: string; appliedAt: Date }>;
  pending: Array<{ version: string; description: string }>;
}> {
  try {
    await createMigrationTable();
    
    const appliedResult = await prisma.$queryRaw<Array<{
      version: string;
      description: string;
      applied_at: Date;
    }>>`
      SELECT version, description, applied_at FROM _migrations ORDER BY version;
    `;
    
    const appliedVersions = appliedResult.map(row => row.version);
    const pendingMigrations = migrations.filter(
      migration => !appliedVersions.includes(migration.version)
    );
    
    return {
      applied: appliedResult.map(row => ({
        version: row.version,
        description: row.description,
        appliedAt: row.applied_at,
      })),
      pending: pendingMigrations.map(migration => ({
        version: migration.version,
        description: migration.description,
      })),
    };
  } catch (error) {
    logger.error('Failed to get migration status:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      runMigrations().catch(process.exit);
      break;
    case 'down':
      rollbackMigration().catch(process.exit);
      break;
    case 'status':
      getMigrationStatus()
        .then(status => {
          console.log('Applied migrations:');
          status.applied.forEach(m => console.log(`  ✓ ${m.version}: ${m.description}`));
          console.log('\nPending migrations:');
          status.pending.forEach(m => console.log(`  - ${m.version}: ${m.description}`));
        })
        .catch(process.exit);
      break;
    default:
      console.log('Usage: npm run migrate [up|down|status]');
      process.exit(1);
  }
}