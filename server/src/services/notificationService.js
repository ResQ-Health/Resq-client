// src/services/notificationService.js

const { sendPlainTextEmail, sendEmailWithAttachment, sendEmail } = require('../config/email');

// From appointmentController.js
async function sendPendingAppointmentNotification(patient, provider, appointment) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (provider.work_email && provider.notification_settings.email) {
            await sendPlainTextEmail(
                provider.work_email,
                'New Appointment Request',
                `Hi ${provider.provider_name},\n\nA new appointment has been requested by ${patient.full_name} on ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time}.\n\nPlease log in to confirm or reject this appointment request.\n\nThank you for using ResQ.`
            );
        }

    } catch (error) {
        console.error('Error sending pending appointment notification:', error);
    }
}

async function sendRejectionNotification(patient, provider, appointment) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const patientMessage = `Your appointment request with ${provider.provider_name} on ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time} has been rejected.`;

        if (patient.email) {
            await sendPlainTextEmail(
                patient.email,
                'Appointment Request Rejected',
                `Hi ${patient.full_name},\n\n${patientMessage}\n\nPlease try scheduling for a different time or contact the provider directly.\n\nThank you for choosing ResQ.`
            );
        }

    } catch (error) {
        console.error('Error sending rejection notification:', error);
    }
}

async function sendAppointmentNotifications(patient, provider, appointment) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (patient.email) {
            await sendPlainTextEmail(
                patient.email,
                'Appointment Confirmation',
                `Hi ${patient.full_name},\n\nYour appointment with ${provider.provider_name} is confirmed for ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time}.\n\nThank you for choosing ResQ.`
            );
        }

        if (provider.work_email && provider.notification_settings.email) {
            await sendPlainTextEmail(
                provider.work_email,
                'New Appointment Booked',
                `Hi ${provider.provider_name},\n\nA new appointment has been booked by ${patient.full_name} on ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time}.\n\nThank you for using ResQ.`
            );
        }

    } catch (error) {
        console.error('Error sending notifications:', error);
    }
}

async function sendCancellationNotifications(patient, provider, appointment, cancelledBy) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const patientMessage = `Your appointment with ${provider.provider_name} on ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time} has been cancelled${cancelledBy === 'provider' ? ' by the provider' : ''}.`;
        const providerMessage = `The appointment with ${patient.full_name} on ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time} has been cancelled${cancelledBy === 'patient' ? ' by the patient' : ''}.`;

        if (patient.email) {
            await sendPlainTextEmail(
                patient.email,
                'Appointment Cancelled',
                `Hi ${patient.full_name},\n\n${patientMessage}\n\nThank you for choosing ResQ.`
            );
        }

        if (provider.work_email && provider.notification_settings.email) {
            await sendPlainTextEmail(
                provider.work_email,
                'Appointment Cancelled',
                `Hi ${provider.provider_name},\n\n${providerMessage}\n\nThank you for using ResQ.`
            );
        }

    } catch (error) {
        console.error('Error sending cancellation notifications:', error);
    }
}

