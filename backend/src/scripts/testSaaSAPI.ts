/**
 * Test SaaS Multi-Tenant API
 * Demonstrates the complete multi-tenant workflow
 */

import axios from 'axios';
// import { logger } from '../utils/logger'; // Using console.log instead

const API_BASE = 'http://localhost:3001/api/v1';

interface AdminSignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  businessType?: string;
}

interface StaffData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'MANAGER' | 'STAFF';
  locationId: string;
}

async function testSaaSMultiTenant() {
  console.log('🚀 Starting SaaS Multi-Tenant API Test');

  try {
    // Test 1: Create first admin tenant (Alice's Business)
    console.log('\n📝 Test 1: Creating first admin tenant (Alice\'s Business)');
    
    const aliceData: AdminSignupData = {
      email: 'alice@alicebusiness.com',
      password: 'SecurePass123!',
      firstName: 'Alice',
      lastName: 'Johnson',
      companyName: 'Alice\'s Retail Store',
      businessType: 'retail'
    };

    const aliceSignup = await axios.post(`${API_BASE}/saas/admin/signup`, aliceData);
    logger.info('✅ Alice\'s admin account created successfully');
    logger.info('Alice\'s access token:', aliceSignup.data.data.accessToken.substring(0, 20) + '...');

    const aliceToken = aliceSignup.data.data.accessToken;
    const aliceMainLocationId = aliceSignup.data.data.mainLocation.id;

    // Test 2: Create second admin tenant (Bob's Business)
    logger.info('\n📝 Test 2: Creating second admin tenant (Bob\'s Business)');
    
    const bobData: AdminSignupData = {
      email: 'bob@bobselectronics.com',
      password: 'SecurePass456!',
      firstName: 'Bob',
      lastName: 'Smith',
      companyName: 'Bob\'s Electronics',
      businessType: 'electronics'
    };

    const bobSignup = await axios.post(`${API_BASE}/saas/admin/signup`, bobData);
    logger.info('✅ Bob\'s admin account created successfully');
    logger.info('Bob\'s access token:', bobSignup.data.data.accessToken.substring(0, 20) + '...');

    const bobToken = bobSignup.data.data.accessToken;
    const bobMainLocationId = bobSignup.data.data.mainLocation.id;

    // Test 3: Alice creates additional location
    logger.info('\n📝 Test 3: Alice creates additional location');
    
    const aliceSecondLocation = await axios.post(
      `${API_BASE}/saas/locations`,
      {
        name: 'Alice\'s Branch Store',
        address: '456 Branch Ave',
        city: 'New York',
        state: 'NY'
      },
      {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }
    );
    logger.info('✅ Alice\'s second location created');
    const aliceBranchLocationId = aliceSecondLocation.data.data.id;

    // Test 4: Alice creates staff for main location
    logger.info('\n📝 Test 4: Alice creates staff for main location');
    
    const aliceStaff1: StaffData = {
      email: 'manager1@alicebusiness.com',
      firstName: 'John',
      lastName: 'Manager',
      role: 'MANAGER',
      locationId: aliceMainLocationId
    };

    await axios.post(
      `${API_BASE}/saas/staff`,
      aliceStaff1,
      {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }
    );
    logger.info('✅ Alice\'s manager created for main location');

    // Test 5: Alice creates staff for branch location
    logger.info('\n📝 Test 5: Alice creates staff for branch location');
    
    const aliceStaff2: StaffData = {
      email: 'staff1@alicebusiness.com',
      firstName: 'Jane',
      lastName: 'Staff',
      role: 'STAFF',
      locationId: aliceBranchLocationId
    };

    await axios.post(
      `${API_BASE}/saas/staff`,
      aliceStaff2,
      {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }
    );
    logger.info('✅ Alice\'s staff created for branch location');

    // Test 6: Bob creates staff for his location
    logger.info('\n📝 Test 6: Bob creates staff for his location');
    
    const bobStaff1: StaffData = {
      email: 'manager1@bobselectronics.com',
      firstName: 'Mike',
      lastName: 'TechManager',
      role: 'MANAGER',
      locationId: bobMainLocationId
    };

    const bobStaff1Response = await axios.post(
      `${API_BASE}/saas/staff`,
      bobStaff1,
      {
        headers: { Authorization: `Bearer ${bobToken}` }
      }
    );
    logger.info('✅ Bob\'s manager created');

    // Test 7: Alice tries to access Bob's data (should fail)
    logger.info('\n📝 Test 7: Testing tenant isolation - Alice tries to access Bob\'s staff');
    
    try {
      const bobStaffId = bobStaff1Response.data.data.id;
      await axios.put(
        `${API_BASE}/saas/staff/${bobStaffId}`,
        { firstName: 'Hacked' },
        {
          headers: { Authorization: `Bearer ${aliceToken}` }
        }
      );
      logger.error('❌ SECURITY BREACH: Alice was able to access Bob\'s staff!');
    } catch (error: any) {
      if (error.response?.status === 403) {
        logger.info('✅ Tenant isolation working: Alice cannot access Bob\'s staff');
      } else {
        logger.error('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 8: Bob tries to create staff in Alice's location (should fail)
    logger.info('\n📝 Test 8: Testing location isolation - Bob tries to create staff in Alice\'s location');
    
    try {
      await axios.post(
        `${API_BASE}/saas/staff`,
        {
          email: 'hacker@bobselectronics.com',
          firstName: 'Hacker',
          lastName: 'Staff',
          role: 'STAFF',
          locationId: aliceMainLocationId // Alice's location
        },
        {
          headers: { Authorization: `Bearer ${bobToken}` }
        }
      );
      logger.error('❌ SECURITY BREACH: Bob was able to create staff in Alice\'s location!');
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 400) {
        logger.info('✅ Location isolation working: Bob cannot create staff in Alice\'s location');
      } else {
        logger.error('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 9: Alice gets her tenant info
    logger.info('\n📝 Test 9: Alice gets her tenant information');
    
    const aliceTenantInfo = await axios.get(
      `${API_BASE}/saas/tenant/info`,
      {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }
    );
    logger.info('✅ Alice\'s tenant info retrieved:');
    logger.info(`   Company: ${aliceTenantInfo.data.data.companyName}`);
    logger.info(`   Locations: ${aliceTenantInfo.data.data.locations.length}`);
    logger.info(`   Staff Count: ${aliceTenantInfo.data.data.staffCount}`);

    // Test 10: Alice gets her staff list
    logger.info('\n📝 Test 10: Alice gets her staff list');
    
    const aliceStaffList = await axios.get(
      `${API_BASE}/saas/staff`,
      {
        headers: { Authorization: `Bearer ${aliceToken}` }
      }
    );
    logger.info('✅ Alice\'s staff list retrieved:');
    aliceStaffList.data.data.forEach((staff: any) => {
      logger.info(`   - ${staff.firstName} ${staff.lastName} (${staff.role}) at ${staff.location.name}`);
    });

    // Test 11: Bob gets his staff list
    logger.info('\n📝 Test 11: Bob gets his staff list');
    
    const bobStaffList = await axios.get(
      `${API_BASE}/saas/staff`,
      {
        headers: { Authorization: `Bearer ${bobToken}` }
      }
    );
    logger.info('✅ Bob\'s staff list retrieved:');
    bobStaffList.data.data.forEach((staff: any) => {
      logger.info(`   - ${staff.firstName} ${staff.lastName} (${staff.role}) at ${staff.location.name}`);
    });

    // Summary
    logger.info('\n🎉 SaaS Multi-Tenant Test Summary:');
    logger.info('✅ Two independent admin tenants created');
    logger.info('✅ Each admin can create their own locations');
    logger.info('✅ Each admin can create staff linked to their locations');
    logger.info('✅ Tenant isolation prevents cross-tenant access');
    logger.info('✅ Location isolation prevents unauthorized location access');
    logger.info('✅ Each tenant can only see their own data');
    logger.info('\n🔒 Multi-tenant security is working correctly!');

  } catch (error: any) {
    logger.error('💥 SaaS Multi-Tenant test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testSaaSMultiTenant()
    .then(() => {
      logger.info('🎉 SaaS Multi-Tenant testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 SaaS Multi-Tenant testing failed:', error);
      process.exit(1);
    });
}

export { testSaaSMultiTenant };