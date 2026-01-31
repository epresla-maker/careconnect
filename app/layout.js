// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import PushNotificationSetup from "@/app/components/PushNotificationSetup";
import PushNotificationBanner from "@/app/components/PushNotificationBanner";
import PWARegister from "@/app/components/PWARegister";
import GlobalBottomNav from "@/app/components/GlobalBottomNav";
import StartupRedirect from "@/app/components/StartupRedirect";
import PWAInstallBanner from "@/app/components/PWAInstallBanner";
import BadgeManager from "@/app/components/BadgeManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pharmagister - Gyógyszertári helyettesítés",
  description: "Gyógyszertári helyettesítés platform",
  manifest: "/manifest.json",
  appleWebAppCapable: "yes",
  appleWebAppStatusBarStyle: "default",
};

export const viewport = {
  themeColor: "#6B46C1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <head>
        <meta name="application-name" content="Pharmagister" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pharmagister" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className}`}>
        <AuthProvider>
          <PWARegister />
          <BadgeManager />
          <StartupRedirect />
          <PushNotificationSetup />
          <PushNotificationBanner />
          <ThemeProvider>
            <ToastProvider>
              {children}
              <GlobalBottomNav />
              <PWAInstallBanner />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
