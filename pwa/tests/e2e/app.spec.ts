import { test, expect, Page } from '@playwright/test'

// ── Helpers ────────────────────────────────────────────────────────────────

async function openApp(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Open App/i }).first().click()
  await expect(page.getByText('Notes').first()).toBeVisible({ timeout: 5000 })
}

async function navigateTo(page: Page, label: string) {
  // Sidebar button text includes emoji prefix; use partial text match
  await page.locator(`button:has-text("${label}")`).first().click()
  await page.waitForLoadState('domcontentloaded')
}

// ── Landing page ────────────────────────────────────────────────────────────

test('landing page renders and has Open App button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Open App/i }).first()).toBeVisible()
  await expect(page.getByText('Privacy-first')).toBeVisible()
})

test('landing page shows all 8 feature cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Encrypted Vault').first()).toBeVisible()
  await expect(page.getByText('Private Notes').first()).toBeVisible()
  await expect(page.getByText('Todo Lists').first()).toBeVisible()
  await expect(page.getByText('Subscriptions', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Map Pins').first()).toBeVisible()
  await expect(page.getByText('Password Generator').first()).toBeVisible()
  await expect(page.getByText('Reports').first()).toBeVisible()
  await expect(page.getByText('Drive Sync').first()).toBeVisible()
})

test('Get Started button opens app', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Get Started/i }).click()
  await expect(page.getByText('Notes').first()).toBeVisible({ timeout: 5000 })
})

// ── Navigation ──────────────────────────────────────────────────────────────

test('can navigate to all 9 tabs', async ({ page }) => {
  await openApp(page)
  const tabs = ['Notes', 'Vault', 'Todo', 'Subs', 'Maps', 'Generator', 'Reports', 'Sync', 'Settings']
  for (const tab of tabs) {
    await navigateTo(page, tab)
    await expect(page.locator('main').first()).toBeVisible()
  }
})

// ── Notes ───────────────────────────────────────────────────────────────────

test.describe('Notes', () => {
  test('shows Notes heading and + New button', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Notes')
    await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible()
    await expect(page.getByRole('button', { name: '+ New' })).toBeVisible()
  })

  test('can create a new note', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Notes')

    await page.getByRole('button', { name: '+ New' }).click()
    // Wait for the note editor to appear
    const titleInput = page.locator('input[placeholder="Title"]')
    await titleInput.waitFor({ state: 'visible', timeout: 10000 })
    await titleInput.fill('My Test Note')
    await page.locator('textarea').first().fill('Hello **world**')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.locator('button', { hasText: '←' }).click()
    await expect(page.getByText('My Test Note')).toBeVisible()
  })

  test('search notes filters results', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Notes')

    // Create two notes
    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Title"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('input[placeholder="Title"]').fill('Unique Alpha Note')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.locator('button', { hasText: '←' }).click()

    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Title"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('input[placeholder="Title"]').fill('Beta Note')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.locator('button', { hasText: '←' }).click()

    // Search
    await page.locator('input[placeholder="Search notes…"]').fill('Alpha')
    await expect(page.getByText('Unique Alpha Note')).toBeVisible()
    await expect(page.getByText('Beta Note')).not.toBeVisible()
  })

  test('preview toggle renders markdown', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Notes')

    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Title"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('input[placeholder="Title"]').fill('MD Note')
    await page.locator('textarea').first().fill('**bold text**')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.locator('strong')).toBeVisible()
  })
})

// ── Vault ────────────────────────────────────────────────────────────────────

test.describe('Vault', () => {
  test('shows lock screen with password input', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Vault')
    await expect(page.locator('input[placeholder="Master password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Unlock' })).toBeVisible()
  })

  test('can unlock vault with a new password', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Vault')
    await page.locator('input[placeholder="Master password"]').fill('mysecretpassword')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await expect(page.getByRole('button', { name: '+ New' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Lock' })).toBeVisible()
  })

  test('can add a new secret', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Vault')
    await page.locator('input[placeholder="Master password"]').fill('mysecretpassword')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await page.getByRole('button', { name: '+ New' }).waitFor({ state: 'visible', timeout: 10000 })
    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Label (e.g. GitHub)"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Label (e.g. GitHub)"]').fill('GitHub PAT')
    await page.locator('input[placeholder="Secret value"]').fill('ghp_abc123')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.locator('button', { hasText: '←' }).click()
    await expect(page.getByText('GitHub PAT')).toBeVisible()
  })

  test('lock button re-locks the vault', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Vault')
    await page.locator('input[placeholder="Master password"]').fill('mysecretpassword')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await page.getByRole('button', { name: 'Lock' }).click({ timeout: 5000 })
    await expect(page.locator('input[placeholder="Master password"]')).toBeVisible()
  })
})

