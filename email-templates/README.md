# Email Templates

This folder contains professional email templates for the CIMA Learn platform.

## Password Reset Template

### File: `password-reset.html`

A professional password reset email template designed with the CIMA brand colors:

- **Primary Crimson**: `#610000`
- **Secondary Amber**: `#fedb95` 
- **Background**: `#fbfaee`
- **Typography**: Inter, Noto Serif, Work Sans

### Features

- ✅ Mobile-responsive design
- ✅ Professional branding with CIMA colors
- ✅ Security notice with expiration information
- ✅ Clear call-to-action button
- ✅ Accessibility compliant
- ✅ Current year (2025) in copyright

### Usage

This template is designed to be used with Supabase Auth email templates. The `{{ .ConfirmationURL }}` placeholder will be automatically replaced by Supabase with the actual password reset link.

### Customization

To customize the template:

1. Update colors in the `<style>` section
2. Modify the logo section if needed
3. Adjust copy text as required
4. Update footer links for Privacy Policy and Terms of Service

### Security Features

- Generic success messages to prevent user enumeration
- Clear expiration information (24 hours)
- Security notice about unauthorized requests
- Professional appearance to build trust

## Implementation Notes

The password reset flow is fully implemented in the application:

1. **Forgot Password Page**: `/forgot-password`
   - Email input form
   - Rate limiting (10-second cooldown)
   - Security-focused messaging
   - Professional UI with shield icon

2. **Reset Password Page**: `/reset-password`
   - Password strength validation
   - Real-time requirements checking
   - Show/hide password toggles
   - Visual feedback for validation

3. **Email Template**: This HTML template
   - Professional branding
   - Mobile-responsive
   - Security information
   - Clear CTA button

The complete flow follows security best practices and provides excellent user experience.