async function sendBookingConfirmationToPatient(patient, provider, appointment, service) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedAmount = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(service.price);

        let emailContent = '';
        emailContent += `APPOINTMENT BOOKING CONFIRMATION\n\n`;
        emailContent += `Dear ${patient.full_name},\n\n`;
        emailContent += `Thank you for booking an appointment with ResQ Healthcare. Your appointment has been received and is awaiting confirmation from the provider.\n\n`;
        emailContent += `APPOINTMENT DETAILS\n`;
        emailContent += `------------------\n`;
        emailContent += `Service: ${service.name} (${service.category})\n`;
        emailContent += `Provider: ${provider.provider_name}\n`;
        emailContent += `Date: ${appointmentDate}\n`;
        emailContent += `Time: ${appointment.start_time} - ${appointment.end_time}\n`;
        emailContent += `Amount: ${formattedAmount}\n`;
        emailContent += `Status: ${appointment.status === 'pending' ? 'Awaiting Provider Confirmation' : 'Confirmed'}\n`;
        emailContent += `\nBOOKING INFORMATION\n`;
        emailContent += `-------------------\n`;
        emailContent += `Appointment ID: ${appointment.id}\n`;
        emailContent += `Booking Date: ${new Date().toLocaleDateString()}\n`;
        emailContent += `For: ${appointment.formData.forWhom}\n`;
        emailContent += `Communication: ${appointment.formData.communicationPreference || 'Booker'}\n`;
        if (appointment.formData.comments) {
            emailContent += `Comments: ${appointment.formData.comments}\n`;
        }
        if (appointment.formData.forWhom === 'Other' && appointment.formData.patientName) {
            emailContent += `\nPATIENT DETAILS\n`;
            emailContent += `--------------\n`;
            emailContent += `Patient Name: ${appointment.formData.patientName}\n`;
            if (appointment.formData.patientEmail) {
                emailContent += `Patient Email: ${appointment.formData.patientEmail}\n`;
            }
            if (appointment.formData.patientPhone) {
                emailContent += `Patient Phone: ${appointment.formData.patientPhone}\n`;
            }
            if (appointment.formData.patientAddress) {
                emailContent += `Patient Address: ${appointment.formData.patientAddress}\n`;
            }
            if (appointment.formData.patientGender) {
                emailContent += `Patient Gender: ${appointment.formData.patientGender}\n`;
            }
            if (appointment.formData.patientDOB) {
                emailContent += `Patient Date of Birth: ${appointment.formData.patientDOB}\n`;
            }
        }
        emailContent += `\nNEXT STEPS\n`;
        emailContent += `-----------\n`;
        emailContent += `1. The provider will review your appointment request\n`;
        emailContent += `2. Once confirmed, you will receive a confirmation email\n`;
        emailContent += `3. You will need to make payment to secure your appointment\n`;
        emailContent += `4. After payment, your appointment will be fully confirmed\n`;
        emailContent += `\nThank you for choosing ResQ Healthcare Services.\n`;
        emailContent += `If you have any questions, please contact our support team.\n`;

        if (patient.email) {
            await sendPlainTextEmail(
                patient.email,
                'Appointment Booking Confirmation - ResQ Healthcare',
                emailContent
            );
            console.log(`Booking confirmation email sent to booker: ${patient.email}`);
        }

        if (appointment.formData.forWhom === 'Other' &&
            ['Patient', 'Both'].includes(appointment.formData.communicationPreference) &&
            appointment.formData.patientEmail) {

            const patientEmailContent = emailContent.replace(`Dear ${patient.full_name},`, `Dear ${appointment.formData.patientName},`);

            await sendPlainTextEmail(
                appointment.formData.patientEmail,
                'Appointment Booking Confirmation - ResQ Healthcare',
                patientEmailContent
            );
            console.log(`Booking confirmation email sent to patient: ${appointment.formData.patientEmail}`);
        }
    } catch (error) {
        console.error('Error sending booking confirmation email:', error);
    }
}