// ── Todo ─────────────────────────────────────────────────────────────────────

test.describe('Todo', () => {
  test('shows todo screen with + List button', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Todo')
    await expect(page.getByRole('button', { name: '+ List' })).toBeVisible()
  })

  test('can create a todo list', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Todo')
    await page.getByRole('button', { name: '+ List' }).click()
    await page.locator('input[placeholder="List name"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="List name"]').fill('Shopping')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Shopping')).toBeVisible()
  })

  test('can open a list and add tasks', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Todo')
    await page.getByRole('button', { name: '+ List' }).click()
    await page.locator('input[placeholder="List name"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="List name"]').fill('Work')
    await page.getByRole('button', { name: 'Create' }).click()
    await page.getByText('Work').click()

    await page.locator('input[placeholder="Add task…"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Add task…"]').fill('Write unit tests')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Write unit tests')).toBeVisible()
  })

  test('can toggle task done', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Todo')
    await page.getByRole('button', { name: '+ List' }).click()
    await page.locator('input[placeholder="List name"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="List name"]').fill('Toggle Test')
    await page.getByRole('button', { name: 'Create' }).click()
    await page.getByText('Toggle Test').click()

    await page.locator('input[placeholder="Add task…"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Add task…"]').fill('Complete me')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Complete me')).toBeVisible()

    await page.locator('button.rounded-full.border-2').first().click()
    await expect(page.getByText('Completed')).toBeVisible({ timeout: 3000 })
  })
})

// ── Subscriptions ────────────────────────────────────────────────────────────

test.describe('Subscriptions', () => {
  test('shows subscriptions screen with + New button', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Subs')
    await expect(page.getByRole('button', { name: '+ New' })).toBeVisible()
  })

  test('can add a subscription', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Subs')
    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Name (e.g. Netflix)"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Name (e.g. Netflix)"]').fill('Netflix')
    await page.locator('input[placeholder="Amount"]').fill('15.99')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.locator('button', { hasText: '←' }).click()
    await expect(page.getByText('Netflix')).toBeVisible()
  })

  test('can delete a subscription', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Subs')
    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Name (e.g. Netflix)"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Name (e.g. Netflix)"]').fill('DeleteMe')
    await page.locator('input[placeholder="Amount"]').fill('9.99')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.locator('button', { hasText: '←' }).click()
    await page.getByText('DeleteMe').click()
    await page.getByText('Delete subscription').click()
    await expect(page.getByText('DeleteMe')).not.toBeVisible({ timeout: 3000 })
  })
})

// ── Maps ─────────────────────────────────────────────────────────────────────

test.describe('Maps', () => {
  test('shows map screen with + Stack button', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Maps')
    await expect(page.getByRole('button', { name: '+ Stack' })).toBeVisible()
  })

  test('can create a map stack', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Maps')
    await page.getByRole('button', { name: '+ Stack' }).click()
    await page.locator('input[placeholder="Stack name"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Stack name"]').fill('Tokyo')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Tokyo')).toBeVisible()
  })

  test('can open a stack and add a pin', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Maps')
    await page.getByRole('button', { name: '+ Stack' }).click()
    await page.locator('input[placeholder="Stack name"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Stack name"]').fill('Japan')
    await page.getByRole('button', { name: 'Create' }).click()
    await page.getByText('Japan').click()
    await page.getByRole('button', { name: '+ Pin' }).click()

    await page.locator('input[placeholder="Label"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input[placeholder="Label"]').fill('Shibuya')
    await page.locator('input[placeholder="Latitude"]').fill('35.6595')
    await page.locator('input[placeholder="Longitude"]').fill('139.7004')
    await page.getByRole('button', { name: 'Save' }).click()
    // After save, editingPin=null and pin list reloads; "Shibuya" appears in the stack's pin list
    await expect(page.getByText('Shibuya')).toBeVisible({ timeout: 10000 })
  })
})

