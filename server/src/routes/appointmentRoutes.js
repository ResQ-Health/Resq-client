// Appointment routes
const express = require("express");
const router = express.Router();

// Import controllers
const appointmentController = require("../controllers/appointmentController");
const serviceController = require("../controllers/serviceController");
const paymentController = require("../controllers/paymentController");
const { protect, providerOnly, patientOnly, clinicianOnly, patientOrClinician, optionalAuth } = require("../middleware/auth");

// Get available dates for calendar view
router.get(
  "/available-dates",
  protect,
  appointmentController.getAvailableDates,
);

// Get available time slots for a provider
router.get(
  "/available-slots",
  protect,
  appointmentController.getAvailableSlots,
);

// Get all services (for appointment booking)
router.get("/services", serviceController.getAllServices);

// Book an appointment (optional auth - allows logged-in patients/clinicians and guest bookings)
router.post("/book", optionalAuth, appointmentController.bookAppointment);

// Book an appointment on behalf of a patient (dedicated clinician route)
router.post(
  "/clinician/book",
  protect,
  clinicianOnly,
  appointmentController.bookAppointmentByClinician,
);

// Alias route for clinician booking
router.post(
  "/clinician-book",
  protect,
  clinicianOnly,
  appointmentController.bookAppointmentByClinician,
);

// Get clinician's booked appointments
router.get(
  "/clinician",
  protect,
  clinicianOnly,
  appointmentController.getClinicianAppointments,
);

// Get patient's appointments
router.get(
  "/patient",
  protect,
  patientOnly,
  appointmentController.getPatientAppointments,
);

// Get provider's appointments
router.get(
  "/provider",
  protect,
  providerOnly,
  appointmentController.getProviderAppointments,
);

// Confirm or reject an appointment (provider only)
router.put(
  "/:appointmentId/confirm",
  protect,
  providerOnly,
  appointmentController.confirmAppointment,
);

// Auto-confirm an appointment (system function)
router.put(
  "/:appointmentId/auto-confirm",
  appointmentController.autoConfirmAppointment,
);

// Get single appointment details (with payment and clinician info)
router.get(
  "/:appointmentId",
  optionalAuth,
  appointmentController.getAppointmentById,
);

// Send/resend payment required email for an unpaid appointment
router.post(
  "/:appointmentId/send-payment-email",
  optionalAuth,
  appointmentController.sendAppointmentPaymentEmail,
);

// Confirm payment for an appointment directly
router.put(
  "/:appointmentId/confirm-payment",
  optionalAuth,
  paymentController.confirmAppointmentPayment,
);

// Cancel an appointment
router.put(
  "/:appointmentId/cancel",
  protect,
  patientOrClinician,
  appointmentController.cancelAppointment,
);

// Soft delete an appointment (user only)
router.delete(
  "/:appointmentId",
  protect,
  patientOrClinician,
  appointmentController.deleteAppointment,
);

module.exports = router;
