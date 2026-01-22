// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import PushNotificationSetup from "@/app/components/PushNotificationSetup";
import GlobalBottomNav from "@/app/components/GlobalBottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CareConnect - Pharmagister & Tutomagister",
  description: "Gyógyszertári helyettesítés és idősgondozás platform",
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
        <meta name="application-name" content="CareConnect" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CareConnect" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className}`}>
        <AuthProvider>
          <PushNotificationSetup />
          <ThemeProvider>
            <ToastProvider>
              {children}
              <GlobalBottomNav />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
