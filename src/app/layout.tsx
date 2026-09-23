import type { Metadata } from "next";
import { Anton, Geist } from "next/font/google";
import "sweetalert2/dist/sweetalert2.min.css";
import "./globals.css";
import "./components.css";
import "./expanded-components.css";
import "./country-control.css";
import "./modal-overrides.css";
import "./asset-control.css";
import "./auth-v2.css";
import "./auth-recovery.css";
import "./scrollbars.css";
import "./auth-scroll-layout.css";
import "./phone-input.css";
import "./auth-field-fixes.css";
import "./phone-country-switch.css";
import "./access-auth.css";
import "./dashboard-shell.css";
import "./onboarding-compliance.css";
import { ToastProvider } from "@/components/ui/toast";
import { ClientCryptoPolyfill } from "@/components/client-crypto-polyfill";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const antonDisplay = Anton({
  variable: "--font-anton-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: { default: "StrivePay", template: "%s | StrivePay" },
  description: "Move money between bank and crypto, both directions.",
};

const LAN_RANDOM_UUID_POLYFILL = `(function(){var c=globalThis.crypto;if(!c||typeof c.randomUUID==="function"||typeof c.getRandomValues!=="function")return;c.randomUUID=function(){var b=new Uint8Array(16);c.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h=Array.from(b,function(x){return x.toString(16).padStart(2,"0");}).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);};})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${antonDisplay.variable} h-full antialiased`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LAN_RANDOM_UUID_POLYFILL }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ClientCryptoPolyfill />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
