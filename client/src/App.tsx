/**
 * Main Application Component
 *
 * Root component that sets up routing, authentication, and global providers.
 *
 * Features:
 * - Client-side routing with wouter
 * - React Query for server state management
 * - Multi-language support
 * - Authentication-based route protection
 * - Public and protected route separation
 *
 * Route Types:
 * - Landing/Home: Conditional based on auth status
 * - Public: Accessible to everyone (course catalog, legal pages, etc.)
 * - Protected: Requires authentication (dashboard, instructor tools, etc.)
 */

import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Courses from "@/pages/courses";
import CourseDetail from "@/pages/course-detail";
import Dashboard from "@/pages/dashboard";
import Checkout from "@/pages/checkout";
import Programs from "@/pages/programs";
import VideoPlayer from "@/pages/video-player";
import Community from "@/pages/community";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import CookiePolicy from "@/pages/cookie-policy";
import HelpCenter from "@/pages/help-center";
import Contact from "@/pages/contact";
import TechnicalSupport from "@/pages/technical-support";
import AcademicAdvising from "@/pages/academic-advising";
import CourseCatalog from "@/pages/course-catalog";
import GlobalMAProgram from "@/pages/global-ma-program";
import FCIMarbFellowship from "@/pages/fcrimarb-fellowship";
import Certification from "@/pages/certification";
import Resources from "@/pages/resources";
import CommunityForum from "@/pages/community-forum";
import ProfessionalStandards from "@/pages/professional-standards";
import QuizPage from "@/pages/quiz";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Profile from "@/pages/profile";
import PaymentSuccess from "@/pages/payment-success";

// Lazy loaded components - heavy/role-gated pages
const InstructorDashboard = lazy(() => import("@/pages/instructor-dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminSetup = lazy(() => import("@/pages/admin-setup"));
const BecomeInstructor = lazy(() => import("@/pages/become-instructor"));
const CreateCourse = lazy(() => import("@/pages/create-course"));
const CourseCurriculum = lazy(() => import("@/pages/course-curriculum"));

// Wrapped components with Suspense for ProtectedRoute
const LazyAdminDashboard = () => (
  <Suspense fallback={<PageLoader />}>
    <AdminDashboard />
  </Suspense>
);
const LazyAdminSetup = () => (
  <Suspense fallback={<PageLoader />}>
    <AdminSetup />
  </Suspense>
);
const LazyInstructorDashboard = () => (
  <Suspense fallback={<PageLoader />}>
    <InstructorDashboard />
  </Suspense>
);
const LazyCreateCourse = () => (
  <Suspense fallback={<PageLoader />}>
    <CreateCourse />
  </Suspense>
);
const LazyCourseCurriculum = () => (
  <Suspense fallback={<PageLoader />}>
    <CourseCurriculum />
  </Suspense>
);
const LazyBecomeInstructor = () => (
  <Suspense fallback={<PageLoader />}>
    <BecomeInstructor />
  </Suspense>
);

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Home route - conditional based on auth */}
      <Route path="/">
        {isLoading || !isAuthenticated ? <Landing /> : <Home />}
      </Route>

      {/* Public routes available to everyone */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/course/:id" component={CourseDetail} />
      <Route path="/become-instructor" component={LazyBecomeInstructor} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/help-center" component={HelpCenter} />
      <Route path="/contact" component={Contact} />
      <Route path="/technical-support" component={TechnicalSupport} />
      <Route path="/academic-advising" component={AcademicAdvising} />
      <Route path="/course-catalog" component={CourseCatalog} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/global-ma-program" component={GlobalMAProgram} />
      <Route path="/fcrimarb-fellowship" component={FCIMarbFellowship} />
      <Route path="/certification" component={Certification} />
      <Route path="/resources" component={Resources} />
      <Route path="/community-forum" component={CommunityForum} />
      <Route path="/professional-standards" component={ProfessionalStandards} />

      {/* Admin bootstrap — protected behind admin role */}
      <ProtectedRoute
        path="/admin-setup"
        component={LazyAdminSetup}
        requiredRole="admin"
      />

      {/* Protected routes - using ProtectedRoute for proper redirection and role checking */}
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/courses" component={Courses} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/programs" component={Programs} />
      <ProtectedRoute
        path="/learn/:courseId/:lessonId"
        component={VideoPlayer}
      />
      <ProtectedRoute path="/quiz/:quizId" component={QuizPage} />
      <ProtectedRoute path="/community" component={Community} />
      <ProtectedRoute path="/checkout/:courseId" component={Checkout} />

      {/* Instructor-only routes */}
      <ProtectedRoute path="/instructor" requiredRole="instructor">
        <Suspense fallback={<PageLoader />}>
          <InstructorDashboard />
        </Suspense>
      </ProtectedRoute>
      <ProtectedRoute path="/instructor/courses/new" requiredRole="instructor">
        <Suspense fallback={<PageLoader />}>
          <CreateCourse />
        </Suspense>
      </ProtectedRoute>
      <ProtectedRoute
        path="/instructor/courses/:courseId/curriculum"
        requiredRole="instructor"
      >
        <Suspense fallback={<PageLoader />}>
          <CourseCurriculum />
        </Suspense>
      </ProtectedRoute>

      {/* Admin routes */}
      <ProtectedRoute path="/admin" requiredRole="admin">
        <Suspense fallback={<PageLoader />}>
          <AdminDashboard />
        </Suspense>
      </ProtectedRoute>

      {!isLoading && <Route component={NotFound} />}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
