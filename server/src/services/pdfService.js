const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generate a PDF receipt for a payment
 * @param {Object} appointment - The appointment object
 * @param {Object} patient - The patient object
 * @param {Object} provider - The provider object
 * @param {Object} service - The service object
 * @returns {Promise<Buffer>} - The generated PDF as a buffer
 */
const generateReceiptPDF = (appointment, patient, provider, service) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);

            // --- Constants & Helpers ---
            const colors = {
                primary: '#333333',
                secondary: '#666666',
                accent: '#4CAF50', // Green for PAID status
                lightGray: '#F5F5F5',
                line: '#E0E0E0'
            };

            const fonts = {
                regular: 'Helvetica',
                bold: 'Helvetica-Bold'
            };

            // Helper to draw Naira symbol
            const drawNaira = (x, y, size, isBold = false) => {
                doc.save();
                doc.font(isBold ? fonts.bold : fonts.regular).fontSize(size);
                const symbol = 'N';
                const w = doc.widthOfString(symbol);

                // Draw N
                doc.text(symbol, x, y, { lineBreak: false });

                // Draw lines
                doc.lineWidth(1);
                doc.strokeColor(doc._fillColor); // Match text color
                const y1 = y + (size * 0.35); // Approx positions based on N height
                const y2 = y + (size * 0.60);

                doc.moveTo(x - 1, y1).lineTo(x + w + 1, y1).stroke();
                doc.moveTo(x - 1, y2).lineTo(x + w + 1, y2).stroke();
                doc.restore();
                return w;
            };

            // Helper for Right Aligned Currency
            const drawCurrencyRight = (amount, x, y, width, size, isBold) => {
                // Standard currency format: 10,000.00
                const text = amount.toLocaleString('en-NG', { minimumFractionDigits: 0 });

                doc.fontSize(size).font(isBold ? fonts.bold : fonts.regular);
                const textWidth = doc.widthOfString(text);

                // Calculate symbol width
                const symbolStr = 'N';
                const symbolWidth = doc.widthOfString(symbolStr);
                const spacing = 2;

                const totalWidth = symbolWidth + spacing + textWidth;
                const startX = x + width - totalWidth; // Right align relative to (x + width)

                // Draw Symbol
                drawNaira(startX, y, size, isBold);

                // Draw Amount
                doc.text(text, startX + symbolWidth + spacing, y);
            };

            // --- Header ---
            // Logo
            const logoPath = path.join(__dirname, '../public/Logomark (1).png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 40 });
                doc.fontSize(20).font(fonts.bold).text('RESQ', 100, 55);
            } else {
                doc.fontSize(24).font(fonts.bold).text('RESQ', 50, 50);
            }

            // Receipt Title & ID (Top Right)
            doc.fontSize(24).font(fonts.bold).text('RECEIPT', 400, 50, { align: 'right' });
            doc.fontSize(10).font(fonts.regular).fillColor(colors.secondary)
                .text(`#${appointment.payment.paystackReference || 'N/A'}`, 400, 80, { align: 'right' });

            // Horizontal Line
            doc.moveTo(50, 110).lineTo(545, 110).strokeColor(colors.line).lineWidth(1).stroke();

            // --- Date & Status Row ---
            const dateY = 130;
            doc.fillColor(colors.secondary).fontSize(10).font(fonts.bold).text('DATE ISSUED', 50, dateY);
            doc.fillColor(colors.primary).fontSize(12).font(fonts.regular)
                .text(new Date(appointment.payment.paidAt || Date.now()).toLocaleDateString('en-GB'), 50, dateY + 15);

            doc.fillColor(colors.secondary).fontSize(10).font(fonts.bold).text('STATUS', 450, dateY, { align: 'right' });

            // Status Pill
            const statusText = (appointment.payment.status || 'PAID').toUpperCase();
            const statusWidth = doc.widthOfString(statusText) + 20;
            const statusX = 545 - statusWidth;

            // Draw pill background
            doc.roundedRect(statusX, dateY + 12, statusWidth, 20, 10).fill('#E8F5E9'); // Light green bg
            doc.fillColor(colors.accent).fontSize(10).font(fonts.bold)
                .text(statusText, statusX, dateY + 17, { width: statusWidth, align: 'center' });

            // --- Details Section (Two Columns) ---
            const detailsY = 200;
            const col1X = 50;
            const col2X = 300;

            // Column Headers
            doc.fillColor(colors.secondary).fontSize(10).font(fonts.bold).text('PATIENT DETAILS', col1X, detailsY);
            doc.moveTo(col1X, detailsY + 15).lineTo(250, detailsY + 15).stroke();

            doc.text('APPOINTMENT DETAILS', col2X, detailsY);
            doc.moveTo(col2X, detailsY + 15).lineTo(545, detailsY + 15).stroke();

            // Patient Details Content
            const contentY = detailsY + 30;
            const lineHeight = 18;
            doc.font(fonts.regular).fontSize(10).fillColor(colors.primary);

            const patientName = appointment.formData?.patientName ||
                patient.full_name ||
                `${patient.personal_details?.first_name || ''} ${patient.personal_details?.last_name || ''}`.trim();

            doc.font(fonts.bold).text('Name: ', col1X, contentY)
                .font(fonts.regular).text(patientName, col1X + 40, contentY);

            doc.font(fonts.bold).text('Email: ', col1X, contentY + lineHeight)
                .font(fonts.regular).text(patient.email, col1X + 40, contentY + lineHeight);

            doc.font(fonts.bold).text('Phone: ', col1X, contentY + lineHeight * 2)
                .font(fonts.regular).text(patient.phone_number || 'N/A', col1X + 40, contentY + lineHeight * 2);


            // Appointment Details Content
            doc.font(fonts.bold).text('Service: ', col2X, contentY)
                .font(fonts.regular).text(service.name, col2X + 50, contentY);

            const apptDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            doc.font(fonts.bold).text('Date: ', col2X, contentY + lineHeight)
                .font(fonts.regular).text(apptDate, col2X + 50, contentY + lineHeight);

            doc.font(fonts.bold).text('Time: ', col2X, contentY + lineHeight * 2)
                .font(fonts.regular).text(`${appointment.start_time}`, col2X + 50, contentY + lineHeight * 2);

            doc.font(fonts.bold).text('Location: ', col2X, contentY + lineHeight * 3)
                .font(fonts.regular).text(provider.address, col2X + 50, contentY + lineHeight * 3, { width: 200 });


            // --- Payment Details Table ---
            let tableY = 380;

            doc.font(fonts.bold).fillColor(colors.secondary).text('PAYMENT DETAILS', 50, tableY - 30);

            // Table Header Background
            doc.rect(50, tableY, 495, 30).fill(colors.lightGray);

            // Table Header Text
            doc.fillColor(colors.primary).fontSize(10).font(fonts.bold);
            doc.text('Description', 60, tableY + 10);
            doc.text('Amount', 450, tableY + 10, { align: 'right', width: 85 });

            // Table Row
            tableY += 40;
            doc.font(fonts.regular);
            doc.text(service.name, 60, tableY);

            // Amount Row
            drawCurrencyRight(appointment.payment.amount || 0, 450, tableY, 85, 10, true);

            // Total Row
            tableY += 40;
            doc.font(fonts.bold).fontSize(12);
            doc.text('Total', 60, tableY, { align: 'center', width: 390 }); // Centered relative to table

            // Amount Total
            drawCurrencyRight(appointment.payment.amount || 0, 450, tableY - 2, 85, 14, true);


            // --- Footer ---
            doc.moveTo(50, 650).lineTo(545, 650).strokeColor(colors.line).lineWidth(1).stroke();

            doc.fontSize(10).font(fonts.regular).fillColor(colors.secondary);
            doc.text('Thank you for choosing RESQ Health.', 50, 670, { align: 'center' });
            doc.text('For any inquiries, please contact us at Hello@resq.africa or +2347072779831', 50, 690, { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateReceiptPDF
};
