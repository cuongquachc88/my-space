// @ts-nocheck
import { test, expect } from '@playwright/test'

test('debug note creation', async ({ page }) => {
  const logs: string[] = []
  page.on('console', msg => { logs.push(`[${msg.type()}] ${msg.text()}`) })

  await page.goto('/')
  await page.getByRole('button', { name: /Open App/i }).first().click()
  await page.locator('button:has-text("Notes")').first().click()
  await page.waitForLoadState('domcontentloaded')

  // Wait for Notes view to fully render (Notes header visible)
  await page.waitForSelector('text=No notes yet', { timeout: 30000 })
  console.log('Notes loaded - "No notes yet" visible')

  // Click + New
  await page.locator('button:has-text("+ New")').first().click()
  console.log('Clicked + New')

  // Wait up to 30s for editor input
  try {
    await page.waitForSelector('input[placeholder="Title"]', { timeout: 30000 })
    console.log('SUCCESS: Editor appeared!')
  } catch (e) {
    console.log('FAILED: Title input never appeared')
    const body = await page.textContent('body')
    console.log('Body:', body?.substring(0, 500))
  }

  console.log('All logs:', JSON.stringify(logs.slice(0, 20)))
})
