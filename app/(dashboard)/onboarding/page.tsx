'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { apiFetch } from '@/lib/api/client'

const STEPS = [
  { title: 'Dados da clínica', icon: '🏥' },
  { title: 'Convênios', icon: '📋' },
  { title: 'Equipe médica', icon: '👨‍⚕️' },
  { title: 'Primeiro paciente', icon: '🧑' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1: Clinic data (already filled on signup)
  // Step 2: Convenios
  const [convenios, setConvenios] = useState([
    { nome: '', registroAns: '' },
  ])

  // Step 3: Team
  const [medicos, setMedicos] = useState([
    { nome: '', email: '', crm: '', especialidade: '' },
  ])

  // Step 4: First patient
  const [paciente, setPaciente] = useState({ nome: '', cpf: '', telefone: '' })

  const handleNext = async () => {
    if (step === 1 && convenios.some((c) => c.nome.trim())) {
      setSaving(true)
      for (const c of convenios.filter((x) => x.nome.trim())) {
        await apiFetch('/convenios', {
          method: 'POST',
          body: JSON.stringify(c),
        }).catch(() => {})
      }
      setSaving(false)
    }

    if (step === 2 && medicos.some((m) => m.nome.trim() && m.email.trim())) {
      setSaving(true)
      for (const m of medicos.filter((x) => x.nome.trim() && x.email.trim())) {
        await apiFetch('/usuarios/invite', {
          method: 'POST',
          body: JSON.stringify({ ...m, role: 'medico' }),
        }).catch(() => {})
      }
      setSaving(false)
    }

    if (step === 3) {
      // Paciente é opcional — só cria se nome preenchido
      if (paciente.nome.trim()) {
        setSaving(true)
        await apiFetch('/pacientes', {
          method: 'POST',
          body: JSON.stringify(paciente),
        }).catch(() => {})
        setSaving(false)
      }
      router.push('/dashboard')
      return
    }

    if (step < STEPS.length - 1) setStep(step + 1)
  }

  // Botão "Pular tudo" do onboarding (canto superior direito)
  const handleSkipAll = () => {
    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 0' }}>
      {/* Skip all link (canto superior) */}
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <button
          onClick={handleSkipAll}
          style={{
            padding: '4px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text3)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Pular e configurar depois →
        </button>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 4, borderRadius: 2, marginBottom: 8,
              background: i <= step ? 'var(--accent)' : 'var(--bg3)',
              transition: 'background 0.3s',
            }} />
            <div style={{
              fontSize: 20, marginBottom: 4,
              opacity: i <= step ? 1 : 0.4,
            }}>{s.icon}</div>
            <div style={{
              fontSize: 11, color: i <= step ? 'var(--text)' : 'var(--text3)',
              fontWeight: i === step ? 600 : 400,
            }}>{s.title}</div>
          </div>
        ))}
      </div>

      <Card style={{ padding: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {STEPS[step].icon} {STEPS[step].title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
          {step === 0 && 'Seus dados da clínica já foram salvos no cadastro. Prossiga para o próximo passo.'}
          {step === 1 && 'Adicione os convênios que a clínica atende.'}
          {step === 2 && 'Convide os médicos da equipe. Eles receberão um email com link de acesso.'}
          {step === 3 && 'Cadastre o primeiro paciente para testar o sistema.'}
        </p>

        {step === 0 && (
          <div style={{ padding: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#34d399', margin: 0 }}>
              ✓ Clínica configurada com sucesso. Clique em Próximo para continuar.
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {convenios.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inputStyle, flex: 2 }} placeholder="Nome do convênio" value={c.nome}
                  onChange={(e) => { const arr = [...convenios]; arr[i].nome = e.target.value; setConvenios(arr) }} />
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Registro ANS" value={c.registroAns}
                  onChange={(e) => { const arr = [...convenios]; arr[i].registroAns = e.target.value; setConvenios(arr) }} />
              </div>
            ))}
            <button onClick={() => setConvenios([...convenios, { nome: '', registroAns: '' }])}
              style={{ alignSelf: 'flex-start', padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
              + Adicionar convênio
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {medicos.map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={inputStyle} placeholder="Nome" value={m.nome}
                  onChange={(e) => { const arr = [...medicos]; arr[i].nome = e.target.value; setMedicos(arr) }} />
                <input style={inputStyle} placeholder="Email" value={m.email}
                  onChange={(e) => { const arr = [...medicos]; arr[i].email = e.target.value; setMedicos(arr) }} />
                <input style={inputStyle} placeholder="CRM" value={m.crm}
                  onChange={(e) => { const arr = [...medicos]; arr[i].crm = e.target.value; setMedicos(arr) }} />
                <input style={inputStyle} placeholder="Especialidade" value={m.especialidade}
                  onChange={(e) => { const arr = [...medicos]; arr[i].especialidade = e.target.value; setMedicos(arr) }} />
              </div>
            ))}
            <button onClick={() => setMedicos([...medicos, { nome: '', email: '', crm: '', especialidade: '' }])}
              style={{ alignSelf: 'flex-start', padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
              + Adicionar médico
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={inputStyle} placeholder="Nome completo" value={paciente.nome}
              onChange={(e) => setPaciente({ ...paciente, nome: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={inputStyle} placeholder="CPF (opcional)" value={paciente.cpf}
                onChange={(e) => setPaciente({ ...paciente, cpf: e.target.value })} />
              <input style={inputStyle} placeholder="Telefone (opcional)" value={paciente.telefone}
                onChange={(e) => setPaciente({ ...paciente, telefone: e.target.value })} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
          <div>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
                ← Voltar
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && step < 3 && (
              <button onClick={() => setStep(step + 1)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
                Pular
              </button>
            )}
            <button onClick={handleNext} disabled={saving}
              style={{
                padding: '10px 24px', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Salvando...' : step === 3 ? 'Concluir setup' : 'Próximo →'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
