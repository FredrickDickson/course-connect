# CIMA Learn - Professional ADR Education Platform

## Overview

CIMA Learn is a comprehensive Udemy-style learning management system (LMS) for the Center for International Mediators and Arbitrators (CIMA). The platform provides professional Alternative Dispute Resolution (ADR) training through courses, programs, and certifications for mediators and arbitrators globally. It features instructor onboarding, course creation tools, student enrollment systems, payment processing, multi-role user management, and complete administrative oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## Platform Features

### Multi-Role System
- **Students**: Course enrollment, progress tracking, certification, community participation
- **Instructors**: Course creation, content management, student interaction, earnings tracking
- **Administrators**: Platform oversight, instructor approvals, user management, analytics

### Instructor Onboarding System
- **Application Process**: Comprehensive instructor application with qualification verification
- **Document Uploads**: Resume, certificates, portfolio, and identification documents
- **Admin Review**: Multi-stage approval workflow with Education Director oversight
- **Quality Assurance**: Professional standards verification and background checks

### Course Management
- **Creation Tools**: Multi-step course builder with sections, lectures, and assessments
- **Content Upload**: Video lectures, documents, quizzes, and assignments
- **Publishing Workflow**: Draft → Review → Approval → Live publishing
- **Revenue Sharing**: Instructor earnings and platform fee management

### Administrative Dashboard
- **Instructor Applications**: Review, approve, or reject instructor applications
- **User Management**: Manage student and instructor accounts with role assignments
- **Course Oversight**: Monitor course quality and approve new course launches
- **Platform Analytics**: User growth, revenue tracking, engagement metrics
- **Content Moderation**: Quality control and compliance monitoring

### Payment & Enrollment
- **Paystack Integration**: Secure payment processing for course purchases
- **Multiple Pricing Models**: Free courses, one-time payments, and subscription options
- **Automated Enrollment**: Instant access upon successful payment
- **Revenue Management**: Transparent earnings tracking and payout systems

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in a single-page application (SPA) architecture
- **Routing**: Wouter for client-side routing with role-based access control
- **State Management**: TanStack Query (React Query) for server state with cache management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and responsive layouts
- **Form Handling**: React Hook Form with Zod validation schemas
- **Build Tool**: Vite with hot module replacement and optimized production builds

### Backend Architecture
- **Framework**: Express.js server with TypeScript and ES modules
- **Database ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Authentication**: Passport.js with OpenID Connect (Replit Auth) integration
- **Authorization**: Role-based middleware with fine-grained permissions
- **Session Management**: PostgreSQL-backed session store with security hardening
- **API Design**: RESTful endpoints with comprehensive error handling
- **File Uploads**: Multer integration with organized file storage structure

### Database Design
- **Primary Database**: PostgreSQL via Supabase with Transaction pooler
- **Schema Management**: Drizzle ORM with automatic migrations and rollback support
- **Core Entities**: 
  - Users (students, instructors, admins)
  - Courses (with modules, lessons, and assessments)
  - Enrollments and progress tracking
  - Instructor applications and approval workflow
  - Orders and payment records
  - Reviews and community discussions
- **Relationships**: Comprehensive foreign key constraints and optimized indexing

### Authentication & Security
- **Primary Auth**: Replit OpenID Connect with automatic user provisioning
- **Session Storage**: Secure PostgreSQL sessions with configurable expiration
- **Role Protection**: Middleware-based route protection with role verification
- **Admin Bootstrap**: Secure admin setup system for initial platform configuration
- **Data Validation**: Input sanitization and schema validation on all endpoints

## Key Features Implemented

### Admin Management System
- **Setup Process**: Secure initial admin account creation with setup keys
- **Dashboard**: Comprehensive overview of platform metrics and pending tasks
- **User Management**: Search, filter, and manage all platform users
- **Application Review**: Detailed instructor application review workflow
- **Course Approval**: Quality control for new course publications
- **Analytics**: Revenue tracking, user engagement, and growth metrics

