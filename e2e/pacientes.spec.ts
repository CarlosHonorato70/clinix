import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '.auth', 'admin.json') })

test.describe('Pacientes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pacientes')
  })

  test('should render patient list page', async ({ page }) => {
    await expect(page.getByText('Base de pacientes')).toBeVisible()
    await expect(page.getByRole('button', { name: /Novo paciente/ })).toBeVisible()
  })

  test('should render patient table headers', async ({ page }) => {
    const table = page.locator('table')
    await expect(table.getByText('Paciente')).toBeVisible()
    await expect(table.getByText('CPF')).toBeVisible()
    await expect(table.getByText('Convênio')).toBeVisible()
    await expect(table.getByText('Telefone')).toBeVisible()
  })

  test('should show patients from seed data', async ({ page }) => {
    // Wait for data to load (no more skeleton)
    await expect(page.getByText(/pacientes/)).toBeVisible()

    // Check for known seed patients
    await expect(page.getByText('João Carlos Ferreira')).toBeVisible()
    await expect(page.getByText('Maria Aparecida Silva')).toBeVisible()
  })

  test('should filter patients by search', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome...')
    await searchInput.fill('João')

    // Wait for debounce (300ms) and API response
    await expect(page.getByText('João Carlos Ferreira')).toBeVisible()

    // Verify other patients are filtered out
    await expect(page.getByText('Maria Aparecida Silva')).not.toBeVisible()
  })

  test('should show empty state for no results', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome...')
    await searchInput.fill('xyznonexistent')

    await expect(page.getByText(/Nenhum paciente encontrado/)).toBeVisible()
  })

  test('should have link to prontuarios for each patient', async ({ page }) => {
    await expect(page.getByText('João Carlos Ferreira')).toBeVisible()

    const links = page.getByRole('link', { name: 'Abrir →' })
    await expect(links.first()).toBeVisible()
    await expect(links.first()).toHaveAttribute('href', '/prontuarios')
  })

  test('should show patient count', async ({ page }) => {
    await expect(page.getByText(/\d+ pacientes cadastrados/)).toBeVisible()
  })
})
