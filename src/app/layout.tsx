import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delivery SaaS - Painel",
  description: "Gerencie seu delivery via WhatsApp",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
