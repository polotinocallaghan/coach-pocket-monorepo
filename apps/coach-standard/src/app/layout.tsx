import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FluidNavigator } from "@/components/navigation";
import { AuthProvider, AppConfigProvider } from "@coach-pocket/core";
import { SuccessProvider } from "@/lib/SuccessContext";
import { LanguageProvider } from "@/lib/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Coach Pocket 2.0 - Professional Tennis Coaching Platform",
  description: "Complete platform for tennis coaches with drill library, session builder, calendar, team management, and professional networking",
  manifest: "/manifest", // Let Next.js dynamic manifest route pick it up
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coach Pocket",
  },
  formatDetection: {
    telephone: false,
  },
};

import { ThemeProvider } from "@/lib/ThemeContext";
import { ThemeSettings } from "@/components/ThemeSettings";
import { AppBackground } from "@/components/AppBackground";
import TennisBoard from "@/components/TennisBoard";
import OnboardingWizard from "@/components/features/onboarding/OnboardingWizard";
import AuthGuard from "@/components/auth/AuthGuard";
import PWARegister from "@/components/PWARegister";

// ... existing imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen relative`}>
        <PWARegister />
        <LanguageProvider>
          <ThemeProvider>
            <AppConfigProvider isNCAA={false} appRole="coach">
              <AuthProvider>
                <AppBackground />
                <SuccessProvider>
                  <AuthGuard>
                    <FluidNavigator>
                      {children}
                      <OnboardingWizard />
                    </FluidNavigator>
                  </AuthGuard>
                </SuccessProvider>
                <ThemeSettings />
                <TennisBoard />
              </AuthProvider>
            </AppConfigProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
