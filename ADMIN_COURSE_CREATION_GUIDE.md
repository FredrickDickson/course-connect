# Admin Course Creation Guide

## Overview
Admins can create courses on behalf of instructors. The created courses will appear in the instructor's dashboard as if they created them.

## How It Works

### For Instructors
When instructors create a course, they:
1. Navigate to `/instructor/courses/new`
2. Fill out the course form with all required fields:
   - **Course Title** (required)
   - **Course Subtitle** (required)
   - **Description** (required, min 10 characters)
   - **Category** (required - can select existing or create custom)
   - **Course Type** (required - Professional Programme or Adjunct Course)
   - **Difficulty Level** (required for Professional Programme only)
   - **Qualification Track** (required for Professional Programme only)
   - **Price** (required, must be non-negative)
   - **Currency** (default: USD)
   - **Thumbnail Image** (optional - URL or file upload)
   - **Publish Course** (toggle - default: false)
   - **Featured Course** (toggle - default: false)

3. Click "Create Course" to save
4. The course is created with `instructor_id` set to their user ID
5. They're redirected to `/instructor/courses/{courseId}/curriculum` to add lessons

### For Admins
When admins create a course on behalf of an instructor, they:

1. Navigate to `/admin/courses/new` or click "Create Course" button in the admin dashboard header
2. See an **"Admin mode" section** at the top of the form with:
   - Explanation text about creating on behalf of an instructor
   - **Instructor selector** with search functionality
   - Selected instructor's profile card showing:
     - Avatar and name
     - Email address
     - Number of existing courses
     - Number of total students
     - Verification status

3. **Select an instructor** (REQUIRED) - the admin must choose an instructor before they can submit
   - Search instructors by name or email
   - View instructor details in the dropdown
   - See confirmation of selected instructor

4. Fill out the **exact same course form** as instructors:
   - Course Title
   - Course Subtitle
   - Description
   - Category
   - Course Type (Professional Programme or Adjunct Course)
   - Difficulty Level (for Professional Programme)
   - Qualification Track (for Professional Programme)
   - Price
   - Currency
   - Thumbnail
   - Publish/Featured toggles

5. Click "Create Course" to save
6. The course is created with `instructor_id` set to the selected instructor's ID
7. Admin is redirected to `/admin/courses/{courseId}/curriculum` to add lessons

## Technical Implementation

### API Endpoint
- **Instructor route**: `POST /api/instructor/courses`
- **Admin route**: `POST /api/instructor/courses?onBehalfOf={instructorId}`

### Backend Logic
When an admin creates a course:
```javascript
// Request includes onBehalfOf query parameter
const onBehalfOf = req.query.onBehalfOf;

if (onBehalfOf && userRole === 'admin') {
  // Set instructor_id to the selected instructor
  courseData.instructor_id = onBehalfOf;
} else {
  // Set instructor_id to the current user (normal instructor flow)
  courseData.instructor_id = currentUserId;
}
```

### Database Schema
Courses table includes:
- `instructor_id` (UUID, foreign key to profiles table)
- All other course fields (title, subtitle, description, etc.)

### Validation Rules
1. **Admin must select an instructor** - the form validates this before submission
2. **All course fields must be valid** - same validation as instructor form
3. **Professional Programme courses** require level and track
4. **Adjunct Courses** don't require level or track

## User Experience

### Instructor Dashboard
- Instructors see ALL courses where `instructor_id = their_user_id`
- They cannot tell whether the course was created by them or by an admin
- They have full control to:
  - Edit course details
  - Add/edit curriculum
  - Publish/unpublish courses
  - View analytics

### Admin Dashboard
- Admins can:
  - View all courses (from all instructors)
  - Create courses for any instructor
  - Edit any course
  - View course analytics
  - Manage instructors

## Key Benefits
1. **Seamless experience** - Instructors manage courses the same way regardless of who created them
2. **Admin flexibility** - Admins can set up courses for new instructors
3. **Proper ownership** - Courses are properly attributed to the instructor
4. **Consistent interface** - Same form fields and validation for both roles
5. **Full access** - Instructors have complete control over admin-created courses

## Access Control
- **Instructors** can only create/edit their own courses (`instructor_id` matches)
- **Admins** can create/edit any course and specify the instructor
- Both roles use protected routes with role verification
- API endpoints validate user permissions

## Navigation
- Instructors: Home → Instructor → Create Course
- Admins: Home → Admin Dashboard → "Create Course" button (header)
- Both lead to appropriate form with role-specific features
