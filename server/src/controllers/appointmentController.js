// Appointment controller
const mongoose = require("mongoose");
const User = require("../models/User");
const Provider = require("../models/Provider");
const TimeSlot = require("../models/TimeSlot");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const { nanoid } = require("nanoid");
const notificationService = require("../services/notificationService");
const axios = require("axios");
let admin;
try {
  admin = require("firebase-admin");
} catch (error) {
  console.log(
    "Firebase Admin SDK not available in appointmentController, push notifications will be disabled",
  );
}
// nodemailer removed - using email service from config/email.js instead

// @desc    Get available time slots for a provider
// @route   GET /api/appointments/available-slots
// @access  Private
const getAvailableSlots = async (req, res) => {
  try {
    const { providerId, date } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    // Validate date format
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD format.",
      });
    }

    // Prevent booking for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot book appointments for past dates",
      });
    }

    // Find provider
    const provider = await Provider.findOne({ id: providerId });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Get day information
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayOfWeek];

    // Check if provider works on this day of the week based on their calendar
    const workingHoursForDay = provider.working_hours.find(
      (hours) => hours.day === dayName,
    );
    const isWorkingDay = workingHoursForDay && workingHoursForDay.isAvailable;

    if (!isWorkingDay) {
      return res.json({
        success: true,
        data: {
          provider: {
            id: provider.id,
            provider_name: provider.provider_name,
          },
          date: date,
          dayName: dayName,
          isWorkingDay: false,
          message: `${provider.provider_name} does not work on ${dayName}s.`,
          slots: [],
        },
      });
    }

    // Format the date for display
    const formattedDate = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate time slots based on provider's working hours
    const interval = 30; // 30-minute intervals
    const formattedSlots = [];

    // Parse start and end times
    const startTimeParts =
      workingHoursForDay.startTime.match(/(\d+):(\d+) ([AP]M)/);
    const endTimeParts =
      workingHoursForDay.endTime.match(/(\d+):(\d+) ([AP]M)/);

    if (!startTimeParts || !endTimeParts) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format in provider working hours",
      });
    }

    let startHour = parseInt(startTimeParts[1]);
    const startMinute = parseInt(startTimeParts[2]);
    const startAmPm = startTimeParts[3];

    let endHour = parseInt(endTimeParts[1]);
    const endMinute = parseInt(endTimeParts[2]);
    const endAmPm = endTimeParts[3];

    // Convert to 24-hour format
    if (startAmPm === "PM" && startHour < 12) startHour += 12;
    if (startAmPm === "AM" && startHour === 12) startHour = 0;

    if (endAmPm === "PM" && endHour < 12) endHour += 12;
    if (endAmPm === "AM" && endHour === 12) endHour = 0;

    // Set start and end times for the selected date
    const startTime = new Date(selectedDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Check for existing appointments for this provider on this day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get booked appointments for this day (exclude soft-deleted)
    const bookedAppointments = await Appointment.find({
      provider_id: providerId,
      appointment_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $nin: ["cancelled", "rejected"] },
      is_deleted: false,
    });

    // Create a map of booked time slots
    const bookedTimeSlots = {};
    bookedAppointments.forEach((appointment) => {
      const key = `${appointment.start_time}-${appointment.end_time}`;
      bookedTimeSlots[key] = true;
    });

    // Generate slots
    let slotStart = new Date(startTime);
    let slotId = 1;

    // Get current time to filter out past slots for today
    const now = new Date();
    const isToday =
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    // Add a buffer of 15 minutes to prevent last-minute bookings
    const bufferTime = new Date(now.getTime() + 15 * 60 * 1000);

    while (slotStart < endTime) {
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotStart.getMinutes() + interval);

      // Don't create slots that go beyond the end time
      if (slotEnd > endTime) {
        break;
      }

      // Format times for display
      const startHour = slotStart.getHours();
      const startMinutes = slotStart.getMinutes();
      const endHour = slotEnd.getHours();
      const endMinutes = slotEnd.getMinutes();

      const formattedStartTime = `${startHour % 12 || 12}:${startMinutes.toString().padStart(2, "0")} ${startHour >= 12 ? "PM" : "AM"}`;
      const formattedEndTime = `${endHour % 12 || 12}:${endMinutes.toString().padStart(2, "0")} ${endHour >= 12 ? "PM" : "AM"}`;

      // Check if this slot is already booked
      const slotKey = `${formattedStartTime}-${formattedEndTime}`;
      const isAvailable = !bookedTimeSlots[slotKey];

      // Skip slots that have already passed for today
      const isPastSlot = isToday && slotStart < bufferTime;

      // Only add available and future slots
      if (isAvailable && !isPastSlot) {
        formattedSlots.push({
          id: `${providerId}_${date}_${slotId}`,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          formatted_time: `${formattedStartTime} - ${formattedEndTime}`,
        });
        slotId++;
      }

      // Move to next slot
      slotStart = new Date(slotEnd);
    }

    res.json({
      success: true,
      data: {
        provider: {
          id: provider.id,
          provider_name: provider.provider_name,
        },
        date: date,
        formatted_date: formattedDate,
        dayName: dayName,
        isWorkingDay: true,
        working_hours: `${workingHoursForDay.startTime} - ${workingHoursForDay.endTime}`,
        slots: formattedSlots,
        slots_count: formattedSlots.length,
      },
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Book an appointment (now with pending status)
// @route   POST /api/appointments/book
// @access  Private
const bookAppointment = async (req, res) => {
  try {
    const {
      providerId,
      serviceId,
      date,
      start_time,
      end_time,
      formData,
      notes,
    } = req.body;

    let patient;
    let patientId;
    const isClinicianBooking = req.user && req.user.user_type === "Clinician";
    let clinicianId = null;
    let clinicianUser = null;

    if (isClinicianBooking) {
      clinicianId = req.user.id;
      clinicianUser = req.user;
      console.log(
        `[Book Appointment] Clinician booking detected: ${clinicianUser.full_name || clinicianUser.email} (${clinicianId})`,
      );

      // Auto-set defaults in formData for clinician booking if not explicitly provided
      if (formData) {
        if (!formData.forWhom) formData.forWhom = "Other";
        if (formData.visitedBefore === undefined) formData.visitedBefore = false;
        if (!formData.communicationPreference) formData.communicationPreference = "Both";
      }

      // Check for target patient specification
      const targetPatientId = req.body.patientId || formData?.patientId;
      const targetPatientEmail = req.body.patientEmail || formData?.patientEmail;
      const targetPatientName = req.body.patientName || formData?.patientName;
      const targetPatientPhone = req.body.patientPhone || formData?.patientPhone;

      if (targetPatientId) {
        patient = await User.findOne({ id: targetPatientId });
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: `Patient with ID ${targetPatientId} not found`,
          });
        }
        patientId = patient.id;
      } else if (targetPatientEmail) {
        const normalizedTargetEmail = targetPatientEmail.toLowerCase().trim();
        patient = await User.findOne({ email: normalizedTargetEmail });
        if (patient) {
          patientId = patient.id;
        } else {
          // Check if phone number is already registered by another patient
          if (targetPatientPhone) {
            const phoneExists = await User.findOne({
              phone_number: targetPatientPhone.trim(),
              user_type: "Patient",
            });
            if (phoneExists) {
              return res.status(400).json({
                success: false,
                message: "Phone number is already registered to an existing patient.",
              });
            }
          }

          const guestPassword = nanoid(10);
          patient = new User({
            full_name: targetPatientName || "Patient",
            email: normalizedTargetEmail,
            user_type: "Patient",
            password: guestPassword,
            email_verified: false,
            phone_number: targetPatientPhone ? targetPatientPhone.trim() : "",
            location_details: {
              address: formData?.patientAddress || req.body.patientAddress || "",
            },
            personal_details: {
              gender: formData?.patientGender || req.body.patientGender || "",
              date_of_birth: formData?.patientDOB || req.body.patientDOB || "",
            },
            metadata: {
              added_by_provider: clinicianId,
              added_at: new Date(),
            },
          });
          await patient.save();
          patientId = patient.id;
          console.log(
            `[Book Appointment] Created patient account for clinician booking: ${normalizedTargetEmail} (ID: ${patientId})`,
          );
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Patient ID or patient email is required when booking as a clinician",
        });
      }
    } else if (req.user) {
      patientId = req.user.id;
      patient = await User.findOne({ id: patientId });
      console.log(
        `[Book Appointment] User is logged in. Using patient ID: ${patientId} (${patient?.email})`,
      );
    } else {
      // Handle guest user (no authentication)
      const providedEmail = formData?.patientEmail;
      const providedName = formData?.patientName;

      if (providedEmail) {
        // Check if user already exists with this email
        let existingUser = await User.findOne({
          email: providedEmail.toLowerCase(),
        });

        if (existingUser) {
          patient = existingUser;
          patientId = existingUser.id;
          console.log(
            `[Book Appointment] Guest booking linked to existing user: ${providedEmail} (ID: ${patientId})`,
          );
        } else {
          // Check if phone number is already in use by another patient
          if (formData?.patientPhone) {
            const phoneExists = await User.findOne({
              phone_number: formData.patientPhone.trim(),
              user_type: "Patient"
            });

            if (phoneExists) {
              return res.status(400).json({
                success: false,
                message: "Phone number is already registered. Please use a different phone number or sign in with your existing account."
              });
            }
          }

          // Create new user with provided details
          const guestPassword = nanoid(10); // Random password
          patient = new User({
            full_name: providedName || "Guest User",
            email: providedEmail,
            user_type: "Patient",
            password: guestPassword,
            email_verified: false,
            phone_number: formData?.patientPhone || "",
            location_details: {
              address: formData?.patientAddress || "",
            },
            personal_details: {
              gender: formData?.patientGender || "",
              date_of_birth: formData?.patientDOB || "",
            },
          });
          await patient.save();
          patientId = patient.id;
          console.log(
            `[Book Appointment] Created new user for guest booking: ${providedEmail} (ID: ${patientId})`,
          );
        }
      } else {
        // Fallback for when no email is provided (should be rare if validation works)
        const guestEmail = `guest-${nanoid(10)}@resq.com`;
        const guestPassword = nanoid(20);

        patient = new User({
          full_name:
            formData?.forWhom === "Other" ? formData?.patientName : "Guest User",
          email: guestEmail,
          user_type: "Patient",
          password: guestPassword,
          email_verified: false,
        });

        await patient.save();
        patientId = patient.id;
        console.log(
          `[Book Appointment] Created guest user without email: ${guestEmail} (ID: ${patientId})`,
        );
      }
    }

    if (!providerId || !serviceId || !date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message:
          "Provider ID, service ID, date, start time, and end time are required",
      });
    }

    // Validate form data
    if (
      !formData ||
      !formData.forWhom ||
      formData.visitedBefore === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Form data is required with forWhom and visitedBefore fields",
      });
    }

    // Validate forWhom field
    if (formData.forWhom !== "Self" && formData.forWhom !== "Other") {
      return res.status(400).json({
        success: false,
        message: 'forWhom must be either "Self" or "Other"',
      });
    }

    // Validate communication preference
    const validCommunicationPreferences = ["Booker", "Patient", "Both"];
    if (
      formData.communicationPreference &&
      !validCommunicationPreferences.includes(formData.communicationPreference)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'communicationPreference must be one of: "Booker", "Patient", or "Both"',
      });
    }

    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD format.",
      });
    }

    // Prevent booking for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot book appointments for past dates",
      });
    }

    // Parse the appointment time to check if it's in the past
    const parseTimeString = (timeStr) => {
      const [timePart, ampm] = timeStr.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);

      if (ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      return { hours, minutes };
    };

    // Check if the appointment time has already passed for today's date
    const now = new Date();
    const isToday =
      appointmentDate.getDate() === now.getDate() &&
      appointmentDate.getMonth() === now.getMonth() &&
      appointmentDate.getFullYear() === now.getFullYear();

    if (isToday) {
      const startTimeObj = parseTimeString(start_time);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(
        startTimeObj.hours,
        startTimeObj.minutes,
        0,
        0,
      );

      // Add a buffer of 15 minutes to prevent last-minute bookings
      const bufferTime = new Date(now.getTime() + 15 * 60 * 1000);

      if (appointmentDateTime < bufferTime) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot book appointments for times that have already passed or are within 15 minutes from now",
        });
      }
    }

    // Get provider and service details in parallel
    // Note: Service model doesn't have is_deleted field, so we query without it
    const [provider, service] = await Promise.all([
      Provider.findOne({ id: providerId }),
      Service.findOne({ id: serviceId }),
    ]);

    // Add detailed logging for debugging
    if (!provider) {
      console.log(`[Book Appointment] Provider not found: ${providerId}`);
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    if (!service) {
      console.log(`[Book Appointment] Service not found: ${serviceId} for provider: ${providerId}`);
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Verify service belongs to the provider
    if (service.provider_id !== providerId) {
      console.log(`[Book Appointment] Service ${serviceId} does not belong to provider ${providerId}. Service provider_id: ${service.provider_id}`);
      return res.status(400).json({
        success: false,
        message: "Service does not belong to the specified provider",
      });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Get day information
    const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayOfWeek];

    // Check if provider works on this day of the week based on their calendar
    const workingHoursForDay = provider.working_hours.find(
      (hours) => hours.day === dayName,
    );
    const isWorkingDay = workingHoursForDay && workingHoursForDay.isAvailable;
    const isReferralOrClinician = Boolean(
      isClinicianBooking ||
      formData?.bookedByClinician ||
      formData?.referralId ||
      formData?.identificationNumber ||
      req.body.referralId ||
      req.body.identificationNumber
    );

    if (!isWorkingDay) {
      if (isReferralOrClinician) {
        console.log(`[Book Appointment] Clinical referral/booking on non-standard working day (${dayName}) for ${provider.provider_name}, accepting under clinical discretion.`);
      } else {
        return res.status(400).json({
          success: false,
          message: `${provider.provider_name} does not work on ${dayName}s.`,
        });
      }
    }

    // Validate that the requested time is within the provider's working hours
    const defaultStart = { hours: 8, minutes: 0 };
    const defaultEnd = { hours: 21, minutes: 0 };
    const providerStartTime = workingHoursForDay ? parseTimeString(workingHoursForDay.startTime) : defaultStart;
    const providerEndTime = workingHoursForDay ? parseTimeString(workingHoursForDay.endTime) : defaultEnd;
    const requestedStartTime = parseTimeString(start_time);
    const requestedEndTime = parseTimeString(end_time);

    // Convert to minutes since midnight for easier comparison
    const toMinutes = (time) => time.hours * 60 + time.minutes;
    const providerStartMinutes = toMinutes(providerStartTime);
    const providerEndMinutes = toMinutes(providerEndTime);
    const requestedStartMinutes = toMinutes(requestedStartTime);
    const requestedEndMinutes = toMinutes(requestedEndTime);

    // Check if requested time is within provider's working hours
    if (
      requestedStartMinutes < providerStartMinutes ||
      requestedEndMinutes > providerEndMinutes
    ) {
      if (isReferralOrClinician) {
        console.log(`[Book Appointment] Clinical referral/booking requested slot (${start_time} - ${end_time}) outside standard provider hours, accepting under clinical discretion.`);
      } else {
        return res.status(400).json({
          success: false,
          message: `The requested time is outside of ${provider.provider_name}'s working hours (${workingHoursForDay ? workingHoursForDay.startTime : '8:00 AM'} - ${workingHoursForDay ? workingHoursForDay.endTime : '5:00 PM'}).`,
        });
      }
    }

    // Check for existing appointments at the same time
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      provider_id: providerId,
      appointment_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      start_time: start_time,
      end_time: end_time,
      status: { $nin: ["cancelled", "rejected"] },
      is_deleted: false,
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message:
          "This time slot is already booked. Please choose another time.",
      });
    }

    // Generate a unique time slot ID if needed for backward compatibility
    // This is optional as we're using date and time directly now
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const nanoidSuffix = nanoid(6);
    const timeSlotId = `${providerId}_${date.replace(/-/g, "")}_${start_time.replace(/[: ]/g, "")}_${end_time.replace(/[: ]/g, "")}_${timestamp}_${randomSuffix}_${nanoidSuffix}`;

    // Set initial status based on provider's auto-approve setting
    // Clinician booking has not yet been paid for, so it MUST always start as pending
    const initialStatus = isClinicianBooking
      ? "pending"
      : provider.auto_confirm_appointments
      ? "confirmed"
      : "pending";

    // Create appointment with appropriate status
    let appointment;
    try {
      const actualServiceName =
        req.body.serviceName ||
        formData.serviceName ||
        (req.body.scanType ? `${req.body.scanType}${req.body.bodyPart ? ' (' + req.body.bodyPart + ')' : ''}` : '') ||
        (formData.scanType ? `${formData.scanType}${formData.bodyPart ? ' (' + formData.bodyPart + ')' : ''}` : '') ||
        (service && service.name !== 'Referral Service' ? service.name : '') ||
        'Diagnostic Scan';

      const rawPrice =
        req.body.facilityPrice ??
        req.body.price ??
        req.body.amount ??
        formData.facilityPrice ??
        formData.price ??
        formData.amount;

      const parsedPrice = Number(rawPrice);
      const actualPrice = (!isNaN(parsedPrice) && parsedPrice > 0)
        ? parsedPrice
        : (service && service.name !== 'Referral Service' ? service.price : 0);

      const appointmentId = nanoid(10);
      console.log(
        `[Book Appointment] Creating appointment ${appointmentId} for patient ${patientId}`,
      );

      appointment = await Appointment.create({
        id: appointmentId,
        patient_id: patientId,
        provider_id: providerId,
        clinician_id: clinicianId || undefined,
        time_slot_id: timeSlotId, // Optional field, kept for backward compatibility
        service_id: serviceId,
        formData: {
          forWhom: isClinicianBooking ? "Other" : formData.forWhom,
          visitedBefore:
            formData.visitedBefore === "true" ||
            formData.visitedBefore === true,
          identificationNumber: formData.identificationNumber || req.body.identificationNumber || "",
          referralId: formData.referralId || req.body.referralId || formData.identificationNumber || req.body.identificationNumber || "",
          serviceName: actualServiceName,
          facilityPrice: actualPrice,
          price: actualPrice,
          amount: actualPrice,
          scanType: req.body.scanType || formData.scanType || "",
          bodyPart: req.body.bodyPart || formData.bodyPart || "",
          facilityName: req.body.facilityName || formData.facilityName || provider?.provider_name || "",
          comments: formData.comments || "",
          // Add communication preference
          communicationPreference: formData.communicationPreference || (isClinicianBooking ? "Both" : "Booker"),
          // Include patient details if booking for someone else, clinician booking, OR if it's a guest user
          patientName:
            formData.forWhom === "Other" || isClinicianBooking || !req.user
              ? formData.patientName || patient?.full_name || ""
              : "",
          patientEmail:
            formData.forWhom === "Other" || isClinicianBooking || !req.user
              ? formData.patientEmail || patient?.email || ""
              : "",
          patientPhone:
            formData.forWhom === "Other" || isClinicianBooking || !req.user
              ? formData.patientPhone || patient?.phone_number || ""
              : "",
          patientAddress:
            formData.forWhom === "Other" || isClinicianBooking || !req.user
              ? formData.patientAddress || patient?.location_details?.address || ""
              : "",
          patientGender:
            formData.forWhom === "Other" || isClinicianBooking || !req.user
              ? formData.patientGender || patient?.personal_details?.gender || ""
              : "",
          patientDOB:
            formData.forWhom === "Other" || isClinicianBooking || !req.user
              ? formData.patientDOB || patient?.personal_details?.date_of_birth || ""
              : "",
          bookedByClinician: isClinicianBooking,
          clinicianId: clinicianId || "",
          clinicianName: clinicianUser ? clinicianUser.full_name : "",
          clinicianEmail: clinicianUser ? clinicianUser.email : "",
        },
        payment: {
          status: "pending",
          amount: actualPrice,
        },
        appointment_date: appointmentDate,
        start_time: start_time,
        end_time: end_time,
        status: initialStatus, // Set status based on provider's auto-approve setting
        notes: notes || "",
      });

      console.log(
        `[Book Appointment] Successfully created appointment ${appointment.id} for patient ${patientId}. Status: ${appointment.status}, is_deleted: ${appointment.is_deleted}`,
      );

      // Link and update matching Referral in MongoDB if this booking is from a referral
      const referralIdToMatch = formData?.referralId || formData?.identificationNumber || req.body.referralId || req.body.identificationNumber;
      if (referralIdToMatch) {
        try {
          const ReferralModel = mongoose.models.Referral || mongoose.model("Referral", new mongoose.Schema({}, { strict: false }));
          ReferralModel.updateMany(
            { referralId: referralIdToMatch },
            {
              $set: {
                patientAppointmentId: appointment.id,
                clinicianAppointmentId: appointment.id,
                patientSyncStatus: "Synced",
                clinicianSyncStatus: "Synced",
                patientSyncError: "",
                clinicianSyncError: "",
                status: appointment.status === "confirmed" ? "Confirmed" : "Booking in Progress",
              },
            }
          ).catch((e) => console.warn("[Book Appointment] Referral update error:", e.message));
        } catch (syncErr) {
          console.warn("[Book Appointment] Referral sync notice:", syncErr.message);
        }
      }

      // Verify the appointment was saved correctly
      const verifyAppointment = await Appointment.findOne({ id: appointment.id });
      if (verifyAppointment) {
        console.log(
          `[Book Appointment] Verified appointment ${appointment.id} exists in database. Patient ID: ${verifyAppointment.patient_id}, is_deleted: ${verifyAppointment.is_deleted}`,
        );
      } else {
        console.error(
          `[Book Appointment] WARNING: Appointment ${appointment.id} was created but not found in database!`,
        );
      }
    } catch (createError) {
      // Handle duplicate key error specifically
      if (createError.code === 11000) {
        console.error(
          "Duplicate key error during appointment creation:",
          createError,
        );
        return res.status(409).json({
          success: false,
          message:
            "A booking conflict occurred. Please try again with a different time slot.",
          error: "DUPLICATE_BOOKING",
        });
      }
      throw createError; // Re-throw other errors
    }

    // Log provider's auto-approve setting
    if (provider.auto_confirm_appointments) {
      console.log(
        `Provider ${provider.provider_name} has auto-approve enabled. Appointment ${appointment.id} created with confirmed status.`,
      );
    } else {
      console.log(
        `Provider ${provider.provider_name} has auto-approve disabled. Appointment ${appointment.id} created with pending status.`,
      );
    }

    // Send notifications in background (completely non-blocking)
    setImmediate(() => {
      // Use setTimeout to ensure this runs after the response is sent
      setTimeout(async () => {
        try {
          const patientNotificationPromise = isClinicianBooking
            ? notificationService.sendReferralPaymentRequiredNotification(
                patient,
                provider,
                appointment,
                service,
                clinicianUser,
              )
            : notificationService.sendBookingConfirmationToPatient(
                patient,
                provider,
                appointment,
                service,
              );

          // All appointments start as pending, so send pending notifications
          const notificationPromises = [
            notificationService
              .sendPendingAppointmentNotification(
                patient,
                provider,
                appointment,
              )
              .catch((err) =>
                console.error("Provider notification failed:", err),
              ),
            patientNotificationPromise
              .catch((err) =>
                console.error("Patient notification failed:", err),
              ),
          ];

          // Don't wait for completion - just fire and forget
          Promise.all(notificationPromises).catch((err) =>
            console.error("Background notification error:", err),
          );
        } catch (error) {
          console.error("Background notification error:", error);
        }
      }, 100); // Small delay to ensure response is sent first
    });

    // Set response message based on provider's auto-approve setting
    const responseMessage = provider.auto_confirm_appointments
      ? "Appointment confirmed successfully. Please complete payment to finalize your booking."
      : "Appointment request submitted. Please complete payment to confirm your appointment.";

    // Determine the correct patient name to display
    const displayPatientName =
      formData.forWhom === "Other" ? formData.patientName : patient.full_name;

    // Format date consistently
    const formattedDate = appointment.appointment_date
      .toISOString()
      .split("T")[0]; // YYYY-MM-DD format

    res.json({
      success: true,
      message: responseMessage,
      data: {
        appointment: {
          id: appointment.id,
          provider_name: provider.provider_name,
          patient_name: displayPatientName,
          service: {
            id: service.id,
            name: (service.name && service.name !== 'Referral Service') ? service.name : actualServiceName,
            category: service.category,
            price: appointment.payment?.amount || actualPrice,
          },
          date: formattedDate,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          payment: {
            ...appointment.payment,
            payment_link: `/api/v1/payments/initialize/${appointment.id}`,
          },
          formData: {
            forWhom: appointment.formData.forWhom,
            communicationPreference:
              appointment.formData.communicationPreference,
            patientEmail: appointment.formData.patientEmail || patient.email,
            patientPhone:
              appointment.formData.patientPhone || patient.phone_number,
            patientAddress:
              appointment.formData.patientAddress ||
              patient.location_details?.address,
            comments: appointment.formData.comments,
          },
          timezone: "WAT", // West Africa Time
        },
      },
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Confirm an appointment (provider only)
// @route   PUT /api/appointments/:appointmentId/confirm
// @access  Private/Provider
const confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    const { action } = req.body; // 'confirm' or 'reject'

    // Ensure user is a provider or clinician
    if (
      req.user.user_type !== "Clinician" &&
      req.user.user_type !== "DiagnosticProvider"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized. Only providers can confirm or reject appointments.",
      });
    }

    if (!action || !["confirm", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be either "confirm" or "reject"',
      });
    }

    // Find the appointment
    const appointment = await Appointment.findOne({ id: appointmentId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if user is the provider
    const provider = await Provider.findOne({ user_id: userId });

    if (!provider || provider.id !== appointment.provider_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to confirm this appointment",
      });
    }

    // Check if appointment is in pending status
    if (appointment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Appointment is already ${appointment.status}`,
      });
    }

    // Get patient details
    const patient = await User.findOne({ id: appointment.patient_id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    if (action === "confirm") {
      // Update appointment status to confirmed
      appointment.status = "confirmed";
      await appointment.save();

      // Send confirmation notifications asynchronously (don't wait)
      notificationService
        .sendAppointmentNotifications(patient, provider, appointment)
        .catch((error) =>
          console.error("Error sending confirmation notifications:", error),
        );

      res.json({
        success: true,
        message: "Appointment confirmed successfully",
        data: {
          appointment: {
            id: appointment.id,
            status: "confirmed",
          },
        },
      });
    } else {
      // Reject the appointment
      appointment.status = "rejected";
      await appointment.save();

      // Send rejection notification asynchronously (don't wait)
      notificationService
        .sendRejectionNotification(patient, provider, appointment)
        .catch((error) =>
          console.error("Error sending rejection notification:", error),
        );

      res.json({
        success: true,
        message: "Appointment rejected successfully",
        data: {
          appointment: {
            id: appointment.id,
            status: "rejected",
          },
        },
      });
    }
  } catch (error) {
    console.error("Confirm appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Helper to resolve the true scan name and true price for an appointment,
 * preventing fallback to placeholder "Referral Service" or 5000 NGN.
 */
const resolveAppointmentServiceAndPrice = (appointment, service) => {
  let actualServiceName = appointment?.formData?.serviceName;
  if (!actualServiceName && appointment?.formData?.scanType) {
    actualServiceName = `${appointment.formData.scanType}${appointment.formData.bodyPart ? ' (' + appointment.formData.bodyPart + ')' : ''}`;
  }
  if (!actualServiceName && appointment?.formData?.comments) {
    const match = appointment.formData.comments.match(/Referral\s*#[A-Za-z0-9_-]+\s*-\s*([^.\n]+?)(?:\.\s*Note|\.|$)/i);
    if (match) {
      actualServiceName = match[1].trim();
    }
  }
  if (!actualServiceName && appointment?.notes) {
    const scanMatch = appointment.notes.match(/Scan:\s*([^.\n]+?)(?:\.\s*Priority|\.|$)/i);
    if (scanMatch) {
      actualServiceName = scanMatch[1].trim();
    } else {
      const mriMatch = appointment.notes.match(/(MRI|CT|Ultrasound|X-Ray|Fluoroscopy|Mammography|PET|Scan)[^,.]*/i);
      if (mriMatch) {
        actualServiceName = mriMatch[0].trim();
      }
    }
  }
  if (!actualServiceName && service && service.name !== 'Referral Service') {
    actualServiceName = service.name;
  }
  if (!actualServiceName) {
    actualServiceName = (service?.name && service.name !== 'Referral Service') ? service.name : 'Diagnostic Scan';
  }

  const actualPrice =
    Number(appointment?.payment?.amount) ||
    Number(appointment?.formData?.facilityPrice) ||
    Number(appointment?.formData?.price) ||
    Number(appointment?.formData?.amount) ||
    (service && service.name !== 'Referral Service' ? service.price : 0);

  return {
    id: service?.id || appointment?.service_id || 'SRV-SCAN',
    name: actualServiceName,
    category: service?.category || 'scans',
    price: actualPrice,
  };
};

// @desc    Get patient's appointments
// @route   GET /api/appointments/patient
// @access  Private
const getPatientAppointments = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const patientId = req.user.id;
    const { status } = req.query;

    // Fetch patient details once (used for all appointments)
    const patient = await User.findOne({ id: patientId }).select('id full_name email phone_number contact_details location_details personal_details').lean();

    // Build query - ensure we match by patient ID, patient email, or phone number in formData
    const patientFilters = [{ patient_id: patientId }];
    if (patient?.email) {
      patientFilters.push({ "formData.patientEmail": new RegExp(`^${patient.email.trim()}$`, "i") });
    }
    if (patient?.phone_number) {
      patientFilters.push({ "formData.patientPhone": patient.phone_number.trim() });
    }

    const query = {
      $or: patientFilters,
      is_deleted: { $ne: true }
    };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Get appointments (exclude soft-deleted) with timeout
    // Sort by payment.paidAt (payment date/time) descending to show most recently paid appointments first
    let appointments = await Appointment.find(query)
      .sort({ "payment.paidAt": -1, created_at: -1 })
      .maxTimeMS(10000)
      .lean(); // Use lean() for performance since we don't need Mongoose document methods on the list

    // Auto-Reconcile: Check for any clinician referrals in the shared Referral collection
    // for this patient's email or phone number that do not yet have a matching Appointment.
    try {
      const ReferralModel = mongoose.models.Referral || mongoose.model("Referral", new mongoose.Schema({}, { strict: false }));
      const refFilters = [];
      if (patient?.email) {
        refFilters.push({ patientEmail: new RegExp(`^${patient.email.trim()}$`, "i") });
      }
      if (patient?.phone_number) {
        refFilters.push({ patientPhone: patient.phone_number.trim() });
      }
      if (refFilters.length > 0) {
        const referrals = await ReferralModel.find({ $or: refFilters }).lean();
        for (const ref of referrals) {
          const alreadyInList = appointments.some((a) =>
            (ref.referralId && (a.formData?.referralId === ref.referralId || a.formData?.identificationNumber === ref.referralId)) ||
            (ref.patientAppointmentId && a.id === ref.patientAppointmentId) ||
            (ref.clinicianAppointmentId && a.id === ref.clinicianAppointmentId)
          );
          if (!alreadyInList) {
            let existingInDb = await Appointment.findOne({
              $or: [
                { "formData.referralId": ref.referralId },
                { "formData.identificationNumber": ref.referralId },
                { id: ref.patientAppointmentId },
                { id: ref.clinicianAppointmentId },
              ].filter(Boolean),
              is_deleted: { $ne: true },
            }).lean();

            if (existingInDb) {
              if (existingInDb.patient_id !== patientId) {
                Appointment.updateOne({ id: existingInDb.id }, { $set: { patient_id: patientId } }).catch(() => {});
                existingInDb.patient_id = patientId;
              }
              appointments.push(existingInDb);
            } else {
              const newApptId = nanoid(10);
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

              const createdAppt = await Appointment.create({
                id: newApptId,
                patient_id: patientId,
                provider_id: ref.providerId || 'CWZDBt9Xmv',
                service_id: ref.serviceId || 'P7S_Vf3fBt',
                clinician_id: ref.doctorEmail || undefined,
                time_slot_id: `REF_${newApptId}_${Date.now()}`,
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
                  patientName: ref.patientName || patient.full_name,
                  patientEmail: ref.patientEmail || patient.email,
                  patientPhone: ref.patientPhone || patient.phone_number,
                  patientAddress: ref.patientAddress || patient.location_details?.address || '',
                  patientGender: ref.patientGender || patient.personal_details?.gender || '',
                  patientDOB: ref.patientDob || patient.personal_details?.date_of_birth || '',
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

              appointments.push(createdAppt.toObject ? createdAppt.toObject() : createdAppt);

              ReferralModel.updateOne(
                { _id: ref._id },
                {
                  $set: {
                    patientAppointmentId: newApptId,
                    clinicianAppointmentId: newApptId,
                    patientSyncStatus: 'Synced',
                    clinicianSyncStatus: 'Synced',
                    patientSyncError: '',
                    clinicianSyncError: '',
                  },
                }
              ).catch((e) => console.warn('Referral update error:', e.message));
            }
          }
        }
      }
    } catch (reconcileErr) {
      console.warn('[Get Patient Appointments] Referral reconciliation notice:', reconcileErr.message);
    }

    // Attempt auto-verify of payments that have a Paystack reference but are still pending
    // We do this in parallel but limit concurrency if needed, and update IN MEMORY to avoid re-fetch
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (appointments.length > 0) {
      const verificationPromises = appointments.map(async (appt) => {
        const isCompleted = appt.payment?.status === "completed";
        const needsVerify = paystackKey && appt.payment?.paystackReference && !isCompleted;

        if (needsVerify) {
          try {
            const ref = appt.payment.paystackReference;
            const resp = await axios.get(
              `https://api.paystack.co/transaction/verify/${ref}`,
              {
                headers: { Authorization: `Bearer ${paystackKey}` },
                timeout: 5000 // 5s timeout for external API
              },
            );
            if (resp.data?.status && resp.data?.data?.status === "success") {
              // Update in memory
              appt.payment = {
                status: "completed",
                paystackReference: ref,
                amount: resp.data.data.amount / 100,
                paidAt: new Date(),
              };
              appt.status = "confirmed";
              
              // Persist update to DB asynchronously
              Appointment.updateOne(
                { id: appt.id }, 
                { $set: { payment: appt.payment, status: "confirmed", updated_at: new Date() } }
              ).catch(e => console.error(`Failed to persist payment update for ${appt.id}:`, e));

              // Also sync matching Referral in shared DB
              try {
                const ReferralModel = mongoose.models.Referral || mongoose.model("Referral", new mongoose.Schema({}, { strict: false }));
                ReferralModel.updateMany(
                  {
                    $or: [
                      { patientAppointmentId: appt.id },
                      { clinicianAppointmentId: appt.id },
                      { referralId: appt.formData?.referralId },
                      { referralId: appt.formData?.identificationNumber },
                    ].filter(Boolean),
                  },
                  {
                    $set: {
                      status: "Confirmed",
                      paymentStatus: "Paid",
                      "paymentDetails.paidAt": new Date(),
                      "paymentDetails.reference": ref,
                      "paymentDetails.method": resp.data?.data?.channel || "paystack",
                    },
                  }
                ).catch(e => console.error(`Failed to sync referral for ${appt.id}:`, e));
              } catch (refErr) {
                console.warn("Matching referral update warning:", refErr.message);
              }
            }
          } catch (e) {
            // Ignore verification errors to avoid blocking
          }
        } else if (isCompleted) {
          // If payment is completed, ensure appointment is marked confirmed and referral is synced
          if (appt.status !== "confirmed") {
            appt.status = "confirmed";
            Appointment.updateOne(
              { id: appt.id },
              { $set: { status: "confirmed", updated_at: new Date() } }
            ).catch(e => console.error(`Failed to update status for ${appt.id}:`, e));
          }

          try {
            const ReferralModel = mongoose.models.Referral || mongoose.model("Referral", new mongoose.Schema({}, { strict: false }));
            ReferralModel.updateMany(
              {
                $or: [
                  { patientAppointmentId: appt.id },
                  { clinicianAppointmentId: appt.id },
                  { referralId: appt.formData?.referralId },
                  { referralId: appt.formData?.identificationNumber },
                ].filter(Boolean),
                paymentStatus: { $ne: "Paid" },
              },
              {
                $set: {
                  status: "Confirmed",
                  paymentStatus: "Paid",
                  "paymentDetails.paidAt": appt.payment?.paidAt || new Date(),
                  "paymentDetails.reference": appt.payment?.paystackReference,
                  "paymentDetails.method": appt.payment?.method || "paystack",
                },
              }
            ).catch(e => console.error(`Failed to sync referral for ${appt.id}:`, e));
          } catch (refErr) {
            // ignore
          }
        }
      });

      // Wait for verifications to complete (or fail/timeout) so the user sees up-to-date status
      await Promise.allSettled(verificationPromises);
    }

    // Batch Fetching: Get all unique Provider IDs, Service IDs, and Clinician IDs
    const providerIds = [...new Set(appointments.map(a => a.provider_id).filter(Boolean))];
    const serviceIds = [...new Set(appointments.map(a => a.service_id).filter(Boolean))];
    const clinicianIds = [...new Set(appointments.map(a => a.clinician_id).filter(Boolean))];

    // Fetch Providers, Services, and Clinicians in parallel
    const [providers, services, clinicians] = await Promise.all([
        Provider.find({ id: { $in: providerIds } }).select('id provider_name').lean(),
        Service.find({ id: { $in: serviceIds } }).select('id name category price').lean(),
        User.find({ id: { $in: clinicianIds } }).select('id full_name email phone_number').lean(),
    ]);

    // Create lookup maps
    const providerMap = {};
    providers.forEach(p => providerMap[p.id] = p);

    const serviceMap = {};
    services.forEach(s => serviceMap[s.id] = s);

    const clinicianMap = {};
    clinicians.forEach(c => clinicianMap[c.id] = c);

    // Map appointments to response structure
    const appointmentDetails = appointments.map((appointment) => {
      const provider = providerMap[appointment.provider_id];
      const service = serviceMap[appointment.service_id];
      const clinician = clinicianMap[appointment.clinician_id];

        // Extract contact info - use formData if booking for "Other", otherwise use patient's User data
        const isBookingForOther = appointment.formData?.forWhom === "Other";

        const contactInfo = {
          name: isBookingForOther
            ? (appointment.formData?.patientName || "")
            : (patient?.full_name || ""),
          email: isBookingForOther
            ? (appointment.formData?.patientEmail || "")
            : (patient?.email || patient?.contact_details?.email_address || ""),
          phone: isBookingForOther
            ? (appointment.formData?.patientPhone || "")
            : (patient?.phone_number || patient?.contact_details?.phone_number || ""),
          address: isBookingForOther
            ? (appointment.formData?.patientAddress || "")
            : (patient?.location_details?.address || ""),
          gender: isBookingForOther
            ? (appointment.formData?.patientGender || "")
            : (patient?.personal_details?.gender || ""),
          dob: isBookingForOther
            ? (appointment.formData?.patientDOB || "")
            : (patient?.personal_details?.date_of_birth || ""),
          communicationPreference:
            appointment.formData?.communicationPreference || "Booker",
          bookingType: appointment.formData?.forWhom || "Self",
        };

        const isBookedByClinician = Boolean(
          appointment.clinician_id || appointment.formData?.bookedByClinician,
        );

        return {
          id: appointment.id,
          provider_id: appointment.provider_id,
          provider_name: provider ? provider.provider_name : "Unknown Provider",
          patient_id: appointment.patient_id,
          clinician_id: appointment.clinician_id || null,
          bookedByClinician: isBookedByClinician,
          clinician: isBookedByClinician
            ? {
                id: appointment.clinician_id || appointment.formData?.clinicianId || "",
                name: clinician?.full_name || appointment.formData?.clinicianName || "Clinician",
                email: clinician?.email || appointment.formData?.clinicianEmail || "",
                phone: clinician?.phone_number || "",
              }
            : null,
          service: resolveAppointmentServiceAndPrice(appointment, service),
          date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          payment: {
            ...appointment.payment,
            amount: resolveAppointmentServiceAndPrice(appointment, service).price,
          },
          isPaid: appointment.payment?.status === "completed",
          paymentRequired: appointment.payment?.status !== "completed",
          paymentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/appointments/${appointment.id}/pay`,
          contact: contactInfo,
          formData: appointment.formData,
          notes: appointment.notes,
        };
    });

    res.json({
      success: true,
      data: {
        appointments: appointmentDetails,
      },
    });
  } catch (error) {
    console.error("Get patient appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get provider's appointments
// @route   GET /api/appointments/provider
// @access  Private
const getProviderAppointments = async (req, res) => {
  try {
    // Ensure user is a provider or clinician
    if (
      req.user.user_type !== "Clinician" &&
      req.user.user_type !== "DiagnosticProvider"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized. Only providers can access provider appointments.",
      });
    }

    // Get the provider associated with the user
    const provider = await Provider.findOne({ user_id: req.user.id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const { status, date } = req.query;

    // Build query
    const query = { provider_id: provider.id };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.appointment_date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Get appointments (exclude soft-deleted)
    const appointments = await Appointment.find({
      ...query,
      is_deleted: false,
    }).sort({ appointment_date: 1, start_time: 1 });

    // Get patient details for each appointment
    const appointmentDetails = await Promise.all(
      appointments.map(async (appointment) => {
        let booker, service;
        try {
          [booker, service] = await Promise.all([
            User.findOne({ id: appointment.patient_id }).maxTimeMS(5000),
            Service.findOne({
              id: appointment.service_id,
              is_deleted: false,
            }).maxTimeMS(5000),
          ]);
        } catch (dbError) {
          console.error("Error fetching booker/service details:", dbError);
          booker = null;
          service = null;
        }

        const isBookingForOther = appointment.formData?.forWhom === "Other";

        const patientDetails = {
          name: isBookingForOther
            ? (appointment.formData?.patientName || "")
            : (booker?.full_name || ""),
          email: isBookingForOther
            ? (appointment.formData?.patientEmail || "")
            : (booker?.email || booker?.contact_details?.email_address || ""),
          phone: isBookingForOther
            ? (appointment.formData?.patientPhone || "")
            : (booker?.phone_number || booker?.contact_details?.phone_number || ""),
          address: isBookingForOther
            ? (appointment.formData?.patientAddress || "")
            : (booker?.location_details?.address || ""),
          gender: isBookingForOther
            ? (appointment.formData?.patientGender || "")
            : (booker?.personal_details?.gender || ""),
          dob: isBookingForOther
            ? (appointment.formData?.patientDOB || "")
            : (booker?.personal_details?.date_of_birth || ""),
        };

        return {
          id: appointment.id,
          patient_id: appointment.patient_id,
          patient_details: patientDetails,
          booker_name: booker ? booker.full_name : "Unknown Booker",
          provider_id: appointment.provider_id,
          service: resolveAppointmentServiceAndPrice(appointment, service),
          date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          payment: {
            ...appointment.payment,
            amount: resolveAppointmentServiceAndPrice(appointment, service).price,
          },
          formData: appointment.formData,
          notes: appointment.notes,
          review: appointment.review,
        };
      }),
    );

    res.json({
      success: true,
      data: {
        appointments: appointmentDetails,
      },
    });
  } catch (error) {
    console.error("Get provider appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Cancel an appointment
// @route   PUT /api/appointments/:appointmentId/cancel
// @access  Private
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    // Find the appointment
    const appointment = await Appointment.findOne({ id: appointmentId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if user is authorized to cancel (patient, provider, or clinician who booked)
    const provider = await Provider.findOne({ user_id: userId });
    const isProvider = provider && provider.id === appointment.provider_id;
    const isPatient = userId === appointment.patient_id;
    const isClinician =
      (appointment.clinician_id && appointment.clinician_id === userId) ||
      (appointment.formData && appointment.formData.clinicianId === userId);

    // If user is trying to cancel as a provider, ensure they are actually a provider/clinician type
    if (
      isProvider &&
      req.user.user_type !== "Clinician" &&
      req.user.user_type !== "DiagnosticProvider"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized. Only providers can cancel appointments as providers.",
      });
    }

    if (!isProvider && !isPatient && !isClinician && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this appointment",
      });
    }

    // Check if appointment is already cancelled or rejected
    if (["cancelled", "rejected"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Appointment is already ${appointment.status}`,
      });
    }

    // Update appointment status
    appointment.status = "cancelled";
    await appointment.save();

    // Get details for notifications
    const patient = await User.findOne({ id: appointment.patient_id });
    const providerData = await Provider.findOne({
      id: appointment.provider_id,
    });

    // Send cancellation notifications
    await notificationService.sendCancellationNotifications(
      patient,
      providerData,
      appointment,
      isPatient ? "patient" : "provider",
    );

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: {
        appointment: {
          id: appointment.id,
          status: appointment.status,
        },
      },
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Soft delete an appointment (user only)
// @route   DELETE /api/appointments/:appointmentId
// @access  Private
const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Find the appointment (including soft-deleted ones for this check)
    const appointment = await Appointment.findOne({ id: appointmentId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment is already soft deleted
    if (appointment.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Appointment has already been deleted",
      });
    }

    // Check if user is the patient who booked the appointment
    if (userId !== appointment.patient_id) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized. Only the patient who booked the appointment can delete it.",
      });
    }

    // Check if appointment can be deleted (not completed or in progress)
    if (["completed", "no-show"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete completed or no-show appointments",
      });
    }

    // Soft delete the appointment using updateOne to avoid validation issues
    await Appointment.updateOne(
      { id: appointmentId },
      {
        $set: {
          is_deleted: true,
          deleted_by: userId,
          deletion_reason: reason || "user_request",
          updated_at: new Date(),
        },
      },
    );

    // Get details for notifications
    const patient = await User.findOne({ id: appointment.patient_id });
    const providerData = await Provider.findOne({
      id: appointment.provider_id,
    });

    // Send deletion notification to provider if appointment was confirmed
    if (appointment.status === "confirmed" && providerData) {
      try {
        await notificationService.sendAppointmentDeletionNotification(
          patient,
          providerData,
          appointment,
        );
      } catch (notificationError) {
        console.error(
          "Error sending deletion notification:",
          notificationError,
        );
        // Continue even if notification fails
      }
    }

    res.json({
      success: true,
      message: "Appointment deleted successfully",
      data: {
        appointment: {
          id: appointment.id,
          is_deleted: true,
          deleted_at: new Date(),
          deletion_reason: reason || "user_request",
        },
      },
    });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get available dates for a provider (for calendar view)
