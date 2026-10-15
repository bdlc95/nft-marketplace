import { test, expect, type Page } from '@playwright/test'
import { addFromDetail, connectAndReview } from './helpers'

async function settled(page: Page) {
  await expect(page.getByTestId('socket-status')).toHaveText(
    'Tempo real: conectado',
  )
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page
    .locator('img:visible')
    .evaluateAll((images) =>
      Promise.all(
        images.map((img) =>
          img instanceof HTMLImageElement ? img.decode() : Promise.resolve(),
        ),
      ),
    )
  await page.evaluate(() => window.scrollTo(0, 0))
}
async function cart(page: Page) {
  await page.goto('/nfts/nft-01')
  await addFromDetail(page)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
}

test('catálogo — referência de regressão', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await settled(page)
  await expect(page).toHaveScreenshot('catalog.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('detalhe — referência de regressão', async ({ page }) => {
  await page.goto('/nfts/nft-01')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
  await expect(
    page.locator('.related-grid').getByTestId('nft-card'),
  ).toHaveCount(5)
  await settled(page)
  await expect(page).toHaveScreenshot('detail.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('carrinho — referência de regressão', async ({ page }) => {
  await cart(page)
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('1.087 ETH')
  await settled(page)
  await expect(page).toHaveScreenshot('cart.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('pagamento — referência de regressão', async ({ page }) => {
  await cart(page)
  await page.goto('/login?redirect=%2Fcheckout')
  await page.getByLabel('E-mail', { exact: true }).fill('bruno@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/checkout')
  await connectAndReview(page)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Fechar', exact: true })
    .click()
  await settled(page)
  await expect(page).toHaveScreenshot('payment.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
