import { lazy, Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthProvider";

const LandingPage = lazy(() => import("./pages/landing/LandingPage.jsx"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/auth/RegistrationPage.jsx"));
const OnboardingPage = lazy(() =>
  import("./pages/onboarding/OnboardingPage.jsx")
);
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const DocumentEditor = lazy(() => import("./pages/editor/DocumentEditor.jsx"));
const SharedDocuments = lazy(() =>
  import("./pages/shared/SharedDocuments.jsx")
);
const FolderEditor = lazy(() => import("./pages/editor/FolderEditor.jsx"));
const Projects = lazy(() => import("./pages/projects/Projects.jsx"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-screen">
    <div className="animate-pulse text-primary-500 text-2xl">Loading...</div>
  </div>
);

const ProtectedRoute = () => {
  const { isAuthenticated, loading, currentuser } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (
    currentuser &&
    currentuser.onboardingCompleted === false &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export const routes = [
  {
    path: "/",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <RegisterPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/onboarding",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <OnboardingPage />
          </Suspense>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "/documents/:id",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DocumentEditor />
          </Suspense>
        ),
      },
      {
        path: "/shared",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SharedDocuments />
          </Suspense>
        ),
      },
      {
        path: "/folders/:id",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <FolderEditor />
          </Suspense>
        ),
      },
      {
        path: "/projects",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Projects />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];
