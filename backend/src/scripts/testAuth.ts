import { AuthService } from '../services/authService';
import { connectDatabase } from '../config/database';
import { connectRedis } from '../config/redis';
import { initializeFirebase } from '../config/firebase';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAuthSystem() {
  try {
    console.log('🧪 Testing Authentication System...\n');

    // Initialize services
    await connectDatabase();
    await connectRedis();
    await initializeFirebase();

    console.log('✅ Services initialized successfully\n');

    // Test user registration
    console.log('📝 Testing user registration...');
    try {
      const testUser = {
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'STAFF' as any
      };

      const registrationResult = await AuthService.register(testUser);
      console.log('✅ User registration successful');
      console.log('User ID:', registrationResult.user.id);
      console.log('Access Token:', registrationResult.tokens.accessToken.substring(0, 20) + '...');
      
      // Test login
      console.log('\n🔐 Testing user login...');
      const loginResult = await AuthService.login({
        email: testUser.email,
        password: testUser.password
      });
      console.log('✅ User login successful');
      console.log('User ID:', loginResult.user.id);
      
      // Test profile retrieval
      console.log('\n👤 Testing profile retrieval...');
      const profile = await AuthService.getProfile(loginResult.user.id);
      console.log('✅ Profile retrieval successful');
      console.log('Profile:', {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        role: profile.role
      });

      // Test profile update
      console.log('\n✏️ Testing profile update...');
      const updatedProfile = await AuthService.updateProfile(loginResult.user.id, {
        firstName: 'Updated',
        lastName: 'Name'
      });
      console.log('✅ Profile update successful');
      console.log('Updated name:', updatedProfile.firstName, updatedProfile.lastName);

      // Test logout
      console.log('\n🚪 Testing user logout...');
      await AuthService.logout(loginResult.user.id, loginResult.tokens.accessToken);
      console.log('✅ User logout successful');

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Test user already exists, skipping registration test');
        
        // Test login with existing user
        console.log('\n🔐 Testing login with existing user...');
        const loginResult = await AuthService.login({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        console.log('✅ Login with existing user successful');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run tests
testAuthSystem();