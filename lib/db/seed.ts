import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as bcrypt from 'bcryptjs'
import { tenants } from './schema/tenants'
import { usuarios } from './schema/usuarios'
import { convenios } from './schema/convenios'
import { pacientes } from './schema/pacientes'
import { agendamentos } from './schema/agendamentos'
import { consultas } from './schema/consultas'
import { guiasTiss, tuss } from './schema/guias-tiss'
import { convenioRegrasAprendidas } from './schema/convenio-regras'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

const DEV_PASSWORD = 'medflow123'

async function seed() {
  console.log('🌱 Seeding database...')

  // 1. Tenant
  const [tenant] = await db.insert(tenants).values({
    nome: 'Clínica São Lucas',
    subdominio: 'sao-lucas',
    plano: 'pro',
  }).returning()
  const tid = tenant.id
  console.log('  ✓ Tenant created:', tid)

  // 2. Hash password
  const hash = await bcrypt.hash(DEV_PASSWORD, 12)

  // 3. Users (doctors + staff)
  const doctorsData = [
    { nome: 'Dr. Carlos Mendes', email: 'carlos@medflow.dev', role: 'medico', crm: 'CRM-SP 48291', especialidade: 'Clínica Médica', corAgenda: '#3b82f6' },
    { nome: 'Dra. Ana Figueiredo', email: 'ana@medflow.dev', role: 'medico', crm: 'CRM-SP 61047', especialidade: 'Cardiologia', corAgenda: '#8b5cf6' },
    { nome: 'Dr. Ricardo Braga', email: 'ricardo@medflow.dev', role: 'medico', crm: 'CRM-SP 33814', especialidade: 'Ortopedia', corAgenda: '#10b981' },
    { nome: 'Dra. Larissa Porto', email: 'larissa@medflow.dev', role: 'medico', crm: 'CRM-SP 55932', especialidade: 'Pediatria', corAgenda: '#f59e0b' },
  ]

  const staffData = [
    { nome: 'Admin MedFlow', email: 'admin@medflow.dev', role: 'admin' },
    { nome: 'Juliana Faturamento', email: 'juliana@medflow.dev', role: 'faturista' },
    { nome: 'Priscila Recepção', email: 'priscila@medflow.dev', role: 'recepcionista' },
  ]

  const allUsers = [...doctorsData, ...staffData].map((u) => ({
    tenantId: tid,
    senhaHash: hash,
    ...u,
  }))

  const insertedUsers = await db.insert(usuarios).values(allUsers).returning()
  console.log(`  ✓ ${insertedUsers.length} users created`)

  const doctorMap: Record<string, string> = {}
  const doctorKeys = ['cm', 'af', 'rb', 'lp']
  insertedUsers.filter(u => u.role === 'medico').forEach((u, i) => {
    doctorMap[doctorKeys[i]] = u.id
  })

  // 4. Convenios
  const conveniosData = [
    { nome: 'Unimed', codigoAns: '339482' },
    { nome: 'Amil', codigoAns: '326305' },
    { nome: 'Bradesco', codigoAns: '005711' },
    { nome: 'SulAmérica', codigoAns: '006246' },
    { nome: 'Hapvida', codigoAns: '368253' },
    { nome: 'Particular', codigoAns: null },
  ]

  const insertedConvenios = await db.insert(convenios).values(
    conveniosData.map((c) => ({ tenantId: tid, ...c }))
  ).returning()
  console.log(`  ✓ ${insertedConvenios.length} convenios created`)

  const convMap: Record<string, string> = {}
  insertedConvenios.forEach((c) => { convMap[c.nome] = c.id })

  // 5. Patients
  const uniquePatients = [
    { nome: 'João Carlos Ferreira', idade: 62, sexo: 'M', cpf: '123.456.789-45', convenio: 'Unimed', medico: 'cm' },
    { nome: 'Maria Aparecida Silva', idade: 45, sexo: 'F', cpf: '234.567.890-12', convenio: 'Amil', medico: 'cm' },
    { nome: 'Roberto Campos', idade: 51, sexo: 'M', cpf: '345.678.901-23', convenio: 'Particular', medico: 'cm' },
    { nome: 'Fernanda Torres Melo', idade: 28, sexo: 'F', cpf: '456.789.012-91', convenio: 'Amil', medico: 'cm' },
    { nome: 'Clara Oliveira', idade: 34, sexo: 'F', cpf: '567.890.123-34', convenio: 'Unimed', medico: 'cm' },
    { nome: 'Antônio Neves', idade: 58, sexo: 'M', cpf: '678.901.234-56', convenio: 'Unimed', medico: 'cm' },
    { nome: 'Helena Costa', idade: 42, sexo: 'F', cpf: '789.012.345-67', convenio: 'Amil', medico: 'cm' },
    { nome: 'Igor Pinto', idade: 39, sexo: 'M', cpf: '890.123.456-78', convenio: 'Unimed', medico: 'cm' },
    { nome: 'Eduardo Matos', idade: 67, sexo: 'M', cpf: '901.234.567-89', convenio: 'Unimed', medico: 'af' },
    { nome: 'Luciana Pimentel', idade: 55, sexo: 'F', cpf: '012.345.678-90', convenio: 'Unimed', medico: 'af' },
    { nome: 'Fernanda Cruz', idade: 61, sexo: 'F', cpf: '111.222.333-44', convenio: 'SulAmérica', medico: 'af' },
    { nome: 'Beatriz Lima', idade: 49, sexo: 'F', cpf: '222.333.444-55', convenio: 'Amil', medico: 'af' },
    { nome: 'Miguel Santos', idade: 72, sexo: 'M', cpf: '333.444.555-66', convenio: 'Bradesco', medico: 'af' },
    { nome: 'Pedro Henrique Rocha', idade: 38, sexo: 'M', cpf: '444.555.666-33', convenio: 'SulAmérica', medico: 'rb' },
    { nome: 'Gabriel Rios', idade: 29, sexo: 'M', cpf: '555.666.777-88', convenio: 'Hapvida', medico: 'rb' },
    { nome: 'Lucas Alves', idade: 44, sexo: 'M', cpf: '666.777.888-99', convenio: 'Particular', medico: 'rb' },
    { nome: 'Mariana Vaz', idade: 36, sexo: 'F', cpf: '777.888.999-00', convenio: 'Unimed', medico: 'rb' },
    { nome: 'Natália Braga', idade: 27, sexo: 'F', cpf: '888.999.000-11', convenio: 'Amil', medico: 'rb' },
    { nome: 'Carlos Souza', idade: 53, sexo: 'M', cpf: '999.000.111-22', convenio: 'Bradesco', medico: 'rb' },
    { nome: 'Ana Paula Costa', idade: 31, sexo: 'F', cpf: '100.200.300-78', convenio: 'Bradesco', medico: 'lp' },
    { nome: 'Julia Lemos', idade: 28, sexo: 'F', cpf: '200.300.400-89', convenio: 'Bradesco', medico: 'lp' },
    { nome: 'Daniela Faria', idade: 35, sexo: 'F', cpf: '300.400.500-90', convenio: 'Particular', medico: 'lp' },
  ]

  function birthDateFromAge(age: number): string {
    const d = new Date()
    d.setFullYear(d.getFullYear() - age)
    return d.toISOString().split('T')[0]
  }

  const insertedPatients = await db.insert(pacientes).values(
    uniquePatients.map((p) => ({
      tenantId: tid,
      medicoResponsavelId: doctorMap[p.medico],
      nome: p.nome,
      cpf: p.cpf,
      dataNascimento: birthDateFromAge(p.idade),
      sexo: p.sexo,
      convenioId: convMap[p.convenio],
    }))
  ).returning()
  console.log(`  ✓ ${insertedPatients.length} patients created`)

  const patientMap: Record<string, string> = {}
  insertedPatients.forEach((p) => { patientMap[p.nome] = p.id })

  // 6. TUSS reference codes
  await db.insert(tuss).values([
    { codigo: '10101012', descricao: 'Consulta em consultório (clínica médica)', categoria: 'Consultas' },
    { codigo: '40304361', descricao: 'Eletrocardiograma com esforço', categoria: 'Exames' },
    { codigo: '40302558', descricao: 'Troponina I (quantitativa)', categoria: 'Exames laboratoriais' },
    { codigo: '30715017', descricao: 'Artroscopia de joelho diagnóstica', categoria: 'Procedimentos cirúrgicos' },
    { codigo: '40304590', descricao: 'Hemograma completo', categoria: 'Exames laboratoriais' },
  ])
  console.log('  ✓ TUSS reference codes created')

  // 7. Sample appointments (today = Friday, index 4 in the seed)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)

  // Appointment data from APPOINTMENTS_SEED
  const apptData: { medicoKey: string; dayIdx: number; time: string; patient: string; conv: string; risk: boolean }[] = [
    { medicoKey: 'cm', dayIdx: 0, time: '08:00', patient: 'Antônio Neves', conv: 'Unimed', risk: false },
    { medicoKey: 'cm', dayIdx: 0, time: '09:00', patient: 'Fernanda Cruz', conv: 'SulAmérica', risk: true },
    { medicoKey: 'cm', dayIdx: 4, time: '15:00', patient: 'Roberto Campos', conv: 'Particular', risk: true },
    { medicoKey: 'cm', dayIdx: 4, time: '15:45', patient: 'Fernanda Torres Melo', conv: 'Amil', risk: false },
    { medicoKey: 'cm', dayIdx: 4, time: '16:30', patient: 'Maria Aparecida Silva', conv: 'Amil', risk: false },
    { medicoKey: 'cm', dayIdx: 4, time: '17:00', patient: 'Clara Oliveira', conv: 'Unimed', risk: false },
    { medicoKey: 'af', dayIdx: 0, time: '09:00', patient: 'Eduardo Matos', conv: 'Unimed', risk: false },
    { medicoKey: 'af', dayIdx: 4, time: '08:00', patient: 'Eduardo Matos', conv: 'Unimed', risk: false },
    { medicoKey: 'af', dayIdx: 4, time: '09:00', patient: 'Fernanda Cruz', conv: 'SulAmérica', risk: true },
    { medicoKey: 'af', dayIdx: 4, time: '14:30', patient: 'Luciana Pimentel', conv: 'Unimed', risk: false },
    { medicoKey: 'rb', dayIdx: 0, time: '08:00', patient: 'Lucas Alves', conv: 'Particular', risk: false },
    { medicoKey: 'rb', dayIdx: 4, time: '10:00', patient: 'Pedro Henrique Rocha', conv: 'SulAmérica', risk: false },
    { medicoKey: 'rb', dayIdx: 4, time: '11:00', patient: 'Gabriel Rios', conv: 'Hapvida', risk: false },
    { medicoKey: 'rb', dayIdx: 4, time: '14:00', patient: 'Lucas Alves', conv: 'Particular', risk: false },
    { medicoKey: 'lp', dayIdx: 0, time: '08:00', patient: 'Ana Paula Costa', conv: 'Bradesco', risk: false },
    { medicoKey: 'lp', dayIdx: 4, time: '09:30', patient: 'Ana Paula Costa', conv: 'Bradesco', risk: false },
    { medicoKey: 'lp', dayIdx: 4, time: '11:30', patient: 'Julia Lemos', conv: 'Bradesco', risk: false },
  ]

  const apptValues = apptData.map((a) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + a.dayIdx)
    const [h, m] = a.time.split(':')
    date.setHours(parseInt(h), parseInt(m), 0, 0)

    // Find patient by partial match
    const patientName = Object.keys(patientMap).find(n => n.includes(a.patient) || a.patient.includes(n.split(' ')[0]))
    const patientId = patientName ? patientMap[patientName] : insertedPatients[0].id

    return {
      tenantId: tid,
      medicoId: doctorMap[a.medicoKey],
      pacienteId: patientId,
      dataHora: date,
      tipo: 'retorno' as const,
      status: a.dayIdx < (dayOfWeek === 0 ? 6 : dayOfWeek - 1) ? 'atendido' : 'agendado',
      riscoNoshow: a.risk ? 0.7 : 0.1,
      convenioId: convMap[a.conv],
    }
  })

  const insertedAppts = await db.insert(agendamentos).values(apptValues).returning()
  console.log(`  ✓ ${insertedAppts.length} appointments created`)

  // 8. Sample consultas
  const joaoId = patientMap['João Carlos Ferreira']
  const mariaId = patientMap['Maria Aparecida Silva']

  const [consulta1] = await db.insert(consultas).values([
    {
      tenantId: tid,
      pacienteId: joaoId,
      medicoId: doctorMap['cm'],
      anamnese: 'Paciente relata dor precordial aos esforços há 2 semanas, com irradiação para membro superior esquerdo.',
      exameFisico: 'PA 150x95mmHg, FC 88bpm, ausculta cardíaca com B4.',
      hipoteseDiagnostica: { cid10: ['I20', 'I10'], descricao: 'Angina pectoris, Hipertensão essencial' },
      conduta: 'Solicitado ECG de esforço e troponina. Ajuste de anti-hipertensivo.',
      iaExtraido: {
        cid10_principal: 'I20',
        cid10_secundarios: ['I10'],
        procedimentos: [
          { tuss: '10101012', descricao: 'Consulta em consultório', quantidade: 1 },
          { tuss: '40304361', descricao: 'Eletrocardiograma com esforço', quantidade: 1 },
          { tuss: '40302558', descricao: 'Troponina I', quantidade: 1 },
        ],
        tipo_consulta: 'retorno',
      },
    },
    {
      tenantId: tid,
      pacienteId: mariaId,
      medicoId: doctorMap['cm'],
      anamnese: 'Retorno para avaliação de exames de rotina.',
      exameFisico: 'PA 120x80mmHg, IMC 24.',
      hipoteseDiagnostica: { cid10: ['Z00.0'], descricao: 'Exame médico geral' },
      conduta: 'Resultados normais. Manter medicação atual. Retorno em 6 meses.',
    },
  ]).returning()
  console.log('  ✓ 2 consultas created')

  // 9. Sample guias TISS
  await db.insert(guiasTiss).values([
    {
      tenantId: tid,
      consultaId: consulta1.id,
      convenioId: convMap['Unimed'],
      numeroGuia: 'TISS-2026-001',
      status: 'pendente_revisao',
      valorFaturado: '2100.00',
      auditoriaIa: { aprovado: false, alertas: ['Autorização prévia necessária para ECG de esforço'], sugestoes: ['Solicitar autorização antes do envio'] },
    },
    {
      tenantId: tid,
      convenioId: convMap['Amil'],
      numeroGuia: 'TISS-2026-002',
      status: 'pendente_envio',
      valorFaturado: '420.00',
      auditoriaIa: { aprovado: true, alertas: [], sugestoes: [] },
    },
    {
      tenantId: tid,
      convenioId: convMap['Bradesco'],
      numeroGuia: 'TISS-2026-003',
      status: 'pendente_envio',
      valorFaturado: '180.00',
      auditoriaIa: { aprovado: true, alertas: [], sugestoes: [] },
    },
    {
      tenantId: tid,
      convenioId: convMap['SulAmérica'],
      numeroGuia: 'TISS-2026-004',
      status: 'pendente_auditoria',
      valorFaturado: '890.00',
      auditoriaIa: { aprovado: false, alertas: ['Autorização ausente para procedimento cirúrgico'], sugestoes: ['Anexar autorização'] },
    },
    {
      tenantId: tid,
      convenioId: convMap['Amil'],
      numeroGuia: 'TISS-2026-005',
      status: 'pendente_envio',
      valorFaturado: '380.00',
      auditoriaIa: { aprovado: true, alertas: [], sugestoes: [] },
    },
  ])
  console.log('  ✓ 5 guias TISS created')

  // 10. Sample learned rules
  await db.insert(convenioRegrasAprendidas).values([
    {
      tenantId: tid,
      convenioId: convMap['Unimed'],
      tussCodigo: '40304361',
      tipoRegra: 'requer_autorizacao',
      descricao: 'Unimed exige autorização prévia para ECG de esforço (40304361)',
      confianca: 0.92,
      confirmacoes: 14,
      rejeicoes: 1,
      confirmadaPorHumano: true,
      origem: 'glosa_xml',
    },
    {
      tenantId: tid,
      convenioId: convMap['Amil'],
      tipoRegra: 'intervalo_minimo',
      descricao: 'Amil requer intervalo mínimo de 7 dias entre retornos do mesmo paciente',
      valorParametro: { dias: 7 },
      confianca: 0.85,
      confirmacoes: 8,
      rejeicoes: 2,
      confirmadaPorHumano: true,
      origem: 'feedback_faturista',
    },
    {
      tenantId: tid,
      convenioId: convMap['SulAmérica'],
      tussCodigo: '30715017',
      tipoRegra: 'documentos_obrigatorios',
      descricao: 'SulAmérica exige laudo detalhado para procedimentos cirúrgicos',
      valorParametro: { documentos: ['laudo_medico', 'autorizacao'] },
      confianca: 0.78,
      confirmacoes: 5,
      rejeicoes: 1,
      confirmadaPorHumano: false,
      origem: 'glosa_xml',
    },
  ])
  console.log('  ✓ 3 learned rules created')

  console.log('\n✅ Seed complete!')
  console.log('\nLogin credentials (all passwords: medflow123):')
  console.log('  admin@medflow.dev (admin)')
  console.log('  carlos@medflow.dev (medico)')
  console.log('  ana@medflow.dev (medico)')
  console.log('  ricardo@medflow.dev (medico)')
  console.log('  larissa@medflow.dev (medico)')
  console.log('  juliana@medflow.dev (faturista)')
  console.log('  priscila@medflow.dev (recepcionista)')

  await client.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
