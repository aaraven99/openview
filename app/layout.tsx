import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "OpenView — market intelligence", description: "Open-source charting and paper trading workspace." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
