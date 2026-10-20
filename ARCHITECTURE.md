# Arquitetura e decisões

A aplicação separa telas, consultas, serviços HTTP e servidor simulado. Os componentes não leem o banco local diretamente. Axios envia requisições REST; MSW intercepta a rede e aplica regras em `src/mocks/business.ts`. Os contratos tipados ficam em `src/types/contracts.ts`.

## Dados e navegação

Router guarda busca, filtros, ordenação e página na URL. O parser normaliza valores inválidos sem converter preços para ponto flutuante. TanStack Query guarda respostas do servidor e transmite AbortSignal ao Axios. Cancelar consultas antigas evita que uma busca lenta sobrescreva a mais recente.

Estados locais do React representam seleção de edição, campos, diálogos e revisão. Estado persistente de negócio pertence ao servidor simulado. O carrinho retorna itens enriquecidos e totais; a tela não decide preços ou estoque. `src/lib/eth.ts` converte strings de até 18 casas em wei com BigInt; descontos usam aritmética inteira. A simulação expressa os totais em ETH mesmo ao trocar a rede, que muda a taxa. Não há conversão cambial ou RPC.

## Conta e isolamento

O mock guarda usuários com salt e hash PBKDF2/SHA-256 de 100.000 iterações, nunca a senha em texto puro. Senhas de fixtures são credenciais fictícias públicas da demonstração. Os hashes das contas fictícias são preparados quando uma operação de conta precisa delas; visitantes não precisam desse cálculo para navegar ou manter carrinho. Uma sessão possui token aleatório, usuário e expiração de 30 minutos. O cliente guarda identidade mínima e recupera a sessão pela API.

As query keys privadas incluem o ID do usuário. Trocar conta cancela e remove consultas privadas, limpa a sessão anterior e instala a nova. O listener Socket.IO também é recriado. Respostas de mutações antigas verificam o token antes de mexer no cache. Um 401 de sessão expirada só encerra a identidade correspondente àquela requisição. Credenciais incorretas no login não encerram outra conta.

A proteção de rota consulta a sessão antes de renderizar o conteúdo privado. Falha de rede mostra erro recuperável. Expiração redireciona ao login com destino relativo validado; não aceita URL externa. Rascunho de checkout e tentativa de compra são persistidos em chaves por usuário, sem senhas. Login espera escritas de carrinho visitante em andamento antes da mescla.

Essa autenticação representa o contrato de um frontend. Banco, hash e tokens locais podem ser alterados pelo próprio visitante; em produção as regras, segredos, autorização e armazenamento pertencem a um backend real. Abas/navegadores não compartilham um servidor central neste mock.

## Carrinho, cotação e pedido

O carrinho visitante usa uma identidade própria; login mescla quantidades com as do usuário respeitando estoque. Favoritos são por conta. A mudança visual otimista salva o valor anterior, faz PUT/DELETE e restaura em caso de erro.

Uma cotação contém snapshot dos itens, versões, estoque, cupom, taxa, total, rede, revisão do carrinho e validade. O servidor recalcula na criação do pedido. Se houver diferença, responde 409 QUOTE_CHANGED com nova cotação; a interface exige nova revisão e confirmação. Estoque insuficiente e cupom expirado bloqueiam a compra.

Antes do POST, o cliente persiste uma chave de idempotência e o payload exato. A mesma chave/payload retorna o pedido já criado; mesma chave com payload diferente resulta em 409. Um timeout não prova que o POST falhou: o checkout busca `/orders/by-attempt/:key` e reutiliza a tentativa, inclusive após refresh. Enquanto o resultado for desconhecido, não cria outra tentativa.

Criar um pedido reserva estoque de forma síncrona. `pending` passa a `confirmed` ou `rejected`. O vencimento da simulação é persistido; GET após refresh recupera a conclusão. Confirmar remove apenas as quantidades do snapshot, preservando adições posteriores. Recusar devolve estoque e mantém carrinho. Estados terminais não retornam a pending; o recibo usa o snapshot imutável e nunca recalcula preços atuais.

