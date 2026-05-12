import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import BodyWrapper from "@/components/layout/BodyWrapper";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from 'sonner' // ✅ pastikan ini ada

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem POS",
  description: "Sistem Point of Sale untuk Ritel Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <BodyWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="pos-theme"
          >
            <AuthProvider>
              {children}
              <Toaster richColors position="top-center" /> {/* ✅ tambahkan ini */}
            </AuthProvider>
          </ThemeProvider>
        </BodyWrapper>
      </body>
    </html>
  );
}
