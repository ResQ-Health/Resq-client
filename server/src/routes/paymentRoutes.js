// Payment routes
const express = require("express");
const router = express.Router();

// Import controllers
const paymentController = require("../controllers/paymentController");
const { protect, patientOnly, optionalAuth } = require("../middleware/auth");

// Direct confirmation of appointment payment (patient portal / checkout)
router.post("/confirm-appointment", optionalAuth, paymentController.confirmAppointmentPayment);

// Initialize payment for an appointment
router.post("/initialize", paymentController.initializePayment);

router.get("/can-retry/:appointmentId", paymentController.canRetryPayment);

// Retry payment for an appointment
router.post("/retry", paymentController.retryPayment);

// Verify payment
router.get(
  "/verify/:reference",
  protect,
  patientOnly,
  paymentController.verifyPayment,
);

// Verify payment by appointmentId
router.post(
  "/verify-by-appointment",
  protect,
  patientOnly,
  paymentController.verifyPaymentByAppointment,
);

// Paystack webhook (public route)
router.post("/webhook", paymentController.paystackWebhook);

// Get payment history for a user
router.get(
  "/history",
  protect,
  patientOnly,
  paymentController.getPaymentHistory,
);

// Get individual payment receipt
router.get("/receipt/:appointmentId", paymentController.getPaymentReceipt);

// Send payment receipt by email (optionally accepts PDF file upload)
// If PDF is provided, it will be used; otherwise, a PDF will be generated automatically
router.post(
  "/receipt/send",
  paymentController.pdfUpload.single("pdf"), // Optional PDF file upload
  paymentController.sendReceipt,
);

// Patient Payment Methods Management
// Get saved payment methods
router.get("/methods", protect, patientOnly, paymentController.getPaymentMethods);

// Initialize payment method tokenization
router.post("/methods/initialize", protect, patientOnly, paymentController.initializePaymentMethod);

// Verify and save payment method
router.post("/methods/verify", protect, patientOnly, paymentController.verifyAndSavePaymentMethod);

module.exports = router;
