import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM = process.env.EMAIL_FROM || 'Clinix <noreply@clinix.com.br>'

export async function sendWelcomeEmail(to: string, clinicaNome: string, userName: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Bem-vindo ao Clinix, ${userName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Clinix</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Bem-vindo ao Clinix!</h2>
          <p style="color: #555; line-height: 1.6;">
            Olá <strong>${userName}</strong>, a clínica <strong>${clinicaNome}</strong>
            foi criada com sucesso no Clinix.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Seu período de teste de <strong>14 dias</strong> já começou.
            Durante o trial, você tem acesso a todas as funcionalidades do sistema.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Acesse o sistema e comece a configurar sua clínica:
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinix.com.br'}/login"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Acessar Clinix
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
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinix.com.br'}/reset-password?token=${resetToken}`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Redefinir sua senha — Clinix',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Clinix</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Redefinir senha</h2>
          <p style="color: #555; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta Clinix.
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

export async function sendInviteEmail(to: string, inviterName: string, clinicaNome: string, inviteToken: string) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinix.com.br'}/invite?token=${inviteToken}`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${inviterName} convidou você para o Clinix`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Clinix</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Você foi convidado!</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${inviterName}</strong> convidou você para fazer parte da equipe da clínica
            <strong>${clinicaNome}</strong> no Clinix.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Clique no botão abaixo para criar sua senha e acessar o sistema.
            Este convite expira em <strong>24 horas</strong>.
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Aceitar convite
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Se você não reconhece este convite, ignore este email.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendVerificationEmail(to: string, userName: string, verifyToken: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinix.com.br'}/verify?token=${verifyToken}`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Confirme seu email — Clinix',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Clinix</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Confirme seu email</h2>
          <p style="color: #555; line-height: 1.6;">
            Olá <strong>${userName}</strong>, clique no botão abaixo para confirmar
            seu email e ativar sua conta Clinix.
          </p>
          <a href="${verifyUrl}"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Confirmar email
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Se você não criou esta conta, ignore este email.
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
    subject: `Seu trial Clinix expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Clinix</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111; margin-top: 0;">Seu período de teste está acabando</h2>
          <p style="color: #555; line-height: 1.6;">
            O período de teste da clínica <strong>${clinicaNome}</strong> expira em
            <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Para continuar usando o Clinix sem interrupção, escolha um plano:
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinix.com.br'}/configuracoes"
             style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Escolher plano
          </a>
        </div>
      </div>
    `,
  })
}
