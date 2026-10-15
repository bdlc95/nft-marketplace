# Conferência da entrega

| Exigência | Estado e evidência |
| --- | --- |
| React/TS, Router, Query, Axios, Tailwind e shadcn | Implementados; build/typecheck/lint |
| MSW REST + Socket.IO, fixtures fora da UI | Implementados; test:network/test:business/E2E |
| Descoberta, URL, cancelamento e precisão | Implementados; discovery.spec.ts |
| Home e detalhe desktop/mobile | Implementados com contextos/capturas do Figma |
| Carrinho, pagamento e confirmação | Implementados; commerce.spec.ts |
| Login, cadastro, perfil e carteiras | Implementados; commerce.spec.ts |
| Sessões, isolamento e retomada | Implementados; troca de contas/expiração/refresh |
| Favoritos e rollback | Implementados; falha determinística 503 |
| Cotação autoritativa e nova concordância | Implementadas; preço/taxa/estoque e 409 |
| Idempotência e recuperação de timeout | Implementadas; mesmo pedido após refresh |
| Rejeição e quantidade adicionada durante pending | Implementadas; reserva/restauração/preservação |
| Eventos antigos/duplicados e reconexão | Implementados; realtime.spec.ts + commerce.spec.ts |
| Playwright desktop/mobile | 54 casos funcionais + 8 visuais; resultados atuais em docs/VALIDATION.md |
| Baselines de home/detalhe/carrinho/pagamento | Oito PNGs; geração e comparação independentes |
| Lighthouse três vezes por página/perfil | 12 relatórios reais e medianas; docs/VALIDATION.md |
| Demonstração pública | Hospedagem Sites; URL no README |
| Repositório público GitHub | Pendente: criar repositório público vazio; conta bdlc95 verificada, integração sem criação e navegador expirou |
| Referência dos demais frames | 15 páginas do PDF inspecionadas; composição/textos revistos; docs/DESIGN.md |

O repositório público GitHub permanece pendente até existir um link verificável. As baselines do código são testes de regressão, não prova automática de fidelidade ao Figma.
