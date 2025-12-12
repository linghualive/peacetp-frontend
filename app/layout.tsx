import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthExpiredDialog } from "./components/auth-expired-dialog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeaceTP 管理系统",
  description: "PeaceTP 统一设备与用户管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <AuthExpiredDialog />
        {children}
      </body>
    </html>
  );
}
