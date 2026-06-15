# Security Implementation Guide

## Overview
This application implements comprehensive security measures to protect user data and prevent unauthorized access.

## Security Features Implemented

### 1. **Authentication Security**

#### Password Requirements
- Minimum 12 characters (configurable in `src/config/security.ts`)
- Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (!@#$%^&*...)
- Rejects common/weak passwords
- Real-time password strength indicator during signup

#### Rate Limiting
- **Login Attempts**: Maximum 5 attempts per minute per email
  - After exceeding limit: 15-minute lockout
- **Signup Attempts**: Maximum 3 attempts per hour per IP/email
- Client-side rate limiting with server-side validation via Supabase

#### Session Management
- **Session Timeout**: 30 minutes of inactivity
- **Maximum Session Duration**: 12 hours
- **Auto-refresh**: Tokens refresh 5 minutes before expiry
- **Activity Tracking**: Monitors user interactions (mouse, keyboard, scroll, touch)
- **Browser Fingerprinting**: Additional validation layer

### 2. **Input Validation & Sanitization**

#### Email Validation
- Strict RFC-compliant email format validation
- Maximum length: 254 characters
- Real-time validation feedback in UI

#### Input Sanitization
- All user inputs are sanitized to prevent XSS attacks
- HTML tags are stripped
- Special characters are escaped
- SQL injection pattern detection

### 3. **Secure Error Handling**

- Generic error messages that don't leak information
- No indication whether an email exists in the system (prevents enumeration)
- Sanitized error messages for all authentication failures
- Detailed errors logged server-side only

### 4. **Data Protection**

#### In Transit
- All communications use HTTPS (enforced by Supabase)
- TLS 1.2+ encryption
- Secure WebSocket connections for real-time updates

#### At Rest
- Passwords hashed using bcrypt (handled by Supabase Auth)
- Session tokens encrypted
- Sensitive data in localStorage is base64-encoded (upgrade to proper encryption recommended)

### 5. **UI/UX Security Features**

- Password visibility toggle
- Real-time password strength indicator
- Clear security badges and indicators
- Visual feedback for validation errors
- Secure connection indicators

## Configuration

### Security Settings
All security configurations are centralized in `src/config/security.ts`:

```typescript
export const SECURITY_CONFIG = {
    PASSWORD: {
        MIN_LENGTH: 12,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SPECIAL_CHARS: true,
    },
    RATE_LIMIT: {
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION_MS: 15 * 60 * 1000,
        // ... more settings
    },
    SESSION: {
        TIMEOUT_MS: 30 * 60 * 1000,
        MAX_DURATION_MS: 12 * 60 * 60 * 1000,
        // ... more settings
    },
}
```

## Environment Variables

### Required Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Security Notes
- **NEVER** commit `.env` to version control
- The anon key is safe to expose in client-side code (it's public)
- Row Level Security (RLS) policies in Supabase protect your data
- Service role key should NEVER be used in client-side code

## Supabase Security Configuration

### Row Level Security (RLS)
Ensure RLS is enabled on all tables:

```sql
-- Enable RLS on tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (example for tasks table)
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);
```

### Email Verification
Configure in Supabase Dashboard:
1. Go to Authentication > Settings
2. Enable "Confirm email" under Email Auth
3. Customize email templates
4. Set redirect URLs

## Best Practices

### For Developers

1. **Never Log Sensitive Data**
   - Don't log passwords, tokens, or personal information
   - Use secure logging levels in production

2. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```

3. **Use Environment Variables**
   - Never hardcode secrets
   - Use `.env.local` for local development
   - Use platform environment variables in production

4. **Validate on Both Sides**
   - Client-side validation for UX
   - Server-side validation for security (via Supabase RLS)

5. **Regular Security Audits**
   - Review security configurations quarterly
   - Test authentication flows
   - Check for dependency vulnerabilities

### For Users

1. **Use Strong Passwords**
   - Follow the password requirements
   - Don't reuse passwords from other sites
   - Consider using a password manager

2. **Enable Email Verification**
   - Always verify your email address
   - Check for suspicious login notifications

3. **Secure Your Account**
   - Log out when using shared devices
   - Don't share your credentials
   - Report suspicious activity

## Security Checklist

- [x] Strong password requirements (12+ chars, mixed case, numbers, symbols)
- [x] Password strength indicator
- [x] Rate limiting on login/signup
- [x] Session timeout on inactivity
- [x] Maximum session duration
- [x] Input validation and sanitization
- [x] XSS prevention
- [x] SQL injection prevention
- [x] Secure error messages
- [x] Activity tracking
- [x] Browser fingerprinting
- [x] HTTPS enforcement (via Supabase)
- [x] Email verification support
- [x] Secure session management
- [x] Auto-logout on session expiry

## Future Enhancements

### Recommended Additions

1. **Two-Factor Authentication (2FA)**
   - TOTP (Time-based One-Time Password)
   - SMS verification
   - Email verification codes

2. **Advanced Session Security**
   - Device fingerprinting
   - Geolocation tracking
   - Suspicious login detection

3. **Enhanced Encryption**
   - End-to-end encryption for sensitive data
   - Proper encryption for localStorage (replace base64)
   - Encrypted backups

4. **Security Monitoring**
   - Failed login attempt monitoring
   - Unusual activity detection
   - Security event logging

5. **Compliance**
   - GDPR compliance features
   - Data export functionality
   - Account deletion with data purge

## Incident Response

### If You Suspect a Security Issue

1. **Immediate Actions**
   - Change your password immediately
   - Sign out from all devices
   - Check recent activity

2. **Report**
   - Contact support
   - Document the incident
   - Preserve evidence

3. **Prevention**
   - Enable additional security features
   - Review account settings
   - Monitor for suspicious activity

## Support

For security-related questions or to report vulnerabilities:
- Email: security@quoril.app (update with your actual contact)
- GitHub Issues: For non-sensitive security improvements

**Note**: For sensitive security issues, please contact us privately before public disclosure.

---

Last Updated: February 2026
Version: 1.0.0
