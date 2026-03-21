import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '.auth', 'admin.json') })

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should render all metric cards', async ({ page }) => {
    await expect(page.getByText('Atendimentos hoje')).toBeVisible()
    await expect(page.getByText('Faturado no mês')).toBeVisible()
    await expect(page.getByText('Guias pendentes')).toBeVisible()
    await expect(page.getByText('Prontas para envio')).toBeVisible()
  })

  test('should render agenda table with headers', async ({ page }) => {
    await expect(page.getByText('Agenda — hoje')).toBeVisible()

    const agendaTable = page.locator('table').first()
    await expect(agendaTable.getByText('Hora')).toBeVisible()
    await expect(agendaTable.getByText('Paciente')).toBeVisible()
    await expect(agendaTable.getByText('Médico')).toBeVisible()
  })

  test('should render guias em auditoria section', async ({ page }) => {
    await expect(page.getByText('Guias em auditoria')).toBeVisible()
  })

  test('should render insights section', async ({ page }) => {
    await expect(page.getByText('Insights do agente')).toBeVisible()
    await expect(page.getByText('NOVA REGRA APRENDIDA')).toBeVisible()
    await expect(page.getByText('GLOSA EVITADA')).toBeVisible()
    await expect(page.getByText('PADRÃO DETECTADO')).toBeVisible()
  })

  test('should have navigation links to agenda and faturamento', async ({ page }) => {
    const verAgenda = page.getByRole('link', { name: 'Ver agenda →' })
    await expect(verAgenda).toBeVisible()
    await expect(verAgenda).toHaveAttribute('href', '/agenda')

    const verTodas = page.getByRole('link', { name: 'Ver todas →' })
    await expect(verTodas).toBeVisible()
    await expect(verTodas).toHaveAttribute('href', '/faturamento')
  })
})
