# Setting Up Secure & Reliable Email Authentication

### The Problem: Emails going to Spam
Currently, your app is using Supabase's built-in default email service.
- **Why it goes to Spam:** This service acts as a "generic" sender for thousands of Supabase projects. Email providers (Gmail, Outlook) often flag these as spam because the IP address is shared with many other developers.
- **Security Implication:** Users might miss verification emails, making the signup process unreliable.

### The Solution: Custom SMTP
To make your authentication "Secure and Proper," you must connect a dedicated email sending service to Supabase. This establishes **Domain Reputation**.

### Recommended Provider: Resend (Free Tier is Excellent)
1. **Create an account** at [Resend.com](https://resend.com).
2. **Add your domain** (e.g., `quoril.com` or `blitzit.app`).
   - *Note: You need a real domain name for this.*
3. **Verify DNS records** (DKIM, SPF, DMARC) provided by Resend.
   - **DKIM/SPF:** These are cryptographic signatures that tell Gmail/Outlook "This email really came from us, not a scammer." **This is the #1 fix for spam.**

### Steps to Configure in Supabase
1. Go to your **Supabase Dashboard**.
2. Navigate to **Project Settings** -> **Authentication** -> **Email**.
3. Toggle **"Enable Custom SMTP"**.
4. Fill in the details from Resend (or SendGrid/AWS SES):
   - **Sender Email:** `noreply@yourdomain.com` (Must match the domain you verified)
   - **Sender Name:** Quoril App
   - **SMTP Host:** `smtp.resend.com`
   - **Port:** `465` (Secure SSL)
   - **Username:** `resend`
   - **Password:** [Your Resend API Key]
5. Click **Save**.

### Important: URL Configuration for Deep Linking
To ensure the "Verify Email" Link Opens your Desktop App and not a Browser:

1. In Supabase Dashboard, go to **Authentication** -> **URL Configuration**.
2. **Site URL:** Set this to your website URL (or `http://localhost:3000` if you don't have one yet).
3. **Redirect URLs:** You **MUST** add these exactly:
   - `quoril://auth/callback` (This Triggers the Desktop App)
   - `http://localhost:5173/auth/callback` (For local testing)

### Security Checklist (Already Implemented in Code)
Your app code is already secure. We have implemented:
- *Rate Limiting:* Prevents attackers from spamming signups (`src/utils/securityUtils.ts`).
- *Password Strength:* Enforces strong passwords with uppercase, numbers, and symbols.
- *Input Sanitization:* Prevents malicious code injection.                        

*Summary:* The code is secure. The "spam" issue is purely a **Supabase Dashboard Configuration** task. Once you add Custom SMTP, the emails will land in the Inbox perfectly.
