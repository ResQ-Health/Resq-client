// One-time and recurring script to reconcile all referrals into appointments
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (_) {}
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
require('dotenv').config({ path: __dirname + '/../../.env' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: __dirname + '/../../../.env' });
}

async function runReconciliation() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  const Provider = mongoose.model('Provider', new mongoose.Schema({}, { strict: false }));
  const Appointment = require('../models/Appointment');
  const Referral = mongoose.model('Referral', new mongoose.Schema({}, { strict: false }));
  const User = require('../models/User');

  // 1. Ensure Billing Hospital has comprehensive working hours (Monday-Sunday 8:00 AM - 8:30 PM)
  const fullWorkingHours = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ].map(day => ({
    day,
    isAvailable: true,
    startTime: '8:00 AM',
    endTime: '8:30 PM',
  }));

  const updatedProvider = await Provider.findOneAndUpdate(
    { id: 'CWZDBt9Xmv' },
    { $set: { working_hours: fullWorkingHours } },
    { new: true }
  );
  if (updatedProvider) {
    console.log('✓ Updated Billing Hospital working hours to 8:00 AM - 8:30 PM (all 7 days).');
  }

  // 2. Fetch all referrals
  const referrals = await Referral.find({}).sort({ createdAt: -1 }).lean();
  console.log(`Found ${referrals.length} total referrals in database.`);

  let syncedCount = 0;
  let alreadySyncedCount = 0;

  for (const ref of referrals) {
    // Check if appointment exists
    const existing = await Appointment.findOne({
      $or: [
        { 'formData.referralId': ref.referralId },
        { 'formData.identificationNumber': ref.referralId },
        { id: ref.patientAppointmentId },
        { id: ref.clinicianAppointmentId },
      ].filter(Boolean),
      is_deleted: { $ne: true }
    });

    if (existing) {
      alreadySyncedCount++;
      // Make sure referral is marked Synced and has the ID
      if (!ref.patientAppointmentId || ref.patientSyncStatus !== 'Synced') {
        await Referral.updateOne(
          { _id: ref._id },
          {
            $set: {
              patientAppointmentId: existing.id,
              clinicianAppointmentId: existing.id,
              patientSyncStatus: 'Synced',
              clinicianSyncStatus: 'Synced',
              patientSyncError: '',
              clinicianSyncError: '',
            }
          }
        );
      }
      continue;
    }

    // Appointment is missing! Create it.
    const patientEmail = (ref.patientEmail || '').toLowerCase().trim();
    let patient = null;
    if (patientEmail) {
      patient = await User.findOne({ email: patientEmail });
    }
    if (!patient && ref.patientPhone) {
      patient = await User.findOne({ phone_number: ref.patientPhone.trim() });
    }

    let patientId;
    if (patient) {
      patientId = patient.id;
    } else {
      // Create guest patient user so patient can log in or reset password
      patientId = nanoid(10);
      patient = new User({
        id: patientId,
        full_name: ref.patientName || 'Patient',
        email: patientEmail || `guest-${nanoid(8)}@resq.com`,
        phone_number: ref.patientPhone || '',
        user_type: 'Patient',
        password: nanoid(12),
        email_verified: false,
        location_details: { address: ref.patientAddress || '' },
        personal_details: {
          gender: ref.patientGender || '',
          date_of_birth: ref.patientDob || '',
        },
      });
      await patient.save().catch(e => console.warn('Guest user save notice:', e.message));
    }

    const apptId = (ref.patientAppointmentId && ref.patientAppointmentId.trim()) || 
                   (ref.clinicianAppointmentId && ref.clinicianAppointmentId.trim()) || 
                   nanoid(10);
    const scanName = ref.serviceName || (ref.scanType ? `${ref.scanType}${ref.bodyPart ? ` (${ref.bodyPart})` : ''}` : 'Diagnostic Scan');
    const amount = Number(ref.facilityPrice || ref.price || ref.amount || 0);

    let apptDate = new Date();
    if (ref.slot?.date) {
      const parsed = new Date(ref.slot.date);
      if (!isNaN(parsed.getTime())) apptDate = parsed;
    }
    apptDate.setHours(0, 0, 0, 0);

    const startTime = ref.slot?.time || '10:00 AM';
    let endTime = '10:30 AM';
    try {
      const match = startTime.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10) + 30;
        const p = match[3] ? match[3].toUpperCase() : '';
        if (m >= 60) {
          m -= 60;
          h = (h + 1) % 24;
        }
        endTime = `${h}:${String(m).padStart(2, '0')} ${p}`.trim();
      }
    } catch (_) {}

    const isPaid = (ref.paymentStatus === 'Paid' || ref.status === 'Confirmed');
    const apptStatus = isPaid ? 'confirmed' : 'pending';

    await Appointment.create({
      id: apptId,
      patient_id: patientId,
      provider_id: ref.providerId || 'CWZDBt9Xmv',
      service_id: ref.serviceId || 'P7S_Vf3fBt',
      clinician_id: ref.doctorEmail || undefined,
      time_slot_id: `REF_${apptId}_${Date.now()}`,
      formData: {
        forWhom: 'Other',
        visitedBefore: false,
        identificationNumber: ref.referralId,
        referralId: ref.referralId,
        serviceName: scanName,
        facilityPrice: amount,
        price: amount,
        amount: amount,
        scanType: ref.scanType || '',
        bodyPart: ref.bodyPart || '',
        facilityName: ref.facilityName || 'Accredited ResQ Diagnostic Network',
        comments: `Referral #${ref.referralId} - ${scanName}. ${ref.clinicalNote ? `Note: ${ref.clinicalNote}` : ''}`,
        communicationPreference: 'Both',
        patientName: ref.patientName || patient?.full_name || 'Patient',
        patientEmail: patientEmail,
        patientPhone: ref.patientPhone || patient?.phone_number || '',
        patientAddress: ref.patientAddress || patient?.location_details?.address || '',
        patientGender: ref.patientGender || patient?.personal_details?.gender || '',
        patientDOB: ref.patientDob || patient?.personal_details?.date_of_birth || '',
        bookedByClinician: true,
        clinicianId: ref.doctorEmail || '',
        clinicianName: ref.doctorName || 'Referring Clinician',
        clinicianEmail: ref.doctorEmail || '',
      },
      payment: {
        status: isPaid ? 'completed' : 'pending',
        amount: amount,
        method: ref.paymentDetails?.method || 'Paystack',
        paystackReference: ref.paymentDetails?.reference,
        paidAt: ref.paymentDetails?.paidAt,
      },
      appointment_date: apptDate,
      start_time: startTime,
      end_time: endTime,
      status: apptStatus,
      notes: ref.clinicalNote || `Medical Referral #${ref.referralId} from ${ref.doctorName || 'Doctor'}.`,
    });

    await Referral.updateOne(
      { _id: ref._id },
      {
        $set: {
          patientAppointmentId: apptId,
          clinicianAppointmentId: apptId,
          patientSyncStatus: 'Synced',
          clinicianSyncStatus: 'Synced',
          patientSyncError: '',
          clinicianSyncError: '',
        }
      }
    );

    console.log(`+ Synced referral ${ref.referralId} -> Appointment ${apptId} for patient ${patientEmail}`);
    syncedCount++;
  }

  console.log(`\nReconciliation Summary:`);
  console.log(`- Already synced: ${alreadySyncedCount}`);
  console.log(`- Newly synced: ${syncedCount}`);
  console.log(`- Total referrals: ${referrals.length}`);

  await mongoose.disconnect();
}

runReconciliation().catch(err => {
  console.error('Reconciliation error:', err);
  process.exit(1);
});