// ── Generator ────────────────────────────────────────────────────────────────

test.describe('Generator', () => {
  test('shows Generate button', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Generator')
    await expect(page.getByRole('button', { name: /Generate/i })).toBeVisible()
  })

  test('generates a password and shows Copy button', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Generator')
    await page.getByRole('button', { name: /Generate/i }).click()
    await expect(page.getByRole('button', { name: /Copy/i })).toBeVisible()
  })

  test('copy button copies password to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openApp(page)
    await navigateTo(page, 'Generator')
    await page.getByRole('button', { name: /Generate/i }).click()
    await page.getByRole('button', { name: /Copy/i }).click()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard.length).toBeGreaterThan(0)
  })

  test('generated password only contains alphanumeric and symbols by default', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openApp(page)
    await navigateTo(page, 'Generator')
    await page.getByRole('button', { name: /Generate/i }).click()
    await page.getByRole('button', { name: /Copy/i }).click()
    const pw = await page.evaluate(() => navigator.clipboard.readText())
    expect(pw).toMatch(/^[\x21-\x7e]+$/) // printable ASCII
  })
})

// ── Reports ───────────────────────────────────────────────────────────────────

test.describe('Reports', () => {
  test('shows reports screen', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Reports')
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('shows canvas chart element', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Reports')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 })
  })

  test('shows currency selector', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Reports')
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('currency dropdown has USD option', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Reports')
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    const options = await select.locator('option').allTextContents()
    expect(options.some(o => o.includes('USD'))).toBe(true)
  })
})

// ── Sync ──────────────────────────────────────────────────────────────────────

test.describe('Sync', () => {
  test('shows sync screen', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Sync')
    // Sync page shows some text about Google Drive or sync
    const text = await page.textContent('main')
    expect(text?.toLowerCase()).toMatch(/drive|sync|google|cloud/i)
  })
})

// ── Settings ─────────────────────────────────────────────────────────────────

test.describe('Settings', () => {
  test('shows Export and Import sections', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await expect(page.getByRole('button', { name: /Export all data/i })).toBeVisible()
    await expect(page.getByText(/Import from JSON/i)).toBeVisible()
  })

  test('shows About section with version', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await expect(page.getByText(/My SPACE v/i)).toBeVisible()
  })

  test('logout returns to landing page', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await page.getByRole('button', { name: /Lock vault/i }).click()
    await expect(page.getByRole('button', { name: /Open App/i }).first()).toBeVisible({ timeout: 3000 })
  })

  test('export all data triggers download or shows Export complete', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')

    // Start listening for download before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
    await page.getByRole('button', { name: /Export all data/i }).click()
    const download = await downloadPromise

    if (download) {
      expect(download.suggestedFilename()).toMatch(/my-space-export.*\.json/)
    } else {
      await expect(page.getByText('Export complete')).toBeVisible({ timeout: 5000 })
    }
  })
})

// ── Export → Import data round-trip ──────────────────────────────────────────

test.describe('Data copy: export → import', () => {
  test('exported JSON has all required table keys', async ({ page }) => {
    await openApp(page)

    // Create a note first
    await navigateTo(page, 'Notes')
    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input[placeholder="Title"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('input[placeholder="Title"]').fill('Export Test Note')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.locator('button', { hasText: '←' }).click()

    await navigateTo(page, 'Settings')

    const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null)
    await page.getByRole('button', { name: /Export all data/i }).click()
    const download = await downloadPromise

    if (download) {
      const path = await download.path()
      if (path) {
        const { readFileSync } = await import('fs')
        const json = JSON.parse(readFileSync(path, 'utf-8'))
        const requiredKeys = ['notes', 'secrets', 'subscriptions', 'todo_lists', 'todo_tasks', 'map_stacks', 'map_pins', 'bills', 'exported_at']
        for (const key of requiredKeys) {
          expect(json).toHaveProperty(key)
        }
        expect(Array.isArray(json.notes)).toBe(true)
        expect(json.notes.length).toBeGreaterThanOrEqual(1)
      }
    } else {
      // Export happened but no download event — verify the success message
      await expect(page.getByText('Export complete')).toBeVisible({ timeout: 5000 })
    }
  })
})
