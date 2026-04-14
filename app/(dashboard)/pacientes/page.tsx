'use client'

import { useState, useEffect, useRef } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useApi } from '@/lib/api/client'
import { useToast } from '@/components/ui/Toast'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Paciente {
  id: string
  nome: string
  cpf: string | null
  dataNascimento: string | null
  sexo: string | null
  email: string | null
  telefone: string | null
  convenio: { id: string; nome: string } | null
}

// ─── Convenio badge color map ──────────────────────────────────────────────
const convenioBadgeColor = (convenio: string): 'teal' | 'amber' | 'purple' | 'blue' => {
  if (convenio?.startsWith('Amil')) return 'teal'
  if (convenio?.startsWith('Unimed')) return 'amber'
  if (convenio?.startsWith('Bradesco')) return 'purple'
  if (convenio?.startsWith('SulAm')) return 'blue'
  return 'teal'
}

function calcAge(dateStr: string | null): number {
  if (!dateStr) return 0
  const birth = new Date(dateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age
}

// ─── Search icon ───────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

// ─── Table row ─────────────────────────────────────────────────────────────
function PatientRow({ patient }: { patient: Paciente }) {
  const [hovered, setHovered] = useState(false)
  const age = calcAge(patient.dataNascimento)
  const sex = patient.sexo === 'F' ? 'Feminino' : 'Masculino'
  const convenioNome = patient.convenio?.nome ?? 'Particular'

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <td style={{ padding: '11px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{patient.nome}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 1 }}>
          {age} anos · {sex}
        </div>
      </td>
      <td style={{ padding: '11px 16px' }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm)', padding: '2px 8px', display: 'inline-block',
        }}>
          {patient.cpf ?? '—'}
        </span>
      </td>
      <td style={{ padding: '11px 16px' }}>
        <Badge color={convenioBadgeColor(convenioNome)}>{convenioNome}</Badge>
      </td>
      <td style={{ padding: '11px 16px' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          {patient.telefone ?? '—'}
        </span>
      </td>
      <td style={{ padding: '11px 16px' }}>
        <a
          href="/prontuarios"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 28, padding: '0 12px', borderRadius: 7, background: 'transparent',
            border: '1px solid var(--border2)', color: 'var(--text2)',
            fontSize: 12.5, fontWeight: 500, textDecoration: 'none',
            fontFamily: 'var(--font)', transition: 'border-color 0.15s, color 0.15s', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
        >
          Abrir →
        </a>
      </td>
    </tr>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function PacientesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { notify } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const apiPath = debouncedSearch
    ? `/pacientes?q=${encodeURIComponent(debouncedSearch)}`
    : '/pacientes'

  const { data, isLoading, mutate } = useApi<{ pacientes: Paciente[] }>(apiPath)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      notify('Envie um arquivo .csv', 'error')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/pacientes/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const result = await res.json()

      if (!res.ok) {
        notify(result.error || 'Erro ao importar', 'error')
      } else {
        const msg = `${result.imported} pacientes importados${result.errors.length > 0 ? ` · ${result.errors.length} erros` : ''}`
        notify(msg, result.errors.length > 0 ? 'warning' : 'success')
        mutate()
      }
    } catch {
      notify('Erro de conexão ao importar', 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const patients = data?.pacientes ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>
            Base de pacientes
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--mono)' }}>
            {patients.length} pacientes {debouncedSearch ? 'encontrados' : 'cadastrados'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              cursor: importing ? 'wait' : 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!importing) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--text)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            <span style={{ fontSize: 14 }}>↑</span>
            {importing ? 'Importando...' : 'Importar CSV'}
          </button>
          <button style={{
            height: 34, padding: '0 16px', borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            border: '1px solid rgba(139,92,246,0.5)', color: '#fff',
            fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <span style={{ fontSize: 15 }}>+</span>
            Novo paciente
          </button>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: 380, width: '100%',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '0 12px', height: 34, transition: 'border-color 0.15s',
          }}
            onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)' }}
            onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
          >
            <span style={{ color: 'var(--text3)', display: 'flex' }}><IconSearch /></span>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Paciente', 'CPF', 'Convênio', 'Telefone', ''].map((col) => (
                  <th key={col} style={{
                    padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text3)', whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [1, 2, 3, 4].map((i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div style={{ height: 14, width: '60%', background: 'var(--bg3)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && patients.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    {debouncedSearch ? `Nenhum paciente encontrado para "${debouncedSearch}"` : 'Nenhum paciente cadastrado'}
                  </td>
                </tr>
              )}
              {patients.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
