# Email Notification Setup Guide

This document provides instructions on how to properly set up email notifications for the ResQ healthcare platform.

## Issue: Email Notifications Not Being Received

If you're not receiving email notifications for payments or appointment bookings, the most likely cause is incorrect email configuration.

## Solution

### 1. Create a Gmail App Password

For security reasons, Gmail requires an App Password for third-party applications:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Select "Security" from the left menu
3. Under "Signing in to Google," select "2-Step Verification" (enable it if not already enabled)
4. At the bottom of the page, select "App passwords"
5. Click "Select app" and choose "Other (Custom name)"
6. Enter "ResQ Healthcare" and click "Generate"
7. Google will display a 16-character app password. **Copy this password**

### 2. Update Your Environment Variables

1. Create or edit the `.env` file in the root directory of your project
2. Update the email configuration variables:

```
# Email Configuration
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
EMAIL_FROM=your_gmail_address@gmail.com
ADMIN_EMAIL=admin_email@example.com
```

Replace:
- `your_gmail_address@gmail.com` with your actual Gmail address
- `your_16_character_app_password` with the app password you generated
- `admin_email@example.com` with the email where you want to receive admin notifications

### 3. Test Your Email Configuration

Run the email test script to verify your configuration:

```bash
npm run test-email
```

If successful, you should see:
```
Testing email configuration...
EMAIL_USER: your_gmail_address@gmail.com
EMAIL_PASSWORD set: Yes
Test email sent successfully!
```

And you should receive a test email in your inbox.

### 4. Restart Your Server

After updating the configuration, restart your server:

```bash
npm run dev
```

## Troubleshooting

If you're still experiencing issues:

1. **Check Gmail Settings**: Make sure "Less secure app access" is turned on in your Google Account settings if you're not using an App Password.

2. **Check Spam Folder**: Email notifications might be marked as spam.

3. **Verify Environment Variables**: Make sure your `.env` file is being properly loaded.

4. **Check Server Logs**: Look for any error messages related to email sending.

5. **Test with Different Email**: Try configuring the system with a different email provider.

## Gmail SMTP Settings Reference

```
Host: smtp.gmail.com
Port: 587
Security: TLS
Username: your_gmail_address@gmail.com
Password: your_app_password
```

## Common Errors

### "Invalid login: 535-5.7.8 Username and Password not accepted"
This usually means your Gmail password is incorrect or you need to use an App Password.

### "Error: self signed certificate in certificate chain"
This is related to SSL/TLS. Try setting `rejectUnauthorized: false` in your SMTP configuration.

### "Error: connect ETIMEDOUT"
This could be a network issue or Gmail's SMTP server being temporarily unavailable. Try again later. 