### Instructor Application System
- **Multi-Step Form**: Personal info, qualifications, experience, and references
- **Document Upload**: Secure file upload for credentials and portfolios
- **Status Tracking**: Real-time application status with email notifications
- **Review Process**: Standardized evaluation criteria and decision workflow
- **Approval Pipeline**: Education Director review → Committee decision → Final approval

### Course Creation Platform
- **Course Builder**: Intuitive interface for structuring courses and content
- **Media Upload**: Video, document, and image upload with progress tracking
- **Content Organization**: Hierarchical lesson structure with drag-and-drop
- **Preview System**: Course preview before publication
- **Publishing Control**: Draft management and approval workflow

### Student Learning Experience
- **Course Catalog**: Advanced filtering and search capabilities
- **Enrollment Flow**: Seamless payment and instant access
- **Progress Tracking**: Detailed completion metrics and milestone tracking
- **Interactive Elements**: Quizzes, assignments, and discussion forums
- **Certification**: Automated certificate generation upon course completion

## Technical Infrastructure

### External Dependencies
- **Paystack**: Payment processing and subscription management
- **Supabase**: PostgreSQL database with real-time capabilities and automatic scaling
- **Replit Auth**: OpenID Connect authentication provider
- **File Storage**: Organized upload system with security controls

### Development Tools
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Drizzle Kit**: Database migration and schema management
- **Vite**: Development server with hot reload and build optimization
- **ESBuild**: Fast production bundling for server applications

### Security & Performance
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Comprehensive request validation with Zod schemas
- **Error Handling**: Centralized error management with user-friendly messages
- **Database Optimization**: Efficient queries with proper indexing strategies

## Deployment & Operations

### Environment Management
- **Development**: Local development with hot reload and debugging
- **Production**: Optimized builds with performance monitoring
- **Database**: Automated migrations with rollback capabilities
- **File Storage**: Secure upload handling with file type validation

### Monitoring & Analytics
- **User Analytics**: Enrollment tracking, course completion rates
- **Financial Metrics**: Revenue reporting and instructor earnings
- **Platform Health**: Error monitoring and performance tracking
- **Admin Insights**: Comprehensive dashboard with actionable metrics

## Recent Updates (October 2025)

### Udemy-Style Curriculum Builder (October 20, 2025)
- Implemented hierarchical course structure: Courses → Modules (Sections) → Lectures
- Added course curriculum management page at `/instructor/courses/:courseId/curriculum`
- Created backend API routes for managing modules and lessons with proper ordering
- Added `course_resources` table for downloadable materials (PDFs, files) attached to lectures
- Built intuitive curriculum builder UI with expandable sections
- Support for different lecture types: video, text, quiz, assignment
- Instructors can now add/edit/delete sections and lectures like Udemy
- Integrated with existing course creation workflow

### Database Migration to Supabase
- Migrated from Neon to Supabase for PostgreSQL hosting
- Updated database connection to use `postgres` package with Transaction pooler
- Generated complete SQL migration file for easy database setup
- Created comprehensive setup guide (SUPABASE_SETUP.md) with step-by-step instructions
- Configured connection for optimal performance with Supabase's pooling system

### Admin Dashboard Implementation
- Complete administrative interface for platform management
- Instructor application review and approval system
- User role management and platform oversight tools
- Revenue analytics and engagement metrics tracking

### Instructor Onboarding System
- Multi-step application form with qualification verification
- Document upload system for credentials and portfolios
- Automated workflow for application review and approval
- Email notification system for status updates

### Security Enhancements
- Admin setup system for secure initial platform configuration
- Role-based access control with granular permissions
- Enhanced authentication middleware and session management
- Comprehensive input validation and error handling

### Database Architecture Updates
- Added instructor applications table with approval workflow
- Enhanced user roles system (student, instructor, admin)
- Optimized database queries with proper indexing
- Implemented comprehensive foreign key relationships