import { test, expect, type Page } from '@playwright/test'
import { addFromDetail, connectAndReview } from './helpers'
async function login(
  page: Page,
  email = 'bruno@example.test',
  redirect = '/profile',
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(redirect.replace('/', '\\/')))
}
async function add(page: Page, quantity = 1) {
  await page.goto('/nfts/nft-01')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
  for (let i = 1; i < quantity; i++)
    await page
      .getByRole('button', { name: 'Aumentar quantidade', exact: true })
      .click()
  await addFromDetail(page)
}
async function lab(page: Page, command?: string, scenario?: string) {
  await page.getByRole('button', { name: 'Cenários de teste' }).click()
  if (scenario) await page.getByLabel('Condição da rede').selectOption(scenario)
  if (command)
    await page.getByRole('button', { name: command, exact: true }).click()
  if (command === 'Expirar sessão') {
    await expect(page).toHaveURL(/\/login/)
    return
  }
  if (
    command === 'Confirmar pedido pendente' ||
    command === 'Recusar pedido pendente'
  ) {
    await expect(
      page.getByRole('heading', {
        name:
          command === 'Confirmar pedido pendente'
            ? 'Seus NFTs agora estão na sua carteira'
            : 'Pagamento recusado',
        exact: true,
      }),
    ).toBeVisible()
    return
  }
  await expect(
    page.getByRole('status').filter({ hasText: 'Cenário aplicado.' }),
  ).toBeVisible()
  const dialog = page.getByRole('dialog', {
    name: 'Laboratório de cenários',
    exact: true,
  })
  if (await dialog.isVisible()) await dialog.press('Escape')
}
async function readyCheckout(page: Page) {
  await page.goto('/checkout')
  await connectAndReview(page)
}
test('visitante mantém carrinho no refresh e no login; cupom, quantidade e remoção', async ({
  page,
}) => {
  await add(page, 2)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(page.getByTestId('cart-total')).toHaveText('2.396 ETH')
  await page.reload()
  await expect(
    page.getByLabel('Quantidade de Emerald Ape #042', { exact: true }),
  ).toHaveValue('2')
  await page.getByLabel('Código promocional').fill('ERRADO')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Cupom inválido')
  await page.getByLabel('Código promocional').fill('EXPIRADO')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('expirou')
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('2.158 ETH')
  await login(page, 'bruno@example.test', '/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await expect(
    page.getByLabel('Quantidade de Emerald Ape #042', { exact: true }),
  ).toHaveValue('2')
  await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
  await page
    .getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' })
    .click()
  await expect(page.getByTestId('cart-total')).toHaveText('1.206 ETH')
  await page
    .getByRole('button', { name: 'Remover Emerald Ape #042', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
  ).toBeVisible()
})

test('layout mobile do carrinho mantém imagem e controles alinhados sem overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await add(page)
  await page.goto('/cart')
  const item = page.getByTestId('cart-item')
  const itemBox = await item.boundingBox()
  const imageBox = await item.locator('.cart-product img').boundingBox()
  const quantityBox = await item.locator('.cart-quantity').boundingBox()
  expect(itemBox).not.toBeNull()
  expect(imageBox).not.toBeNull()
  expect(quantityBox).not.toBeNull()
  expect(imageBox!.x).toBeGreaterThanOrEqual(itemBox!.x)
  expect(imageBox!.y).toBeGreaterThanOrEqual(itemBox!.y)
  expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(
    itemBox!.y + itemBox!.height,
  )
  expect(quantityBox!.y).toBeGreaterThanOrEqual(itemBox!.y + imageBox!.height)
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.viewport)
})

test('galeria mobile do detalhe segue o frame sem indicadores de carrossel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 414, height: 896 })
  await page.goto('/nfts/nft-01')
  const frame = page.locator('.gallery-picture picture')
  const image = page.locator('.gallery-picture picture > img')
  const frameBox = await frame.boundingBox()
  const imageBox = await image.boundingBox()
  expect(frameBox).not.toBeNull()
  expect(imageBox).not.toBeNull()
  expect(imageBox!.x).toBeCloseTo(frameBox!.x, 0)
  expect(imageBox!.width).toBeCloseTo(frameBox!.width, 0)
  await expect(page.locator('.mobile-gallery-dots')).toHaveCount(0)
})

test('login mobile permite rolar até o acesso social', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  const socialLogin = page.getByRole('button', {
    name: 'Continuar com Facebook',
    exact: true,
  })
  await socialLogin.scrollIntoViewIfNeeded()
  const bounds = await socialLogin.boundingBox()
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  expect(bounds).not.toBeNull()
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewportHeight)
  const response = page.waitForResponse(
    (item) =>
      item.url().endsWith('/api/auth/social') &&
      item.request().method() === 'POST',
  )
  await socialLogin.click()
  expect((await response).status()).toBe(200)
})

