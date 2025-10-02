/**
 * Simple SaaS Multi-Tenant API Test
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

async function testSaaSSimple() {
  console.log('🚀 Starting Simple SaaS Multi-Tenant API Test\n');

  try {
    // Test 1: Create admin tenant
    console.log('📝 Test 1: Creating admin tenant');
    
    const adminData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Admin',
      companyName: 'Test Company',
      businessType: 'retail'
    };

    const response = await axios.post(`${API_BASE}/saas/admin/signup`, adminData);
    console.log('✅ Admin tenant created successfully');
    console.log('Response:', {
      success: response.data.success,
      adminId: response.data.data.admin.id,
      companyName: adminData.companyName
    });

    const token = response.data.data.accessToken;
    const locationId = response.data.data.mainLocation.id;

    // Test 2: Create staff
    console.log('\n📝 Test 2: Creating staff user');
    
    const staffData = {
      email: 'staff@example.com',
      firstName: 'Test',
      lastName: 'Staff',
      role: 'STAFF',
      locationId: locationId
    };

    const staffResponse = await axios.post(
      `${API_BASE}/saas/staff`,
      staffData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Staff user created successfully');
    console.log('Staff:', {
      id: staffResponse.data.data.id,
      email: staffResponse.data.data.email,
      role: staffResponse.data.data.role
    });

    // Test 3: Get tenant info
    console.log('\n📝 Test 3: Getting tenant information');
    
    const tenantInfo = await axios.get(
      `${API_BASE}/saas/tenant/info`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Tenant info retrieved successfully');
    console.log('Tenant:', {
      companyName: tenantInfo.data.data.companyName,
      locations: tenantInfo.data.data.locations.length,
      staffCount: tenantInfo.data.data.staffCount
    });

    console.log('\n🎉 All tests passed! SaaS Multi-Tenant system is working correctly.');

  } catch (error: any) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

// Run test
if (require.main === module) {
  testSaaSSimple()
    .then(() => {
      console.log('\n✅ SaaS testing completed successfully');
      process.exit(0);
    })
    .catch(() => {
      console.error('\n💥 SaaS testing failed');
      process.exit(1);
    });
}

export { testSaaSSimple };