// From paymentController.js
async function sendPaymentNotifications(patient, provider, appointment, service) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedAmount = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(appointment.payment.amount);

        const createPaymentEmailContent = (recipient) => {
            let content = '';
            content += `PAYMENT CONFIRMATION - THANK YOU\n\n`;
            content += `Dear ${recipient},\n\n`;
            content += `Thank you for your payment of ${formattedAmount}. Your appointment has been successfully confirmed.\n\n`;
            content += `APPOINTMENT DETAILS\n`;
            content += `------------------\n`;
            content += `Service: ${service.name} (${service.category})\n`;
            content += `Provider: ${provider.provider_name}\n`;
            content += `Date: ${appointmentDate}\n`;
            content += `Time: ${appointment.start_time} - ${appointment.end_time}\n`;
            content += `Amount Paid: ${formattedAmount}\n`;
            content += `Status: Confirmed\n`;
            if (appointment.notes) {
                content += `Notes: ${appointment.notes}\n`;
            }
            content += `\nBOOKING INFORMATION\n`;
            content += `-------------------\n`;
            content += `Appointment For: ${appointment.formData.forWhom}\n`;
            content += `Previous Visit: ${appointment.formData.visitedBefore ? 'Yes' : 'No'}\n`;
            content += `Communication: ${appointment.formData.communicationPreference || 'Booker'}\n`;
            if (appointment.formData.identificationNumber) {
                content += `Identification Number: ${appointment.formData.identificationNumber}\n`;
            }
            if (appointment.formData.comments) {
                content += `Comments: ${appointment.formData.comments}\n`;
            }
            if (appointment.formData.forWhom === 'Other' && appointment.formData.patientName) {
                content += `\nPATIENT DETAILS\n`;
                content += `--------------\n`;
                content += `Patient Name: ${appointment.formData.patientName}\n`;
                if (appointment.formData.patientEmail) {
                    content += `Patient Email: ${appointment.formData.patientEmail}\n`;
                }
                if (appointment.formData.patientPhone) {
                    content += `Patient Phone: ${appointment.formData.patientPhone}\n`;
                }
                if (appointment.formData.patientAddress) {
                    content += `Patient Address: ${appointment.formData.patientAddress}\n`;
                }
                if (appointment.formData.patientGender) {
                    content += `Patient Gender: ${appointment.formData.patientGender}\n`;
                }
                if (appointment.formData.patientDOB) {
                    content += `Patient Date of Birth: ${appointment.formData.patientDOB}\n`;
                }
            }
            content += `\nPAYMENT DETAILS\n`;
            content += `---------------\n`;
            content += `Payment Status: Completed\n`;
            content += `Reference: ${appointment.payment.paystackReference}\n`;
            content += `Payment Date: ${new Date(appointment.payment.paidAt).toLocaleString()}\n`;
            content += `\nWHAT TO BRING\n`;
            content += `-------------\n`;
            content += `1. A valid ID (Driver's License, National ID, International Passport)\n`;
            content += `2. Your payment receipt (digital or printed)\n`;
            content += `3. Any previous medical records related to this appointment (if applicable)\n`;
            content += `\nREMINDER\n`;
            content += `--------\n`;
            content += `Please arrive 15 minutes before your scheduled appointment time.\n`;
            content += `If you need to cancel or reschedule, please do so at least 24 hours in advance.\n`;
            content += `\nThank you for choosing ResQ Healthcare Services.\n`;
            content += `We look forward to providing you with excellent healthcare service.\n`;
            content += `For any questions or concerns, please contact our support team.\n`;
            return content;
        };

        if (patient && patient.email) {
            await sendPlainTextEmail(
                patient.email,
                'Thank You for Your Payment - ResQ Healthcare',
                createPaymentEmailContent(patient.full_name)
            );
            console.log(`Payment confirmation email sent to booker: ${patient.email}`);
        }

        if (appointment.formData.forWhom === 'Other' &&
            ['Patient', 'Both'].includes(appointment.formData.communicationPreference) &&
            appointment.formData.patientEmail) {

            await sendPlainTextEmail(
                appointment.formData.patientEmail,
                'Thank You for Your Payment - ResQ Healthcare',
                createPaymentEmailContent(appointment.formData.patientName)
            );
            console.log(`Payment confirmation email sent to patient: ${appointment.formData.patientEmail}`);
        }

    } catch (error) {
        console.error('Error sending payment notifications:', error);
    }
}

async function sendPaymentFailureNotification(patient, provider, appointment, service, errorMessage) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedAmount = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(service.price);

        const createFailureEmailContent = (recipient) => {
            let content = '';
            content += `PAYMENT FAILED\n\n`;
            content += `Dear ${recipient},\n\n`;
            content += `We regret to inform you that your payment of ${formattedAmount} for the following appointment could not be processed:\n\n`;
            content += `APPOINTMENT DETAILS\n`;
            content += `------------------\n`;
            content += `Service: ${service.name} (${service.category})\n`;
            content += `Provider: ${provider.provider_name}\n`;
            content += `Date: ${appointmentDate}\n`;
            content += `Time: ${appointment.start_time} - ${appointment.end_time}\n`;
            content += `Amount: ${formattedAmount}\n`;
            content += `\nPAYMENT FAILURE DETAILS\n`;
            content += `----------------------\n`;
            content += `Status: Failed\n`;
            content += `Reason: ${errorMessage}\n`;
            content += `Reference: ${appointment.payment.paystackReference || 'Not available'}\n`;
            content += `Time: ${new Date().toLocaleString()}\n`;
            content += `\nNEXT STEPS\n`;
            content += `-----------\n`;
            content += `1. Please check that your card details are correct\n`;
            content += `2. Ensure you have sufficient funds in your account\n`;
            content += `3. Try again by logging into your account and selecting the appointment\n`;
            content += `4. If the problem persists, please contact your bank or our support team\n`;
            content += `\nThank you for using ResQ Healthcare Services.\n`;
            return content;
        };

        if (patient && patient.email) {
            await sendPlainTextEmail(
                patient.email,
                'Payment Failed - ResQ Healthcare',
                createFailureEmailContent(patient.full_name)
            );
        }

    } catch (error) {
        console.error('Error sending payment failure notification:', error);
    }
}

