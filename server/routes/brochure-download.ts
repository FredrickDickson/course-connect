import { Router } from 'express';
import { sendEmail } from '../services/email';
import { supabase } from '../db';
import path from 'path';
import fs from 'fs';

const router = Router();

router.post('/api/brochure-download', async (req, res) => {
  try {
    const { email, full_name, organization } = req.body;

    // Validate required fields
    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

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

    // Read the PDF file
    const pdfPath = path.join(process.cwd(), 'public', 'brochures', 'cima-learn-brochure.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found at:', pdfPath);
      return res.status(500).json({ error: 'Brochure file not found' });
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Send email with PDF attachment
    await sendEmail({
      to: email,
      subject: 'Your CIMA Learn Summer School 2026 Brochure',
      html: `
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
              
              <p><strong>The brochure is attached to this email as a PDF file.</strong></p>
              
              <p>If you have any questions or would like to speak with our admissions team, please don't hesitate to reach out.</p>
              
              <a href="https://thecima.org" class="button" style="color: white;">Visit Our Website</a>
              
              <p>Best regards,<br>
              <strong>The CIMA Learn Team</strong></p>
            </div>
            <div class="footer">
              <p>CIMA Learn - Professional ADR Education<br>
              This email was sent because you requested our brochure at thecima.org</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [{
        filename: 'CIMA-Learn-Summer-School-2026.pdf',
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }]
    });

    res.json({ 
      success: true, 
      message: 'Brochure sent successfully to your email' 
    });

  } catch (error) {
    console.error('Error sending brochure:', error);
    res.status(500).json({ 
      error: 'Failed to send brochure. Please try again.' 
    });
  }
});

export default router;