// @route   GET /api/appointments/available-dates
// @access  Private
const getAvailableDates = async (req, res) => {
  try {
    const { providerId, month, year } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    // Validate month and year inputs
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1; // 1-12
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Find provider
    const provider = await Provider.findOne({ id: providerId });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Calculate start and end dates for the query (entire month)
    const startDate = new Date(currentYear, currentMonth - 1, 1); // Month is 0-indexed in Date
    const endDate = new Date(currentYear, currentMonth, 0); // Last day of the month
    endDate.setHours(23, 59, 59, 999);

    // Get working hours for this provider
    if (!provider.working_hours || provider.working_hours.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provider has not set working hours",
      });
    }

    // Get today's date for filtering past dates
    const today = new Date();
    const currentTime = new Date();
    today.setHours(0, 0, 0, 0);

    // Get booked appointments for this month to check availability (exclude soft-deleted)
    const bookedAppointments = await Appointment.find({
      provider_id: providerId,
      appointment_date: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $nin: ["cancelled", "rejected"] },
      is_deleted: false,
    });

    // Create a map of dates with booked appointments
    const bookedDates = {};
    bookedAppointments.forEach((appointment) => {
      const dateStr = appointment.appointment_date.toISOString().split("T")[0];
      if (!bookedDates[dateStr]) {
        bookedDates[dateStr] = [];
      }
      bookedDates[dateStr].push({
        start_time: appointment.start_time,
        end_time: appointment.end_time,
      });
    });

    // Calculate all days in the month with availability information
    const calendarDays = [];
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][dayOfWeek];

      // Check if provider works on this day of the week based on their calendar
      const workingHoursForDay = provider.working_hours.find(
        (hours) => hours.day === dayName,
      );
      const isWorkingDay = workingHoursForDay && workingHoursForDay.isAvailable;

      const dateStr = date.toISOString().split("T")[0];
      const isPastDate = date < today;

      // Check if this is today
      const isToday =
        date.getDate() === currentTime.getDate() &&
        date.getMonth() === currentTime.getMonth() &&
        date.getFullYear() === currentTime.getFullYear();

      // Calculate how many slots are still available
      // For simplicity, we'll assume 30-minute slots
      let availableSlotsCount = 0;

      if (isWorkingDay && !isPastDate) {
        // Parse working hours
        const startTimeParts =
          workingHoursForDay.startTime.match(/(\d+):(\d+) ([AP]M)/);
        const endTimeParts =
          workingHoursForDay.endTime.match(/(\d+):(\d+) ([AP]M)/);

        if (startTimeParts && endTimeParts) {
          let startHour = parseInt(startTimeParts[1]);
          const startMinute = parseInt(startTimeParts[2]);
          const startAmPm = startTimeParts[3];

          let endHour = parseInt(endTimeParts[1]);
          const endMinute = parseInt(endTimeParts[2]);
          const endAmPm = endTimeParts[3];

          // Convert to 24-hour format
          if (startAmPm === "PM" && startHour < 12) startHour += 12;
          if (startAmPm === "AM" && startHour === 12) startHour = 0;

          if (endAmPm === "PM" && endHour < 12) endHour += 12;
          if (endAmPm === "AM" && endHour === 12) endHour = 0;

          // Calculate total minutes in the working day
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;

          // If today, adjust start minutes to current time + buffer
          let effectiveStartMinutes = startMinutes;
          if (isToday) {
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            const currentTotalMinutes = currentHour * 60 + currentMinute + 15; // Add 15-minute buffer

            // If current time (with buffer) is after start time, use current time instead
            if (currentTotalMinutes > startMinutes) {
              effectiveStartMinutes = currentTotalMinutes;
              // Round up to the next 30-minute slot
              effectiveStartMinutes =
                Math.ceil(effectiveStartMinutes / 30) * 30;
            }
          }

          // If adjusted start time is after end time, no slots available
          if (effectiveStartMinutes >= endMinutes) {
            availableSlotsCount = 0;
          } else {
            const totalMinutes = endMinutes - effectiveStartMinutes;
            // Calculate total 30-minute slots
            const totalSlots = Math.floor(totalMinutes / 30);

            // Get booked slots for this date
            const bookedSlots = bookedDates[dateStr] || [];

            // Simple approximation: each booking takes one slot
            availableSlotsCount = totalSlots - bookedSlots.length;
            if (availableSlotsCount < 0) availableSlotsCount = 0;
          }
        }
      }

      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek,
        dayName,
        isWorkingDay,
        isPastDate,
        isToday,
        hasAvailableSlots:
          isWorkingDay && !isPastDate && availableSlotsCount > 0,
        availableSlotsCount:
          isWorkingDay && !isPastDate ? availableSlotsCount : 0,
        workingHours: isWorkingDay
          ? {
            startTime: workingHoursForDay.startTime,
            endTime: workingHoursForDay.endTime,
          }
          : null,
      });
    }

    // Send the calendar data to the client
    res.json({
      success: true,
      data: {
        provider: {
          id: provider.id,
          provider_name: provider.provider_name,
        },
        calendar: {
          year: currentYear,
          month: currentMonth,
          days: calendarDays,
        },
      },
    });
  } catch (error) {
    console.error("Get available dates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Auto-confirm an appointment (system function)
// @route   PUT /api/v1/appointments/:appointmentId/auto-confirm
// @access  Public (internal system use)
const autoConfirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Find the appointment
    const appointment = await Appointment.findOne({
      id: appointmentId,
      is_deleted: false,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment is already confirmed or cancelled
    if (appointment.status === "confirmed") {
      return res.status(200).json({
        success: true,
        message: "Appointment is already confirmed",
        data: {
          appointment: {
            id: appointment.id,
            status: appointment.status,
            provider_name: provider.provider_name,
            appointment_date: appointment.appointment_date,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
          },
        },
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Appointment is already ${appointment.status}`,
      });
    }

    // Get provider details
    const provider = await Provider.findOne({ id: appointment.provider_id });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Check if provider has auto-confirm enabled
    if (!provider.auto_confirm_appointments) {
      return res.status(400).json({
        success: false,
        message: "Provider has auto-confirm disabled",
      });
    }

    // Update appointment status to confirmed
    appointment.status = "confirmed";
    appointment.updated_at = new Date();
    await appointment.save();

    // Get patient and service details for notifications
    const [patient, service] = await Promise.all([
      User.findOne({ id: appointment.patient_id }),
      Service.findOne({ id: appointment.service_id }),
    ]);

    // Send confirmation notifications in background
    if (patient && service) {
      setImmediate(() => {
        setTimeout(async () => {
          try {
            await notificationService.sendAppointmentNotifications(
              patient,
              provider,
              appointment,
            );
          } catch (error) {
            console.error("Auto-confirm notification error:", error);
          }
        }, 100);
      });
    }

    res.json({
      success: true,
      message: "Appointment auto-confirmed successfully",
      data: {
        appointment: {
          id: appointment.id,
          status: appointment.status,
          provider_name: provider.provider_name,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
        },
      },
    });
  } catch (error) {
    console.error("Auto-confirm appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Book an appointment on behalf of a patient (Clinician only)
// @route   POST /api/v1/appointments/clinician/book
// @access  Private (Clinician only)
const bookAppointmentByClinician = async (req, res) => {
  try {
    const clinicianId = req.user.id;
    const clinicianUser = req.user;

    const {
      providerId,
      serviceId,
      date,
      start_time,
      end_time,
      patientId: inputPatientId,
      patientEmail: inputPatientEmail,
      patientName: inputPatientName,
      patientPhone: inputPatientPhone,
      patientAddress: inputPatientAddress,
      patientGender: inputPatientGender,
      patientDOB: inputPatientDOB,
      formData = {},
      notes = "",
    } = req.body;

    if (!providerId || !serviceId || !date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message:
          "Provider ID, service ID, date, start time, and end time are required",
      });
    }

    const patientEmail = (inputPatientEmail || formData.patientEmail || "")
      .toLowerCase()
      .trim();
    const patientIdParam = inputPatientId || formData.patientId;
    const patientName = inputPatientName || formData.patientName;
    const patientPhone = inputPatientPhone || formData.patientPhone;
    const patientAddress = inputPatientAddress || formData.patientAddress;
    const patientGender = inputPatientGender || formData.patientGender;
    const patientDOB = inputPatientDOB || formData.patientDOB;

    if (!patientIdParam && !patientEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Either patientId or patientEmail is required to book an appointment for a patient",
      });
    }

    // Resolve or create patient
    let patient;
    let patientId;

    if (patientIdParam) {
      patient = await User.findOne({ id: patientIdParam });
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: `Patient with ID ${patientIdParam} not found`,
        });
      }
      patientId = patient.id;
    } else {
      patient = await User.findOne({ email: patientEmail });
      if (patient) {
        patientId = patient.id;
      } else {
        // Check if phone number is already in use by another patient
        if (patientPhone) {
          const phoneExists = await User.findOne({
            phone_number: patientPhone.trim(),
            user_type: "Patient",
          });
          if (phoneExists) {
            return res.status(400).json({
              success: false,
              message:
                "Phone number is already registered to an existing patient.",
            });
          }
        }

        const guestPassword = nanoid(10);
        patient = new User({
          full_name: patientName || "Patient",
          email: patientEmail,
          user_type: "Patient",
          password: guestPassword,
          email_verified: false,
          phone_number: patientPhone ? patientPhone.trim() : "",
          location_details: {
            address: patientAddress || "",
          },
          personal_details: {
            gender: patientGender || "",
            date_of_birth: patientDOB || "",
          },
          metadata: {
            added_by_provider: clinicianId,
            added_at: new Date(),
          },
        });
        await patient.save();
        patientId = patient.id;
      }
    }

    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD format.",
      });
    }

    // Prevent past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot book appointments for past dates",
      });
    }

    // Parse time helper
    const parseTimeString = (timeStr) => {
      const [timePart, ampm] = timeStr.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
      else if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
      return { hours, minutes };
    };

    // Buffer check for today
    const now = new Date();
    const isToday =
      appointmentDate.getDate() === now.getDate() &&
      appointmentDate.getMonth() === now.getMonth() &&
      appointmentDate.getFullYear() === now.getFullYear();

    if (isToday) {
      const startTimeObj = parseTimeString(start_time);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(
        startTimeObj.hours,
        startTimeObj.minutes,
        0,
        0,
      );
      const bufferTime = new Date(now.getTime() + 15 * 60 * 1000);
      if (appointmentDateTime < bufferTime) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot book appointments for times that have already passed or are within 15 minutes from now",
        });
      }
    }

    // Provider & Service
    const [provider, service] = await Promise.all([
      Provider.findOne({ id: providerId }),
      Service.findOne({ id: serviceId }),
    ]);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }
    if (service.provider_id !== providerId) {
      return res.status(400).json({
        success: false,
        message: "Service does not belong to the specified provider",
      });
    }

    // Check working hours
    const dayOfWeek = appointmentDate.getDay();
    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayOfWeek];
    const workingHoursForDay = provider.working_hours.find(
      (h) => h.day === dayName,
    );
    const isWorkingDay = workingHoursForDay && workingHoursForDay.isAvailable;
    if (!isWorkingDay) {
      console.log(`[Clinician Book Appointment] Booking on non-working day (${dayName}) for ${provider.provider_name}, accepting under clinical discretion.`);
    }

    const defaultStart = { hours: 8, minutes: 0 };
    const defaultEnd = { hours: 21, minutes: 0 };
    const providerStartTime = workingHoursForDay ? parseTimeString(workingHoursForDay.startTime) : defaultStart;
    const providerEndTime = workingHoursForDay ? parseTimeString(workingHoursForDay.endTime) : defaultEnd;
    const requestedStartTime = parseTimeString(start_time);
    const requestedEndTime = parseTimeString(end_time);
    const toMinutes = (time) => time.hours * 60 + time.minutes;

    if (
      toMinutes(requestedStartTime) < toMinutes(providerStartTime) ||
      toMinutes(requestedEndTime) > toMinutes(providerEndTime)
    ) {
      console.log(`[Clinician Book Appointment] Booking slot (${start_time} - ${end_time}) outside standard provider hours, accepting under clinical discretion.`);
    }

    // Check collision
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      provider_id: providerId,
      appointment_date: { $gte: startOfDay, $lte: endOfDay },
      start_time: start_time,
      end_time: end_time,
      status: { $nin: ["cancelled", "rejected"] },
      is_deleted: false,
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked. Please choose another time.",
      });
    }

    // Clinician booking has not yet been paid for, so it MUST always start as pending
    const initialStatus = "pending";
    const appointmentId = nanoid(10);
    const timestamp = Date.now();
    const timeSlotId = `${providerId}_${date.replace(/-/g, "")}_${start_time.replace(/[: ]/g, "")}_${end_time.replace(/[: ]/g, "")}_${timestamp}`;

    const actualServiceName =
      req.body.serviceName ||
      formData.serviceName ||
      (req.body.scanType ? `${req.body.scanType}${req.body.bodyPart ? ' (' + req.body.bodyPart + ')' : ''}` : '') ||
      (formData.scanType ? `${formData.scanType}${formData.bodyPart ? ' (' + formData.bodyPart + ')' : ''}` : '') ||
      (service && service.name !== 'Referral Service' ? service.name : '') ||
      'Diagnostic Scan';

    const rawPrice =
      req.body.facilityPrice ??
      req.body.price ??
      req.body.amount ??
      formData.facilityPrice ??
      formData.price ??
      formData.amount;

    const parsedPrice = Number(rawPrice);
    const actualPrice = (!isNaN(parsedPrice) && parsedPrice > 0)
      ? parsedPrice
      : (service && service.name !== 'Referral Service' ? service.price : 0);

    const appointment = await Appointment.create({
      id: appointmentId,
      patient_id: patientId,
      provider_id: providerId,
      clinician_id: clinicianId,
      time_slot_id: timeSlotId,
      service_id: serviceId,
      formData: {
        forWhom: "Other",
        visitedBefore:
          formData.visitedBefore === true || formData.visitedBefore === "true",
        identificationNumber: formData.identificationNumber || req.body.identificationNumber || "",
        referralId: formData.referralId || req.body.referralId || formData.identificationNumber || req.body.identificationNumber || "",
        serviceName: actualServiceName,
        facilityPrice: actualPrice,
        price: actualPrice,
        amount: actualPrice,
        scanType: req.body.scanType || formData.scanType || "",
        bodyPart: req.body.bodyPart || formData.bodyPart || "",
        facilityName: req.body.facilityName || formData.facilityName || provider?.provider_name || "",
        comments: formData.comments || "",
        communicationPreference: formData.communicationPreference || "Both",
        patientName: patientName || patient.full_name || "",
        patientEmail: patientEmail || patient.email || "",
        patientPhone: patientPhone || patient.phone_number || "",
        patientAddress:
          patientAddress || patient.location_details?.address || "",
        patientGender:
          patientGender || patient.personal_details?.gender || "",
        patientDOB:
          patientDOB || patient.personal_details?.date_of_birth || "",
        bookedByClinician: true,
        clinicianId: clinicianId,
        clinicianName: clinicianUser.full_name,
        clinicianEmail: clinicianUser.email,
      },
      payment: {
        status: "pending",
        amount: actualPrice,
      },
      appointment_date: appointmentDate,
      start_time: start_time,
      end_time: end_time,
      status: initialStatus,
      notes: notes || "",
    });

    // Background notifications
    setImmediate(() => {
      setTimeout(async () => {
        try {
          await Promise.all([
            notificationService
              .sendPendingAppointmentNotification(
                patient,
                provider,
                appointment,
              )
              .catch((err) =>
                console.error("[Clinician Book] Provider notif error:", err),
              ),
            notificationService
              .sendReferralPaymentRequiredNotification(
                patient,
                provider,
                appointment,
                service,
                clinicianUser,
              )
              .catch((err) =>
                console.error("[Clinician Book] Patient referral payment notif error:", err),
              ),
          ]);
        } catch (notifErr) {
          console.error("[Clinician Book] Notification error:", notifErr);
        }
      }, 100);
    });

    // Link and update matching Referral in MongoDB
    const referralIdToMatch = formData?.referralId || formData?.identificationNumber || req.body.referralId || req.body.identificationNumber;
    if (referralIdToMatch) {
      try {
        const ReferralModel = mongoose.models.Referral || mongoose.model("Referral", new mongoose.Schema({}, { strict: false }));
        ReferralModel.updateMany(
          { referralId: referralIdToMatch },
          {
            $set: {
              patientAppointmentId: appointment.id,
              clinicianAppointmentId: appointment.id,
              patientSyncStatus: "Synced",
              clinicianSyncStatus: "Synced",
              patientSyncError: "",
              clinicianSyncError: "",
              status: "Booking in Progress",
            },
          }
        ).catch((err) => console.warn("[Clinician Book] Referral sync error:", err.message));
      } catch (_) {}
    }

    return res.status(201).json({
      success: true,
      message: "Appointment successfully booked for patient by clinician. Patient has been notified to complete payment.",
      data: {
        appointment,
        patient: {
          id: patient.id,
          name: patient.full_name,
          email: patient.email,
          phone: patient.phone_number,
        },
        clinician: {
          id: clinicianUser.id,
          name: clinicianUser.full_name,
          email: clinicianUser.email,
        },
        provider: {
          id: provider.id,
          name: provider.provider_name,
        },
        service: {
          id: service.id,
          name: (service.name && service.name !== 'Referral Service') ? service.name : actualServiceName,
          price: actualPrice,
        },
      },
    });
  } catch (error) {
    console.error("[Clinician Book Appointment] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error booking appointment for patient",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get appointments booked by clinician
// @route   GET /api/v1/appointments/clinician
// @access  Private (Clinician only)
const getClinicianAppointments = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const clinicianId = req.user.id;
    const clinicianEmail = req.user.email;

    const clinicianFilters = [
      { clinician_id: clinicianId },
      { "formData.clinicianId": clinicianId },
    ];
    if (clinicianEmail) {
      clinicianFilters.push({ "formData.clinicianEmail": new RegExp(`^${clinicianEmail.trim()}$`, "i") });
    }

    const appointments = await Appointment.find({
      $or: clinicianFilters,
      is_deleted: { $ne: true },
    })
      .populate("patient", "id full_name email phone_number")
      .populate("service", "id name price category")
      .sort({ appointment_date: -1, created_at: -1 })
      .lean();

    // Attach provider details
    const providerIds = [
      ...new Set(appointments.map((a) => a.provider_id).filter(Boolean)),
    ];
    const providers = await Provider.find({ id: { $in: providerIds } })
      .select("id provider_name address phone")
      .lean();
    const providerMap = new Map(providers.map((p) => [p.id, p]));

    const formattedAppointments = appointments.map((appointment) => {
      const provider = providerMap.get(appointment.provider_id);
      return {
        id: appointment.id,
        date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        payment: appointment.payment,
        notes: appointment.notes,
        provider: provider
          ? {
              id: provider.id,
              name: provider.provider_name,
              address: provider.address,
            }
          : { id: appointment.provider_id, name: "Unknown Provider" },
        patient: appointment.patient
          ? {
              id: appointment.patient.id,
              name: appointment.patient.full_name,
              email: appointment.patient.email,
              phone: appointment.patient.phone_number,
            }
          : {
              name: appointment.formData?.patientName || "Patient",
              email: appointment.formData?.patientEmail || "",
              phone: appointment.formData?.patientPhone || "",
            },
        service: appointment.service || null,
        formData: appointment.formData,
        created_at: appointment.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        appointments: formattedAppointments,
      },
    });
  } catch (error) {
    console.error("Get clinician appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching clinician appointments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get single appointment details (with payment status and clinician referral info)
// @route   GET /api/v1/appointments/:appointmentId
// @access  Public / Optional Auth
const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findOne({
      id: appointmentId,
      is_deleted: { $ne: true },
    }).lean();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const [provider, service, clinician, patient] = await Promise.all([
      Provider.findOne({ id: appointment.provider_id })
        .select("id provider_name address phone_number work_email working_hours")
        .lean(),
      Service.findOne({ id: appointment.service_id })
        .select("id name category price description")
        .lean(),
      appointment.clinician_id
        ? User.findOne({ id: appointment.clinician_id })
            .select("id full_name email phone_number specialty practiceName")
            .lean()
        : null,
      User.findOne({ id: appointment.patient_id })
        .select("id full_name email phone_number location_details personal_details")
        .lean(),
    ]);

    const isBookedByClinician = Boolean(
      appointment.clinician_id || appointment.formData?.bookedByClinician,
    );
    const isPaid = appointment.payment?.status === "completed";

    return res.json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          provider_id: appointment.provider_id,
          provider_name: provider ? provider.provider_name : "Unknown Provider",
          provider: provider || { id: appointment.provider_id, provider_name: "Unknown Provider" },
          service: resolveAppointmentServiceAndPrice(appointment, service),
          patient_id: appointment.patient_id,
          patient: {
            id: patient?.id || appointment.patient_id,
            name: appointment.formData?.patientName || patient?.full_name || "Patient",
            email: appointment.formData?.patientEmail || patient?.email || "",
            phone: appointment.formData?.patientPhone || patient?.phone_number || "",
          },
          clinician_id: appointment.clinician_id || null,
          bookedByClinician: isBookedByClinician,
          clinician: isBookedByClinician
            ? {
                id: appointment.clinician_id || appointment.formData?.clinicianId || "",
                name: clinician?.full_name || appointment.formData?.clinicianName || "Clinician",
                email: clinician?.email || appointment.formData?.clinicianEmail || "",
                phone: clinician?.phone_number || "",
              }
            : null,
          date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          payment: {
            ...appointment.payment,
            amount: resolveAppointmentServiceAndPrice(appointment, service).price,
          },
          isPaid,
          paymentRequired: !isPaid,
          paymentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/appointments/${appointment.id}/pay`,
          notes: appointment.notes,
          formData: appointment.formData,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at,
        },
      },
    });
  } catch (error) {
    console.error("Get appointment by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving appointment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Send / Resend payment required email to patient for an unpaid appointment
// @route   POST /api/v1/appointments/:appointmentId/send-payment-email
// @access  Public / Optional Auth
const sendAppointmentPaymentEmail = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findOne({
      id: appointmentId,
      is_deleted: { $ne: true },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.payment?.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already paid and confirmed",
      });
    }

    const [provider, service, clinician, patient] = await Promise.all([
      Provider.findOne({ id: appointment.provider_id }),
      Service.findOne({ id: appointment.service_id }),
      appointment.clinician_id ? User.findOne({ id: appointment.clinician_id }) : null,
      User.findOne({ id: appointment.patient_id }),
    ]);

    await notificationService.sendReferralPaymentRequiredNotification(
      patient || { full_name: appointment.formData?.patientName, email: appointment.formData?.patientEmail },
      provider || { provider_name: "Medical Diagnostic Center" },
      appointment,
      service || { name: "Diagnostic Scan", price: appointment.payment?.amount || 0 },
      clinician || { full_name: appointment.formData?.clinicianName, email: appointment.formData?.clinicianEmail },
    );

    return res.json({
      success: true,
      message: "Payment required notification email sent successfully to patient",
      data: {
        appointmentId: appointment.id,
        recipient: appointment.formData?.patientEmail || patient?.email,
      },
    });
  } catch (error) {
    console.error("Send appointment payment email error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send payment email",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getAvailableSlots,
  bookAppointment,
  bookAppointmentByClinician,
  getClinicianAppointments,
  getPatientAppointments,
  getProviderAppointments,
  getAppointmentById,
  sendAppointmentPaymentEmail,
  cancelAppointment,
  confirmAppointment,
  autoConfirmAppointment,
  deleteAppointment,
  getAvailableDates,
};
