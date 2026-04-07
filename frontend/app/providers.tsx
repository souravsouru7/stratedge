"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketProvider } from "@/context/MarketContext";
import { ToastProvider } from "@/features/shared/components/ui/Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
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
    <QueryClientProvider client={queryClient}>
      <MarketProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </MarketProvider>
    </QueryClientProvider>
  );
}
