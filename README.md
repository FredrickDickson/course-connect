# CIMA Learn - Professional ADR Education Platform

A comprehensive Udemy-style Learning Management System (LMS) for the Center for International Mediators and Arbitrators (CIMA), providing world-class Alternative Dispute Resolution (ADR) training and certification programs with full instructor capabilities, course creation tools, student enrollment systems, and complete administrative oversight.

## 🚀 Current Status

**✅ Production-Ready Architecture**
- **All Major Gaps Resolved**: Auth mismatch, broken payments, and schema drift fixed.
- **Authentication**: Fully synchronized with **Supabase Auth** using Service Role JWT verification.
- **Data Integrity**: All dashboard and analytics endpoints replaced with **real database queries**.
- **Security**: Robust **ProtectedRoute** system implemented for role-based access control (RBAC).
- **Server Status**: Running stable on port 5000 with synchronized GitHub main branch.

## ✨ Key Architecture Updates (April 2026)

### 🔑 **Supabase Authentication Sync**
The platform has transitioned from a dual-auth system to a pure **Supabase JWT-based architecture**.
- **Auto-Provisioning**: New Supabase users are automatically synced to the local PostgreSQL `users` table on their first authenticated request.
- **Service Role Verification**: Backend security is hardened using the Supabase Service Role key for reliable server-side JWT validation.

### 📊 **Real-Data Dashboards**
All hardcoded/mocked analytics have been replaced with live database aggregations:
- **Admin**: Real revenue tracking, active student counts, and course performance metrics.
- **Instructors**: Live monthly revenue charts and pending assignment submission feeds.
- **Students**: Personalized course recommendations and progress tracking.

### 📝 **Relational Quiz Engine**
Fixed schema mismatches to support a fully relational quiz system:
- **Automated Grading**: Functional grading engine converts student responses into scores and pass/fail results based on DB-stored answers.
- **Relational Integrity**: Quizzes, questions, and answers are now correctly joined across the schema.

---

## 🛠 Technology Stack

### **Frontend**
- **React 18** with TypeScript
- **Wouter** for lightweight routing
- **TanStack Query** for server state management
- **shadcn/ui** & **Tailwind CSS** for professional design
- **Supabase Auth Helper** for client-side session management

### **Backend**
- **Express.js** with TypeScript
- **Drizzle ORM** for type-safe PostgreSQL operations
- **Supabase Service Role** for JWT verification
- **PostgreSQL (Supabase/Neon)**
- **Paystack API** for secure payment processing

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- Paystack account for payment processing

### Installation

1. **Clone and Install**
   ```bash
   git clone [repository-url]
   cd course-connect
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file with the following variables:
   ```env
   DATABASE_URL=your_postgresql_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SESSION_SECRET=your_session_secret
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
   PAYSTACK_SECRET_KEY=your_secret_key
   VITE_PAYSTACK_PUBLIC_KEY=your_public_key
   ```

3. **Initialize Database**
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8080`.

---

## 🛡️ Security & Hardening

- **Protected Routes**: All sensitive paths are wrapped in the `<ProtectedRoute />` component, which handles authentication status and role verification.
- **CORS & Rate Limiting**: Production-ready security middleware applied to all API endpoints.
- **Data Access Control**: Relational queries use ownership checks to ensure instructors only manage their own content.

## 📊 Features Roadmap

### **Completed - Phase 5 (Current)**
- ✅ **Supabase Auth Sync**: Eliminated auth mismatch issues.
- ✅ **Real-Data Aggregation**: Replaced mocks in all dashboards.
- ✅ **Quiz Relational Fix**: Functional grading and schema alignment.
- ✅ **GitHub Synchronization**: Unified local and remote codebases.
- ✅ **Legacy Cleanup**: Removed Passport, memorystore, and broken auth routes.

### **Upcoming**
- 🔄 **Advanced Video Analytics**: Heatmaps and drop-off rates for lessons.
- 🔄 **Mobile Companion App**: React Native bridge for offline learning.
- 🔄 **AI Course Builder**: Automated module generation based on topics.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Last updated: April 3, 2026*
