import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM = process.env.EMAIL_FROM || 'MedFlow <noreply@medflow.com.br>'

export async function sendWelcomeEmail(to: string, clinicaNome: string, userName: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Bem-vindo ao MedFlow, ${userName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MedFlow</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Bem-vindo ao MedFlow!</h2>
          <p style="color: #555; line-height: 1.6;">
            Olá <strong>${userName}</strong>, a clínica <strong>${clinicaNome}</strong>
            foi criada com sucesso no MedFlow.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Seu período de teste de <strong>14 dias</strong> já começou.
            Durante o trial, você tem acesso a todas as funcionalidades do sistema.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Acesse o sistema e comece a configurar sua clínica:
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.medflow.com.br'}/login"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Acessar MedFlow
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Se você não criou esta conta, ignore este email.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.medflow.com.br'}/reset-password?token=${resetToken}`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Redefinir sua senha — MedFlow',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MedFlow</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Redefinir senha</h2>
          <p style="color: #555; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta MedFlow.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Redefinir senha
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Se você não solicitou a redefinição, ignore este email. Sua senha permanecerá a mesma.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendTrialExpiringEmail(to: string, clinicaNome: string, daysLeft: number) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Seu trial MedFlow expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MedFlow</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Seu período de teste está acabando</h2>
          <p style="color: #555; line-height: 1.6;">
            O período de teste da clínica <strong>${clinicaNome}</strong> expira em
            <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Para continuar usando o MedFlow sem interrupção, escolha um plano:
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.medflow.com.br'}/configuracoes"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Escolher plano
          </a>
        </div>
      </div>
    `,
  })
}
