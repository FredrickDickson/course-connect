# 400 Error Fixes Guide

## Overview

This document provides practical fixes for the most common 400 errors found in your codebase. The fixes can be applied to existing routes without breaking changes.

## Common 400 Error Patterns Found

### 1. Missing Required Fields
**Problem**: Routes return 400 when required fields are missing
**Locations**: `routes.ts`, `routes/enrollments.ts`, `routes/qualification.ts`

**Current Code**:
```typescript
if (!courseId || !enrollmentLevel) {
  return res.status(400).json({ message: "courseId and enrollmentLevel are required" });
}
```

**Fixed Code**:
```typescript
import { validateRequiredFields } from "../middleware/error-fixes";

// Add middleware or inline validation
const validation = validateRequiredFields(req, ['courseId', 'enrollmentLevel']);
if (!validation.isValid) {
  return res.status(400).json({
    error: "Validation failed",
    details: validation.error
  });
}
```

### 2. File Upload Validation
**Problem**: Routes return 400 when no file is uploaded
**Locations**: `routes.ts`, `routes/auth.ts`, `routes/admin.ts`

**Current Code**:
```typescript
if (!req.file) {
  return res.status(400).json({ error: "No image file provided" });
}
```

**Fixed Code**:
```typescript
import { validateFileUpload } from "../middleware/error-fixes";

const fileValidation = validateFileUpload(req, ['image/jpeg', 'image/png', 'image/gif']);
if (!fileValidation.isValid) {
  return res.status(400).json({
    error: "File validation failed",
    details: fileValidation.error
  });
}
```

### 3. Invalid Email Format
**Problem**: Contact forms return 400 for invalid emails
**Location**: `routes.ts`

**Current Code**:
```typescript
if (!emailRegex.test(email)) {
  return res.status(400).json({ message: "Invalid email address" });
}
```

**Fixed Code**:
```typescript
import { validateEmailFormat } from "../middleware/error-fixes";

const emailValidation = validateEmailFormat(email);
if (!emailValidation.isValid) {
  return res.status(400).json({
    error: "Email validation failed",
    message: emailValidation.error
  });
}
```

### 4. Invalid Role Values
**Problem**: Role updates return 400 for invalid roles
**Locations**: `routes.ts`, `routes/admin.ts`

**Current Code**:
```typescript
if (!["student", "instructor", "admin"].includes(role)) {
  return res.status(400).json({ message: "Invalid role" });
}
```

**Fixed Code**:
```typescript
import { validators } from "../middleware/error-fixes";

const roleValidation = validators.role(role);
if (!roleValidation.isValid) {
  return res.status(400).json({
    error: "Role validation failed",
    details: roleValidation.error
  });
}
```

### 5. Video URL Validation
**Problem**: Video endpoints return 400 for invalid URLs
**Location**: `routes/videos.ts`

**Current Code**:
```typescript
if (!url) {
  return res.status(400).json({ 
    error: "MISSING_URL",
    message: "URL is required" 
  });
}
```

**Fixed Code**:
```typescript
import { validators } from "../middleware/error-fixes";

const urlValidation = validators.videoUrl(url);
if (!urlValidation.isValid) {
  return res.status(400).json({
    error: "URL validation failed",
    message: urlValidation.error
  });
}
```

## Quick Implementation Steps

### Step 1: Add Validation Middleware
The validation middleware is already created at `server/middleware/error-fixes.ts`

### Step 2: Update Existing Routes
Replace existing validation logic with the new validators:

**Before**:
```typescript
router.post('/enrollments', async (req, res) => {
  const { courseId, enrollmentLevel } = req.body;
  if (!courseId || !enrollmentLevel) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  // ... rest of logic
});
```

**After**:
```typescript
import { createValidationMiddleware, validators } from "../middleware/error-fixes";

router.post('/enrollments', 
  createValidationMiddleware(validators.enrollment),
  async (req, res) => {
    const { courseId, enrollmentLevel } = req.body;
    // ... rest of logic (validation already done)
  }
);
```

### Step 3: Test the Fixes
1. Start development server: `npm run dev`
2. Test endpoints with invalid data
3. Verify proper error responses
4. Check that valid requests still work

## Benefits of These Fixes

1. **Consistent Error Format**: All 400 errors return the same structure
2. **Better Error Messages**: More specific and helpful error details
3. **Reusable Validation**: Can be applied across all routes
4. **Type Safety**: Better TypeScript integration
5. **Easier Testing**: Validation logic is centralized

## Example Error Responses

### Before Fixes
```json
{
  "message": "courseId and enrollmentLevel are required"
}
```

### After Fixes
```json
{
  "error": "Validation failed",
  "message": "Missing required fields",
  "details": {
    "missing": ["courseId"],
    "required": ["courseId", "enrollmentLevel"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Files to Modify

Apply these fixes to the following files:

1. **server/routes.ts** - Main routes file
2. **server/routes/enrollments.ts** - Enrollment endpoints
3. **server/routes/videos.ts** - Video validation
4. **server/routes/qualification.ts** - Qualification endpoints
5. **server/routes/admin.ts** - Admin functions
6. **server/routes/auth.ts** - Authentication routes

## Testing Checklist

- [ ] Test with missing required fields
- [ ] Test with invalid file uploads
- [ ] Test with invalid email formats
- [ ] Test with invalid role values
- [ ] Test with invalid URLs
- [ ] Verify valid requests still work
- [ ] Check error response format consistency

## Next Steps

1. Apply validation middleware to existing routes
2. Update error handling to use consistent format
3. Add comprehensive logging for 400 errors
4. Set up monitoring for 400 error rates
5. Add client-side validation to prevent unnecessary 400s

This approach will significantly reduce 400 errors and provide better developer experience when debugging API issues.
