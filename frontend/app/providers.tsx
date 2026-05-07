"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketProvider } from "@/context/MarketContext";
import { ToastProvider } from "@/features/shared/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { registerPushNotifications } from "@/services/pushNotifications";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register for push notifications on Android (no-op on web)
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
