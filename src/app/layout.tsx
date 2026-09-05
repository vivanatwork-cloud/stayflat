import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { DataProvider } from "@/components/providers";
import { RouteTheme } from "@/components/brand/route-theme";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stayflat.xyz"),
  title: {
    default: "StayFlat — Master the trader, not the trade",
    template: "%s · StayFlat",
  },
  description:
    "Find the trading behavior costing you money and build one practical rule to stop repeating it.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "StayFlat",
    title: "StayFlat — Master the trader, not the trade",
    description:
      "Find the trading behavior costing you money and build one practical rule to stop repeating it.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "StayFlat — Master the trader, not the trade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StayFlat — Master the trader, not the trade",
    description:
      "Find the trading behavior costing you money and build one practical rule to stop repeating it.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = Boolean(clerkPublishableKey);
  const clerkDomain = clerkPublishableKey?.startsWith("pk_live_")
    ? "clerk.stayflat.xyz"
    : undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=location.pathname;var a=p==='/report'||p.indexOf('/report/')===0||p==='/onboarding'||p.indexOf('/onboarding/')===0||p==='/journal'||p.indexOf('/journal/')===0;var t='light';if(a){t=localStorage.getItem('stayflat_theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()` }} />
      </head>
      <body
        className={`${newsreader.variable} ${hankenGrotesk.variable} ${jetBrainsMono.variable}`}
      >
        <RouteTheme />
        {clerkEnabled ? (
          <ClerkProvider afterSignOutUrl="/" domain={clerkDomain}>
            <DataProvider clerkEnabled>{children}</DataProvider>
          </ClerkProvider>
        ) : (
          <DataProvider clerkEnabled={false}>{children}</DataProvider>
        )}
      </body>
    </html>
  );
}
