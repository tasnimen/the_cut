import "./globals.css";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { env } from "@/config/env";
import { site } from "@/config/site";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { connection } from "next/server";

const displayFont = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bodyFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: env.SITE_URL ? new URL(env.SITE_URL) : undefined,
  title: site.name,
  description: site.description,
};

export default async function RootLayout({ children }) {
  await connection();
  return (
    <html lang={site.locale} className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