## Tempo real

Socket.IO real usa transporte WebSocket, interceptado pelo binding MSW. A assinatura de sessão permite ao mock enviar eventos privados apenas às conexões do dono do pedido. O cliente valida usuário, ID e versão do recurso; duplicatas e versões antigas são descartadas. Eventos novos cancelam respostas GET antigas antes de atualizar cache. Reconexão invalida consultas e reconcilia REST, que continua sendo a autoridade. Pedidos pending também consultam REST periodicamente; o socket acelera o feedback sem ser a única forma de conclusão.

O laboratório controla latência, erros, preço/estoque, expiração, taxas, socket e decisão do pedido. Só aparece com VITE_SHOW_TEST_CONTROLS=true, no modo scenarios; o build público usa os mesmos mocks com os controles ocultos.

## Carregamento e visual

Páginas de conta/compra/detalhe usam imports tardios. O loader do detalhe começa o GET junto do carregamento do chunk, e o useQuery reutiliza essa consulta. MSW começa antes de carregar o módulo que cria Socket.IO, evitando captura de WebSocket anterior à interceptação. Fontes, 77 assets originais do Figma e os pequenos recortes PNG extraídos do PDF são locais. A geração Tailwind lê apenas src para impedir que HTMLs de relatórios alterem o CSS da build. A imagem principal da rota conhecida `/nfts/nft-01` tem preload responsivo no HTML; outras rotas mantêm prioridade alta no componente, sem forçar downloads desnecessários em toda a aplicação. `robots.txt` evita que o fallback SPA responda HTML para esse recurso.

O chunk compartilhado ainda passa de 500 kB antes de gzip. As medições reais estão em `docs/VALIDATION.md`; dividir dependências compartilhadas pode ser um próximo ajuste, mas nenhuma funcionalidade foi retirada para melhorar a nota.

## Revisão com o PDF — versão 1.1.0

As 15 páginas do PDF fornecem a referência das telas e dos textos. `src/design-match.css` adapta os componentes existentes; `WalletFields`, `PasswordField`, `EnsField`, `CommerceHeading` e `TransactionItems` compartilham a composição. Login/cadastro desktop usam diálogo sobre o catálogo; no celular são páginas completas. Perfil/carteiras e confirmação não acrescentam rodapé. Comprar no desktop leva ao carrinho; no celular o botão Comprar NFT leva ao carrinho e o ícone permite adicionar sem sair do detalhe. A confirmação usa o snapshot do pedido em um diálogo, somente após status confirmed.

POST /auth/social mantém o mesmo contrato de sessão e isolamento. O mock associa cada provedor a uma conta fictícia estável, sem OAuth, credenciais reais ou chamadas a Google/Facebook. Os metadados de carteira e perfil são validados no servidor simulado e persistidos após refresh.

As edições e os dados ilustrativos da referência têm inconsistências. Os números de filtros e paginação refletem as 36 fixtures. Carteira, usuário e campos preenchidos refletem a sessão. Preços, estoque, subtotal, desconto, taxa, ID e data do recibo seguem a API. No carrinho mobile do PDF, a soma dos subtotais é 8.14 ETH, embora o resumo mostre 8.92 ETH; não usamos esse número como regra de negócio. A edição única mantém limite um. Estados de erro, vazio, revisão e atualização são necessários ao enunciado e aparecem quando a ação os exige. Esses ajustes estão documentados em docs/DESIGN.md.

A home antecipa sua imagem principal por largura no HTML, como o detalhe já fazia. Isso reduz o atraso de descoberta do recurso sem remover imagens ou mudar a composição. A avaliação de Socket.IO continua depois de worker.start, para manter a interceptação MSW. Os testes de compra, login social, eventos e imagens foram revalidados após esse ajuste.
