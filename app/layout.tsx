import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Where Did I Put That?",
  description: "Your house remembers. A private memory for your belongings.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Remember", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
