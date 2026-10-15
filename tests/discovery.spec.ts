import { test, expect, type Page } from '@playwright/test'

async function searchInput(page: Page) {
  await page.getByLabel('Buscar NFTs').waitFor({ state: 'attached' })
  if (!(await page.getByLabel('Buscar NFTs').isVisible()))
    await page.getByRole('link', { name: 'Abrir busca' }).click()
  return page.getByLabel('Buscar NFTs')
}
async function filters(page: Page) {
  await page.locator('.catalog-sidebar').waitFor({ state: 'attached' })
  if (!(await page.locator('.catalog-sidebar').isVisible())) {
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
    return page.getByRole('dialog')
  }
  return page.locator('.catalog-sidebar')
}
async function closeFilters(page: Page) {
  if (await page.getByRole('dialog').isVisible())
    await page.getByRole('button', { name: 'Ver resultados' }).click()
}

test('combina filtros, ordena na API e reinicia a página', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  const controls = await filters(page)
  await controls
    .getByRole('button', { name: 'Mais filtros', exact: true })
    .click()
  await controls.getByLabel('Coleção', { exact: true }).selectOption('cosmos')
  await expect(page).toHaveURL(/page=1/)
  await controls.getByRole('button', { name: /^Fotografia/ }).click()
  const sort = page.locator('.catalog-sort select:visible')
  await sort.selectOption('price-desc')
  await closeFilters(page)
  await expect(page.getByTestId('nft-card').getByRole('heading')).toHaveText([
    'Ivory Baron #088',
    'Luna',
    'Ember',
    'Pulse',
    'Violet Nomad #314',
    'Cosmic Bloom #118',
  ])
  await page.reload()
  const restored = await filters(page)
  await restored
    .getByRole('button', { name: 'Mais filtros', exact: true })
    .click()
  await expect(restored.getByLabel('Coleção', { exact: true })).toHaveValue(
    'cosmos',
  )
  await expect(
    restored.getByRole('button', { name: /^Fotografia/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  await closeFilters(page)
  await expect(page.getByTestId('nft-card').getByRole('heading')).toHaveText([
    'Ivory Baron #088',
    'Luna',
    'Ember',
    'Pulse',
    'Violet Nomad #314',
    'Cosmic Bloom #118',
  ])
})

test('os indicadores do hero trocam a imagem em destaque', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const dots = page.locator('.hero-mobile-dots button')
  const image = page.locator('.mobile-hero-primary')
  await expect(image).toHaveAttribute('alt', /Emerald Ape/)
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThanOrEqual(250)
  const secondaryImage = page.locator('.mobile-hero-secondary')
  await expect(secondaryImage).toHaveAttribute('src', /sage\.png$/)
  await expect
    .poll(() =>
      secondaryImage.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThanOrEqual(250)
  await dots.nth(1).click()
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
  await expect(image).toHaveAttribute('alt', /Sage Nomad/)
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThanOrEqual(250)
  await dots.nth(2).click()
  await expect(image).toHaveAttribute('alt', /Ivory Baron/)
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThanOrEqual(250)
})

test('login mantém os botões sociais acessíveis em uma janela baixa', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 600 })
  await page.goto('/login')
  const socialLogin = page.getByRole('button', {
    name: 'Continuar com Google',
    exact: true,
  })
  await socialLogin.scrollIntoViewIfNeeded()
  const response = page.waitForResponse(
    (item) =>
      item.url().endsWith('/api/auth/social') &&
      item.request().method() === 'POST',
  )
  await socialLogin.click()
  expect((await response).status()).toBe(200)
})

test('busca e filtros sobrevivem ao histórico', async ({ page }) => {
  await page.goto('/')
  await (await searchInput(page)).fill('Emerald')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByTestId('nft-card')).toHaveCount(1)
  const controls = await filters(page)
  await controls
    .getByRole('button', { name: 'Mais filtros', exact: true })
    .click()
  await controls.getByLabel('Coleção', { exact: true }).selectOption('origins')
  await closeFilters(page)
  await expect(
    page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
  ).toBeVisible()
  await page.goBack()
  await expect(page.getByLabel('Buscar NFTs')).toHaveValue('Emerald')
  await expect(page.getByTestId('nft-card')).toHaveCount(1)
  await page.getByLabel('Buscar NFTs').fill('Kurio Apes')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
})

test('termo sem correspondência e parâmetros inválidos', async ({ page }) => {
  await page.goto('/?q=inexistente&page=-5&sort=invalida&category=invalida')
  await expect(
    page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
  ).toBeVisible()
  const controls = await filters(page)
  await expect(page.locator('.catalog-sort select:visible')).toHaveValue(
    'recent',
  )
  await expect(
    controls.getByRole('button', { name: /^Fotografia/ }),
  ).toHaveAttribute('aria-pressed', 'false')
  await closeFilters(page)
  await expect(
    page.getByRole('button', { name: 'Anterior', exact: true }),
  ).toBeDisabled()
})

