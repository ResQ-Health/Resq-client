// Payment controller
const mongoose = require("mongoose");
const axios = require("axios");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const User = require("../models/User");
const Provider = require("../models/Provider");
const crypto = require("crypto");
const notificationService = require("../services/notificationService");
const pdfService = require("../services/pdfService");
const multer = require("multer");
const { sendEmailWithAttachment } = require("../config/email");

// Configure multer for PDF file uploads (memory storage)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// @desc    Initialize payment for an appointment
// @route   POST /api/payments/initialize
// @access  Private
const initializePayment = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId || req.body.appointment_id;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
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

    // Get patient details from the appointment
    const patient = await User.findOne({ id: appointment.patient_id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found for this appointment",
      });
    }
    const userId = patient.id;

    // Check if appointment is already paid
    if (appointment.payment && appointment.payment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been completed for this appointment",
      });
    }

    // Check if appointment status is appropriate for payment
    // Only allow payments for pending appointments or appointments that are already confirmed but not paid
    if (
      appointment.status !== "confirmed" &&
      appointment.status !== "pending"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for an appointment with status: ${appointment.status}`,
      });
    }

    // If appointment is already confirmed, handle payment retry logic
    if (appointment.status === "confirmed") {
      // Check if there's any payment record at all
      if (appointment.payment && appointment.payment.status) {
        // If payment is completed, don't allow a new payment
        if (appointment.payment.status === "completed") {
          return res.status(400).json({
            success: false,
            message: "Payment has already been completed for this appointment",
          });
        }

        // If payment is pending, allow retry immediately (no timing restrictions)
        if (appointment.payment.status === "pending") {
          console.log(
            `Allowing payment retry for appointment ${appointment.id} - no timing restrictions`,
          );
        }

        // If payment failed, allow retry by continuing with new payment
        if (appointment.payment.status === "failed") {
          console.log(
            `Allowing payment retry for appointment ${appointment.id} after failed payment`,
          );
        }
      }
    }

    // No timing restrictions - payments can be initiated immediately

    // Get service details to confirm price
    const service = await Service.findOne({ id: appointment.service_id });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Determine patient frontend client URL for callback redirect
    let patientAppUrl = process.env.PATIENT_FRONTEND_URL || 'http://localhost:5174';
    if (process.env.NODE_ENV === 'production' && patientAppUrl.includes('localhost')) {
      patientAppUrl = process.env.STAGING_URL || 'https://resq-client.vercel.app';
    }
    patientAppUrl = patientAppUrl.replace(/\/+$/, '');

    // Default to /booking-history on the patient portal (port 5174)
    const callbackUrl = (req.body.callback_url || req.body.callbackUrl)
      ? (req.body.callback_url || req.body.callbackUrl)
      : `${patientAppUrl}/booking-history`;

    // Initialize payment with Paystack
    const effectiveServiceName =
      appointment.formData?.serviceName ||
      (appointment.formData?.scanType ? `${appointment.formData.scanType}${appointment.formData.bodyPart ? ' (' + appointment.formData.bodyPart + ')' : ''}` : '') ||
      (service && service.name !== 'Referral Service' ? service.name : '') ||
      'Diagnostic Scan';
    const effectiveAmount =
      Number(appointment.payment?.amount) ||
      Number(appointment.formData?.facilityPrice) ||
      Number(appointment.formData?.price) ||
      Number(appointment.formData?.amount) ||
      (service && service.name !== 'Referral Service' ? service.price : 0);
    const paymentData = {
      email: patient.email,
      amount: effectiveAmount * 100, // Paystack amount is in kobo (100 kobo = 1 Naira)
      reference: `RESQ-${appointment.id}-${Date.now()}`,
      metadata: {
        appointment_id: appointment.id,
        patient_id: patient.id,
        service_id: service.id,
        custom_fields: [
          {
            display_name: "Appointment Date",
            variable_name: "appointment_date",
            value: new Date(appointment.appointment_date).toLocaleDateString(),
          },
          {
            display_name: "Service",
            variable_name: "service_name",
            value: effectiveServiceName,
          },
        ],
      },
      callback_url: callbackUrl,
    };

    try {
      // Make the Paystack API call
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Update appointment with payment reference
      appointment.payment = {
        ...appointment.payment,
        paystackReference: response.data.data.reference,
      };
      await appointment.save();

      res.json({
        success: true,
        message: "Payment initialized successfully",
        data: {
          authorization_url: response.data.data.authorization_url,
          reference: response.data.data.reference,
        },
      });
    } catch (paystackError) {
      // Handle Paystack API errors specifically
      console.error(
        "Paystack API error:",
        paystackError.response?.data || paystackError.message,
      );

      if (paystackError.response?.status === 401) {
        // Return a more helpful error message for unauthorized errors
        return res.status(400).json({
          success: false,
          message:
            "Payment provider authorization failed. Please contact support.",
          errorDetails:
            "Your Paystack API key may be invalid or your IP address may not be whitelisted.",
          action:
            "Please add your current IP address to the Paystack IP whitelist in your Paystack dashboard.",
        });
      }

      throw paystackError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error("Initialize payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Verify payment for an appointment
// @route   GET /api/payments/verify/:reference
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    // Check if this reference has already been processed
    const existingPayment = await Appointment.findOne({
      "payment.paystackReference": reference,
      "payment.status": "completed",
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "This payment has already been processed",
        data: {
          appointment_id: existingPayment.id,
          payment_status: "completed",
          amount: existingPayment.payment.amount,
        },
      });
    }

    try {
      // Verify payment with Paystack
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      // Extract appointment ID from metadata
      const appointmentId = response.data.data.metadata.appointment_id;

      // Find the appointment
      let appointment = await Appointment.findOne({ id: appointmentId });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      // Get patient and provider details
      const patient = await User.findOne({ id: appointment.patient_id });
      const provider = await Provider.findOne({ id: appointment.provider_id });
      const service = await Service.findOne({ id: appointment.service_id });

      // Check if payment was successful
      if (
        response.data.status === false ||
        response.data.data.status !== "success"
      ) {
        // Payment failed or abandoned - update status and notify patient
        const paystackStatus = response.data.data.status;
        const failureReason =
          response.data.data.gateway_response ||
          response.data.message ||
          "Payment verification failed";

        appointment.payment = {
          status: "failed",
          method:
            response.data?.data?.channel ||
            response.data?.data?.authorization?.channel ||
            "paystack",
          paystackReference: reference,
          amount: response.data.data?.amount
            ? response.data.data.amount / 100
            : service.price,
          paidAt: new Date(),
        };
        await appointment.save();

        // Send failed payment notification to patient
        await notificationService.sendPaymentFailureNotification(
          patient,
          provider,
          appointment,
          service,
          `${failureReason} (Status: ${paystackStatus})`,
        );

        return res.status(400).json({
          success: false,
          message: `Payment ${paystackStatus}. ${failureReason}`,
          data: {
            paystack_status: paystackStatus,
            reason: failureReason,
            can_retry: paystackStatus === "abandoned",
          },
        });
      }

      // Check if payment is already completed for this appointment
      if (appointment.payment && appointment.payment.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Payment has already been completed for this appointment",
          data: {
            appointment_id: appointmentId,
            payment_status: "completed",
            amount: appointment.payment.amount,
          },
        });
      }

      // Additional check: If the appointment is already confirmed and has a payment status that's not failed,
      // don't process this payment to avoid duplicate payments
      if (
        appointment.status === "confirmed" &&
        appointment.payment &&
        appointment.payment.status &&
        appointment.payment.status !== "failed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This appointment is already confirmed and has a payment in process or completed",
          data: {
            appointment_id: appointmentId,
            appointment_status: appointment.status,
            payment_status: appointment.payment.status,
          },
        });
      }

      // Update payment status and auto-confirm appointment if provider has auto-confirm enabled
      appointment.payment = {
        status: "completed",
        method:
          response.data?.data?.channel ||
          response.data?.data?.authorization?.channel ||
          "paystack",
        paystackReference: reference,
        amount: response.data.data.amount / 100, // Convert from kobo to Naira
        paidAt: new Date(),
        receipt: {
          patient: {
            name: (
              patient.full_name ||
              `${patient.personal_details?.first_name || ""} ${patient.personal_details?.last_name || ""}`.trim()
            ).trim(),
            email: patient.email,
            mobile_number:
              patient.phone_number ||
              patient.contact_details?.phone_number ||
              "",
            address: patient.location_details?.address || "",
            gender: patient.personal_details?.gender || "",
            date_of_birth: patient.personal_details?.date_of_birth || "",
          },
          appointment: {
            location: provider.address,
            type: service.name,
            date: appointment.appointment_date,
            time: appointment.start_time,
            booking_id: appointment.id,
          },
          payment_summary: {
            payment_method:
              response.data?.data?.channel ||
              response.data?.data?.authorization?.channel ||
              "paystack",
            service_cost: `₦${service.price}`,
            coupon: "None",
            total: `₦${response.data.data.amount / 100}`,
          },
        },
      };

      // Confirm appointment status upon successful payment
      appointment.status = "confirmed";
      appointment.updated_at = new Date();
      console.log(
        `Confirming appointment ${appointmentId} after successful payment`,
      );

      await appointment.save();

      // Also sync matching Referral in shared DB if exists
      try {
        const ReferralModel =
          mongoose.models.Referral ||
          mongoose.model(
            "Referral",
            new mongoose.Schema({}, { strict: false }),
          );
        await ReferralModel.updateMany(
          {
            $or: [
              { patientAppointmentId: appointment.id },
              { clinicianAppointmentId: appointment.id },
              { referralId: appointment.formData?.referralId },
              { referralId: appointment.formData?.identificationNumber },
            ].filter(Boolean),
          },
          {
            $set: {
              status: "Confirmed",
              paymentStatus: "Paid",
              "paymentDetails.paidAt": new Date(),
              "paymentDetails.reference": reference,
              "paymentDetails.method":
                response.data?.data?.channel ||
                response.data?.data?.authorization?.channel ||
                "paystack",
            },
          },
        );
      } catch (refErr) {
        console.warn("Matching referral update warning:", refErr.message);
      }

      // Send payment notifications asynchronously (don't wait)
      notificationService
        .sendPaymentNotifications(patient, provider, appointment, service)
        .catch((error) =>
          console.error("Error sending payment notifications:", error),
        );
      notificationService
        .sendPaymentConfirmationToProvider(
          provider,
          patient,
          appointment,
          service,
        )
        .catch((error) =>
          console.error("Error sending provider payment confirmation:", error),
        );

      res.json({
        success: true,
        message: "Payment verified successfully",
        data: {
          appointment_id: appointmentId,
          payment_status: "completed",
          amount: response.data.data.amount / 100,
        },
      });
    } catch (paystackError) {
      // Handle Paystack API errors specifically
      console.error(
        "Paystack verification API error:",
        paystackError.response?.data || paystackError.message,
      );

      if (paystackError.response?.status === 401) {
        // Return a more helpful error message for unauthorized errors
        return res.status(400).json({
          success: false,
          message:
            "Payment provider authorization failed. Please contact support.",
          errorDetails:
            "Your Paystack API key may be invalid or your IP address may not be whitelisted.",
          action:
            "Please add your current IP address to the Paystack IP whitelist in your Paystack dashboard.",
        });
      }

      throw paystackError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Handle Paystack webhook
// @route   POST /api/payments/webhook
// @access  Public
const paystackWebhook = async (req, res) => {
  try {
    // Validate event
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).json({ status: false });
    }

    // Process the event
    const event = req.body;

    // Handle successful charge
    if (event.event === "charge.success") {
      const { reference } = event.data;
      const appointmentId = event.data.metadata.appointment_id;

      // Check if this reference has already been processed
      const existingPayment = await Appointment.findOne({
        "payment.paystackReference": reference,
        "payment.status": "completed",
      });

      // If payment already processed, acknowledge but don't process again
      if (existingPayment) {
        console.log(
          `Payment with reference ${reference} has already been processed. Skipping.`,
        );
        return res.status(200).json({ received: true });
      }

      // Update appointment payment status
      let appointment = await Appointment.findOne({ id: appointmentId });

      if (appointment) {
        // Check if payment is already completed for this appointment
        if (appointment.payment && appointment.payment.status === "completed") {
          console.log(
            `Payment for appointment ${appointmentId} has already been completed. Skipping.`,
          );
          return res.status(200).json({ received: true });
        }

        // Additional check: If the appointment is already confirmed and has a payment status that's not failed,
        // don't process this payment to avoid duplicate payments
        if (
          appointment.status === "confirmed" &&
          appointment.payment &&
          appointment.payment.status &&
          appointment.payment.status !== "failed"
        ) {
          console.log(
            `Appointment ${appointmentId} is already confirmed with payment status ${appointment.payment.status}. Skipping to avoid duplicate payment.`,
          );
          return res.status(200).json({ received: true });
        }

        // Get patient, provider, and service details before using them
        const [patient, provider, service] = await Promise.all([
          User.findOne({ id: appointment.patient_id }),
          Provider.findOne({ id: appointment.provider_id }),
          Service.findOne({ id: appointment.service_id }),
        ]);

        if (!patient || !provider || !service) {
          console.error(
            `Could not find patient, provider, or service for appointment ${appointmentId}. Patient: ${!!patient}, Provider: ${!!provider}, Service: ${!!service}`,
          );
          // Still save the payment status even if we can't get all details
          appointment.payment = {
            status: "completed",
            method: event.data?.channel || event.data?.authorization?.channel || "paystack",
            paystackReference: reference,
            amount: event.data.amount / 100,
            paidAt: new Date(),
          };
          await appointment.save();
          return res.status(200).json({ received: true });
        }

        appointment.payment = {
          status: "completed",
          method: event.data?.channel || event.data?.authorization?.channel || "paystack",
          paystackReference: reference,
          amount: event.data.amount / 100, // Convert from kobo to Naira
          paidAt: new Date(),
          receipt: {
            patient: {
              name: (
                patient.full_name ||
                `${patient.personal_details?.first_name || ""} ${patient.personal_details?.last_name || ""}`.trim()
              ).trim(),
              email: patient.email,
              mobile_number:
                patient.phone_number ||
                patient.contact_details?.phone_number ||
                "",
              address: patient.location_details?.address || "",
              gender: patient.personal_details?.gender || "",
              date_of_birth: patient.personal_details?.date_of_birth || "",
            },
            appointment: {
              location: provider.address,
              type: service.name,
              date: appointment.appointment_date,
              time: appointment.start_time,
              booking_id: appointment.id,
            },
            payment_summary: {
              payment_method: event.data?.channel || event.data?.authorization?.channel || "paystack",
              service_cost: `₦${service.price}`,
              coupon: "None",
              total: `₦${event.data.amount / 100}`,
            },
          },
        };

        // Update appointment status to confirmed upon successful payment
        appointment.status = "confirmed";
        appointment.updated_at = new Date();
        console.log(
          `Confirming appointment ${appointmentId} after successful payment via webhook`,
        );

        await appointment.save();

        // Also sync matching Referral in shared DB if exists
        try {
          const ReferralModel =
            mongoose.models.Referral ||
            mongoose.model(
              "Referral",
              new mongoose.Schema({}, { strict: false }),
            );
          await ReferralModel.updateMany(
            {
              $or: [
                { patientAppointmentId: appointment.id },
                { clinicianAppointmentId: appointment.id },
                { referralId: appointment.formData?.referralId },
                { referralId: appointment.formData?.identificationNumber },
              ].filter(Boolean),
            },
            {
              $set: {
                status: "Confirmed",
                paymentStatus: "Paid",
                "paymentDetails.paidAt": new Date(),
                "paymentDetails.reference": event.data.reference,
                "paymentDetails.method":
                  event.data?.channel ||
                  event.data?.authorization?.channel ||
                  "paystack",
              },
            },
          );
        } catch (refErr) {
          console.warn("Matching referral update warning in webhook:", refErr.message);
        }

        // Send payment notifications
        await notificationService.sendPaymentNotifications(
          patient,
          provider,
          appointment,
          service,
        );
        await notificationService.sendPaymentConfirmationToProvider(
          provider,
          patient,
          appointment,
          service,
        );
      }
    }
    // Handle failed charge
    else if (event.event === "charge.failed") {
      const { reference } = event.data;
      const appointmentId = event.data.metadata?.appointment_id;

      if (!appointmentId) {
        console.log("No appointment ID found in failed payment metadata");
        return res.status(200).json({ received: true });
      }

      // Update appointment payment status
      const appointment = await Appointment.findOne({ id: appointmentId });

      if (appointment) {
        // Only update if payment is not already completed
        if (appointment.payment && appointment.payment.status !== "completed") {
          appointment.payment = {
            status: "failed",
            paystackReference: reference,
            amount: event.data.amount / 100, // Convert from kobo to Naira
            paidAt: new Date(),
          };
          await appointment.save();

          // Get patient and provider details for notification
          const patient = await User.findOne({ id: appointment.patient_id });
          const provider = await Provider.findOne({
            id: appointment.provider_id,
          });
          const service = await Service.findOne({ id: appointment.service_id });

          // Send payment failure notification
          await notificationService.sendPaymentFailureNotification(
            patient,
            provider,
            appointment,
            service,
            event.data.gateway_response || "Payment failed",
          );
        }
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    res.status(500).json({ status: false });
  }
};

// Note: Appointment status can be automatically confirmed after payment if provider has auto-confirm enabled
// Otherwise, appointment status is changed only by provider manual confirmation

// @desc    Verify payment by appointmentId (uses stored reference)
// @route   POST /api/payments/verify-by-appointment
// @access  Private
const verifyPaymentByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res
        .status(400)
        .json({ success: false, message: "Appointment ID is required" });
    }

    // Find the appointment
    let appointment = await Appointment.findOne({ id: appointmentId });
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Ensure a reference exists
    const reference = appointment.payment?.paystackReference;
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "No payment reference found for this appointment",
      });
    }

    // If already completed, short-circuit
    if (appointment.payment && appointment.payment.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Payment already completed",
        data: {
          appointment_id: appointment.id,
          payment_status: "completed",
          amount: appointment.payment.amount,
        },
      });
    }

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

    const data = response.data;
    if (data.status === false || data.data.status !== "success") {
      // Mark as failed
      const paystackStatus = data.data.status;
      const failureReason =
        data.data.gateway_response ||
        data.message ||
        "Payment verification failed";

      appointment.payment = {
        status: "failed",
        paystackReference: reference,
        amount: data.data?.amount
          ? data.data.amount / 100
          : appointment.payment?.amount,
        paidAt: new Date(),
      };
      await appointment.save();

      const patient = await User.findOne({ id: appointment.patient_id });
      const provider = await Provider.findOne({ id: appointment.provider_id });
      const service = await Service.findOne({ id: appointment.service_id });

      await notificationService.sendPaymentFailureNotification(
        patient,
        provider,
        appointment,
        service,
        `${failureReason} (Status: ${paystackStatus})`,
      );

      return res.status(400).json({
        success: false,
        message: `Payment ${paystackStatus}. ${failureReason}`,
        data: {
          paystack_status: paystackStatus,
          reason: failureReason,
          can_retry: paystackStatus === "abandoned",
        },
      });
    }

    // Success; update payment status only
    appointment.payment = {
      status: "completed",
      paystackReference: reference,
      amount: data.data.amount / 100,
      paidAt: new Date(),
      receipt: {
        patient: {
          name: `${patient.first_name} ${patient.last_name}`,
          email: patient.email,
          mobile_number: patient.mobile_number,
          address: patient.address,
          gender: patient.gender,
          date_of_birth: patient.date_of_birth,
        },
        appointment: {
          location: provider.address,
          type: service.name,
          date: appointment.appointment_date,
          time: appointment.start_time,
          booking_id: appointment.id,
        },
        payment_summary: {
          payment_method: "Card Payment",
          service_cost: `₦${service.price}`,
          coupon: "None",
          total: `₦${data.data.amount / 100}`,
        },
      },
    };

    // Reflect on the status of the appointment: confirmed and paid for!
    appointment.status = "confirmed";
    appointment.updated_at = new Date();
    console.log(
      `Confirming appointment ${appointment.id} after successful payment verification`,
    );

    await appointment.save();

    // Also sync matching Referral in shared DB if exists
    try {
      const ReferralModel =
        mongoose.models.Referral ||
        mongoose.model(
          "Referral",
          new mongoose.Schema({}, { strict: false }),
        );
      await ReferralModel.updateMany(
        {
          $or: [
            { patientAppointmentId: appointment.id },
            { clinicianAppointmentId: appointment.id },
            { referralId: appointment.formData?.referralId },
            { referralId: appointment.formData?.identificationNumber },
          ].filter(Boolean),
        },
        {
          $set: {
            status: "Confirmed",
            paymentStatus: "Paid",
            "paymentDetails.paidAt": new Date(),
            "paymentDetails.reference": reference,
            "paymentDetails.method": "Card Payment",
          },
        },
      );
    } catch (refErr) {
      console.warn("Matching referral update warning on verifyByAppointment:", refErr.message);
    }
    const provider = await Provider.findOne({ id: appointment.provider_id });
    const service = await Service.findOne({ id: appointment.service_id });

    // Send payment notifications asynchronously (don't wait)
    notificationService
      .sendPaymentNotifications(patient, provider, appointment, service)
      .catch((error) =>
        console.error("Error sending payment notifications:", error),
      );
    notificationService
      .sendPaymentConfirmationToProvider(
        provider,
        patient,
        appointment,
        service,
      )
      .catch((error) =>
        console.error("Error sending provider payment confirmation:", error),
      );

    return res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        appointment_id: appointment.id,
        payment_status: "completed",
        amount: data.data.amount / 100,
      },
    });
  } catch (error) {
    console.error("Verify payment by appointment error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Check if payment can be retried
// @route   GET /api/payments/can-retry/:appointmentId
// @access  Private
const canRetryPayment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Find the appointment
    const appointment = await Appointment.findOne({ id: appointmentId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment is confirmed
    if (appointment.status !== "confirmed") {
      return res.json({
        success: true,
        canRetry: false,
        reason: "Appointment must be confirmed before payment can be retried",
      });
    }

    // Check if payment is already completed
    if (appointment.payment && appointment.payment.status === "completed") {
      return res.json({
        success: true,
        canRetry: false,
        reason: "Payment has already been completed for this appointment",
      });
    }

    // No timing restrictions - payments can always be retried if not completed

    // Can retry
    return res.json({
      success: true,
      canRetry: true,
      reason: "Payment can be retried",
    });
  } catch (error) {
    console.error("Can retry payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Retry payment for an appointment
// @route   POST /api/payments/retry
// @access  Private
const retryPayment = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
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

    // Check if appointment is confirmed
    if (appointment.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Appointment must be confirmed before payment can be retried",
      });
    }

    // Check if payment is already completed
    if (appointment.payment && appointment.payment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been completed for this appointment",
      });
    }

    // Reset payment status to allow retry
    if (appointment.payment) {
      appointment.payment.status = "pending";
      appointment.payment.paystackReference = null;
      appointment.payment.paidAt = null;
    }

    await appointment.save();

    // Now call the regular payment initialization
    req.body.appointmentId = appointmentId;
    return await initializePayment(req, res);
  } catch (error) {
    console.error("Retry payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get payment history for a user
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = {
      patient_id: userId,
      "payment.status": { $in: ["completed", "failed"] },
    };

    // Add status filter if provided
    if (status) {
      query["payment.status"] = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get appointments with payment history with retry logic
    let appointments;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        appointments = await Appointment.find(query)
          .select(
            "id appointment_date start_time end_time payment status created_at provider_id service_id",
          )
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .maxTimeMS(10000); // 10 second timeout
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.log(
          `Payment history query attempt ${retryCount} failed:`,
          error.message,
        );

        if (retryCount >= maxRetries) {
          throw error; // Re-throw if max retries reached
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Get total count for pagination with retry logic
    let total;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        total = await Appointment.countDocuments(query).maxTimeMS(10000);
        break;
      } catch (error) {
        retryCount++;
        console.log(`Count query attempt ${retryCount} failed:`, error.message);

        if (retryCount >= maxRetries) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Manually populate provider and service data using the custom id field
    const populatedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        let provider = null;
        let service = null;

        // Get provider data using the custom id field with retry logic
        if (appointment.provider_id) {
          try {
            provider = await Provider.findOne({
              id: appointment.provider_id,
            }).maxTimeMS(5000);
          } catch (error) {
            console.log("Provider lookup failed:", error.message);
            provider = null;
          }
        }

        // Get service data using the custom id field with retry logic
        if (appointment.service_id) {
          try {
            service = await Service.findOne({
              id: appointment.service_id,
            }).maxTimeMS(5000);
          } catch (error) {
            console.log("Service lookup failed:", error.message);
            service = null;
          }
        }

        return {
          ...appointment.toObject(),
          provider_id: provider,
          service_id: service,
        };
      }),
    );

    // Format response
    const paymentHistory = populatedAppointments.map((appointment) => ({
      appointment_id: appointment.id,
      date: appointment.appointment_date,
      time: `${appointment.start_time} - ${appointment.end_time}`,
      provider: {
        name: appointment.provider_id?.provider_name || "Unknown Provider",
        email: appointment.provider_id?.work_email,
        phone: appointment.provider_id?.work_phone,
        address: appointment.provider_id?.address,
      },
      service: {
        name: appointment.service_id?.name || "Unknown Service",
        category: appointment.service_id?.category,
        price: appointment.service_id?.price,
      },
      payment: {
        status: appointment.payment?.status,
        amount: appointment.payment?.amount,
        reference: appointment.payment?.paystackReference,
        paid_at: appointment.payment?.paidAt,
      },
      booking_date: appointment.created_at,
    }));

    res.status(200).json({
      success: true,
      data: paymentHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);

    // Handle specific MongoDB errors
    if (
      error.name === "MongoServerSelectionError" ||
      error.name === "MongoNetworkError"
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Database temporarily unavailable. Please try again in a moment.",
        error: "Database connection error",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get payment receipt PDF
// @route   GET /api/payments/receipt/:appointmentId
// @access  Private
const getPaymentReceipt = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
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

    // Check if payment exists and is completed
    // If payment exists but status is not "completed", try to verify with Paystack
    if (!appointment.payment) {
      return res.status(400).json({
        success: false,
        message: "No payment found for this appointment",
      });
    }

    // Log current payment state for debugging
    console.log(
      `[Receipt] Appointment ${appointmentId} payment state:`,
      JSON.stringify({
        status: appointment.payment?.status,
        hasReference: !!appointment.payment?.paystackReference,
        reference: appointment.payment?.paystackReference,
        amount: appointment.payment?.amount,
        hasPaidAt: !!appointment.payment?.paidAt,
      }),
    );

    // Get patient, provider, and service details first (needed for both verification and receipt generation)
    let [patient, provider, service] = await Promise.all([
      User.findOne({ id: appointment.patient_id }),
      Provider.findOne({ id: appointment.provider_id }),
      Service.findOne({ id: appointment.service_id }),
    ]);

    // If payment status is not "completed", try to verify with Paystack if reference exists
    if (appointment.payment.status !== "completed") {
      // If there's a paystack reference, try to verify the payment
      if (appointment.payment.paystackReference) {
        try {
          console.log(
            `[Receipt] Verifying payment for appointment ${appointmentId} with reference: ${appointment.payment.paystackReference}`,
          );
          const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${appointment.payment.paystackReference}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
            },
          );

          console.log(
            `[Receipt] Paystack verification response for ${appointmentId}:`,
            JSON.stringify({
              status: response.data?.status,
              dataStatus: response.data?.data?.status,
              hasData: !!response.data?.data,
            }),
          );

          // If payment was successful on Paystack, update the appointment
          if (
            response.data?.status === true &&
            response.data?.data?.status === "success"
          ) {
            // Update payment status
            appointment.payment = {
              ...appointment.payment,
              status: "completed",
              amount: response.data.data.amount / 100,
              paidAt: appointment.payment.paidAt || new Date(),
              receipt: appointment.payment.receipt || {
                patient: {
                  name: (
                    patient?.full_name ||
                    `${patient?.personal_details?.first_name || ""} ${patient?.personal_details?.last_name || ""}`.trim()
                  ).trim(),
                  email: patient?.email || "",
                  mobile_number:
                    patient?.phone_number ||
                    patient?.contact_details?.phone_number ||
                    "",
                  address: patient?.location_details?.address || "",
                  gender: patient?.personal_details?.gender || "",
                  date_of_birth: patient?.personal_details?.date_of_birth || "",
                },
                appointment: {
                  location: provider?.address || "",
                  type: service?.name || "",
                  date: appointment.appointment_date,
                  time: appointment.start_time,
                  booking_id: appointment.id,
                },
                payment_summary: {
                  payment_method: "Card Payment",
                  service_cost: `₦${service?.price || 0}`,
                  coupon: "None",
                  total: `₦${response.data.data.amount / 100}`,
                },
              },
            };
            await appointment.save();
            console.log(
              `Updated payment status to completed for appointment ${appointmentId} after verification`,
            );
          } else {
            // Payment not successful on Paystack or unexpected response format
            const paystackStatus = response.data?.data?.status || "unknown";
            const paystackMessage = response.data?.message || "No message";

            // If the stored reference shows "abandoned", try to find a successful transaction
            // This can happen if the user abandoned one payment attempt but completed another
            if (paystackStatus === "abandoned") {
              console.log(
                `[Receipt] Stored reference is abandoned, searching for successful transaction for appointment ${appointmentId}`,
              );

              try {
                // Search for successful transactions for this appointment
                // Try multiple search strategies since Paystack API can be tricky
                let successfulTransaction = null;
                let allTransactions = [];

                // Strategy 1: Search by customer email with success status
                if (patient?.email) {
                  try {
                    const searchResponse = await axios.get(
                      `https://api.paystack.co/transaction?customer=${patient.email}&status=success&perPage=100`,
                      {
                        headers: {
                          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        },
                      },
                    );

                    if (searchResponse.data?.status && searchResponse.data?.data) {
                      const transactions = Array.isArray(searchResponse.data.data)
                        ? searchResponse.data.data
                        : [searchResponse.data.data];
                      allTransactions = [...allTransactions, ...transactions];
                      console.log(
                        `[Receipt] Found ${transactions.length} successful transactions for email ${patient.email}`,
                      );
                    }
                  } catch (emailSearchError) {
                    console.log(
                      `[Receipt] Email search failed: ${emailSearchError.message}`,
                    );
                  }
                }

                // Strategy 2: Search by date range (last 30 days) with success status
                // This helps if the customer email doesn't match exactly
                try {
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  const searchResponse = await axios.get(
                    `https://api.paystack.co/transaction?status=success&from=${thirtyDaysAgo.toISOString()}&perPage=100`,
                    {
                      headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                      },
                    },
                  );

                  if (searchResponse.data?.status && searchResponse.data?.data) {
                    const transactions = Array.isArray(searchResponse.data.data)
                      ? searchResponse.data.data
                      : [searchResponse.data.data];
                    // Only add transactions we haven't seen yet
                    const newTransactions = transactions.filter(
                      (txn) =>
                        !allTransactions.some(
                          (existing) => existing.id === txn.id,
                        ),
                    );
                    allTransactions = [...allTransactions, ...newTransactions];
                    console.log(
                      `[Receipt] Found ${newTransactions.length} additional successful transactions in date range`,
                    );
                  }
                } catch (dateSearchError) {
                  console.log(
                    `[Receipt] Date range search failed: ${dateSearchError.message}`,
                  );
                }

                // Look for a successful transaction with this appointment ID in metadata
                console.log(
                  `[Receipt] Searching through ${allTransactions.length} transactions for appointment ID: ${appointmentId}`,
                );

                successfulTransaction = allTransactions.find((txn) => {
                  const metadata = txn.metadata || {};
                  const appointmentIdMatch =
                    metadata.appointment_id === appointmentId ||
                    metadata.appointmentId === appointmentId;

                  if (appointmentIdMatch) {
                    console.log(
                      `[Receipt] Found matching transaction: ${txn.reference}, status: ${txn.status}`,
                    );
                  }

                  return txn.status === "success" && appointmentIdMatch;
                });

                if (successfulTransaction) {
                  console.log(
                    `[Receipt] Found successful transaction ${successfulTransaction.reference} for appointment ${appointmentId}`,
                  );

                  // Update appointment with the successful transaction reference
                  appointment.payment = {
                    ...appointment.payment,
                    status: "completed",
                    paystackReference: successfulTransaction.reference,
                    amount: successfulTransaction.amount / 100,
                    paidAt: new Date(successfulTransaction.paid_at || successfulTransaction.created_at),
                    receipt: appointment.payment.receipt || {
                      patient: {
                        name: (
                          patient?.full_name ||
                          `${patient?.personal_details?.first_name || ""} ${patient?.personal_details?.last_name || ""}`.trim()
                        ).trim(),
                        email: patient?.email || "",
                        mobile_number:
                          patient?.phone_number ||
                          patient?.contact_details?.phone_number ||
                          "",
                        address: patient?.location_details?.address || "",
                        gender: patient?.personal_details?.gender || "",
                        date_of_birth: patient?.personal_details?.date_of_birth || "",
                      },
                      appointment: {
                        location: provider?.address || "",
                        type: service?.name || "",
                        date: appointment.appointment_date,
                        time: appointment.start_time,
                        booking_id: appointment.id,
                      },
                      payment_summary: {
                        payment_method: "Card Payment",
                        service_cost: `₦${service?.price || 0}`,
                        coupon: "None",
                        total: `₦${successfulTransaction.amount / 100}`,
                      },
                    },
                  };
                  await appointment.save();
                  console.log(
                    `[Receipt] Updated appointment ${appointmentId} with successful transaction reference`,
                  );
                  // Continue to generate receipt (don't return error)
                } else {
                  // No successful transaction found via exact match
                  // Since user received success email, payment was likely successful
                  // Check if we can find any transaction with matching amount and recent date
                  console.log(
                    `[Receipt] No exact match found, checking for transactions with matching amount (${appointment.payment.amount})`,
                  );

                  const matchingAmountTransaction = allTransactions.find(
                    (txn) =>
                      txn.status === "success" &&
                      Math.abs(txn.amount / 100 - appointment.payment.amount) < 1, // Within 1 naira difference
                  );

                  if (matchingAmountTransaction) {
                    console.log(
                      `[Receipt] Found transaction with matching amount: ${matchingAmountTransaction.reference}`,
                    );
                    // Update with this transaction
                    appointment.payment = {
                      ...appointment.payment,
                      status: "completed",
                      paystackReference: matchingAmountTransaction.reference,
                      amount: matchingAmountTransaction.amount / 100,
                      paidAt: new Date(
                        matchingAmountTransaction.paid_at ||
                        matchingAmountTransaction.created_at,
                      ),
                      receipt: appointment.payment.receipt || {
                        patient: {
                          name: (
                            patient?.full_name ||
                            `${patient?.personal_details?.first_name || ""} ${patient?.personal_details?.last_name || ""}`.trim()
                          ).trim(),
                          email: patient?.email || "",
                          mobile_number:
                            patient?.phone_number ||
                            patient?.contact_details?.phone_number ||
                            "",
                          address: patient?.location_details?.address || "",
                          gender: patient?.personal_details?.gender || "",
                          date_of_birth:
                            patient?.personal_details?.date_of_birth || "",
                        },
                        appointment: {
                          location: provider?.address || "",
                          type: service?.name || "",
                          date: appointment.appointment_date,
                          time: appointment.start_time,
                          booking_id: appointment.id,
                        },
                        payment_summary: {
                          payment_method: "Card Payment",
                          service_cost: `₦${service?.price || 0}`,
                          coupon: "None",
                          total: `₦${matchingAmountTransaction.amount / 100}`,
                        },
                      },
                    };
                    await appointment.save();
                    console.log(
                      `[Receipt] Updated appointment ${appointmentId} with matching amount transaction`,
                    );
                    // Continue to generate receipt
                  } else {
                    // No successful transaction found at all
                    console.error(
                      `[Receipt] No successful transaction found for appointment ${appointmentId} after searching ${allTransactions.length} transactions`,
                    );
                    return res.status(400).json({
                      success: false,
                      message: `Payment status is ${appointment.payment.status}. The stored payment reference shows as abandoned, and no successful transaction was found for this appointment. If you completed the payment, please contact support with your payment reference.`,
                      debug: {
                        appointmentPaymentStatus: appointment.payment.status,
                        paystackStatus: paystackStatus,
                        searchedTransactions: allTransactions.length,
                        patientEmail: patient?.email,
                        appointmentAmount: appointment.payment.amount,
                      },
                    });
                  }
                }
              } catch (searchError) {
                console.error(
                  `[Receipt] Error searching for successful transactions:`,
                  searchError.message,
                );
                // Fall through to return error about abandoned status
                return res.status(400).json({
                  success: false,
                  message: `Payment status is ${appointment.payment.status}. Payment verification with Paystack shows: ${paystackStatus}. ${paystackMessage}`,
                  debug: {
                    appointmentPaymentStatus: appointment.payment.status,
                    paystackStatus: paystackStatus,
                    paystackMessage: paystackMessage,
                    hasReference: !!appointment.payment.paystackReference,
                  },
                });
              }
            } else {
              // Not abandoned, just failed
              console.error(
                `Payment verification failed for appointment ${appointmentId}. Current status: ${appointment.payment.status}, Paystack status: ${paystackStatus}, Message: ${paystackMessage}`,
              );
              return res.status(400).json({
                success: false,
                message: `Payment status is ${appointment.payment.status}. Payment verification with Paystack shows: ${paystackStatus}. ${paystackMessage}`,
                debug: {
                  appointmentPaymentStatus: appointment.payment.status,
                  paystackStatus: paystackStatus,
                  paystackMessage: paystackMessage,
                  hasReference: !!appointment.payment.paystackReference,
                },
              });
            }
          }
        } catch (verifyError) {
          console.error(
            `Error verifying payment with Paystack for appointment ${appointmentId}:`,
            {
              message: verifyError.message,
              response: verifyError.response?.data,
              status: verifyError.response?.status,
              reference: appointment.payment.paystackReference,
            },
          );
          // If Paystack API returns an error, provide more details
          const errorMessage =
            verifyError.response?.data?.message || verifyError.message;
          return res.status(400).json({
            success: false,
            message: `Payment status is ${appointment.payment.status}. Could not verify payment with Paystack: ${errorMessage}`,
            debug: {
              appointmentPaymentStatus: appointment.payment.status,
              reference: appointment.payment.paystackReference,
              error: errorMessage,
            },
          });
        }
      } else {
        // No reference to verify with
        return res.status(400).json({
          success: false,
          message: `No completed payment found for this appointment. Current payment status: ${appointment.payment.status || "unknown"}`,
        });
      }
    }

    // Validate that we have all required data for receipt generation
    if (!patient || !provider || !service) {
      const missing = [];
      if (!patient) missing.push("patient");
      if (!provider) missing.push("provider");
      if (!service) missing.push("service");

      console.error(
        `Missing data for receipt generation for appointment ${appointmentId}:`,
        missing.join(", "),
      );

      return res.status(404).json({
        success: false,
        message: `Could not retrieve all details for the receipt. Missing: ${missing.join(", ")}`,
      });
    }

    // Create PDF document
    // Create PDF document using shared service
    const pdfBuffer = await pdfService.generateReceiptPDF(appointment, patient, provider, service);
    const filename = `receipt-${appointment.id}.pdf`;
    const base64Pdf = pdfBuffer.toString('base64');

    res.status(200).json({
      success: true,
      message: "Receipt generated successfully",
      data: {
        filename: filename,
        pdf: base64Pdf,
        contentType: "application/pdf",
        patient: {
          name: (
            appointment.formData?.patientName ||
            patient.full_name ||
            `${patient.personal_details?.first_name || ""} ${patient.personal_details?.last_name || ""}`.trim()
          ).trim(),
          email: appointment.formData?.patientEmail || patient.email,
          mobile_number:
            appointment.formData?.patientPhone ||
            patient.phone_number ||
            patient.contact_details?.phone_number ||
            "",
          address:
            appointment.formData?.patientAddress ||
            patient.location_details?.address ||
            "",
          gender:
            appointment.formData?.patientGender ||
            patient.personal_details?.gender ||
            "",
          date_of_birth:
            appointment.formData?.patientDOB ||
            patient.personal_details?.date_of_birth ||
            "",
        },
        appointment: {
          location: provider.address, // Uses the structured address object from Provider model
          type: service.name,
          date: new Date(appointment.appointment_date).toISOString().split('T')[0],
          time: appointment.start_time,
          booking_id: appointment.id,
        },
        payment_summary: {
          payment_method: "Card Payment", // Assuming Card Payment as per webhook logic
          service_cost: `₦${service.price}`,
          coupon: "None",
          total: `₦${appointment.payment.amount}`,
        },
      }
    });

  } catch (error) {
    console.error("Get receipt error:", error);
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
};


