# Contratos REST e Socket.IO

Base `/api`. Axios usa timeout de seis segundos e Bearer token quando autenticado. Sem token, o mock usa o carrinho `guest` da base daquele navegador. GETs aceitam AbortSignal. Respostas JSON seguem os tipos de `src/types/contracts.ts`; mutações não usam retry automático cego.

| Método e rota | Resultado / regra |
| --- | --- |
| GET /nfts | items, page, pageSize, total, totalPages, facets; filtros da URL |
| GET /nfts/:id | NFT e edições; 404 para ID inexistente |
| POST /auth/register | RegisterInput, validação/409 e sessão criada |
| POST /auth/login | email/password; sessão e mescla do carrinho visitante |
| POST /auth/social | provider: google ou facebook; conta fictícia estável, sessão e mescla |
| GET /auth/session | Session; sem token retorna user:null; inválido/expirado 401 |
| POST /auth/logout | Revoga token |
| GET/PATCH /profile | User público; atualização validada, conflito de email 409 |
| PUT /profile/password | Senha atual, nova e confirmação; revoga outras sessões |
| GET /favorites | IDs por usuário |
| PUT/DELETE /favorites/:nftId | Lista atualizada; cliente faz otimista/rollback |
| GET /cart?network=ethereum | Cart enriquecido, totais, revision e warnings |
| POST /cart/items | nftId, editionId, quantity; soma quantidade limitada pelo estoque |
| PATCH /cart/items/:nftId/:editionId | quantity; quantidade inteira positiva |
| DELETE /cart/items/:nftId/:editionId | Remove linha |
| PUT /cart/coupon | code; vazio remove cupom; KURIO10 dá 10% sobre subtotal |
| POST /quotes | network; Quote autenticada com validade de cinco minutos |
| POST /orders | OrderRequest + Idempotency-Key; reserva estoque e retorna Order |
| GET /orders | Pedidos do usuário |
| GET /orders/:id | Estado e snapshot; outro usuário recebe 403 |
| GET /orders/by-attempt/:key | Recupera pedido pela tentativa; 404 se não criado |
| GET/POST /wallets | Lista / criação validada por rede e endereço |
| PATCH /wallets/:id | Edição e seleção principal |
| POST /wallets/:id/connection | action: connect, disconnect ou refuse |

`OrderRequest` contém quoteId, walletId, walletProvider opcional e collector. Collector inclui name, email e acceptTerms (true após confirmar a revisão), além de username, profileName, referralCode, ens, note e secondary opcionais. phone é um campo legado que aceita vazio, sem campo no PDF. Cabeçalho `Idempotency-Key` aceita 8 a 100 caracteres de identificador. As tentativas são indexadas por usuário+chave. Mesmo payload retorna o mesmo pedido mesmo que a cotação já tenha expirado; payload diferente é conflito.

Moeda viaja em strings decimais. `ReceiptItem` guarda NFT/edição/quantidade, nome, token, imagem, preço unitário, subtotal, estoque e versão. `Quote` acrescenta id, ownerId, network, expiresAt e fingerprint aos dados do carrinho. `Order` possui id, ownerId, status, version, createdAt, transaction, reason, quote, collector e wallet. A transação é um identificador fictício.

Erros usuais: `{ code, message, fields? }`. 401 SESSION_EXPIRED; 403 FORBIDDEN; 404 NOT_FOUND; 409 EMAIL_CONFLICT, STOCK_CONFLICT, WALLET_REFUSED e conflito de idempotência; 422 VALIDATION_ERROR; 503 para falhas configuradas. QUOTE_CHANGED inclui adicionalmente `quote` para nova revisão. Cupons inválidos/expirados recebem erro, não desconto fictício.

| Evento | Payload e aplicação |
| --- | --- |
| nft.updated | eventId, resourceId, version, nft; atualiza apenas versão mais nova |
| session.subscribe | token; servidor determina o usuário autorizado |
| order.updated | eventId, resourceId, userId, version, order; privado e monotônico |

Ao reconectar, refaça GETs. Não infira conclusão da compra apenas por chegada/ausência de evento. Use status do pedido e mantenha o snapshot como origem do recibo.

Rotas `/__mock/*` servem exclusivamente aos cenários. O laboratório chama a API para alterar preço/estoque, expirar sessão/cupom, mudar taxa, interromper socket e concluir/recusar pedido. Restaurar o cenário reinicializa ambas as bases e cancela timers.

## Campos de conta e carteira do PDF

User contém username, walletAlias e ens. Carteira aceita provider (metamask, walletconnect ou coinbase), displayName, profileName, email, ens, referralCode e secondary. Cadastro usa nome de usuário, e-mail, senha e confirmação; não exige checkbox de termos. O formulário de perfil usa uma ação Salvar, executando PATCH /profile e, se os campos de senha foram preenchidos, PUT /profile/password em sequência. São duas operações, sem transação atômica entre elas.

A taxa padrão Ethereum é 0.016 ETH; Polygon 0.001 e Solana 0.0005. As recomendações passam por GET /nfts com recommended=true e a coleção; a API ordena por recommendationRank. authImage oferece o asset do slot de catálogo usado atrás dos diálogos de autenticação. O banco restaura os metadados da revisão sem apagar compras, contas ou estoque já alterado, e adiciona as nove novas fixtures.
