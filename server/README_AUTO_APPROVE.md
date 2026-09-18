# Auto-Approve Appointments Feature

This document describes the auto-approve appointments feature for healthcare providers in the ResQ platform.

## Overview

The auto-approve feature allows providers to automatically confirm appointments without manual intervention. By default, all appointments require manual confirmation by the provider, but providers can opt to enable auto-approval for faster processing.

## How It Works

1. Providers can enable or disable auto-approval in their settings
2. When enabled, appointments are automatically confirmed after successful payment
3. When disabled, providers must manually confirm each appointment
4. The setting applies to all future appointments for that provider

## Provider Setting

Each provider has an `auto_confirm_appointments` boolean field in their profile:
- **Default value**: `true` (auto-approve enabled by default)
- **When `true`**: Appointments are automatically confirmed after payment
- **When `false`**: Appointments remain in "pending" status until manually confirmed

To update this setting, the PUT request must include the `user_id` and `provider_name` fields along with `auto_confirm_appointments`.

## API Endpoints

### Get Current Auto-Approve Setting

```
GET /api/v1/providers/me/auto-confirm
```

**Response:**
```json
{
  "success": true,
  "data": {
    "auto_confirm_appointments": true
  }
}
```

### Update Auto-Approve Setting

```
PUT /api/v1/providers/me/auto-confirm
```

**Request Body:**
```json
{
  "user_id": "sSgDBhat0H",
  "provider_name": "ABC Diagnostics",
  "auto_confirm_appointments": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-confirm appointments disabled successfully",
  "data": {
    "user_id": "sSgDBhat0H",
    "provider_name": "ABC Diagnostics",
    "auto_confirm_appointments": false
  }
}
```

## Workflow

### With Auto-Approve Enabled (Default)

1. Patient books appointment → Status: "pending"
2. Patient makes payment → Status: Automatically changes to "confirmed"
3. Notifications sent to patient and provider

### With Auto-Approve Disabled

1. Patient books appointment → Status: "pending"
2. Provider receives notification of new appointment
3. Provider manually confirms appointment via dashboard
4. Patient makes payment → Status: Remains "confirmed" (already confirmed)
5. Notifications sent to patient and provider

## Benefits

- **Faster Processing**: Eliminates wait time for appointment confirmation
- **Convenience**: Reduces manual work for busy providers
- **Flexibility**: Providers can choose based on their workflow preferences
- **Backward Compatibility**: Existing manual confirmation workflow still available

## Technical Implementation

The auto-approve functionality is implemented in two places:

1. **Paystack Webhook Handler**: Automatically confirms appointments when payment is received if provider has auto-approve enabled
2. **Manual Payment Verification**: Also respects the auto-approve setting when payments are manually verified

### Code Logic

```javascript
// In payment webhook handler
if (provider && provider.auto_confirm_appointments === true) {
    appointment.status = 'confirmed';
    appointment.updated_at = new Date();
    console.log(`Auto-confirming appointment ${appointmentId} after successful payment`);
}
```

## Best Practices

1. Providers should consider their workflow when deciding whether to enable auto-approve
2. Providers who want to review appointment details before confirming should disable auto-approve
3. Providers who prioritize speed and convenience should enable auto-approve
4. The setting can be changed at any time and affects only future appointments

## Error Handling

- If the provider profile cannot be found, the appointment will not be auto-approved
- If there are database errors during the auto-approval process, the system logs the error but continues processing
- Manual confirmation is always available as a fallback

## Security Considerations

- Only authenticated providers can modify their auto-approve setting
- The setting only affects the provider's own appointments
- All standard authentication and authorization checks apply