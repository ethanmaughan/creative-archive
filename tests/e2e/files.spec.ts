import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const docxB64 = readFileSync(join(FIXTURES, 'sample.docx')).toString('base64')
const pdfB64 = readFileSync(join(FIXTURES, 'sample.pdf')).toString('base64')

// Seeds a mix of an authored document plus foreign uploads (text, Word, PDF) into the OPFS
// stand-in archive, then drives the file browser and search over them.
test('browses uploaded files and searches inside text, Word, and PDF', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.evaluate(
    async ({ docx, pdf }) => {
      const root = await navigator.storage.getDirectory()
      for (const dir of ['research', 'uploads', 'notebook', 'story-bible', 'library', 'projects']) {
        await root.removeEntry(dir, { recursive: true }).catch(() => undefined)
      }
      const writeText = async (path: string, text: string): Promise<void> => {
        const parts = path.split('/')
        const name = parts.pop() as string
        let dir = root
        for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true })
        const fh = await dir.getFileHandle(name, { create: true })
        const w = await fh.createWritable()
        await w.write(text)
        await w.close()
      }
      const writeBytes = async (path: string, b64: string): Promise<void> => {
        const parts = path.split('/')
        const name = parts.pop() as string
        let dir = root
        for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true })
        const fh = await dir.getFileHandle(name, { create: true })
        const w = await fh.createWritable()
        const bin = atob(b64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        await w.write(bytes)
        await w.close()
      }
      await writeText('research/note.md', '---\ntitle: Field Note\n---\nAn authored note.\n')
      await writeText('uploads/outline.txt', 'The wyvern guards the northern pass.\n')
      await writeBytes('uploads/sample.docx', docx)
      await writeBytes('uploads/sample.pdf', pdf)
    },
    { docx: docxB64, pdf: pdfB64 },
  )

  await page.getByRole('button', { name: /open archive folder/i }).click()
  await expect(page.locator('.sidebar__foot')).toContainText('docs', { timeout: 90_000 })

  // File browser shows the uploads (plus the authored doc), grouped in folders.
  await page.getByRole('link', { name: 'Files', exact: true }).click()
  await expect(page.getByText('outline.txt')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('sample.docx')).toBeVisible()
  await expect(page.getByText('sample.pdf')).toBeVisible()

  // Opening a text upload shows its contents read-only.
  await page.getByText('outline.txt').click()
  await expect(page.locator('.source-text')).toContainText('wyvern guards the northern pass')
  await expect(page.getByText(/Read-only/)).toBeVisible()

  // Search reaches into plain text, Word, and PDF uploads.
  await page.getByRole('link', { name: 'Search', exact: true }).click()
  const box = page.getByRole('textbox', { name: 'Search' })

  await box.fill('wyvern')
  await expect(page.locator('.result').filter({ hasText: 'outline.txt' })).toBeVisible({
    timeout: 15_000,
  })

  await box.fill('gryphon') // from the .docx (proves mammoth extraction)
  await expect(page.locator('.result').filter({ hasText: 'sample.docx' })).toBeVisible({
    timeout: 15_000,
  })

  await box.fill('basilisk') // from the .pdf (proves pdf.js extraction)
  await expect(page.locator('.result').filter({ hasText: 'sample.pdf' })).toBeVisible({
    timeout: 15_000,
  })
})
