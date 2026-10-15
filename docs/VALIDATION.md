# Verificação — versão 1.1.0, 14/10/2026

A revisão usa as 15 páginas do PDF enviado pelo Bruno. Os textos e a composição de login, cadastro, perfil, carteiras, carrinho, pagamento e confirmação foram comparados com essa referência, além de início e detalhe. Os botões Google/Facebook usam a API MSW; o build normal não exibe controles de cenário ou credenciais. O detalhe oculta a contagem de estoque disponível e o total extra do desktop, mantendo o aviso de esgotamento e o total mobile.

## Resultados atuais

| Verificação | Resultado / evidência |
| --- | --- |
| TypeScript, lint e build normal/de cenários | Aprovados; quality.log e builds do Playwright |
| Axios → MSW REST e Socket.IO | npm run test:network aprovado |
| Precisão, sessão, cotação, idempotência, estoque e isolamento | npm run test:business aprovado |
| Rodada funcional completa | 54/54, sem falhas, skips ou flaky; functional.json e functional-html/index.html |
| Detalhe após remover textos extras | 6/6, desktop/mobile; detail-functional.json |
| Bootstrap após preload | 8/8, compra, login social e Socket.IO; bootstrap-functional.json |
| Referências visuais atualizadas | Oito PNGs versionados em tests/visual.spec.ts-snapshots |
| Comparação final com as referências | 8/8, sem falhas; visual.json e visual-html/index.html |
| Inspeção da interface normal | 16 capturas em 1440/414, sem erro de página ou overflow; inspection.json |
| Lighthouse da versão 1.1.0 | 12 relatórios HTML/JSON e summary.json em lighthouse/ |

Os caminhos de evidência acima são relativos a `validation/pdf-match`. E2E usa build de produção no preview Vite, Axios, MSW e o cliente Socket.IO reais da aplicação, sem page.route ou respostas inseridas diretamente nos componentes. A rodada funcional usa o modo scenarios, com controles explicitamente habilitados; a comparação visual usa o build normal, com esses controles ocultos. Capturas adicionais do modo mock mostram login, cadastro, perfil, carteiras, início, carrinho, pagamento e confirmação. A inspeção percorreu compras até confirmed em ambos os tamanhos. Só captura o pagamento após seus controles carregarem.

A cobertura inclui busca/filtros/ordenação/paginação/URL/histórico, cancelamento de consultas, vazio, erro HTTP/rede, carregamento lento e reduced motion; galeria, edições, estoque e precisão; foco/Escape; cadastro e conflito, login por e-mail e Google/Facebook, expiração, troca de contas, perfil/avatar/senha e carteiras; favoritos com rollback, carrinho/refresh/mescla/cupom; conexão/recusa/desconexão; compra confirmada, clique repetido, recusa, timeout/refresh, preço/taxa/estoque alterados; pedido pendente, reconexão, eventos antigos/duplicados e preservação de adições posteriores. Overflow funcional cobre também 390/768/1440.

O teste de negócio confirma PBKDF2 sem senha em texto puro, mescla, aritmética em wei, idempotência com payload igual e conflito com payload diferente, snapshot imutável, retirada exata do carrinho, alteração de cotação e autorização/403 entre contas.

## Lighthouse: medianas de três medições

Build normal otimizada, mocks padrão ativos, imagens e fontes locais. Mobile usa throttling simulado padrão do Lighthouse; desktop usa preset desktop. As medidas são locais, sem retirar recursos e sem rodar outros testes de navegador simultaneamente. Não são medidas do domínio público.

| Página | Perfil | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 47 | 100 | 96 | 100 | 4.856 s | 0.000029 | 2403 ms |
| Início | desktop | 90 | 100 | 100 | 100 | 1.746 s | 0.000806 | 23 ms |
| Detalhe | mobile | 78 | 100 | 100 | 100 | 3.982 s | 0.000135 | 382 ms |
| Detalhe | desktop | 73 | 97 | 100 | 100 | 3.378 s | 0.106866 | 75 ms |

