import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IFA Medical Consult",
  description: "Portal Kolaborasi Klinis Internal Ifa Beauty",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IFA Medical",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#be185d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
