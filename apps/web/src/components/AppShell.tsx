import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ToastContainer } from "@/components/Toast";
import { useOperatorStore } from "@/store/operatorStore";
import { useFacilityStore } from "@/store/facilityStore";

export function AppShell() {
  const isAuthenticated = useOperatorStore((s) => s.isAuthenticated);
  const fetchProfile = useOperatorStore((s) => s.fetchProfile);
  const fetchConfig = useFacilityStore((s) => s.fetchConfig);

  // On mount, fetch profile and facility config if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchConfig();
    }
  }, [isAuthenticated, fetchProfile, fetchConfig]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-soterion-bg text-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
