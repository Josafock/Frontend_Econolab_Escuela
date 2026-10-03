import type { Metadata, Viewport } from "next";
import { Questrial } from "next/font/google";
import PwaProvider from "@/components/pwa/PwaProvider";
import "./globals.css";

const questrial = Questrial({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-questrial",
});

export const metadata: Metadata = {
  title: "Econolab",
  description: "Gestión de servicios, estudios y resultados del laboratorio Econolab.",
  applicationName: "Econolab",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Econolab", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${questrial.className} min-h-screen bg-slate-100 text-gray-900 antialiased`}>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