// @desc    Send payment receipt by email
// @route   POST /api/payments/receipt/send
// @access  Public
// @note    Can accept an optional PDF file in the request. If provided, uses that PDF; otherwise generates one.
const sendReceipt = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
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

    // Check if payment exists and is completed
    // If payment exists but status is not "completed", try to verify with Paystack
    if (!appointment.payment) {
      return res.status(400).json({
        success: false,
        message: "No payment found for this appointment",
      });
    }

    // If payment status is not "completed", try to verify with Paystack if reference exists
    if (appointment.payment.status !== "completed") {
      // If there's a paystack reference, try to verify the payment
      if (appointment.payment.paystackReference) {
        try {
          const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${appointment.payment.paystackReference}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
            },
          );

          // If payment was successful on Paystack, update the appointment
          if (
            response.data.status === true &&
            response.data.data.status === "success"
          ) {
            // Update payment status
            appointment.payment = {
              ...appointment.payment,
              status: "completed",
              amount: response.data.data.amount / 100,
              paidAt: appointment.payment.paidAt || new Date(),
            };
            await appointment.save();
            console.log(
              `Updated payment status to completed for appointment ${appointmentId} after verification`,
            );
          } else {
            // Payment not successful on Paystack
            const paystackStatus = response.data?.data?.status || "unknown";
            console.error(
              `Payment verification failed for appointment ${appointmentId}. Paystack status: ${paystackStatus}`,
            );
            return res.status(400).json({
              success: false,
              message: `Payment status is ${appointment.payment.status}. Payment verification with Paystack shows: ${paystackStatus}`,
            });
          }
        } catch (verifyError) {
          console.error(
            "Error verifying payment with Paystack:",
            verifyError.message,
          );
          return res.status(400).json({
            success: false,
            message: `Payment status is ${appointment.payment.status}. Could not verify payment with Paystack.`,
          });
        }
      } else {
        // No reference to verify with
        return res.status(400).json({
          success: false,
          message: `No completed payment found for this appointment. Current payment status: ${appointment.payment.status || "unknown"}`,
        });
      }
    }

    // Get patient, provider, and service details
    const [patient, provider, service] = await Promise.all([
      User.findOne({ id: appointment.patient_id }),
      Provider.findOne({ id: appointment.provider_id }),
      Service.findOne({ id: appointment.service_id }),
    ]);

    if (!patient || !provider || !service) {
      return res.status(404).json({
        success: false,
        message: "Could not retrieve all details for the receipt",
      });
    }

    // Check if a PDF file was uploaded
    let pdfData;
    let filename = `receipt-${appointment.id}.pdf`;

    if (req.file && req.file.buffer) {
      // Use the uploaded PDF file
      pdfData = req.file.buffer;
      filename = req.file.originalname || filename;
      console.log(`Using uploaded PDF file: ${filename}`);
    } else {
      // Generate PDF receipt using shared service
      try {
        pdfData = await pdfService.generateReceiptPDF(appointment, patient, provider, service);
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
        return res.status(500).json({
          success: false,
          message: "Failed to generate receipt PDF",
        });
      }
    }

    // Send email using notification service (allows for better formatting and centralized logic)
    notificationService.sendReceiptEmail(patient, appointment, pdfData, filename)
      .then(() => {
        console.log(`Receipt email sent successfully to ${patient.email}`);
      })
      .catch((emailError) => {
        console.error(
          `Failed to send receipt email to ${patient.email}:`,
          emailError.message,
        );
      });

    // Send response immediately
    res.json({
      success: true,
      message: "Receipt is being sent to your email",
    });
  } catch (error) {
    console.error("Send receipt error:", error);
    // Check if response has already been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
};