Há medianas abaixo das metas. Consulte os relatórios e a análise de causas antes de apresentar a auditoria como aprovada.

Versões, CPU, memória, sistema e configuração constam no summary.json. LCP, CLS e TBT devem ser analisados junto às notas; resultados variam conforme ambiente/carga. A primeira auditoria desta revisão teve desempenho 72/83 no início mobile/desktop e 84/87 no detalhe. Os relatórios estão em lighthouse-before. Houve atraso de descoberta da imagem principal e trabalho inicial de JavaScript; o build passou a antecipar a imagem da home no HTML; a avaliação de Socket.IO continua após worker.start. A máquina também teve benchmark de CPU menor e variável em relação aos relatórios antigos; isso limita a comparação temporal, sem justificar substituir notas por resultados anteriores. O chunk compartilhado ainda excede 500 kB antes de gzip. Parte dos assets originais tem resolução limitada, e o loading do detalhe não reserva toda a altura do conteúdo. São oportunidades de melhoria, sem recursos desativados para melhorar a nota.

## Diagnósticos e limites

A primeira execução após a revisão tinha expectativas antigas de filtros e rótulos com asterisco. Os rótulos passaram a associar o campo com label e marcador decorativo separado; as expectativas de filtros refletem as 36 fixtures. O laboratório podia sobrepor duas instâncias no recibo mobile; passou a existir apenas na composição ativa de confirmação/pending. Um helper de captura escolhia o botão desktop enquanto o detalhe mobile ainda carregava; agora aguarda o botão de compra antes de escolher a ação. Os relatórios e traces de diagnóstico estão em diagnostics; as rodadas finais são separadas e não usam retry automático nem atualização de baseline para esconder falha funcional.

Ambiente: Node 24.19.0, npm 11.9.0, Linux, Playwright 1.55.0, Chromium headless 153.0.8010.0, MSW 2.10.5 e binding 0.2.0. O Chromium 140 padrão do Playwright não iniciou por restrição de IPC/process singleton. A configuração temporária usa um headless 153 separado, um worker e vídeos desativados, sem --single-process; não faz parte do código distribuído. Os testes não comprovam execução no Chromium 140, Windows ou outro SO. Baselines podem variar com navegador/sistema; revise antes de criar referências locais.

Há comparação manual dos frames e regressão visual do código, sem prova de igualdade pixel a pixel. Valores de carteira, conta e compra seguem a API. O PDF mobile apresenta subtotal 8.92 ETH para itens que somam 8.14 ETH; o cálculo não reproduz essa inconsistência. Perfil/carteiras/recibo mobile são adaptações dos frames desktop, pois não existem seus frames mobile no PDF. Autenticação social, carteira, transação e pagamento são simulações locais por navegador, sem backend multiusuário ou OAuth externo. Consulte [docs/DESIGN.md](DESIGN.md) e [docs/CONTRACTS.md](CONTRACTS.md).

## Reprodução

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:network
npm run test:business
npx playwright install --no-shell chromium
npm run test:e2e
npm run test:visual
```

Para Lighthouse, use npm run preview e npm run audit em terminais separados. CHROME_PATH permite escolher o Chromium do ambiente. Os relatórios locais gerados ficam em reports/lighthouse. Execute npm run dev:scenarios somente para demonstrar as falhas manualmente; a publicação usa o build normal.

## Histórico preservado

A versão 1.0.0 passou em 52 testes funcionais e oito visuais e tinha 12 medições Lighthouse em validation/lighthouse. A versão 1.0.1 retirou os controles de teste e credenciais da interface normal; seus relatórios selecionados ficam em validation/ui-cleanup. Esses relatórios anteriores não medem a revisão do PDF. A instalação limpa registrada em validation/install.log pertence à versão 1.0.0; as dependências da revisão atual não mudaram, somente a versão do projeto no manifest/lockfile.

A demonstração pública anterior foi inspecionada no navegador na versão 1.0.0. A publicação atual é confirmada pelo resultado nativo de implantação; os testes completos desta revisão ocorreram na build local de produção. Não se afirma que todos foram repetidos no domínio publicado.
