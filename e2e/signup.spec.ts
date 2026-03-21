import { test, expect } from '@playwright/test'

test.describe('Signup', () => {
  test('should render signup page', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByText('Criar conta')).toBeVisible()
    await expect(page.getByText('14 dias grátis, sem cartão de crédito')).toBeVisible()
  })

  test('should render all form fields', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByLabel('Nome da clínica')).toBeVisible()
    await expect(page.getByLabel('Subdomínio')).toBeVisible()
    await expect(page.getByLabel('Seu nome')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
  })

  test('should auto-generate subdomain from clinic name', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel('Nome da clínica').fill('Clínica São Paulo')

    const subdomainInput = page.getByLabel('Subdomínio')
    await expect(subdomainInput).toHaveValue('clinica-sao-paulo')
  })

  test('should show subdomain suffix', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByText('.clinix.com.br')).toBeVisible()
  })

  test('should have submit button', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByRole('button', { name: 'Começar teste grátis' })).toBeVisible()
  })

  test('should have link to login page', async ({ page }) => {
    await page.goto('/signup')

    const loginLink = page.getByRole('link', { name: 'Entrar' })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', '/login')
  })
})
