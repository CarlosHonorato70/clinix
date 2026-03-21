import type { Page, Locator } from '@playwright/test'

export function getMetricCard(page: Page, label: string): Locator {
  return page.locator('div').filter({ hasText: label }).first()
}

export function getTableRow(page: Page, text: string): Locator {
  return page.locator('tr').filter({ hasText: text })
}

export function getNavItem(page: Page, label: string): Locator {
  return page.getByRole('link', { name: label })
}

export function getSidebarSection(page: Page, title: string): Locator {
  return page.locator('nav').filter({ hasText: title })
}
