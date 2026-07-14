import type { Metadata } from "next";
import "./globals.css";
import AssistantFAB from "@/components/AssistantFAB";

export const metadata: Metadata = {
  title: "ReasonVest AI — Investment Decisions Powered by Evidence.",
  description:
    "AI-powered investment research: live company data, financials, news, and transparent AI reasoning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AssistantFAB />
      </body>
    </html>
  );
}