async function sendPaymentConfirmationToProvider(provider, patient, appointment, service) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const formattedAmount = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(appointment.payment.amount);

        const patientName = appointment.formData.forWhom === 'Other' ? appointment.formData.patientName : patient.full_name;

        // Notify provider by email
        if (provider.work_email && provider.notification_settings.email) {
            const emailContent = `
                Hi ${provider.provider_name},

                A payment of ${formattedAmount} has been successfully processed for an appointment with ${patientName}.
                The appointment for ${service.name} is confirmed for ${appointmentDate} from ${appointment.start_time} to ${appointment.end_time}.

                Patient Details:
                - Name: ${patientName}
                - Email: ${appointment.formData.forWhom === 'Other' ? appointment.formData.patientEmail : patient.email}
                - Phone: ${appointment.formData.forWhom === 'Other' ? appointment.formData.patientPhone : patient.phone_number}

                Thank you for using ResQ.
            `;
            await sendPlainTextEmail(
                provider.work_email,
                `Payment Received: Appointment with ${patientName}`,
                emailContent
            );
        }

    } catch (error) {
        console.error('Error sending payment confirmation to provider:', error);
    }
}

async function sendReceiptEmail(patient, appointment, pdfBuffer, filename) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const receiptEmailContent = (recipientName) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #4CAF50;">Payment Receipt</h2>
                <p>Dear ${recipientName},</p>
                <p>Thank you for your payment. Please find your receipt attached for the appointment on <strong>${appointmentDate}</strong>.</p>
                <p>We appreciate your trust in ResQ Healthcare Services.</p>
                <br>
                <p>Best regards,</p>
                <p><strong>The ResQ Team</strong></p>
            </div>
        `;

        const attachment = {
            filename: filename,
            content: pdfBuffer,
        };

        // Send to patient/booker
        if (patient.email) {
            await sendEmailWithAttachment(
                patient.email,
                'Your Payment Receipt - ResQ Healthcare',
                receiptEmailContent(patient.full_name || 'Valued Patient'),
                attachment
            );
            console.log(`Receipt email sent to: ${patient.email}`);
        }

        // Send to actual patient if different from booker
        if (
            appointment.formData?.forWhom === 'Other' &&
            ['Patient', 'Both'].includes(appointment.formData?.communicationPreference) &&
            appointment.formData?.patientEmail
        ) {
            const patientName = appointment.formData.patientName || 'Patient';
            await sendEmailWithAttachment(
                appointment.formData.patientEmail,
                'Your Payment Receipt - ResQ Healthcare',
                receiptEmailContent(patientName),
                attachment
            );
            console.log(`Receipt email sent to patient: ${appointment.formData.patientEmail}`);
        }

    } catch (error) {
        console.error('Error sending receipt email:', error);
        throw error; // Re-throw to allow controller to handle it
    }
}

/**
 * Send notification to patient when an appointment is booked by a clinician via referral.
 * Informs the patient that the booking is pending and requires payment.
 */
async function sendReferralPaymentRequiredNotification(patient, provider, appointment, service, clinicianInfo = {}) {
    try {
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const doctorName = clinicianInfo?.full_name || appointment.formData?.clinicianName || 'Dr. Specialist';
        const doctorSpecialty = clinicianInfo?.specialty || appointment.formData?.doctorSpecialty || 'Consultant Specialist';
        const providerName = provider?.provider_name || 'Medical Diagnostic Center';
        const providerAddress = provider?.address || '';
        const serviceName = service?.name || 'Diagnostic Procedure';
        const servicePrice = Number(service?.price || appointment.payment?.amount || 0);
        const formattedPrice = new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(servicePrice);

        const patientName = appointment.formData?.patientName || patient?.full_name || 'Valued Patient';
        const targetEmail = appointment.formData?.patientEmail || patient?.email;

        if (!targetEmail) {
            console.warn(`[sendReferralPaymentRequiredNotification] No recipient email found for appointment ${appointment.id}`);
            return;
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const paymentUrl = `${frontendUrl}/patient/appointments/${appointment.id}/pay`;

        const subject = `Action Required: Payment Needed for Your Appointment Booked by Dr. ${doctorName} - ResQ Healthcare`;

        const htmlContent = `
            <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #0F766E 0%, #14B8A6 100%); padding: 26px 30px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">ResQ Healthcare</h1>
                    <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Clinical Referral & Appointment Notice</p>
                </div>

                <div style="padding: 30px 25px; color: #1e293b;">
                    <div style="display: inline-block; background-color: #FEF3C7; color: #92400E; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px;">
                        Payment Required (Unpaid Booking)
                    </div>

                    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px;">Dear ${patientName},</h2>
                    <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                        Your clinician, <strong>Dr. ${doctorName}</strong> (${doctorSpecialty}), has scheduled a medical appointment for you on ResQ Healthcare.
                    </p>

                    <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #B45309;">
                            <strong>Important Notice:</strong> This appointment has been booked on your behalf, but it has <strong>not yet been paid for</strong>. Your booking slot is on hold. Please complete payment of <strong>${formattedPrice}</strong> to finalize and confirm your appointment.
                        </p>
                    </div>

                    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 20px; margin-bottom: 26px;">
                        <h3 style="margin: 0 0 14px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B;">Appointment Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748B; width: 38%;">Referring Doctor:</td>
                                <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">Dr. ${doctorName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B;">Service / Scan:</td>
                                <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${serviceName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B;">Healthcare Center:</td>
                                <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${providerName}</td>
                            </tr>
                            ${providerAddress ? `<tr><td style="padding: 6px 0; color: #64748B;">Location:</td><td style="padding: 6px 0; color: #0F172A;">${providerAddress}</td></tr>` : ''}
                            <tr>
                                <td style="padding: 6px 0; color: #64748B;">Date:</td>
                                <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${appointmentDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B;">Time Slot:</td>
                                <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${appointment.start_time} - ${appointment.end_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B;">Amount Due:</td>
                                <td style="padding: 6px 0; font-weight: 700; color: #0F766E; font-size: 16px;">${formattedPrice}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B;">Appointment ID:</td>
                                <td style="padding: 6px 0; font-family: monospace; color: #334155;">${appointment.id}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin: 30px 0 24px 0;">
                        <a href="${paymentUrl}" style="background-color: #0F766E; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.25);">
                            Pay for Appointment (${formattedPrice})
                        </a>
                    </div>

                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B; text-align: center;">
                        Alternatively, you can log into your patient portal at <a href="${frontendUrl}" style="color: #0F766E;">ResQ Patient Portal</a> to view and settle your appointment.
                    </p>
                </div>

                <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center; font-size: 12px; color: #94A3B8;">
                    <p style="margin: 0 0 6px 0;">This email was sent regarding medical referral #${appointment.id} initiated by Dr. ${doctorName}.</p>
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ResQ Healthcare. All rights reserved.</p>
                </div>
            </div>
        `;

        await sendEmail(targetEmail, subject, htmlContent);
        console.log(`✅ [NotificationService] Referral payment required email successfully sent to ${targetEmail} for appointment ${appointment.id}`);

        // If booking for someone else and both communication preference, also notify patient.email
        if (
            patient?.email &&
            patient.email.toLowerCase() !== targetEmail.toLowerCase() &&
            ['Patient', 'Both'].includes(appointment.formData?.communicationPreference)
        ) {
            await sendEmail(patient.email, subject, htmlContent).catch(() => null);
        }
    } catch (err) {
        console.error('❌ [NotificationService] Error sending referral payment required notification:', err);
    }
}

module.exports = {
    sendPendingAppointmentNotification,
    sendRejectionNotification,
    sendAppointmentNotifications,
    sendCancellationNotifications,
    sendBookingConfirmationToPatient,
    sendPaymentNotifications,
    sendPaymentFailureNotification,
    sendPaymentConfirmationToProvider,
    sendReceiptEmail,
    sendReferralPaymentRequiredNotification
};
