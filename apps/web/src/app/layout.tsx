import type { Metadata } from "next";
import "./globals.css";
import { Observability } from "@/components/observability/Observability";

export const metadata: Metadata = {
  title: "Weather",
  description: "Glassmorphic weather forecasts powered by Open-Meteo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <Observability />
        {children}
      </body>
    </html>
  );
}
