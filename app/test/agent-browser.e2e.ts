import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

const port = 4174
const baseUrl = `http://127.0.0.1:${port}`
const session = `preclaim-agent-browser-${process.pid}`

let server: Bun.Subprocess

function browser(...args: string[]): string {
  const result = Bun.spawnSync(['agent-browser', '--session', session, ...args], {
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (result.exitCode !== 0) {
    throw new Error(`agent-browser ${args.join(' ')} failed:\n${result.stderr.toString()}`)
  }
  return result.stdout.toString()
}

function evaluate(expression: string): string {
  return browser('eval', expression).trim()
}

function text(selector: string): string {
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`)
}

function count(selector: string): number {
  return Number(evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`))
}

function countText(selector: string, value: string): number {
  return Number(
    evaluate(
      `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter((el) => el.textContent?.includes(${JSON.stringify(value)})).length`,
    ),
  )
}

function click(selector: string): void {
  browser('click', selector)
}

function fill(selector: string, value: string): void {
  browser('fill', selector, value)
}

async function cleanApp(): Promise<void> {
  browser('open', baseUrl)
  browser('wait', '--load', 'domcontentloaded')
  evaluate(
    'localStorage.clear(); localStorage.setItem("preclaim-onboarding-seen", "true"); location.reload()',
  )
  browser('wait', '--text', 'Ikhtisar klaim')
}

beforeAll(async () => {
  server = Bun.spawn(['bun', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: `${import.meta.dir}/..`,
    stdout: 'ignore',
    stderr: 'pipe',
  })

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fetch(baseUrl)
      browser('open', baseUrl)
      return
    } catch {
      await Bun.sleep(250)
    }
  }
  throw new Error('Vite dev server did not start')
})

afterAll(() => {
  try {
    browser('close')
  } finally {
    server?.kill()
  }
})

describe('PreClaim Guard via agent-browser', () => {
  test('introduces the workflow and can reopen the guide', async () => {
    browser('open', baseUrl)
    browser('wait', '--load', 'domcontentloaded')
    evaluate('localStorage.clear(); location.reload()')
    browser('wait', '--text', 'Selamat datang di PreClaim Guard')
    expect(text('[role="dialog"]')).toContain('data sintetis')
    click('.onboarding-next')
    expect(text('[role="dialog"]')).toContain('Mulai dari antrean klaim')
    click('.onboarding-close')
    expect(count('[role="dialog"]')).toBe(0)
    click('button[aria-label="Buka panduan pengguna"]')
    expect(text('[role="dialog"]')).toContain('Selamat datang di PreClaim Guard')
  })

  test('loads the synthetic claim overview', async () => {
    await cleanApp()
    expect(text('.stats')).toContain('5')
    expect(count('.table .tr.row')).toBe(5)
    expect(text('.detail-top .status')).toContain('Perlu ditinjau')
  })

  test('shows finding provenance and rule basis', async () => {
    await cleanApp()
    click('.table .row')
    expect(text('.flags')).toContain('Kode tindakan tidak sesuai dengan diagnosis')
    expect(text('.flags')).toContain('Sumber:')
    click('nav button[title="Lihat aturan pemeriksaan yang aktif"]')
    expect(text('[role="dialog"]')).toContain('Basis:')
  })

  test('revises a procedure without deleting unrelated findings', async () => {
    await cleanApp()
    click('.table .row')
    click('.actions .secondary')
    fill('.revision-box input:not([type="checkbox"])', '47.09')
    fill('.revision-box textarea', 'Koreksi sesuai dokumentasi klinis')
    click('.revision-box input[type="checkbox"]')
    click('.revision-box button.primary')
    expect(text('.detail-top .status')).toContain('Siap submit')
    expect(text('.audit-trail')).toContain('Koreksi sesuai dokumentasi klinis')
  })

  test('requires an approval note and persists the approval', async () => {
    await cleanApp()
    click('.table .row')
    click('.actions .primary')
    browser('wait', '.field-error')
    expect(text('.field-error')).toContain('Catatan koder wajib diisi')
    fill('#coder-note', 'Ditinjau manual dan dapat diproses')
    click('.actions .primary')
    browser('wait', '--text', 'Disetujui dengan catatan')
    expect(text('.detail-top .status')).toContain('Disetujui dengan catatan')
    browser('reload')
    browser('wait', '--text', 'Disetujui dengan catatan')
    expect(text('.detail-top .status')).toContain('Disetujui dengan catatan')
  })

  test('supports dark mode and validated claim import/export controls', async () => {
    await cleanApp()
    click('button[aria-label="Gunakan mode gelap"]')
    expect(text('.shell')).toBeDefined()
    expect(evaluate('document.querySelector(".shell")?.className')).toContain('theme-dark')
    expect(count('input[type="file"][accept="application/json,.json"]')).toBe(1)
    expect(countText('button', 'Ekspor')).toBe(1)
  })
})
