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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationToastContainer } from "@/components/ui/NotificationToast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Courses from "@/pages/courses";
import Dashboard from "@/pages/dashboard";
import AdminExpeditedReviews from "@/pages/admin-expedited-reviews";
import Checkout from "@/pages/checkout";
import Programs from "@/pages/programs";
import VideoPlayer from "@/pages/video-player";
import Community from "@/pages/community";
import CommunityForumCategory from "@/pages/community-forum-category";
import CommunityCreatePost from "@/pages/community-create-post";
import CommunityMyBoards from "@/pages/community-my-boards";
import CommunityMyPosts from "@/pages/community-my-posts";
import CommunityNotifications from "@/pages/community-notifications";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import CookiePolicy from "@/pages/cookie-policy";
import HelpCenter from "@/pages/help-center";
import Contact from "@/pages/contact";
import TechnicalSupport from "@/pages/technical-support";
import AcademicAdvising from "@/pages/academic-advising";
import CourseCatalog from "@/pages/course-catalog";
import CourseSearch from "@/pages/course-search";
import GlobalMAProgram from "@/pages/global-ma-program";
import FCIMarbFellowship from "@/pages/fcrimarb-fellowship";
import Certification from "@/pages/certification";
import Resources from "@/pages/resources";
import QualificationPathway from "@/pages/qualification-pathway";
import ExpeditedApplication from "@/pages/expedited-application";
import VerifyMember from "@/pages/verify-member";
import RenewMembership from "@/pages/renew-membership";
import CommunityForum from "@/pages/community-forum";
import ProfessionalStandards from "@/pages/professional-standards";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import PaymentSuccess from "@/pages/payment-success";
import VerifyEmail from "@/pages/verify-email";
import AuthCallback from "@/pages/auth-callback";
import EnrollmentStatus from "@/pages/enrollment-status";

// Lazy loaded components - heavy/role-gated pages
const InstructorDashboard = lazy(() => import("@/pages/instructor-dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminSetup = lazy(() => import("@/pages/admin-setup"));
const BecomeInstructor = lazy(() => import("@/pages/become-instructor"));
const CreateCourse = lazy(() => import("@/pages/create-course"));
const CourseCurriculum = lazy(() => import("@/pages/course-curriculum"));

// Lazy loaded heavy pages for performance
const CourseDetail = lazy(() => import("@/pages/course-detail"));
const CommunityPost = lazy(() => import("@/pages/community-post"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Profile = lazy(() => import("@/pages/profile"));
const QuizPage = lazy(() => import("@/pages/quiz"));

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
const LazyCourseDetail = () => (
  <Suspense fallback={<PageLoader />}>
    <CourseDetail />
  </Suspense>
);
const LazyCommunityPost = () => (
  <Suspense fallback={<PageLoader />}>
    <CommunityPost />
  </Suspense>
);
const LazyOnboarding = () => (
  <Suspense fallback={<PageLoader />}>
    <Onboarding />
  </Suspense>
);
const LazyProfile = () => (
  <Suspense fallback={<PageLoader />}>
    <Profile />
  </Suspense>
);
const LazyQuizPage = () => (
  <Suspense fallback={<PageLoader />}>
    <QuizPage />
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
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/course/:id" component={LazyCourseDetail} />
      <Route path="/become-instructor" component={LazyBecomeInstructor} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/help-center" component={HelpCenter} />
      <Route path="/contact" component={Contact} />
      <Route path="/technical-support" component={TechnicalSupport} />
      <Route path="/academic-advising" component={AcademicAdvising} />
      <Route path="/course-catalog" component={CourseSearch} />
      <Route path="/search" component={CourseSearch} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/global-ma-program" component={GlobalMAProgram} />
      <Route path="/fcrimarb-fellowship" component={FCIMarbFellowship} />
      <Route path="/certification" component={Certification} />
      <Route path="/resources" component={Resources} />
      <Route path="/community-forum" component={CommunityForum} />
      <Route path="/professional-standards" component={ProfessionalStandards} />
      <Route path="/qualification-pathway" component={QualificationPathway} />
      <Route path="/verify/:memberId" component={VerifyMember} />
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Protected membership routes */}
      <ProtectedRoute path="/renew-membership" component={RenewMembership} />
      <ProtectedRoute path="/onboarding" component={LazyOnboarding} />

      {/* Admin bootstrap — protected behind admin role */}
      <ProtectedRoute
        path="/admin-setup"
        component={LazyAdminSetup}
        requiredRole="admin"
      />

      {/* Protected routes - using ProtectedRoute for proper redirection and role checking */}
      <ProtectedRoute path="/profile" component={LazyProfile} />
      <ProtectedRoute path="/courses" component={Courses} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/programs" component={Programs} />
      <ProtectedRoute
        path="/learn/:courseId/:lessonId"
        component={VideoPlayer}
      />
      <ProtectedRoute
        path="/learn/:courseId"
        component={VideoPlayer}
      />
      <ProtectedRoute path="/quiz/:quizId" component={LazyQuizPage} />
      <ProtectedRoute path="/community" component={Community} />
      <ProtectedRoute path="/community/forums/:slug" component={CommunityForumCategory} />
      <ProtectedRoute path="/community/forums/:slug/new" component={CommunityCreatePost} />
      <ProtectedRoute path="/community/posts/:slug" component={LazyCommunityPost} />
      <ProtectedRoute path="/community/my-boards" component={CommunityMyBoards} />
      <ProtectedRoute path="/community/my-posts" component={CommunityMyPosts} />
      <ProtectedRoute path="/community/notifications" component={CommunityNotifications} />
      <ProtectedRoute path="/checkout/:courseId" component={Checkout} />
      <ProtectedRoute path="/enroll/:courseId/status" component={EnrollmentStatus} />
      <ProtectedRoute path="/expedited-application" component={ExpeditedApplication} />
      <Route path="/payment-success" component={PaymentSuccess} />

      {/* Instructor-only routes */}
      <ProtectedRoute path="/instructor" requiredRole="instructor" component={LazyInstructorDashboard} />
      <ProtectedRoute path="/instructor/courses/new" requiredRole="instructor" component={LazyCreateCourse} />
      <ProtectedRoute path="/instructor/courses/:courseId/edit" requiredRole="instructor" component={LazyCreateCourse} />
      <ProtectedRoute path="/instructor/courses/:courseId/curriculum" requiredRole="instructor" component={LazyCourseCurriculum} />

      {/* Admin routes */}
      <ProtectedRoute path="/admin" requiredRole="admin" component={LazyAdminDashboard} />
      <ProtectedRoute path="/admin/expedited" requiredRole="admin" component={AdminExpeditedReviews} />

      {!isLoading && <Route component={NotFound} />}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <NotificationToastContainer />
              <Router />
            </TooltipProvider>
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
}

export default App;
