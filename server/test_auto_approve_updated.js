// Test script for updated auto-approve functionality
const mongoose = require('mongoose');
const Provider = require('./src/models/Provider');
const { updateAutoConfirmSetting } = require('./src/controllers/providerController');

// Mock request and response objects
const createMockReq = (body, userId) => ({
  body,
  user: { id: userId }
});

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  res.status.mockReturnThis();
  return res;
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resq-healthcare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test the updated auto-approve functionality
async function testUpdatedAutoApprove() {
  try {
    console.log('Testing updated auto-approve functionality...');
    
    // Create a test provider
    const provider = new Provider({
      user_id: 'test-user-123',
      provider_name: 'ABC Diagnostics',
      work_email: 'test@example.com',
      work_phone: '+1234567890',
      auto_confirm_appointments: true
    });
    
    await provider.save();
    console.log('Created test provider');
    
    // Test Case 1: Valid request with all required fields
    console.log('\\nTest Case 1: Valid request with all required fields');
    const req1 = createMockReq({
      user_id: 'test-user-123',
      provider_name: 'ABC Diagnostics',
      auto_confirm_appointments: false
    }, 'test-user-123');
    
    const res1 = createMockRes();
    
    await updateAutoConfirmSetting(req1, res1);
    
    console.log('Response status:', res1.status.mock.calls[0][0]);
    console.log('Response data:', res1.json.mock.calls[0][0]);
    
    if (res1.json.mock.calls[0][0].success && 
        res1.json.mock.calls[0][0].data.auto_confirm_appointments === false) {
      console.log('✅ TEST PASSED: Valid request processed correctly');
    } else {
      console.log('❌ TEST FAILED: Valid request not processed correctly');
    }
    
    // Test Case 2: Missing required fields
    console.log('\\nTest Case 2: Missing required fields');
    const req2 = createMockReq({
      auto_confirm_appointments: false
      // Missing user_id and provider_name
    }, 'test-user-123');
    
    const res2 = createMockRes();
    
    await updateAutoConfirmSetting(req2, res2);
    
    console.log('Response status:', res2.status.mock.calls[0][0]);
    console.log('Response data:', res2.json.mock.calls[0][0]);
    
    if (res2.status.mock.calls[0][0] === 400 && 
        res2.json.mock.calls[0][0].message.includes('required')) {
      console.log('✅ TEST PASSED: Missing fields correctly rejected');
    } else {
      console.log('❌ TEST FAILED: Missing fields not properly rejected');
    }
    
    // Test Case 3: Invalid auto_confirm_appointments value
    console.log('\\nTest Case 3: Invalid auto_confirm_appointments value');
    const req3 = createMockReq({
      user_id: 'test-user-123',
      provider_name: 'ABC Diagnostics',
      auto_confirm_appointments: 'invalid' // Should be boolean
    }, 'test-user-123');
    
    const res3 = createMockRes();
    
    await updateAutoConfirmSetting(req3, res3);
    
    console.log('Response status:', res3.status.mock.calls[0][0]);
    console.log('Response data:', res3.json.mock.calls[0][0]);
    
    if (res3.status.mock.calls[0][0] === 400 && 
        res3.json.mock.calls[0][0].message.includes('boolean')) {
      console.log('✅ TEST PASSED: Invalid boolean value correctly rejected');
    } else {
      console.log('❌ TEST FAILED: Invalid boolean value not properly rejected');
    }
    
    // Clean up test data
    await Provider.deleteOne({ user_id: 'test-user-123' });
    console.log('\\nCleaned up test data');
    
    console.log('\\n✅ All tests completed');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testUpdatedAutoApprove();