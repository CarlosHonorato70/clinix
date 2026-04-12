import type { Metadata, Viewport } from "next";
import PostHogProvider from "@/components/providers/PostHogProvider";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinixproia.com.br'

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'Clinix — Gestão Clínica Inteligente',
    template: '%s | Clinix',
  },
  description: 'Sistema de gestão clínica com IA integrada. Agenda, prontuário eletrônico, faturamento TISS e auditoria automática para clínicas brasileiras. Conforme a LGPD.',
  keywords: ['gestão clínica', 'prontuário eletrônico', 'faturamento TISS', 'software médico', 'IA saúde', 'LGPD saúde', 'agenda médica'],
  authors: [{ name: 'Clinix' }],
  creator: 'Clinix',
  metadataBase: new URL(APP_URL),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clinix',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: APP_URL,
    siteName: 'Clinix',
    title: 'Clinix — Gestão Clínica Inteligente com IA',
    description: 'Agenda, prontuário, faturamento TISS e auditoria com inteligência artificial. Feito para clínicas brasileiras.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clinix — Gestão Clínica Inteligente',
    description: 'Sistema de gestão clínica com IA integrada para clínicas brasileiras.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
