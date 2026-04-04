# CIMA Learn - Professional ADR Education Platform

## Overview

CIMA Learn is a comprehensive Udemy-style Learning Management System (LMS) designed for the Center for International Mediators and Arbitrators (CIMA). Its primary purpose is to provide professional Alternative Dispute Resolution (ADR) training globally through courses, programs, and certifications. The platform supports instructor onboarding, course creation, student enrollment, payment processing, multi-role user management, and extensive administrative oversight, aiming to become a leading global resource for mediators and arbitrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript (SPA).
- **Routing**: Wouter for client-side routing with role-based access control.
- **State Management**: TanStack Query (React Query) for server state and caching.
- **UI Components**: shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom design system.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite.

### Backend Architecture

- **Framework**: Express.js with TypeScript and ES modules.
- **Database**: Supabase Client for PostgreSQL operations and type-safe database access.
- **Authentication**: Supabase Auth with email/password and JWT-based session management.
- **Authorization**: Role-based middleware for fine-grained permissions.
- **Session Management**: PostgreSQL-backed session store.
- **API Design**: RESTful endpoints with error handling.
- **File Uploads**: Multer integration for organized storage.

### Database Design

- **Primary Database**: PostgreSQL via Supabase with Transaction pooler.
- **Schema Management**: Supabase for migrations and rollback.
- **Core Entities**: Users (students, instructors, admins), Courses (modules, lessons, assessments), Enrollments, Instructor applications, Orders, Reviews.
- **Relationships**: Comprehensive foreign key constraints and optimized indexing.

### Authentication & Security

- **Email/Password Auth**: Secure bcrypt hashing and session-based authentication.
- **Session Storage**: PostgreSQL-backed sessions with secure cookies.
- **Password Requirements**: Minimum 8 characters with mixed case, number, special character.
- **Role Protection**: Middleware-based route protection.
- **Admin Bootstrap**: Secure `/admin-setup` for initial admin account creation using a setup key.
- **Data Validation**: Input sanitization and schema validation on all endpoints.

### UI/UX Decisions

- Intuitive curriculum builder with drag-and-drop reordering for modules and lectures.
- Rich text editor (TipTap) for articles, quiz builder with multiple question types, and assignment builder.
- Interactive elements like quizzes and assignments for student engagement.
- Course publishing workflow with a validation checklist.

### Feature Specifications

- **Multi-Role System**: Students, Instructors, Administrators with distinct functionalities.
- **Instructor Onboarding**: Multi-step application, document uploads, admin review, quality assurance.
- **Course Management**: Multi-step builder for courses, modules, lessons, and content (video, text, quiz, assignment). Supports thumbnail and media uploads.
- **Administrative Dashboard**: Instructor application review, user management, course oversight, platform analytics, content moderation.
- **Payment & Enrollment**: Paystack integration, multiple pricing models (free, one-time, subscription), automated enrollment, revenue management.
- **Student Learning Experience**: Course catalog, progress tracking, interactive elements, certification.

## External Dependencies

- **Paystack**: Payment processing and subscription management.
- **Supabase**: PostgreSQL database hosting.
- **Replit Auth**: OpenID Connect authentication provider.
- **Uppy**: File upload library (for video uploads).
- **@dnd-kit**: Drag-and-drop functionality.
