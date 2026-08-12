import type { Metadata } from "next";
import type { Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { LoginScreen } from "@/components/LoginScreen";
import { PreventZoom } from "@/components/PreventZoom";
import { APP_NAME, TABLES } from "@/lib/config";
import { getRows } from "@/lib/sheets";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description: "Costcode web app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/icon-192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#14883d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let peopleRows: any[] = [];
  try {
    peopleRows = await getRows(TABLES.PEOPLE);
  } catch (e) {
    // Ignore error if people table can't be fetched
  }

  const cookieStore = await cookies();
  const employeeId = cookieStore.get("auth_employee_id")?.value;
  const name = cookieStore.get("auth_name")?.value;
  const role = cookieStore.get("auth_role")?.value;
  
  const currentUser = employeeId ? { id: employeeId, name: name || "", role: role || "User" } : null;

  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <PreventZoom />
        {!currentUser ? (
          <LoginScreen peopleRows={peopleRows} />
        ) : (
          <AppShell peopleRows={peopleRows} currentUser={currentUser}>{children}</AppShell>
        )}
      </body>
    </html>
  );
}

