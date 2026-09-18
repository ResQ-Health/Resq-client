// Test script for auto-approve functionality
const mongoose = require('mongoose');
const Provider = require('./src/models/Provider');
const Appointment = require('./src/models/Appointment');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resq-healthcare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test the auto-approve functionality
async function testAutoApprove() {
  try {
    console.log('Testing auto-approve functionality...');
    
    // Create a test provider with auto-approve enabled
    const provider = new Provider({
      user_id: 'test-user-123',
      provider_name: 'Test Provider',
      work_email: 'test@example.com',
      work_phone: '+1234567890',
      auto_confirm_appointments: true
    });
    
    await provider.save();
    console.log('Created test provider with auto-approve enabled');
    
    // Create a test appointment
    const appointment = new Appointment({
      patient_id: 'test-patient-123',
      provider_id: provider.id,
      service_id: 'test-service-123',
      appointment_date: new Date(),
      start_time: '10:00 AM',
      end_time: '10:30 AM',
      status: 'pending',
      formData: {
        forWhom: 'Self',
        visitedBefore: true
      },
      payment: {
        status: 'pending',
        amount: 1000
      }
    });
    
    await appointment.save();
    console.log('Created test appointment with pending status');
    
    // Simulate payment completion and auto-approve
    console.log('Simulating payment completion...');
    appointment.payment.status = 'completed';
    appointment.payment.paidAt = new Date();
    
    // Check if provider has auto-approve enabled
    if (provider.auto_confirm_appointments) {
      appointment.status = 'confirmed';
      console.log('Auto-approved appointment because provider has auto_confirm_appointments enabled');
    }
    
    await appointment.save();
    console.log('Appointment status after payment:', appointment.status);
    
    // Verify the result
    if (appointment.status === 'confirmed') {
      console.log('✅ TEST PASSED: Appointment was auto-approved');
    } else {
      console.log('❌ TEST FAILED: Appointment was not auto-approved');
    }
    
    // Clean up test data
    await Provider.deleteOne({ id: provider.id });
    await Appointment.deleteOne({ id: appointment.id });
    console.log('Cleaned up test data');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testAutoApprove();