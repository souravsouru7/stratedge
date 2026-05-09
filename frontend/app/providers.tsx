"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketProvider } from "@/context/MarketContext";
import { ToastProvider } from "@/features/shared/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { registerPushNotifications } from "@/services/pushNotifications";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Always attempt registration on app open — shows the permission dialog
    // on first install and re-syncs the token on subsequent opens.
    // If the user isn't logged in yet the token save will fail silently;
    // handleAuthSuccess re-runs this after login to guarantee the save.
    registerPushNotifications();
  }, []);

  // We Create the QueryClient inside the state to ensure it is only initialized once
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1, // Only retry once
            refetchOnWindowFocus: false, // Avoid redundant fetches when switching tabs
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MarketProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MarketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
