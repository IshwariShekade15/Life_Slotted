import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Slotted — Auto-schedule your life", template: "%s | Slotted" },
  description: "A calm, honest scheduler that plans tasks around your real availability and adapts when life changes.",
  applicationName: "Slotted",
  robots: { index: true, follow: true },
  openGraph: { type: "website", siteName: "Slotted", title: "Slotted — Auto-schedule your life", description: "Dump your tasks. Slotted builds the plan.", images: ["/og-image.svg"] },
  twitter: { card: "summary_large_image", title: "Slotted — Auto-schedule your life", description: "A calm scheduler that adapts when life changes." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    (() => {
      const saved = localStorage.getItem("slotted-theme");
      const dark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-bg text-ink antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
