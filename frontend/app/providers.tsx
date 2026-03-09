 "use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { MarketProvider } from "@/context/MarketContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Allow the app to run even if Google env isn't set yet
  const content = <MarketProvider>{children}</MarketProvider>;

  if (!googleClientId) return content;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {content}
    </GoogleOAuthProvider>
  );
}

