import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')

const users = [
  { role: 'admin', email: 'admin@clinix.dev' },
  { role: 'medico', email: 'carlos@clinix.dev' },
  { role: 'faturista', email: 'juliana@clinix.dev' },
  { role: 'recepcionista', email: 'priscila@clinix.dev' },
] as const

for (const user of users) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Senha').fill('clinix123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.waitForURL('/')
    await expect(page.getByText('Dashboard')).toBeVisible()

    await page.context().storageState({
      path: path.join(AUTH_DIR, `${user.role}.json`),
    })
  })
}
