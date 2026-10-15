# Kurio — NFT Marketplace

Implementação do desafio frontend em React e TypeScript. Inclui descoberta, detalhe, autenticação, favoritos, carrinho, checkout, acompanhamento do pedido, recibo, perfil e carteiras. Pagamentos, carteiras e backend são simulados; não há transação real em blockchain.

**Demonstração:** https://nft-marketplace-fawn-chi.vercel.app

## Executar

Use Node >=22.12, preferencialmente Node 24 LTS. Extraia o pacote em uma pasta nova e abra `nft-marketplace` no VS Code.

```bash
npm ci
npm run dev:mocks
```

Abra http://localhost:5173. Em PowerShell com bloqueio de `npm.ps1`, use `npm.cmd` e `npx.cmd`. Este README contém os passos para executar e validar a aplicação.

As contas de teste são fictícias e cada navegador mantém sua própria base. Novos cadastros também funcionam. O painel de testes não aparece na interface normal. Para avaliar falhas manualmente, execute `npm run dev:scenarios`: somente esse modo exibe **Cenários de teste**. Restaurar limpa contas criadas, sessões, carrinhos, pedidos e rascunhos locais. A publicação usa `npm run build`, que mantém os controles ocultos.

## Funcionalidades

- React 19, TypeScript, Vite, Tailwind 4 e componentes shadcn/ui locais sobre Radix.
- TanStack Router com filtros/busca/ordenação/página na URL; rotas privadas e retorno ao destino após login.
- TanStack Query + Axios: cancelamento por AbortSignal, estados de carregamento/erro e cache privado por usuário.
- MSW interceptando REST e Socket.IO com binding; toda a UI consome os contratos, sem importar fixtures dos mocks.
- 36 NFTs, nove por página (quatro páginas); filtro por categoria, coleção, rede, preço, disponibilidade e descoberta.
- Hero com três destaques navegáveis por teclado, mouse e toque.
- Sessões recuperáveis de 30 minutos; login por e-mail ou Google/Facebook simulados, cadastro, validação, perfil, avatar, senha e carteiras persistentes.
- Favoritos com atualização otimista e rollback; carrinho visitante persistente e mesclado no login.
- Precisão monetária com strings decimais e BigInt em wei; cupom KURIO10, taxas por rede e limite de estoque.
- Cotação calculada no servidor, validade de cinco minutos, revalidação e nova concordância quando valores mudam.
- Pedidos idempotentes, reserva de estoque, estados pending/confirmed/rejected e recuperação após timeout/refresh/reconexão.
- Recibo baseado no snapshot da compra; confirmação remove apenas as quantidades compradas.
- Socket versionado: eventos antigos/duplicados não regridem dados; REST reconcilia ao reconectar.
- Responsividade, foco, labels, reduced motion, skeleton shimmer e feedback acessível.

Google e Facebook usam `POST /auth/social` do MSW; não há OAuth externo nem contas reais nos provedores. As contas simuladas recebem uma carteira principal desconectada para permitir testar a conexão e o checkout. O contrato mantém sessão, mescla do carrinho e isolamento entre usuários, como no login por e-mail. Conteúdo editorial fora do escopo abre feedback de indisponibilidade somente após interação.

## Verificar

```bash
npm run typecheck
npm run lint
npm run build
npm run test:network
npm run test:business
npx playwright install --no-shell chromium
npm run test:e2e
npm run test:visual
npm run test:report
```

Evidências reais e limites do ambiente: [docs/VALIDATION.md](docs/VALIDATION.md). Baselines dependem de SO/navegador; no Windows, revise as telas antes de gerar referências locais com `npm run test:visual:update`. Nunca atualize referências para ocultar uma regressão.

## Lighthouse

Depois do build, rode `npm run preview` em um terminal e `npm run audit` em outro. O script executa três medições por página/perfil e produz 12 relatórios HTML/JSON, medianas de categorias e LCP/CLS/TBT. Relatórios desta revisão ficam em `validation/pdf-match/lighthouse`; os de `validation/lighthouse` pertencem à versão anterior. Mocks, fontes e assets permanecem ativos. `CHROME_PATH` e `LIGHTHOUSE_CHROME_FLAGS` permitem escolher o navegador do ambiente.

## Configuração e hospedagem

O arquivo `.env.example` documenta a configuração local. Para a demonstração na Vercel, configure `VITE_ENABLE_MOCKS=true` nas variáveis de ambiente do projeto. `VITE_API_URL` assume `/api`; `VITE_SOCKET_URL` assume a mesma origem. Desativar os mocks exige um backend compatível. Variáveis `VITE_` são públicas e não devem conter segredos.

Vercel: preset Vite, build `npm run build`, saída `dist`; `vercel.json` inclui fallback SPA. Netlify: `netlify.toml` e `public/_redirects`. Após publicar, teste também acesso direto e refresh em `/nfts/nft-01`, `/cart` e `/profile`.

## Organização

- [docs/CONTRACTS.md](docs/CONTRACTS.md): REST, eventos e erros.
- [docs/CHECKLIST.md](docs/CHECKLIST.md): cobertura e pendências de entrega.
- [docs/DESIGN.md](docs/DESIGN.md): comparação visual, assets e adaptações mobile.
- [docs/VALIDATION.md](docs/VALIDATION.md): validações executadas e limites conhecidos.
