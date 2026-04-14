'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

export default function LgpdPage() {
  const { notify } = useToast()
  const [pacienteId, setPacienteId] = useState('')
  const [loading, setLoading] = useState<'export' | 'erasure' | null>(null)
  const [consentType, setConsentType] = useState('dados_pessoais')

  async function handleExport() {
    if (!pacienteId) {
      notify('Informe o ID do paciente', 'error')
      return
    }
    setLoading('export')
    try {
      const res = await fetch(`/api/lgpd/export?pacienteId=${pacienteId}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }))
        notify(err.error || 'Erro ao exportar', 'error')
        return
      }

      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lgpd_export_${pacienteId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      notify('Exportação LGPD concluída', 'success')
    } catch {
      notify('Erro de conexão', 'error')
    } finally {
      setLoading(null)
    }
  }

  async function handleErasure() {
    if (!pacienteId) {
      notify('Informe o ID do paciente', 'error')
      return
    }
    if (!confirm(`Tem certeza que deseja anonimizar os dados do paciente ${pacienteId}? Esta ação é irreversível.`)) {
      return
    }
    setLoading('erasure')
    try {
      const res = await fetch('/api/lgpd/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pacienteId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }))
        notify(err.error || 'Erro ao anonimizar', 'error')
        return
      }
      notify('Dados anonimizados com sucesso (registros clínicos mantidos conforme CFM)', 'success')
      setPacienteId('')
    } catch {
      notify('Erro de conexão', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
          Direitos LGPD
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, lineHeight: 1.6 }}>
          Exerça os direitos previstos na Lei Geral de Proteção de Dados (Lei 13.709/2018).
          Como operador de dados, o Clinix disponibiliza ferramentas para você atender às solicitações dos seus pacientes.
        </p>
      </div>

      {/* Info Card */}
      <Card style={{ padding: 20, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 20 }}>🛡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Relação Controlador × Operador
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
              A <strong>clínica</strong> é a <strong>Controladora</strong> dos dados dos seus pacientes.
              O Clinix atua como <strong>Operador</strong>, processando os dados conforme suas instruções.
              Você é responsável por atender as solicitações dos titulares dos dados (pacientes).
            </p>
          </div>
        </div>
      </Card>

      {/* Export */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>↓</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Portabilidade de dados</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Art. 18, V da LGPD</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
          Exporte todos os dados de um paciente em formato JSON estruturado. Inclui dados pessoais, consultas, prontuários, guias TISS e consentimentos.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="ID do paciente (UUID)"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: 8,
              color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)',
            }}
          />
          <button
            onClick={handleExport}
            disabled={loading !== null}
            style={{
              padding: '10px 18px', borderRadius: 8,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
              color: '#34d399', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading === 'export' ? 'Exportando...' : 'Exportar dados'}
          </button>
        </div>
      </Card>

      {/* Erasure */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⊗</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Direito ao esquecimento</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Art. 18, VI da LGPD</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
          Anonimiza os dados pessoais do paciente (nome, CPF, telefone, email).
          <strong style={{ color: '#fbbf24' }}> Registros clínicos são preservados por 20 anos</strong> conforme
          Resolução CFM 1.821/2007 — requisito legal que se sobrepõe ao direito ao esquecimento.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="ID do paciente (UUID)"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: 8,
              color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)',
            }}
          />
          <button
            onClick={handleErasure}
            disabled={loading !== null}
            style={{
              padding: '10px 18px', borderRadius: 8,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading === 'erasure' ? 'Anonimizando...' : 'Anonimizar dados'}
          </button>
        </div>
      </Card>

      {/* Consent */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Registro de consentimento</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Art. 8º da LGPD</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
          Registre o consentimento do paciente para o tratamento de dados pessoais, comunicação,
          compartilhamento ou uso de IA. Todos os consentimentos são versionados e rastreáveis.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={consentType}
            onChange={(e) => setConsentType(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '10px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: 8,
              color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          >
            <option value="dados_pessoais">Dados pessoais</option>
            <option value="comunicacao">Comunicação</option>
            <option value="compartilhamento">Compartilhamento com convênios</option>
            <option value="tratamento_ia">Tratamento por IA</option>
          </select>
          <button
            onClick={() => notify('Informe o ID do paciente e registre via /api/lgpd/consent', 'info')}
            style={{
              padding: '10px 18px', borderRadius: 8,
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Registrar consentimento
          </button>
        </div>
      </Card>

      {/* Retention */}
      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          Política de retenção
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Dados clínicos', time: '20 anos', law: 'CFM 1.821/2007' },
            { label: 'Dados financeiros', time: '5 anos', law: 'CTN Art. 173' },
            { label: 'Logs de auditoria', time: '5 anos', law: 'LGPD Art. 37' },
            { label: 'Sessões', time: '30 dias', law: 'Prática recomendada' },
          ].map((item) => (
            <div key={item.label} style={{
              padding: 12, background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {item.time}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                {item.law}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
