# Supabase Configuration for Production

To ensure email verification works correctly and redirects open your app instead of `localhost`, please follow these steps:

## 1. Configure URL Settings

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Authentication** -> **URL Configuration**.
3.  Set **Site URL** to: `quoril://auth/callback`
4.  Under **Redirect URLs**, add the following:
    *   `quoril://auth/callback`
    *   `quoril://login-callback` (optional, for future use)

## 2. Configure Email Templates

1.  Navigate to **Authentication** -> **Email Templates**.
2.  Ensure the links in your templates (e.g., "Confirm your email") use the `{{ .ConfirmationURL }}` variable, which will now use the custom protocol you set above.

## 3. Why were emails going to Spam?

*   This happens when emails are sent from `noreply@mail.app.supabase.io` (the default) but the "From" address doesn't match the domain, or you are sending too many emails.
*   **Fix:** Go to **Project Settings** -> **Authentication** -> **SMTP Settings** and configure your own SMTP server (e.g., via SendGrid, AWS SES, or Resend). This will significantly improve deliverability.

## 4. Why was it opening Localhost?

*   Previously, the app was configured to redirect to `window.location.origin`, which is `localhost` in development.
*   We have now updated the app to use the detailed custom protocol `quoril://`. When a user clicks the link, it will trigger the operating system to open the Quoril app directly.
