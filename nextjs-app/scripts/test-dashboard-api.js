// Test script for dashboard-stats API
const axios = require('axios');

async function testDashboardAPI() {
  try {
    // Step 1: Login to get authentication token
    console.log('Attempting to log in...');
    
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.token) {
      throw new Error('Login failed - no token returned');
    }
    
    console.log('Login successful, token received');
    const token = loginResponse.data.token;
    
    // Step 2: Call the dashboard-stats API with the token
    console.log('Calling dashboard-stats API...');
    
    const dashboardResponse = await axios.get('http://localhost:3001/api/admin/dashboard-stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Step 3: Output the results
    console.log('Dashboard API call successful!');
    console.log('Results:');
    console.log('- Questionnaire Stats:', dashboardResponse.data.questionnaireStats.length, 'items');
    console.log('- Time Series Data:', dashboardResponse.data.timeSeriesData.length, 'days');
    console.log('- User Engagement:', dashboardResponse.data.userEngagement);
    
    // Output first questionnaire stat as example
    if (dashboardResponse.data.questionnaireStats.length > 0) {
      console.log('\nSample questionnaire stat:');
      console.log(dashboardResponse.data.questionnaireStats[0]);
    }
    
    // Output first time series data point as example
    if (dashboardResponse.data.timeSeriesData.length > 0) {
      console.log('\nSample time series data:');
      console.log(dashboardResponse.data.timeSeriesData[0]);
    }
    
  } catch (error) {
    console.error('Error testing dashboard API:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testDashboardAPI(); 