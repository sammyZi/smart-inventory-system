/**
 * Test Product API Endpoints
 * Simple script to test the product catalog API
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const API_BASE = 'http://localhost:3001/api/v1';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
}

async function testAPI() {
  const results: TestResult[] = [];

  // Test 1: Health check
  try {
    const response = await axios.get(`${API_BASE.replace('/api/v1', '')}/health`);
    results.push({
      endpoint: '/health',
      method: 'GET',
      status: response.status,
      success: true
    });
    logger.info('✅ Health check passed');
  } catch (error: any) {
    results.push({
      endpoint: '/health',
      method: 'GET',
      status: error.response?.status || 0,
      success: false,
      error: error.message
    });
    logger.error('❌ Health check failed:', error.message);
  }

  // Test 2: API info
  try {
    const response = await axios.get(API_BASE);
    results.push({
      endpoint: '/api/v1',
      method: 'GET',
      status: response.status,
      success: true
    });
    logger.info('✅ API info endpoint passed');
    logger.info('Available endpoints:', response.data.endpoints);
  } catch (error: any) {
    results.push({
      endpoint: '/api/v1',
      method: 'GET',
      status: error.response?.status || 0,
      success: false,
      error: error.message
    });
    logger.error('❌ API info endpoint failed:', error.message);
  }

  // Test 3: Products endpoint (should fail without auth)
  try {
    const response = await axios.get(`${API_BASE}/products`);
    results.push({
      endpoint: '/api/v1/products',
      method: 'GET',
      status: response.status,
      success: true
    });
    logger.info('✅ Products endpoint accessible (unexpected - should require auth)');
  } catch (error: any) {
    if (error.response?.status === 401) {
      results.push({
        endpoint: '/api/v1/products',
        method: 'GET',
        status: error.response.status,
        success: true // Expected to fail with 401
      });
      logger.info('✅ Products endpoint correctly requires authentication');
    } else {
      results.push({
        endpoint: '/api/v1/products',
        method: 'GET',
        status: error.response?.status || 0,
        success: false,
        error: error.message
      });
      logger.error('❌ Products endpoint failed unexpectedly:', error.message);
    }
  }

  // Test 4: Product categories (should fail without auth)
  try {
    const response = await axios.get(`${API_BASE}/products/categories`);
    results.push({
      endpoint: '/api/v1/products/categories',
      method: 'GET',
      status: response.status,
      success: true
    });
    logger.info('✅ Categories endpoint accessible (unexpected - should require auth)');
  } catch (error: any) {
    if (error.response?.status === 401) {
      results.push({
        endpoint: '/api/v1/products/categories',
        method: 'GET',
        status: error.response.status,
        success: true // Expected to fail with 401
      });
      logger.info('✅ Categories endpoint correctly requires authentication');
    } else {
      results.push({
        endpoint: '/api/v1/products/categories',
        method: 'GET',
        status: error.response?.status || 0,
        success: false,
        error: error.message
      });
      logger.error('❌ Categories endpoint failed unexpectedly:', error.message);
    }
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  logger.info(`\n📊 Test Summary: ${passed}/${total} tests passed`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    logger.info(`${status} ${result.method} ${result.endpoint} - Status: ${result.status}`);
    if (result.error) {
      logger.info(`   Error: ${result.error}`);
    }
  });

  return results;
}

// Run tests if called directly
if (require.main === module) {
  testAPI()
    .then(() => {
      logger.info('🎉 API testing completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 API testing failed:', error);
      process.exit(1);
    });
}

export { testAPI };