import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "./_components/ServiceWorker";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

/** Every number on screen. Tabular figures so a moving cents readout cannot
 *  reflow the line it sits on. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenTune — free guitar tuner, every alternate tuning",
  description:
    "A free browser guitar tuner with every alternate tuning unlocked. No account, no subscription, works offline.",
  appleWebApp: {
    capable: true,
    title: "OpenTune",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  // The tuner is a single screen; letting it zoom on a double-tap only gets
  // in the way of tapping pegs.
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
