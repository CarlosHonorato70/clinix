import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '.auth', 'admin.json') })

test.describe('Agenda', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agenda')
  })

  test('should render in visao geral mode by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Visão geral' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Por médico' })).toBeVisible()

    // Grid table should have Hora column
    await expect(page.getByText('Hora').first()).toBeVisible()
  })

  test('should have date navigation buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: '←' })).toBeVisible()
    await expect(page.getByRole('button', { name: '→' })).toBeVisible()
  })

  test('should have agendar button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Agendar/ })).toBeVisible()
  })

  test('should switch to por medico view', async ({ page }) => {
    await page.getByRole('button', { name: 'Por médico' }).click()

    // Should show doctor card with specialty and CRM
    await expect(page.getByText('Agenda do dia')).toBeVisible()
    await expect(page.getByText('Pacientes')).toBeVisible()
  })

  test('should show doctor selection buttons in por medico view', async ({ page }) => {
    await page.getByRole('button', { name: 'Por médico' }).click()

    // Doctor names should appear as selection buttons (without Dr./Dra. prefix)
    await expect(page.getByRole('button', { name: /Carlos Mendes/ })).toBeVisible()
  })

  test('should show time slots in visao geral', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByText('08:00')).toBeVisible()
    await expect(page.getByText('14:00')).toBeVisible()
  })

  test('should display current date', async ({ page }) => {
    const today = new Date()
    const month = today.toLocaleDateString('pt-BR', { month: 'long' })
    await expect(page.getByText(new RegExp(month))).toBeVisible()
  })
})