test('favorito persiste e rollback após falha não altera dados', async ({
  page,
}) => {
  await login(page)
  await page.goto('/nfts/nft-01')
  await page
    .getByRole('button', { name: 'Salvar nos favoritos', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toBeEnabled()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await lab(page, undefined, 'favorite-error')
  await page
    .getByRole('button', { name: 'Remover dos favoritos', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('remover o favorito')
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await lab(page, undefined, 'standard')
  await page.goto('/favorites')
  await expect(page.getByTestId('nft-card')).toHaveCount(1)
})
test('compra completa gera recibo imutável e limpa quantidades compradas', async ({
  page,
}) => {
  await add(page)
  await login(page, 'bruno@example.test', '/checkout')
  await readyCheckout(page)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click({ clickCount: 2 })
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible({ timeout: 10_000 })
  const url = page.url()
  await expect(page.getByTestId('receipt')).toBeVisible()
  await expect(page.getByTestId('cart-total')).toHaveText('1.206 ETH')
  await lab(page, 'Alterar preço para 0,25 ETH')
  await page.reload()
  await expect(page.getByTestId('cart-total')).toHaveText('1.206 ETH')
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
  ).toBeVisible()
  await page.goto(url)
  await expect(page.getByTestId('receipt')).toBeVisible()
  await page.goto('/orders')
  await expect(page.locator('.orders-list a')).toHaveCount(1)
})
test('pagamento recusado preserva carrinho e não mostra recibo', async ({
  page,
}) => {
  await login(page)
  await add(page)
  await lab(page, undefined, 'payment-rejected')
  await readyCheckout(page)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Pagamento recusado', exact: true }),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('receipt')).toHaveCount(0)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
})
test('timeout após criação recupera o mesmo pedido após refresh', async ({
  page,
}) => {
  await login(page)
  await add(page)
  await lab(page, undefined, 'order-timeout')
  await readyCheckout(page)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Verificar pedido', exact: true }),
  ).toBeEnabled({ timeout: 12_000 })
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('order-id')).toHaveText('ORD-0001')
  await page.goto('/orders')
  await expect(page.locator('.orders-list>a')).toHaveCount(1)
})
test('preço recebido por Socket.IO exige nova confirmação no checkout', async ({
  page,
}) => {
  await login(page)
  await add(page)
  await readyCheckout(page)
  await lab(page, 'Alterar preço para 0,25 ETH')
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('alert').filter({ hasText: 'mudaram' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Atualizar revisão', exact: true })
    .click()
  await expect(page.getByTestId('cart-total')).toHaveText('0.266 ETH')
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible({ timeout: 10_000 })
})
test('pedido pendente reconecta, preserva inclusões e ignora eventos antigos', async ({
  page,
}) => {
  await login(page)
  await add(page)
  await lab(page, undefined, 'order-pending')
  await readyCheckout(page)
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Pagamento em processamento',
      exact: true,
    }),
  ).toBeVisible()
  const orderURL = page.url()
  await lab(page, 'Interromper conexão')
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Pagamento em processamento',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByTestId('receipt')).toHaveCount(0)
  await add(page)
  await page.goto(orderURL)
  await lab(page, 'Confirmar pedido pendente')
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  await lab(page, 'Enviar pedido antigo')
  await lab(page, 'Enviar pedido duplicado')
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  await page.goto('/cart')
  await expect(
    page.getByLabel('Quantidade de Emerald Ape #042', { exact: true }),
  ).toHaveValue('1')
})
test('sessão expira durante checkout e volta com contexto; contas ficam isoladas', async ({
  page,
}) => {
  await login(page)
  await add(page)
  await page.goto('/profile')
  await page
    .getByLabel('Nome de exibição', { exact: true })
    .fill('Colecionador Teste')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil atualizado.' }),
  ).toBeVisible()
  await readyCheckout(page)
  await lab(page, 'Expirar sessão')
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('E-mail', { exact: true }).fill('bruno@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('Colecionador Teste')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/$|\/?q=/)
  await login(page, 'jade@example.test', '/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
  ).toBeVisible()
  await page.goto('/favorites')
  await expect(page.getByTestId('nft-card')).toHaveCount(0)
})
test('cadastro valida conflito e confirma nova conta', async ({ page }) => {
  await page.goto('/signup')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page.getByRole('alert')).toContainText('Revise os campos')
  await page.getByLabel('Nome de usuário').fill('Pessoa Teste')
  await page.getByLabel('E-mail', { exact: true }).fill('bruno@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Kurio123!')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page.getByRole('alert')).toContainText('já está cadastrado')
  await page.getByLabel('E-mail', { exact: true }).fill('nova@example.test')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/')
  await page.goto('/profile')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Pessoa Teste')
})
test('perfil, avatar, senha e carteira são validados e persistem', async ({
  page,
}) => {
  await login(page)
  await page.getByLabel('Nome de exibição').fill('Bruno Colecionador')
  await page
    .getByLabel('Imagem do avatar')
    .setInputFiles('public/assets/figma/emerald.png')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil atualizado.' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Bruno Colecionador',
  )
  await expect(
    page.getByRole('img', { name: 'Prévia do seu avatar' }),
  ).toBeVisible()
  await page.getByLabel('Senha atual', { exact: true }).fill('errada')
  await page.getByLabel('Nova senha', { exact: true }).fill('Nova123!')
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill('Nova123!')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Senha atual incorreta.', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Senha atual', { exact: true }).fill('Kurio123!')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Senha alterada.' }),
  ).toBeVisible()
  await page.goto('/wallets')
  await page
    .locator('.secondary-wallet')
    .getByRole('button', { name: 'Adicionar', exact: true })
    .click()
  const form = page.getByRole('form', {
    name: 'Carteira secundária',
    exact: true,
  })
  await form.getByLabel('Nome de exibição', { exact: true }).fill('Bruno')
  await form
    .getByLabel('Apelido da carteira', { exact: true })
    .fill('Secundária')
  await form.getByLabel('Rede', { exact: true }).selectOption('ethereum')
  await form
    .getByLabel('Tipo de carteira', { exact: true })
    .selectOption('metamask')
  await form.getByLabel('Nome do perfil', { exact: true }).fill('bruno')
  await form.getByLabel('Código de indicação', { exact: true }).fill('KURIO')
  await form.getByLabel('E-mail', { exact: true }).fill('bruno@example.test')
  await form.getByLabel('Nome ENS', { exact: true }).fill('bruno')
  await form.getByLabel('Endereço da carteira', { exact: true }).fill('errado')
  await form
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    form.getByText('Endereço inválido para esta rede.', { exact: true }),
  ).toBeVisible()
  await form
    .getByLabel('Endereço da carteira', { exact: true })
    .fill(`0x${'2'.repeat(40)}`)
  await form
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Carteira salva.' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page
      .getByRole('form', { name: 'Carteira secundária', exact: true })
      .getByLabel('Apelido da carteira'),
  ).toHaveValue('Secundária')
})
test('carteira recusa e desconecta; estoque e taxas invalidam revisão', async ({
  page,
}) => {
  await login(page)
  await add(page)
  await readyCheckout(page)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Fechar', exact: true })
    .click()
  const provider = page.getByRole('button', {
    name: 'Coinbase Wallet',
    exact: true,
  })
  await provider.click()
  await expect(provider).toHaveAttribute('aria-pressed', 'false')
  await lab(page, undefined, 'wallet-refused')
  await provider.click()
  await expect(page.getByRole('alert')).toContainText('recusada')
  await expect(provider).toHaveAttribute('aria-pressed', 'false')
  await lab(page, undefined, 'standard')
  await connectAndReview(page)
  await lab(page, 'Alterar taxa de rede')
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Atualizar revisão', exact: true })
    .click()
  await expect(page.getByTestId('cart-total')).toHaveText('1.199 ETH')
  await lab(page, 'Esgotar edição')
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  await page.goto('/cart')
  await expect(page.getByRole('alert')).toContainText('ajuste a quantidade')
})

