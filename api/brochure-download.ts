import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, full_name, organization } = req.body;

    // Validate required fields
    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Save to database
    const { error: dbError } = await supabase
      .from('brochure_downloads')
      .insert([{
        email: email.trim(),
        full_name: full_name.trim(),
        organization: organization?.trim() || null,
        user_agent: req.headers['user-agent'] || null
      }]);

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue even if database save fails
    }

    // Build download URL for the PDF
    const brochureFilename = "2026 CIMA Summer School-compressed.pdf";
    const encoded = encodeURIComponent(brochureFilename);
    const downloadUrl = `${process.env.FRONTEND_URL || "https://cimalearn.thecima.org"}/uploads/${encoded}`;

    // Send email via Brevo
    const emailPayload = {
      sender: {
        name: process.env.EMAIL_FROM_NAME || "CIMA Learn",
        email: process.env.EMAIL_FROM || "noreply@thecima.org"
      },
      to: [{
        email: email.trim(),
        name: full_name.trim()
      }],
      subject: 'Your CIMA Learn Summer School 2026 Brochure',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #610000; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #610000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to CIMA Learn!</h1>
            </div>
            <div class="content">
              <p>Dear ${full_name},</p>
              
              <p>Thank you for your interest in CIMA Learn's Summer School 2026 programme!</p>
              
              <p>We're delighted to send you our comprehensive brochure, which includes:</p>
              <ul>
                <li>Complete course catalog & learning pathways</li>
                <li>Accreditation details & certification information</li>
                <li>International faculty profiles & testimonials</li>
                <li>Career advancement statistics & success stories</li>
              </ul>
              
              <p><strong>Click the button below to download your brochure:</strong></p>
              
              <p style="text-align: center;">
                <a href="${downloadUrl}" class="button" style="color: white; text-decoration: none;">Download Brochure (PDF)</a>
              </p>
              
              <p>If you have any questions or would like to speak with our admissions team, please don't hesitate to reach out.</p>
              
              <p>Best regards,<br>
              <strong>The CIMA Learn Team</strong></p>
            </div>
            <div class="footer">
              <p>CIMA Learn - Professional ADR Education<br>
              This email was sent because you requested our brochure</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email via Brevo API
    const emailResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY!,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Brevo API error:', errorData);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Brochure sent successfully to your email' 
    });

  } catch (error) {
    console.error('Error sending brochure:', error);
    return res.status(500).json({ 
      error: 'Failed to send brochure. Please try again.' 
    });
  }
}
