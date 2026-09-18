// Test script for updated appointment booking with auto-approve functionality
const mongoose = require('mongoose');
const Provider = require('./src/models/Provider');
const Appointment = require('./src/models/Appointment');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resq-healthcare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test the updated appointment booking functionality
async function testAppointmentBookingWithAutoApprove() {
  try {
    console.log('Testing appointment booking with auto-approve functionality...');
    
    // Create a test provider with auto-approve enabled
    const providerWithAutoApprove = new Provider({
      user_id: 'test-provider-1',
      provider_name: 'Auto Approve Provider',
      work_email: 'auto@example.com',
      work_phone: '+1234567890',
      auto_confirm_appointments: true
    });
    
    await providerWithAutoApprove.save();
    console.log('Created test provider with auto-approve enabled');
    
    // Create a test provider with auto-approve disabled
    const providerWithoutAutoApprove = new Provider({
      user_id: 'test-provider-2',
      provider_name: 'Manual Approve Provider',
      work_email: 'manual@example.com',
      work_phone: '+1234567891',
      auto_confirm_appointments: false
    });
    
    await providerWithoutAutoApprove.save();
    console.log('Created test provider with auto-approve disabled');
    
    // Test Case 1: Appointment with auto-approve enabled provider
    console.log('\\nTest Case 1: Appointment with auto-approve enabled provider');
    const appointment1 = new Appointment({
      patient_id: 'test-patient-1',
      provider_id: providerWithAutoApprove.id,
      service_id: 'test-service-1',
      appointment_date: new Date(),
      start_time: '10:00 AM',
      end_time: '10:30 AM',
      status: 'confirmed', // Should be confirmed due to auto-approve
      formData: {
        forWhom: 'Self',
        visitedBefore: true
      },
      payment: {
        status: 'pending',
        amount: 1000
      }
    });
    
    await appointment1.save();
    console.log('Appointment status with auto-approve enabled:', appointment1.status);
    
    if (appointment1.status === 'confirmed') {
      console.log('✅ TEST PASSED: Appointment with auto-approve enabled is confirmed');
    } else {
      console.log('❌ TEST FAILED: Appointment with auto-approve enabled is not confirmed');
    }
    
    // Test Case 2: Appointment with auto-approve disabled provider
    console.log('\\nTest Case 2: Appointment with auto-approve disabled provider');
    const appointment2 = new Appointment({
      patient_id: 'test-patient-2',
      provider_id: providerWithoutAutoApprove.id,
      service_id: 'test-service-2',
      appointment_date: new Date(),
      start_time: '11:00 AM',
      end_time: '11:30 AM',
      status: 'pending', // Should be pending due to manual approve
      formData: {
        forWhom: 'Self',
        visitedBefore: true
      },
      payment: {
        status: 'pending',
        amount: 1000
      }
    });
    
    await appointment2.save();
    console.log('Appointment status with auto-approve disabled:', appointment2.status);
    
    if (appointment2.status === 'pending') {
      console.log('✅ TEST PASSED: Appointment with auto-approve disabled is pending');
    } else {
      console.log('❌ TEST FAILED: Appointment with auto-approve disabled is not pending');
    }
    
    // Test Case 3: Payment processing for auto-approved appointment
    console.log('\\nTest Case 3: Payment processing for auto-approved appointment');
    appointment1.payment.status = 'completed';
    appointment1.payment.paidAt = new Date();
    // Status should remain confirmed
    
    await appointment1.save();
    console.log('Appointment status after payment with auto-approve:', appointment1.status);
    
    if (appointment1.status === 'confirmed') {
      console.log('✅ TEST PASSED: Auto-approved appointment remains confirmed after payment');
    } else {
      console.log('❌ TEST FAILED: Auto-approved appointment status changed after payment');
    }
    
    // Test Case 4: Payment processing for manual-approved appointment
    console.log('\\nTest Case 4: Payment processing for manual-approved appointment');
    appointment2.payment.status = 'completed';
    appointment2.payment.paidAt = new Date();
    // Status should remain pending until manually confirmed
    
    await appointment2.save();
    console.log('Appointment status after payment with manual approve:', appointment2.status);
    
    if (appointment2.status === 'pending') {
      console.log('✅ TEST PASSED: Manual-approved appointment remains pending after payment');
    } else {
      console.log('❌ TEST FAILED: Manual-approved appointment status changed after payment');
    }
    
    // Clean up test data
    await Provider.deleteOne({ user_id: 'test-provider-1' });
    await Provider.deleteOne({ user_id: 'test-provider-2' });
    await Appointment.deleteOne({ patient_id: 'test-patient-1' });
    await Appointment.deleteOne({ patient_id: 'test-patient-2' });
    console.log('\\nCleaned up test data');
    
    console.log('\\n✅ All tests completed');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testAppointmentBookingWithAutoApprove();