// @desc    Get saved payment methods (Patient only)
// @route   GET /api/v1/payments/methods
// @access  Private/Patient
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get payment methods, format them for response
    const paymentMethods = (user.payment_methods || []).map(method => ({
      id: method.id,
      type: method.type || 'card',
      last4: method.last4,
      brand: method.brand,
      expiry_month: method.expiry_month,
      expiry_year: method.expiry_year,
      is_default: method.is_default || false
    }));

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Initialize payment method tokenization (Patient only)
// @route   POST /api/v1/payments/methods/initialize
// @access  Private/Patient
const initializePaymentMethod = async (req, res) => {
  try {
    const { payment_provider = 'paystack' } = req.body;
    const userId = req.user.id;

    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (payment_provider !== 'paystack') {
      return res.status(400).json({
        success: false,
        message: 'Only Paystack is currently supported'
      });
    }

    // Initialize a small charge (e.g., 100 kobo = 1 Naira) to tokenize the card
    // This is a common pattern for card tokenization
    const amount = 100; // 1 Naira in kobo

    const paymentData = {
      email: user.email,
      amount: amount,
      reference: `TOKENIZE-${userId}-${Date.now()}`,
      metadata: {
        user_id: userId,
        purpose: 'card_tokenization'
      }
    };

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        success: true,
        data: {
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
          reference: response.data.data.reference
        }
      });
    } catch (paystackError) {
      console.error('Paystack API error:', paystackError.response?.data || paystackError.message);
      res.status(400).json({
        success: false,
        message: 'Failed to initialize payment method',
        error: paystackError.response?.data?.message || 'Payment provider error'
      });
    }
  } catch (error) {
    console.error('Initialize payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify and save payment method (Patient only)
// @route   POST /api/v1/payments/methods/verify
// @access  Private/Patient
const verifyAndSavePaymentMethod = async (req, res) => {
  try {
    const { reference } = req.body;
    const userId = req.user.id;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference is required'
      });
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify the transaction with Paystack
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      if (response.data.status !== true || response.data.data.status !== 'success') {
        return res.status(400).json({
          success: false,
          message: 'Transaction verification failed'
        });
      }

      const transactionData = response.data.data;
      const authorization = transactionData.authorization;

      if (!authorization) {
        return res.status(400).json({
          success: false,
          message: 'No authorization data found in transaction'
        });
      }

      // Check if this payment method already exists
      const existingMethod = user.payment_methods?.find(
        pm => pm.authorization_code === authorization.authorization_code
      );

      if (existingMethod) {
        return res.status(400).json({
          success: false,
          message: 'This payment method is already saved'
        });
      }

      // Create payment method object
      const paymentMethod = {
        id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'card',
        provider: 'paystack',
        last4: authorization.last4,
        brand: authorization.brand,
        expiry_month: authorization.exp_month,
        expiry_year: authorization.exp_year,
        authorization_code: authorization.authorization_code,
        card_type: authorization.card_type,
        bank: authorization.bank || null,
        account_name: authorization.account_name || null,
        is_default: (user.payment_methods || []).length === 0 // Set as default if it's the first one
      };

      // If this is set as default, unset other defaults
      if (paymentMethod.is_default && user.payment_methods) {
        user.payment_methods.forEach(pm => {
          pm.is_default = false;
        });
      }

      // Add payment method to user
      if (!user.payment_methods) {
        user.payment_methods = [];
      }
      user.payment_methods.push(paymentMethod);

      await user.save();

      res.json({
        success: true,
        message: 'Payment method added successfully',
        data: {
          id: paymentMethod.id,
          last4: paymentMethod.last4,
          brand: paymentMethod.brand
        }
      });
    } catch (paystackError) {
      console.error('Paystack verification error:', paystackError.response?.data || paystackError.message);
      res.status(400).json({
        success: false,
        message: 'Failed to verify transaction',
        error: paystackError.response?.data?.message || 'Verification error'
      });
    }
  } catch (error) {
    console.error('Verify and save payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Confirm payment for an appointment directly (patient portal / direct checkout)
// @route   POST /api/v1/payments/confirm-appointment
// @route   PUT /api/v1/appointments/:appointmentId/confirm-payment
// @access  Public / Optional Auth
const confirmAppointmentPayment = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId || req.body.appointmentId;
    const {
      paymentMethod = "Card Payment",
      reference = `REF-PAY-${Date.now()}`,
      amount,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(appointmentId);
    const appointment = await Appointment.findOne({
      $or: [
        { id: appointmentId },
        ...(isObjectId ? [{ _id: appointmentId }] : []),
      ],
      is_deleted: { $ne: true },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const [patient, provider, service] = await Promise.all([
      User.findOne({ id: appointment.patient_id }),
      Provider.findOne({ id: appointment.provider_id }),
      Service.findOne({ id: appointment.service_id }),
    ]);

    const effectiveAmount =
      Number(amount) || appointment.payment?.amount || service?.price || 0;

    appointment.payment = {
      status: "completed",
      method: paymentMethod,
      paystackReference: reference,
      amount: effectiveAmount,
      paidAt: new Date(),
      receipt: {
        patient: {
          name:
            appointment.formData?.patientName ||
            patient?.full_name ||
            "Patient",
          email: appointment.formData?.patientEmail || patient?.email || "",
          mobile_number:
            appointment.formData?.patientPhone ||
            patient?.phone_number ||
            "",
          address:
            appointment.formData?.patientAddress ||
            patient?.location_details?.address ||
            "",
          gender:
            appointment.formData?.patientGender ||
            patient?.personal_details?.gender ||
            "",
          date_of_birth:
            appointment.formData?.patientDOB ||
            patient?.personal_details?.date_of_birth ||
            "",
        },
        appointment: {
          location: provider?.address || "",
          type: service?.name || "Medical Service",
          date: appointment.appointment_date,
          time: appointment.start_time,
          booking_id: appointment.id,
        },
        payment_summary: {
          payment_method: paymentMethod,
          service_cost: `₦${effectiveAmount}`,
          coupon: "None",
          total: `₦${effectiveAmount}`,
        },
      },
    };

    // Reflect on appointment status: confirmed and paid for!
    appointment.status = "confirmed";
    appointment.updated_at = new Date();

    await appointment.save();

    // Also sync matching Referral in shared DB if exists
    try {
      const ReferralModel =
        mongoose.models.Referral ||
        mongoose.model(
          "Referral",
          new mongoose.Schema({}, { strict: false }),
        );
      await ReferralModel.updateMany(
        {
          $or: [
            { patientAppointmentId: appointment.id },
            { clinicianAppointmentId: appointment.id },
            { referralId: appointment.formData?.referralId },
            { referralId: appointment.formData?.identificationNumber },
          ].filter(Boolean),
        },
        {
          $set: {
            status: "Confirmed",
            paymentStatus: "Paid",
            "paymentDetails.paidAt": new Date(),
            "paymentDetails.reference": reference,
            "paymentDetails.method": paymentMethod,
          },
        },
      );
    } catch (refErr) {
      console.warn("Matching referral update warning:", refErr.message);
    }

    // Send notifications asynchronously
    setImmediate(async () => {
      try {
        await Promise.all([
          notificationService
            .sendPaymentNotifications(patient, provider, appointment, service)
            .catch(() => null),
          notificationService
            .sendAppointmentNotifications(patient, provider, appointment)
            .catch(() => null),
          notificationService
            .sendPaymentConfirmationToProvider(
              provider,
              patient,
              appointment,
              service,
            )
            .catch(() => null),
        ]);
      } catch (notifErr) {
        console.error("Payment confirmation notification error:", notifErr);
      }
    });

    return res.status(200).json({
      success: true,
      message:
        "Payment successfully confirmed! Appointment is now confirmed and paid for.",
      data: {
        appointment: {
          id: appointment.id,
          status: appointment.status,
          payment: appointment.payment,
        },
      },
    });
  } catch (error) {
    console.error("Confirm appointment payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error confirming payment",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  initializePayment,
  retryPayment,
  canRetryPayment,
  verifyPayment,
  paystackWebhook,
  verifyPaymentByAppointment,
  confirmAppointmentPayment,
  getPaymentHistory,
  getPaymentReceipt,
  sendReceipt,
  getPaymentMethods,
  initializePaymentMethod,
  verifyAndSavePaymentMethod,
  pdfUpload, // Export multer middleware for PDF uploads
};
