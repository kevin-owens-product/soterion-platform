import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Login } from "@/views/Login";
import { Demo } from "@/views/Demo";
import { DemoLanding } from "@/views/DemoLanding";
import { Mobile } from "@/views/Mobile";
import { OpsCenter } from "@/views/OpsCenter";
import { Security } from "@/views/Security";
import { Leaderboard } from "@/views/Leaderboard";
import { Sensors } from "@/views/Sensors";
import { AdminLayout, AdminFacilitiesList } from "@/views/admin/AdminLayout";
import { OnboardingWizard } from "@/views/admin/OnboardingWizard";
import { AdminDashboard } from "@/views/admin/AdminDashboard";
import { AuditLogViewer } from "@/views/admin/AuditLogViewer";
import { OperatorManagement } from "@/views/admin/OperatorManagement";
import { ApiKeyManagement } from "@/views/admin/ApiKeyManagement";
import { SecurityDashboard } from "@/views/admin/SecurityDashboard";
import { ComplianceDashboard } from "@/views/admin/ComplianceDashboard";
import { ComplianceReport } from "@/views/admin/ComplianceReport";
import { Benchmarking } from "@/views/admin/Benchmarking";
import { Integrations } from "@/views/admin/Integrations";
import { AlertRules } from "@/views/admin/AlertRules";
import { ModelTraining } from "@/views/admin/ModelTraining";
import { ApiDocs } from "@/views/ApiDocs";
import { Signup } from "@/views/Signup";
import { ShiftHandoff } from "@/views/ShiftHandoff";
import { Analytics } from "@/views/Analytics";
import "@/styles/tokens.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/demo",
    element: <Demo />,
  },
  {
    path: "/mobile",
    element: <Mobile />,
  },
  {
    path: "/welcome",
    element: <DemoLanding />,
  },
  {
    path: "/docs/api",
    element: <ApiDocs />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/",
    element: <AppShell />,
    errorElement: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#080808",
          color: "#d4d4d4",
          fontFamily: "'IBM Plex Mono', monospace",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "2px solid #ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            color: "#ef4444",
          }}
        >
          !
        </div>
        <p style={{ fontSize: "14px", color: "#737373" }}>
          Something went wrong.
        </p>
        <a
          href="/ops"
          style={{
            fontSize: "12px",
            color: "#f59e0b",
            textDecoration: "underline",
            textUnderlineOffset: "4px",
          }}
        >
          Go to Ops Center
        </a>
      </div>
    ),
    children: [
      { index: true, element: <Navigate to="/ops" replace /> },
      { path: "ops", element: <OpsCenter /> },
      { path: "security", element: <Security /> },
      { path: "leaderboard", element: <Leaderboard /> },
      { path: "sensors", element: <Sensors /> },
      { path: "shift-handoff", element: <ShiftHandoff /> },
      { path: "analytics", element: <Analytics /> },
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "facilities", element: <AdminFacilitiesList /> },
          { path: "operators", element: <OperatorManagement /> },
          { path: "api-keys", element: <ApiKeyManagement /> },
          { path: "audit-log", element: <AuditLogViewer /> },
          { path: "security", element: <SecurityDashboard /> },
          { path: "compliance", element: <ComplianceDashboard /> },
          { path: "reports", element: <ComplianceReport /> },
          { path: "benchmarking", element: <Benchmarking /> },
          { path: "integrations", element: <Integrations /> },
          { path: "alert-rules", element: <AlertRules /> },
          { path: "model-training", element: <ModelTraining /> },
          { path: "onboarding", element: <OnboardingWizard /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
