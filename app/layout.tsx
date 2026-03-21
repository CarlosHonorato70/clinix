import type { Metadata } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.medflow.com.br'

export const metadata: Metadata = {
  title: {
    default: 'MedFlow — Gestão Clínica Inteligente',
    template: '%s | MedFlow',
  },
  description: 'Sistema de gestão clínica com IA integrada. Agenda, prontuário eletrônico, faturamento TISS e auditoria automática para clínicas brasileiras. Conforme a LGPD.',
  keywords: ['gestão clínica', 'prontuário eletrônico', 'faturamento TISS', 'software médico', 'IA saúde', 'LGPD saúde', 'agenda médica'],
  authors: [{ name: 'MedFlow' }],
  creator: 'MedFlow',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: APP_URL,
    siteName: 'MedFlow',
    title: 'MedFlow — Gestão Clínica Inteligente com IA',
    description: 'Agenda, prontuário, faturamento TISS e auditoria com inteligência artificial. Feito para clínicas brasileiras.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedFlow — Gestão Clínica Inteligente',
    description: 'Sistema de gestão clínica com IA integrada para clínicas brasileiras.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
