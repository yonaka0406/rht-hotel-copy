const axios = require('axios');

// Configuration
const PMS_API_URL = 'https://test.wehub.work/api/booking-engine';
const PMS_API_KEY = process.env.BOOKING_ENGINE_API_KEY || 'your_api_key_here';

// Test functions
async function testHotelCacheUpdate() {
  console.log('\n🧪 Testing Hotel Cache Update...');
  
  try {
    const response = await axios.post(`${PMS_API_URL}/cache/update-hotels`, {}, {
      headers: {
        'Authorization': `Bearer ${PMS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Hotel Cache Update Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (response.data.hotels && Array.isArray(response.data.hotels)) {
      console.log(`✅ Found ${response.data.hotels.length} hotels`);
      if (response.data.hotels.length > 0) {
        const firstHotel = response.data.hotels[0];
        console.log('✅ First hotel structure:', {
          hotel_id: firstHotel.hotel_id,
          name: firstHotel.name,
          has_formal_name: !!firstHotel.formal_name,
          has_facility_type: !!firstHotel.facility_type
        });
      }
    } else {
      console.log('❌ Invalid response structure - missing hotels array');
    }

  } catch (error) {
    console.error('❌ Hotel Cache Update Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testRoomTypeCacheUpdate() {
  console.log('\n🧪 Testing Room Type Cache Update...');
  
  try {
    const response = await axios.post(`${PMS_API_URL}/cache/update-room-types`, {}, {
      headers: {
        'Authorization': `Bearer ${PMS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Room Type Cache Update Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (response.data.room_types && Array.isArray(response.data.room_types)) {
      console.log(`✅ Found ${response.data.room_types.length} room types`);
      if (response.data.room_types.length > 0) {
        const firstRoomType = response.data.room_types[0];
        console.log('✅ First room type structure:', {
          id: firstRoomType.id,
          name: firstRoomType.name,
          hotel_id: firstRoomType.hotel_id,
          has_description: !!firstRoomType.description
        });
      }
    } else {
      console.log('❌ Invalid response structure - missing room_types array');
    }

  } catch (error) {
    console.error('❌ Room Type Cache Update Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testCacheStatus() {
  console.log('\n🧪 Testing Cache Status...');
  
  try {
    const response = await axios.get(`${PMS_API_URL}/cache/status`, {
      headers: {
        'Authorization': `Bearer ${PMS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Cache Status Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (response.data.hotels && response.data.room_types && response.data.availability) {
      console.log('✅ Cache status structure is valid');
      console.log('Hotels TTL:', response.data.hotels.cache_ttl_minutes, 'minutes');
      console.log('Room Types TTL:', response.data.room_types.cache_ttl_minutes, 'minutes');
      console.log('Availability TTL:', response.data.availability.cache_ttl_minutes, 'minutes');
    } else {
      console.log('❌ Invalid cache status structure');
    }

  } catch (error) {
    console.error('❌ Cache Status Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testIndividualHotelEndpoint() {
  console.log('\n🧪 Testing Individual Hotel Endpoint...');
  
  try {
    const response = await axios.get(`${PMS_API_URL}/hotels/1`, {
      headers: {
        'Authorization': `Bearer ${PMS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Individual Hotel Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (response.data.hotel_id && response.data.name) {
      console.log('✅ Individual hotel structure is valid');
      console.log('Hotel ID:', response.data.hotel_id);
      console.log('Hotel Name:', response.data.name);
    } else {
      console.log('❌ Invalid individual hotel structure');
    }

  } catch (error) {
    console.error('❌ Individual Hotel Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testIndividualRoomTypesEndpoint() {
  console.log('\n🧪 Testing Individual Room Types Endpoint...');
  
  try {
    const response = await axios.get(`${PMS_API_URL}/room-types/1`, {
      headers: {
        'Authorization': `Bearer ${PMS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Individual Room Types Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (response.data.hotel_id && response.data.room_types && Array.isArray(response.data.room_types)) {
      console.log('✅ Individual room types structure is valid');
      console.log('Hotel ID:', response.data.hotel_id);
      console.log('Room Types Count:', response.data.room_types.length);
    } else {
      console.log('❌ Invalid individual room types structure');
    }

  } catch (error) {
    console.error('❌ Individual Room Types Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testAuthentication() {
  console.log('\n🧪 Testing Authentication...');
  
  try {
    // Test without API key
    const response = await axios.post(`${PMS_API_URL}/cache/update-hotels`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ Should have failed without API key');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Authentication working correctly - 401 returned without API key');
    } else {
      console.log('❌ Unexpected authentication error:', error.message);
    }
  }
  
  try {
    // Test with invalid API key
    const response = await axios.post(`${PMS_API_URL}/cache/update-hotels`, {}, {
      headers: {
        'Authorization': 'Bearer invalid_key',
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ Should have failed with invalid API key');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Authentication working correctly - 401 returned with invalid API key');
    } else {
      console.log('❌ Unexpected authentication error:', error.message);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Booking Engine Cache API Tests');
  console.log('PMS API URL:', PMS_API_URL);
  console.log('API Key configured:', !!PMS_API_KEY);
  
  if (!PMS_API_KEY || PMS_API_KEY === 'your_api_key_here') {
    console.log('⚠️  Please set BOOKING_ENGINE_API_KEY environment variable');
    return;
  }

  await testAuthentication();
  await testHotelCacheUpdate();
  await testRoomTypeCacheUpdate();
  await testCacheStatus();
  await testIndividualHotelEndpoint();
  await testIndividualRoomTypesEndpoint();
  
  console.log('\n🎉 All tests completed!');
}

// Run tests
runTests().catch(console.error); 