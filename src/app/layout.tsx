import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pampa",
  description: "Gestión ganadera: pesajes, alimentación, sanidad y rentabilidad",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pampa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1d9e75",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
