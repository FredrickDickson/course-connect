# How to Add Partner Logos and Names to the Landing Page

## Overview
The partner carousel is located in the `InstitutionalNetworkSection` component in `client/src/pages/landing.tsx`. It uses a data array called `PARTNER_LOGOS` to manage all partner information.

## Current Structure

### Data Array
```typescript
const PARTNER_LOGOS = [
  { name: "Partner Name", url: "https://example.com/logo.png" },
  // ... more partners
];
```

### Carousel Features
- **Infinite Scroll**: Logos automatically scroll horizontally and loop seamlessly
- **Responsive Design**: Different spacing on mobile, tablet, and desktop
- **Hover Effects**: Logos become fully colored on hover
- **Partner Names**: Displayed below logos on larger screens (hidden on mobile)

## How to Add New Partners

### Step 1: Prepare Your Logo Files
1. **Image Requirements**:
   - Format: PNG, SVG, or JPG (SVG recommended for scalability)
   - Size: 120x60px recommended (will be scaled automatically)
   - Background: Transparent or white
   - Color: Dark colors work best with the grayscale hover effect

2. **Upload Logo Files**:
   - Place logos in: `client/public/images/partners/`
   - Or use a CDN/external URL

### Step 2: Add to the PARTNER_LOGOS Array

Edit `client/src/pages/landing.tsx` and add your partner to the `PARTNER_LOGOS` array:

```typescript
const PARTNER_LOGOS = [
  // Existing partners...
  { name: "Your Partner Name", url: "/images/partners/your-logo.png" },
  { name: "Another Partner", url: "https://cdn.example.com/logo.svg" },
];
```

### Step 3: Best Practices

#### Logo URL Options:
1. **Local Files** (recommended):
   ```typescript
   { name: "Partner Name", url: "/images/partners/logo.png" }
   ```

2. **External CDN**:
   ```typescript
   { name: "Partner Name", url: "https://cdn.example.com/logo.svg" }
   ```

3. **Placeholder** (for testing):
   ```typescript
   { name: "Partner Name", url: "https://via.placeholder.com/120x60/610000/ffffff?text=LOGO" }
   ```

#### Naming Conventions:
- Use clear, recognizable partner names
- Avoid special characters in names
- Keep names reasonably short for mobile display

## Advanced Customization

### Changing Carousel Speed
Edit the CSS animation in `client/src/index.css`:

```css
.animate-scroll {
  animation: scroll 40s linear infinite; /* Change 40s to adjust speed */
}
```

### Modifying Logo Size
In the component, adjust these classes:
```typescript
className="h-10 sm:h-12 logo-tint opacity-60 hover:opacity-100 transition-opacity object-contain"
```

- `h-10` = 40px height (mobile)
- `sm:h-12` = 48px height (tablet and up)

### Adding Links to Partner Websites
If you want logos to be clickable:

```typescript
{duplicatedLogos.map((partner, index) => (
  <a 
    key={`${partner.name}-${index}`}
    href="https://partner-website.com"
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-col items-center gap-2 hover:opacity-100 transition-opacity"
  >
    <img 
      alt={`${partner.name} Logo`} 
      className="h-10 sm:h-12 logo-tint opacity-60 hover:opacity-100 transition-opacity object-contain" 
      src={partner.url}
    />
    <span className="text-xs text-landing-on-surface-variant/70 font-label uppercase tracking-wider hidden sm:block">
      {partner.name}
    </span>
  </a>
))}
```

## Troubleshooting

### Logos Not Showing
1. Check file paths are correct
2. Ensure images are in the public folder
3. Verify image URLs are accessible

### Animation Issues
1. Ensure CSS is loaded properly
2. Check for JavaScript errors
3. Verify the `animate-scroll` class is applied

### Responsive Issues
1. Test on different screen sizes
2. Check logo aspect ratios
3. Verify text visibility on mobile

## File Locations

- **Component**: `client/src/pages/landing.tsx`
- **Styles**: `client/src/index.css`
- **Logo Images**: `client/public/images/partners/`
- **Partner Data**: Inside the component (lines ~397-410)

## Current Partners (as of last update)

1. Law Society of Kenya
2. Bank of Ghana
3. Ghana Bar Association
4. Africa Bar Association
5. Maldives Moot Court Society
6. Legal Vidhiya
7. ICC
8. LCIA
9. CIARB
10. HMRC
11. The Hague
12. Pinsent Masons

---

## Quick Add Template

Copy and paste this template to add a new partner:

```typescript
{ name: "New Partner Name", url: "/images/partners/new-partner-logo.png" },
```

Replace the name and URL with your actual partner information.
