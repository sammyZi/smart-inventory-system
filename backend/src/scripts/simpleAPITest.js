/**
 * Simple API Test - Direct HTTP requests
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testAPI() {
  console.log('🔍 Testing API endpoints...\n');

  try {
    // Test 1: Admin Registration
    console.log('1. Testing Admin Registration...');
    const adminData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Admin',
      companyName: 'Test Company'
    };

    console.log('   Sending request to:', `${API_BASE}/saas/admin/signup`);
    console.log('   Data:', JSON.stringify(adminData, null, 2));

    const adminResponse = await axios.post(`${API_BASE}/saas/admin/signup`, adminData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Admin registration successful!');
    console.log('   Response status:', adminResponse.status);
    console.log('   Token received:', adminResponse.data.data.token ? 'Yes' : 'No');
    
    const token = adminResponse.data.data.token;
    
    // Test 2: Get Tenant Info
    console.log('\n2. Testing Tenant Info...');
    const tenantResponse = await axios.get(`${API_BASE}/saas/tenant/info`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Tenant info retrieved successfully!');
    console.log('   Company:', tenantResponse.data.data.companyName);

    // Test 3: Create Location
    console.log('\n3. Testing Location Creation...');
    const locationData = {
      name: 'Test Store',
      address: '123 Test Street',
      city: 'Test City'
    };

    const locationResponse = await axios.post(`${API_BASE}/saas/locations`, locationData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Location created successfully!');
    console.log('   Location ID:', locationResponse.data.data.id);

    const locationId = locationResponse.data.data.id;

    // Test 4: Create Product
    console.log('\n4. Testing Product Creation...');
    const productData = {
      sku: `TEST-${Date.now()}`,
      name: 'Test Product',
      category: 'Test',
      price: 29.99,
      cost: 15.00
    };

    const productResponse = await axios.post(`${API_BASE}/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Product created successfully!');
    console.log('   Product ID:', productResponse.data.data.id);

    const productId = productResponse.data.data.id;

    // Test 5: Update Inventory
    console.log('\n5. Testing Inventory Update...');
    const inventoryData = {
      productId: productId,
      locationId: locationId,
      quantity: 100,
      reason: 'Initial stock'
    };

    await axios.put(`${API_BASE}/inventory/stock/update`, inventoryData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Inventory updated successfully!');

    // Test 6: Quick Sale
    console.log('\n6. Testing Quick Sale...');
    const saleData = {
      locationId: locationId,
      items: [{
        productId: productId,
        quantity: 1,
        unitPrice: 29.99
      }],
      paymentMethod: 'CASH'
    };

    const saleResponse = await axios.post(`${API_BASE}/billing/quick-sale`, saleData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Quick sale completed successfully!');
    console.log('   Transaction:', saleResponse.data.data.transaction.transactionNo);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED! APIs ARE WORKING!');
    console.log('='.repeat(60));
    console.log('\n📱 Your friend can use these APIs:');
    console.log('   ✅ Admin Registration: POST /saas/admin/signup');
    console.log('   ✅ Location Management: POST /saas/locations');
    console.log('   ✅ Product Management: POST /products');
    console.log('   ✅ Inventory Tracking: PUT /inventory/stock/update');
    console.log('   ✅ Point of Sale: POST /billing/quick-sale');
    console.log('\n🔑 Authentication: Use JWT token in Authorization header');
    console.log('📖 Full documentation: API_ENDPOINTS_FOR_APP.md');

  } catch (error) {
    console.log('\n❌ Test failed!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on port 3001');
      console.log('   Run: npm start or npm run dev');
    }
  }
}

testAPI();