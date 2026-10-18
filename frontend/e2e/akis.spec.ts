import { expect, test, type Page } from '@playwright/test'

const KULLANICI = process.env.FISLIK_KULLANICI ?? ''
const SIFRE = process.env.FISLIK_SIFRE ?? ''

test.skip(!KULLANICI || !SIFRE, 'FISLIK_KULLANICI ve FISLIK_SIFRE tanımlı değil')

async function girisYap(sayfa: Page) {
  await sayfa.goto('/giris')
  await sayfa.getByLabel('Kullanıcı adı').fill(KULLANICI)
  await sayfa.getByLabel('Şifre').fill(SIFRE)
  await sayfa.getByRole('button', { name: 'Masayı aç' }).click()
  await expect(sayfa.getByText('Giriş onaylandı')).toBeVisible()
  await expect(sayfa).toHaveURL('/')
}

test('yanlış şifre reddedilir', async ({ page }) => {
  await page.goto('/giris')
  await page.getByLabel('Kullanıcı adı').fill(KULLANICI)
  await page.getByLabel('Şifre').fill('kesinlikle-yanlis')
  await page.getByRole('button', { name: 'Masayı aç' }).click()
  await expect(page.getByText('Reddedildi')).toBeVisible()
  await expect(page).toHaveURL(/\/giris/)
})

test('oturumsuz ziyaret giriş fişine yönlenir', async ({ page }) => {
  await page.goto('/katalog')
  await expect(page).toHaveURL(/\/giris/)
})

test('odadan dört ekrana gidilir ve veriler yüklenir', async ({ page }) => {
  const hatalar: string[] = []
  page.on('pageerror', (e) => hatalar.push(e.message))
  await girisYap(page)
  await expect(page.getByRole('button', { name: /ekranını aç/ })).toHaveCount(4)

  await page.getByRole('button', { name: /02\s*Katalog/ }).click()
  await expect(page).toHaveURL(/\/katalog/)
  await expect(page.getByText('Çekmece 02 — Katalog')).toBeVisible()

  const menu = page.getByRole('navigation', { name: 'Ana menü' })
  await menu.getByRole('link', { name: /01\s*Panel/ }).click()
  await expect(page.getByText('Çekmece 01 — Panel')).toBeVisible()

  await menu.getByRole('link', { name: /03\s*Ödünç ver/ }).click()
  await expect(page.getByText('Çekmece 03 — Ödünç ver')).toBeVisible()

  await menu.getByRole('link', { name: /04\s*Üyeler/ }).click()
  await expect(page.getByText('Çekmece 04 — Üyeler')).toBeVisible()

  await page.getByRole('button', { name: 'Lambayı yak, geceye geç' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'gece')

  expect(hatalar).toEqual([])
})
