import { expect, type Page } from '@playwright/test'
export async function addFromDetail(page: Page) {
  await expect(
    page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }),
  ).toBeVisible()
  const add = page.getByRole('button', {
    name: 'Adicionar ao carrinho',
    exact: true,
  })
  if (await add.isVisible()) {
    await add.click()
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'NFT adicionado ao carrinho.' }),
    ).toBeVisible()
  } else {
    const detail = page.url()
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/cart')
    await expect(page.getByTestId('cart-item')).not.toHaveCount(0)
    await page.goBack()
    await expect(page).toHaveURL(detail)
    await expect(
      page.getByRole('button', { name: 'COMPRAR', exact: true }),
    ).toBeVisible()
  }
}
export async function connectAndReview(page: Page) {
  const provider = page.getByRole('button', {
    name: 'Coinbase Wallet',
    exact: true,
  })
  await expect(provider).toBeEnabled()
  if ((await provider.getAttribute('aria-pressed')) !== 'true')
    await provider.click()
  await expect(provider).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.checkout-pay').click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeEnabled()
}
