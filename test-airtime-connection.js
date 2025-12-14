// test-airtime-connection.js
// Script per testare la connessione ad Airtime
// Esegui con: node test-airtime-connection.js

require('dotenv').config();
const axios = require('axios');

const AIRTIME_URL = process.env.AIRTIME_URL || 'http://localhost';
const AIRTIME_ADMIN_USER = process.env.AIRTIME_ADMIN_USER || 'admin';
const AIRTIME_ADMIN_PASS = process.env.AIRTIME_ADMIN_PASS || '';

console.log('🎵 Testing Airtime Connection...\n');
console.log('Configuration:');
console.log('- AIRTIME_URL:', AIRTIME_URL);
console.log('- AIRTIME_ADMIN_USER:', AIRTIME_ADMIN_USER);
console.log('- Password configured:', AIRTIME_ADMIN_PASS ? '✅ Yes' : '❌ No');
console.log('\n' + '='.repeat(50) + '\n');

async function testConnection() {
  const results = {
    publicAPI: false,
    adminAPI: false,
    details: {}
  };

  // Test 1: Public API - /api/live-info
  console.log('1️⃣  Testing Public API (no authentication)...');
  try {
    const response = await axios.get(`${AIRTIME_URL}/api/live-info`, {
      timeout: 10000
    });
    results.publicAPI = true;
    results.details.publicAPI = {
      status: 'success',
      data: response.data
    };
    console.log('   ✅ Public API working!');
    console.log('   Station:', response.data?.station?.name || 'N/A');
    console.log('   Current show:', response.data?.shows?.current?.name || 'No show scheduled');
  } catch (error) {
    console.log('   ❌ Public API failed:', error.message);
    results.details.publicAPI = {
      status: 'error',
      message: error.message
    };
  }
  console.log('');

  // Test 2: Public API v2 - /api/live-info/v2
  console.log('2️⃣  Testing Public API v2 (enhanced info)...');
  try {
    const response = await axios.get(`${AIRTIME_URL}/api/live-info/v2`, {
      timeout: 10000
    });
    console.log('   ✅ Public API v2 working!');
    console.log('   Scheduler time:', response.data?.station?.schedulerTime || 'N/A');
    console.log('   Listeners:', response.data?.station?.listener_count || 0);
  } catch (error) {
    console.log('   ❌ Public API v2 failed:', error.message);
  }
  console.log('');

  // Test 3: Week schedule
  console.log('3️⃣  Testing Week Schedule endpoint...');
  try {
    const response = await axios.get(`${AIRTIME_URL}/api/week-info`, {
      timeout: 10000
    });
    console.log('   ✅ Week schedule working!');
    if (Array.isArray(response.data)) {
      console.log('   Scheduled shows:', response.data.length);
    }
  } catch (error) {
    console.log('   ❌ Week schedule failed:', error.message);
  }
  console.log('');

  // Test 4: Admin API with authentication
  console.log('4️⃣  Testing Admin API (with authentication)...');
  if (!AIRTIME_ADMIN_PASS) {
    console.log('   ⚠️  Skipped - No admin password configured');
  } else {
    try {
      const response = await axios.get(`${AIRTIME_URL}/api/version`, {
        auth: {
          username: AIRTIME_ADMIN_USER,
          password: AIRTIME_ADMIN_PASS
        },
        timeout: 10000
      });
      results.adminAPI = true;
      results.details.adminAPI = {
        status: 'success',
        version: response.data
      };
      console.log('   ✅ Admin authentication successful!');
      console.log('   Airtime version:', response.data?.version || 'Unknown');
    } catch (error) {
      console.log('   ❌ Admin authentication failed:', error.message);
      if (error.response?.status === 401) {
        console.log('   💡 Check your AIRTIME_ADMIN_USER and AIRTIME_ADMIN_PASS in .env');
      }
      results.details.adminAPI = {
        status: 'error',
        message: error.message,
        statusCode: error.response?.status
      };
    }
  }
  console.log('');

  // Summary
  console.log('='.repeat(50));
  console.log('\n📊 SUMMARY\n');
  console.log('Public API:', results.publicAPI ? '✅ Working' : '❌ Failed');
  console.log('Admin API:', results.adminAPI ? '✅ Working' : (AIRTIME_ADMIN_PASS ? '❌ Failed' : '⚠️  Not configured'));
  console.log('');

  if (results.publicAPI && results.adminAPI) {
    console.log('🎉 All tests passed! Your Airtime integration is ready.');
  } else if (results.publicAPI && !results.adminAPI) {
    console.log('⚠️  Public API works but Admin authentication failed.');
    console.log('   You can read data but cannot upload/schedule.');
    console.log('   Check your admin credentials in .env file.');
  } else {
    console.log('❌ Connection failed. Check:');
    console.log('   1. Is Airtime running?');
    console.log('   2. Is AIRTIME_URL correct in .env?');
    console.log('   3. Is Airtime accessible from this server?');
    console.log('   4. Is Public API enabled in Airtime settings?');
  }
  console.log('\n' + '='.repeat(50) + '\n');

  return results;
}

// Run the test
testConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
