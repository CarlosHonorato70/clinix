import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '.auth', 'medico.json') })

test.describe('Prontuários', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prontuarios')
  })

  test('should render patient header card', async ({ page }) => {
    await expect(page.getByText('João Carlos Ferreira')).toBeVisible()
    await expect(page.getByText(/62 anos · masculino · Unimed/)).toBeVisible()
  })

  test('should render clinical form fields', async ({ page }) => {
    await expect(page.getByText('Anamnese / Queixa principal')).toBeVisible()
    await expect(page.getByText('Exame físico')).toBeVisible()
    await expect(page.getByText('Conduta / Prescrição')).toBeVisible()
  })

  test('should have pre-filled clinical text', async ({ page }) => {
    const textareas = page.locator('textarea')
    await expect(textareas.first()).not.toBeEmpty()
  })

  test('should have extract TUSS button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Extrair TUSS com IA/ })).toBeVisible()
  })

  test('should have save draft button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeVisible()
  })

  test('should show extraction results after clicking extract', async ({ page }) => {
    await page.getByRole('button', { name: /Extrair TUSS com IA/ }).click()

    // Should show loading state
    await expect(page.getByText('Analisando...').or(page.getByText('Extração IA'))).toBeVisible()

    // Wait for extraction to complete (simulated or real)
    await expect(page.getByText('CID-10')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('I20')).toBeVisible()
    await expect(page.getByText('I10')).toBeVisible()

    // TUSS procedures
    await expect(page.getByText('Procedimentos TUSS')).toBeVisible()
    await expect(page.getByText('10101012')).toBeVisible()
  })

  test('should show link to faturamento after extraction', async ({ page }) => {
    await page.getByRole('button', { name: /Extrair TUSS com IA/ }).click()

    await expect(page.getByText('CID-10')).toBeVisible({ timeout: 15000 })

    const link = page.getByRole('link', { name: /Enviar para faturamento/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/faturamento')
  })

  test('should render consultation history', async ({ page }) => {
    await expect(page.getByText('Histórico de consultas')).toBeVisible()
  })

  test('should show patient info chips', async ({ page }) => {
    await expect(page.getByText('Última consulta')).toBeVisible()
    await expect(page.getByText('Total consultas')).toBeVisible()
    await expect(page.getByText('Alergias')).toBeVisible()
    await expect(page.getByText('Dipirona')).toBeVisible()
  })
})
