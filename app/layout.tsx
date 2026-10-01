import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ruma — Money, made simple", description: "Kelola cashflow, anggaran, dan tujuan tabunganmu." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
