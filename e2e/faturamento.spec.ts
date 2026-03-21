import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '.auth', 'admin.json') })

test.describe('Faturamento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faturamento')
  })

  test('should render metric cards', async ({ page }) => {
    await expect(page.getByText('Pendentes revisão')).toBeVisible()
    await expect(page.getByText('Prontos para envio')).toBeVisible()
    await expect(page.getByText('Glosados este mês')).toBeVisible()
    await expect(page.getByText('Faturado este mês')).toBeVisible()
  })

  test('should render guias table with headers', async ({ page }) => {
    await expect(page.getByText('Guias em processo')).toBeVisible()

    const table = page.locator('table')
    await expect(table.getByText('Paciente')).toBeVisible()
    await expect(table.getByText('Convênio')).toBeVisible()
    await expect(table.getByText('Nº Guia')).toBeVisible()
    await expect(table.getByText('Valor')).toBeVisible()
    await expect(table.getByText('Status IA')).toBeVisible()
    await expect(table.getByText('Ações')).toBeVisible()
  })

  test('should show alert banner when there are pending guides', async ({ page }) => {
    await expect(page.getByText(/Agente IA detectou/)).toBeVisible()
  })

  test('should display status badges for guides', async ({ page }) => {
    // Seed data has guides with these statuses
    await expect(page.getByText('Revisão IA').first()).toBeVisible()
  })

  test('should open auditoria modal when clicking Revisar', async ({ page }) => {
    // Find and click the first "Revisar" button
    const revisarBtn = page.getByRole('button', { name: 'Revisar' }).first()
    await expect(revisarBtn).toBeVisible()
    await revisarBtn.click()

    // Verify modal opens
    await expect(page.getByText('Pendência detectada pela IA')).toBeVisible()
    await expect(page.getByText('Procedimentos auditados')).toBeVisible()
    await expect(page.getByText('Sugestões do agente')).toBeVisible()
  })

  test('should show procedures table in modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Revisar' }).first().click()

    await expect(page.getByText('Consulta médica')).toBeVisible()
    await expect(page.getByText('Cintilografia óssea')).toBeVisible()
  })

  test('should close modal when clicking Cancelar', async ({ page }) => {
    await page.getByRole('button', { name: 'Revisar' }).first().click()
    await expect(page.getByText('Pendência detectada pela IA')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Pendência detectada pela IA')).not.toBeVisible()
  })

  test('should show Enviar button for ready guides', async ({ page }) => {
    const enviarBtn = page.getByRole('button', { name: 'Enviar' })
    await expect(enviarBtn.first()).toBeVisible()
  })
})
