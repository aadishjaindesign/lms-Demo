import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import PwaInstall from "@/components/PwaInstall";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata = {
  title: "Jains Computer LMS",
  description: "Jains Computer Lecture Management System",
  manifest: "/manifest.webmanifest",
  applicationName: "Jains LMS",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Jains LMS", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070606",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className={`${manrope.className} antialiased bg-[#070606] text-white min-h-screen relative`}>
        {/* Site-wide Ambient Red Glow & Fine Dotted Texture */}
        <div className="ambient" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="app min-h-screen relative z-[1]">
          {children}
        </div>
        <PwaInstall />
      </body>
    </html>
  );
}
