import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '.auth', 'admin.json') })

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should render all sidebar nav items', async ({ page }) => {
    const sidebar = page.locator('aside')

    await expect(sidebar.getByText('Dashboard')).toBeVisible()
    await expect(sidebar.getByText('Agenda')).toBeVisible()
    await expect(sidebar.getByText('Pacientes')).toBeVisible()
    await expect(sidebar.getByText('Prontuários')).toBeVisible()
    await expect(sidebar.getByText('Faturamento TISS')).toBeVisible()
    await expect(sidebar.getByText('Financeiro')).toBeVisible()
    await expect(sidebar.getByText('Agente IA')).toBeVisible()
    await expect(sidebar.getByText('Relatórios')).toBeVisible()
    await expect(sidebar.getByText('Configurações')).toBeVisible()
  })

  test('should render sidebar section titles', async ({ page }) => {
    const sidebar = page.locator('aside')

    await expect(sidebar.getByText('Principal')).toBeVisible()
    await expect(sidebar.getByText('Financeiro')).toBeVisible()
    await expect(sidebar.getByText('Inteligência')).toBeVisible()
    await expect(sidebar.getByText('Sistema')).toBeVisible()
  })

  test('should navigate to agenda page', async ({ page }) => {
    await page.locator('aside').getByText('Agenda').click()
    await page.waitForURL('/agenda')

    await expect(page.locator('header').getByText('Agenda')).toBeVisible()
  })

  test('should navigate to pacientes page', async ({ page }) => {
    await page.locator('aside').getByText('Pacientes').click()
    await page.waitForURL('/pacientes')

    await expect(page.getByText('Base de pacientes')).toBeVisible()
  })

  test('should navigate to faturamento page', async ({ page }) => {
    await page.locator('aside').getByText('Faturamento TISS').click()
    await page.waitForURL('/faturamento')

    await expect(page.getByText('Guias em processo')).toBeVisible()
  })

  test('should show user info in sidebar footer', async ({ page }) => {
    const sidebar = page.locator('aside')

    await expect(sidebar.getByText('Admin Clinix')).toBeVisible()
    await expect(sidebar.getByText('Administrador')).toBeVisible()
  })

  test('should show agent status in sidebar', async ({ page }) => {
    await expect(page.getByText(/Agente ativo/)).toBeVisible()
  })

  test('should render header with action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Nova consulta/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Faturar com IA/ })).toBeVisible()
  })

  test('should show Clinix brand in sidebar', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar.getByText('Clinix')).toBeVisible()
    await expect(sidebar.getByText('v2.0 · IA integrada')).toBeVisible()
  })
})
