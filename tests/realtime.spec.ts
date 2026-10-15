import { test, expect } from '@playwright/test'

test('Socket.IO atualiza preço; eventos antigos e duplicados não regridem', async ({
  page,
}) => {
  await page.goto('/nfts/nft-01')
  await expect(page.getByTestId('socket-status')).toHaveText(
    'Tempo real: conectado',
  )
  await expect(page.getByTestId('edition-price')).toHaveText('1.19 ETH')
  await page.getByRole('button', { name: 'Cenários de teste' }).click()
  await page
    .getByRole('button', { name: 'Alterar preço para 0,25 ETH' })
    .click()
  await expect(page.getByTestId('edition-price')).toHaveText('0.25 ETH')
  await page.getByRole('button', { name: 'Enviar evento antigo' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Cenário aplicado.' }),
  ).toBeVisible()
  await expect(page.getByTestId('edition-price')).toHaveText('0.25 ETH')
  await page.getByRole('button', { name: 'Enviar evento duplicado' }).click()
  await expect(page.getByTestId('edition-price')).toHaveText('0.25 ETH')
  await page.getByRole('dialog').press('Escape')
  await page.reload()
  await expect(page.getByTestId('edition-price')).toHaveText('0.25 ETH')
})

test('edição esgotada em tempo real atualiza o limite de quantidade', async ({
  page,
}) => {
  await page.goto('/nfts/nft-01')
  await expect(page.getByTestId('socket-status')).toContainText('conectado')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Cenários de teste' }).click()
  await page.getByRole('button', { name: 'Esgotar edição' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Cenário aplicado.' }),
  ).toBeVisible()
  await page.getByRole('dialog').press('Escape')
  await expect(page.getByLabel('Quantidade selecionada')).toHaveText('0')
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  await expect(
    page.getByText('Esta edição está esgotada.', { exact: true }),
  ).toBeVisible()
})
