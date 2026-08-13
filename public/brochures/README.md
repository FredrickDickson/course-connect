# 📁 CIMA Learn Brochures Directory

## 📄 Place Your Brochure PDF Here

To enable the brochure download functionality:

1. **Add your PDF file** to this directory with the name:
   ```
   cima-learn-brochure.pdf
   ```

2. The download section on the landing page will automatically serve this file.

---

## 📋 Recommended Brochure Content

Your brochure should include:

### Page 1: Cover
- CIMA Learn logo and branding
- Tagline: "Professional ADR Education"
- Compelling hero image

### Page 2-3: About CIMA
- Mission and vision
- Accreditation details
- Global reach (120+ charities, 4,800+ learners)

### Page 4-5: Learning Pathways
1. Commercial Mediation & Settlement
2. Employment & Workplace Mediation
3. Construction Mediation
4. Mediation Advocacy for Lawyers
5. AI, Online Mediation & Digital Dispute Resolution

### Page 6-7: Course Catalog
- Featured courses with descriptions
- Course durations and formats
- Certification details

### Page 8-9: Faculty
- International faculty profiles
- Expert credentials
- Teaching methodology

### Page 10-11: Success Stories
- Student testimonials
- Career advancement statistics
- Employer logos and partnerships

### Page 12: Contact & Next Steps
- Website: [Your URL]
- Email: [Your Email]
- Phone: [Your Phone]
- Clear CTAs: "Register Now" or "Contact Us"

---

## 🎨 Design Tips

**Following enterprise standards:**

1. **Consistent Branding**
   - Use CIMA's burgundy red (#610000)
   - Professional typography
   - High-quality images

2. **Professional Layout**
   - White space for readability
   - Clear section hierarchy
   - Professional charts/graphs for statistics

3. **High Quality**
   - PDF should be 300 DPI for print quality
   - File size: Optimize to 3-5 MB for quick downloads
   - Include hyperlinks to your website

---

## 🔧 Alternative File Name

If you use a different filename, update line 30 in `client/src/pages/landing.tsx`:

```typescript
link.href = '/brochures/YOUR-FILE-NAME.pdf';
```

---

**Note**: This directory is created in the `public` folder, making files directly accessible at `/brochures/` URL path.
