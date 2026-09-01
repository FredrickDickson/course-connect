# Nordic Burgundy Color Update

## Overview
All burgundy and red colors across the UI have been updated to **Nordic Burgundy (#5A2633)**.

## Color Changes

### Primary Color (Nordic Burgundy)
- **New Color**: `#5A2633`
- **Hover State**: `#4a1f29` (darker variant)

### Colors Replaced
| Old Color | Description | New Color |
|-----------|-------------|-----------|
| `#610000` | Dark burgundy | `#5A2633` |
| `#8b0000` | Medium burgundy | `#5A2633` |
| `#7d0000` | Red-burgundy | `#5A2633` |
| `#B91C1C` | Bright red | `#5A2633` |
| `#A01818` | Red hover | `#4a1f29` |
| `bg-red-500` | Tailwind red | `bg-[#5A2633]` |
| `bg-red-600` | Tailwind red | `bg-[#5A2633]` |
| `text-red-600` | Text red | `text-[#5A2633]` |
| `text-red-700` | Text red | `text-[#5A2633]` |

## Files Updated

### Configuration
- ✅ `tailwind.config.ts` - Updated landing theme colors
- ✅ `client/src/index.css` - Updated CSS custom properties (--primary, --ring, etc.)

### Pages Updated (100+ files total)
- ✅ Home page (`home.tsx`)
- ✅ Course catalog (`courses.tsx`, `course-search.tsx`)
- ✅ **Course detail page (`course-detail.tsx`)** - Hero section now Nordic Burgundy
- ✅ Dashboard (student & instructor)
- ✅ Checkout page
- ✅ Login & Registration pages
- ✅ Community pages
- ✅ Help center
- ✅ Landing pages
- ✅ All admin pages
- ✅ All Shadcn/UI components (via CSS variables)
- ✅ All other UI components and pages

## Visual Impact

### Where You'll See Nordic Burgundy

1. **Hero Sections**
   - Homepage hero banner
   - Course catalog header
   - Community page header
   - All marketing sections

2. **Buttons & CTAs**
   - Primary action buttons
   - "Enroll Now" buttons
   - "Continue Learning" buttons
   - Navigation links

3. **Branding Elements**
   - Logo backgrounds
   - Icon containers
   - Badge backgrounds
   - Progress bars

4. **Cards & Components**
   - Course cards
   - Stats cards
   - Achievement badges
   - Active states

5. **Gradients**
   - Hero gradients
   - Card backgrounds
   - Hover effects
   - CTA sections

## Testing Checklist

To verify the changes, check these pages:

- [ ] Home page - Hero banner should be Nordic Burgundy
- [ ] Course catalog - Header gradient should use new color
- [ ] Course detail page - CTA buttons should be Nordic Burgundy
- [ ] Checkout page - Payment buttons and highlights
- [ ] Dashboard - Stats icons and cards
- [ ] Login/Register - Form highlights and buttons
- [ ] Community - Hero section background
- [ ] All hover states - Should use darker variant (#4a1f29)

## Next Steps

1. **Clear browser cache** or do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. **Rebuild the app** if using production build
3. **Test all pages** to ensure colors look consistent
4. **Check contrast** for accessibility (Nordic Burgundy has good contrast with white text)

## Rollback

If you need to revert to the old colors, run this command:

```bash
git diff HEAD > nordic-burgundy-changes.patch
git checkout HEAD -- client/src tailwind.config.ts
```

Then you can reapply with:
```bash
git apply nordic-burgundy-changes.patch
```

---

**Update Date**: 2026-09-01  
**Updated By**: Kiro  
**Color Code**: #5A2633 (Nordic Burgundy)
