"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { prefetchDashboardData } from "@/libs/dashboard-data-cache";

type DashboardAccessContextValue = {
  hasAccess: boolean;
};

const DashboardAccessContext = createContext<DashboardAccessContextValue>({
  hasAccess: false,
});

export function DashboardAccessProvider({
  hasAccess,
  children,
}: {
  hasAccess: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    prefetchDashboardData(hasAccess);
  }, [hasAccess]);

  return (
    <DashboardAccessContext.Provider value={{ hasAccess }}>
      {children}
    </DashboardAccessContext.Provider>
  );
}

export function useDashboardAccess() {
  return useContext(DashboardAccessContext);
}

export function RequireDashboardAccess({ children }: { children: ReactNode }) {
  const { hasAccess } = useDashboardAccess();
  const router = useRouter();

  useEffect(() => {
    if (!hasAccess) {
      router.replace("/dashboard");
    }
  }, [hasAccess, router]);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return children;
}
