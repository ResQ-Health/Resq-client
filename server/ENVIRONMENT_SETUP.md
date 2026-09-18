# Environment Variables Setup Guide

## FRONTEND_URL Configuration

The `FRONTEND_URL` environment variable is used for generating links in emails (password reset, OTP, etc.). It should be set differently for each environment.

### Local Development

In your local `.env` file:

```env
FRONTEND_URL=http://localhost:3000
```

### Staging Environment

In your staging environment (e.g., Render, Heroku, etc.):

```env
FRONTEND_URL=https://resq-client.vercel.app
```

### Production Environment

In your production environment, set the production frontend URL:

```env
FRONTEND_URL=https://resq-client.vercel.app
```

**Note:** If you have a separate production domain, use that instead. For example:
```env
FRONTEND_URL=https://app.resqhealth.com
```

**Important Notes:**
- Do NOT include a trailing slash (`/`) at the end
- Use `https://` for production/staging
- The code will automatically append the path (e.g., `/reset-password?token=...`)

### How It Works

The password reset email will use this URL to generate the reset link:

```
{FRONTEND_URL}/reset-password?token={token}
```

**Examples:**
- Local: `http://localhost:3000/reset-password?token=abc123`
- Staging: `https://resq-client.vercel.app/reset-password?token=abc123`
- Production: `https://resq-client.vercel.app/reset-password?token=abc123` (or your production domain)

### Setting in Render

#### For Staging Environment:
1. Go to your Render dashboard
2. Select your **staging** service
3. Go to **Environment** tab
4. Add or update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://resq-client.vercel.app
   ```
5. Save and redeploy

#### For Production Environment:
1. Go to your Render dashboard
2. Select your **production** service
3. Go to **Environment** tab
4. Add or update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://resq-client.vercel.app
   ```
   (Or your production domain if different)
5. Save and redeploy

### Setting in Other Platforms

**Heroku:**
```bash
heroku config:set FRONTEND_URL=https://resq-client.vercel.app
```

**Vercel/Netlify (if running serverless):**
Add to your environment variables in the dashboard.

**Docker:**
```dockerfile
ENV FRONTEND_URL=https://resq-client.vercel.app
```

### Environment Files

Example environment files are provided:
- `.env.staging.example` - Template for staging environment
- `.env.production.example` - Template for production environment

**Note:** Never commit actual `.env` files with real credentials to version control.

### Verification

After setting the environment variable, you can verify it's working by:

1. Requesting a password reset
2. Checking the server logs - you should see:
   ```
   [Password Reset Email] Using frontend URL: https://resq-client.vercel.app
   ```
3. Checking the email - the reset link should use the correct URL

### Quick Setup Checklist

**For Staging:**
- [ ] Set `FRONTEND_URL=https://resq-client.vercel.app` in staging environment
- [ ] Verify in server logs after deployment
- [ ] Test password reset email

**For Production:**
- [ ] Set `FRONTEND_URL=https://resq-client.vercel.app` (or production domain) in production environment
- [ ] Verify in server logs after deployment
- [ ] Test password reset email
- [ ] Ensure all other production environment variables are set correctly

### Troubleshooting

**Issue: Still seeing localhost in emails**
- Check that `FRONTEND_URL` is set in your production environment
- Restart your server after changing environment variables
- Check server logs to see what URL is being used

**Issue: Double slashes in URL**
- Make sure `FRONTEND_URL` doesn't have a trailing slash
- The code automatically handles this, but it's best practice to omit it

**Issue: Wrong URL in emails**
- Verify the environment variable is set correctly
- Check that you're looking at the right environment (staging vs production)
- Check server logs for the actual URL being used