test('última consulta vence com latência variável', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('nft-challenge:mock-config:v1', 'variable'),
  )
  await page.goto('/')
  await (await searchInput(page)).fill('Em')
  const requestStarted = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get('q') === 'Em',
  )
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const slowRequest = await requestStarted
  const aborted = page.waitForEvent('requestfailed', {
    predicate: (request) => request === slowRequest,
  })
  await page.getByLabel('Buscar NFTs').fill('Spa')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await aborted
  expect(slowRequest.failure()?.errorText).toContain('ERR_ABORTED')
  await expect(page.getByTestId('nft-card').getByRole('heading')).toHaveText([
    'Spark',
  ])
  await expect(page.getByLabel('Buscar NFTs')).toHaveValue('Spa')
  await expect(page).toHaveURL(/q=Spa/)
})

test('detalhe direto, galeria e edição indisponível', async ({ page }) => {
  await page.goto('/nfts/nft-01')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Mostrar imagem 2' }).click()
  await expect(
    page.getByRole('img', { name: 'Arte digital Emerald Ape #042, imagem 2' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ampliar imagem' }).click()
  await expect(
    page.getByRole('img', { name: 'Imagem ampliada de Emerald Ape #042' }),
  ).toBeVisible()
  await page.getByRole('dialog').press('Escape')
  await page.getByRole('radio', { name: '1/1', exact: true }).check()
  await expect(
    page.getByText('Esta edição está esgotada.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('0')
  await expect(
    page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }),
  ).toBeDisabled()
})

test('limite de quantidade e precisão decimal', async ({ page }) => {
  await page.goto('/nfts/nft-03')
  await page.getByRole('radio', { name: '1/10', exact: true }).check()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByTestId('edition-total')).toContainText('6.126 ETH')
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
})

test('NFT inexistente e rota inexistente', async ({ page }) => {
  await page.goto('/nfts/nao-existe')
  await expect(page.getByRole('alert')).toHaveText(
    'Este NFT não foi encontrado.',
  )
  await page.goto('/nao-existe')
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada' }),
  ).toBeVisible()
})

test('shimmer no carregamento lento e redução de movimento', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('nft-challenge:mock-config:v1', 'slow'),
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]').first()).toHaveCSS(
    'animation-name',
    'none',
  )
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
})

test('erro HTTP e recuperação pelo cenário padrão', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('nft-challenge:mock-config:v1', 'http-error'),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText(
    'temporariamente indisponível',
  )
  await page.getByRole('button', { name: 'Cenários de teste' }).click()
  await page.getByLabel('Condição da rede').selectOption('standard')
  await expect(
    page.getByRole('status').filter({ hasText: 'Cenário aplicado.' }),
  ).toBeVisible()
  await page.getByRole('dialog').press('Escape')
  await expect(page.getByTestId('nft-card')).toHaveCount(9)
})

test('diálogo recebe foco, fecha por Escape e devolve o foco', async ({
  page,
}) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Cenários de teste' })
  await trigger.focus()
  await trigger.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect
    .poll(() =>
      page
        .getByRole('dialog')
        .evaluate((dialog) => dialog.contains(document.activeElement)),
    )
    .toBe(true)
  await page.getByRole('dialog').press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('sem overflow horizontal em 390, 768 e 1440 pixels', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    const size = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    expect(size.content).toBeLessThanOrEqual(size.viewport)
    await page.goto('/nfts/nft-01')
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  }
})

test('rede, faixa de preço e descoberta são filtros reais', async ({
  page,
}) => {
  await page.goto('/?network=ethereum&priceMin=1.50&priceMax=2.00')
  await expect(page.getByTestId('nft-card').getByRole('heading')).toHaveText([
    'Sage Nomad #009',
    'Neon Vessel #552',
    'Mist',
    'Dawn',
    'Orbit',
  ])
  await page
    .getByRole('button', { name: 'Novos lançamentos', exact: true })
    .click()
  await expect(page).toHaveURL(/view=new/)
  await expect(page.getByTestId('nft-card').getByRole('heading')).toHaveText([
    'Sage Nomad #009',
    'Neon Vessel #552',
  ])
})

test('preço na URL preserva 18 casas decimais', async ({ page }) => {
  await page.goto(
    '/?network=ethereum&priceMin=1.690000000000000001&priceMax=2.00',
  )
  await expect(page.getByTestId('nft-card').getByRole('heading')).toHaveText([
    'Neon Vessel #552',
  ])
  await page
    .getByRole('button', { name: 'Novos lançamentos', exact: true })
    .click()
  await expect(page).toHaveURL(/priceMin=1.690000000000000001/)
  await expect(page.getByTestId('nft-card')).toHaveCount(1)
})