test('Google e Facebook passam pela API e mantêm contas e coleções isoladas', async ({
  page,
}) => {
  await add(page)
  await page.goto('/login?redirect=%2Fprofile')
  const googleResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/social') &&
      response.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Continuar com Google', exact: true })
    .click()
  const google = await googleResponse
  expect(google.status()).toBe(200)
  expect(google.request().postDataJSON()).toEqual({ provider: 'google' })
  await expect(page).toHaveURL((url) => url.pathname === '/profile')
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('Colecionador Google')
  await page.reload()
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('Colecionador Google')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-item')).toHaveCount(1)
  await page.goto('/checkout')
  const googleWallet = page.getByRole('button', {
    name: 'Coinbase Wallet',
    exact: true,
  })
  await expect(googleWallet).toBeEnabled()
  await googleWallet.click()
  await expect(googleWallet).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.checkout-pay').click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeEnabled()
  await page.goto('/nfts/nft-01')
  await page
    .getByRole('button', { name: 'Salvar nos favoritos', exact: true })
    .first()
    .click()
  await expect(
    page
      .getByRole('button', { name: 'Remover dos favoritos', exact: true })
      .first(),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.goto('/login?redirect=%2Ffavorites')
  const facebookResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/social') &&
      response.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Continuar com Facebook', exact: true })
    .click()
  const facebook = await facebookResponse
  expect(facebook.status()).toBe(200)
  expect(facebook.request().postDataJSON()).toEqual({ provider: 'facebook' })
  await expect(page).toHaveURL((url) => url.pathname === '/favorites')
  await expect(page.getByTestId('nft-card')).toHaveCount(0)
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true }),
  ).toBeVisible()
})
