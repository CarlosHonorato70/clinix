import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('admin@medflow.dev')
    await page.getByLabel('Senha').fill('medflow123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.waitForURL('/')
    await expect(page.getByText('Dashboard')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('admin@medflow.dev')
    await page.getByLabel('Senha').fill('wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Credenciais inválidas')).toBeVisible()
  })

  test('should show loading state while submitting', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('admin@medflow.dev')
    await page.getByLabel('Senha').fill('medflow123')

    // Intercept to delay response
    await page.route('**/api/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 500))
      await route.continue()
    })

    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('button', { name: 'Entrando...' })).toBeVisible()
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/agenda')

    await page.waitForURL(/\/login\?redirect/)
    expect(page.url()).toContain('redirect=%2Fagenda')
  })

  test('should render login page elements correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('MedFlow')).toBeVisible()
    await expect(page.getByText('Gestão Clínica Inteligente')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
})
