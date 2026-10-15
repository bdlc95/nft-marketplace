# Referência visual — versão 1.1.0

A referência desta revisão é o PDF **Frontend Challenge (cópia)** enviado pelo Bruno em 14/10/2026, com 15 páginas. A cópia Figma original é [Frontend Challenge](https://www.figma.com/design/suQnOHvEK0bjKxVR9xNYrj/Frontend-Challenge--c%25C3%25B3pia-?node-id=0-1). Home e detalhe também tinham contextos e assets exportados do Figma. As demais telas passaram a ter comparação direta com o PDF; a limitação anterior de quota não impediu esta revisão.

| Página | Tela | Dimensões |
| --- | --- | --- |
| 1 | Início desktop | 1440 × 3668 |
| 2 | Detalhe desktop | 1440 × 2246 |
| 3 | Carrinho desktop | 1440 × 1754 |
| 4 | Pagamento desktop | 1440 × 1657 |
| 5 | Confirmação desktop | 1440 × 1657 |
| 6 | Login desktop | 1440 × 1981 |
| 7 | Cadastro desktop | 1440 × 1981 |
| 8 | Perfil desktop | 1440 × 1080 |
| 9 | Carteiras desktop | 1440 × 1080 |
| 10 | Início mobile | 414 × 896 |
| 11 | Detalhe mobile | 414 × 896 |
| 12 | Carrinho mobile | 414 × 896 |
| 13 | Pagamento mobile | 414 × 896 |
| 14 | Login mobile | 414 × 896 |
| 15 | Cadastro mobile | 414 × 896 |

## Composição e textos

Login e cadastro desktop são diálogos sobre a vitrine; mobile usa páginas próprias. Os botões dizem **Continuar com Google** e **Continuar com Facebook**, separados por **Ou continue com**. Login apresenta **Esqueceu a senha?** e, no celular, **Novo na Kurio? Crie uma conta**. Cadastro mobile usa **Criar perfil de colecionador**, **Criar perfil** e **Já tem uma conta? Entre**. Não há termos ou credenciais de exemplo inseridos nessa composição.

Perfil usa **Perfil do colecionador**, os campos do PDF, alteração de avatar e senha e uma ação **Salvar**. Carteiras usam **Carteira principal**, **Carteira secundária**, **Salvar carteira** e o formulário de duas colunas, adaptado à largura. O cabeçalho e a navegação lateral preservam os rótulos da referência, sem nome de conta adicional. Essas telas não recebem rodapé.

Carrinho desktop começa pelo breadcrumb e pelas colunas **NFTs**, **Preço**, **Edições** e **Total**. O resumo usa **Resumo da carteira**, **Código promocional**, **Aplicar**, **Desconto do lançamento**, **Taxa de rede**, **Taxa estimada**, **Conectar e finalizar** e **Continuar explorando**. Mobile apresenta **Carrinho de NFTs** e cartões com edição e quantidade. Pagamento usa **Perfil do colecionador**, **Seus NFTs**, **Carteira e rede** e **Confirmar compra**; mobile usa **Pagamento com carteira**, **Carteira conectada** e **Trocar carteira**. A confirmação apresenta **Seus NFTs agora estão na sua carteira**, **Detalhes da transação** e **Ver no Etherscan**, com os dados efetivos do pedido.

O painel de cenários e os avisos de demonstração ficam ausentes do build normal. Mensagens de validação, erro e estados de compra só aparecem quando o fluxo os exige. A busca, filtros, recomendações e compra continuam integrados à API. Os textos decorativos do detalhe seguem a ordem do PDF, inclusive as descrições visualmente trocadas entre Contrato e Direitos autorais.

## Assets e tokens

`public/assets/figma` conserva as 77 exportações anteriores (67 SVG e dez PNG). `public/assets/pdf` contém recortes pequenos da referência: marcas de Google/Facebook, olhos, avatar, ícones da conta, lixeira, THANK YOU e provedores de carteira. Não são imagens geradas. Nenhuma tela inteira é usada como fundo para substituir componentes. Roboto Mono 400/500/700 é local via @fontsource. O fundo é #140D0A; texto #F5F1EB; superfície #241612; primária #D28A4C; destaque #E89B55.

Os wrappers preservam o recorte dos assets. A imagem principal é a exportação original; o catálogo atrás do login usa o campo authImage da API para reproduzir os slots próprios dessa tela. Os cinco itens de “Colecionadores também viram” vêm de uma consulta REST ordenada por recommendationRank. Tamanhos reservados, prioridade de imagens principais e lazy loading continuam ativos.

## Dados dinâmicos e adaptação funcional

- A API tem 36 NFTs, nove por página e quatro páginas. Contagens de filtro e resultados representam os dados, em vez de números decorativos do PDF. Os nomes e tokens da primeira página foram revistos.
- Os cartões mantêm a ordem da consulta nos tamanhos de tela; os exemplos mobile do PDF usam outra seleção de itens. Busca, coleção, preço e disponibilidade continuam funcionais. “Coleções” abre os filtros adicionais, que aparecem após interação.
- A edição única mantém limite um e a seleção preserva IDs estáveis; a referência mobile repete um rótulo de edição. Estoque real e erros não são substituídos por rótulos ilustrativos.
- Carteiras e campos preenchidos vêm da conta. IDs, datas, rede, preço, quantidade, subtotal, desconto e total vêm da resposta da API/snapshot, sem valores fixos para imitar uma compra ilustrativa.
- O PDF mobile lista subtotais 1.19, 1.39, 3.58 e 1.98 ETH (soma **8.14 ETH**), mas mostra subtotal **8.92 ETH**. O código conserva a soma correta e taxa Ethereum padrão 0.016 ETH. O enunciado exige precisão e cotação autoritativa.
- Confirmar compra abre uma revisão acessível antes do POST, exigida pelo enunciado; a API revalida os dados. Pending/rejected e recuperação de falhas têm feedback próprio, embora esses estados não tenham frames no PDF.
- Perfil, carteiras e confirmação mobile são adaptações dos frames desktop, pois o PDF não inclui suas versões mobile. O layout continua utilizável nessas larguras.
- O detalhe mobile mantém uma única imagem principal, sem indicadores de carrossel; o arquivo de arte ocupa e centraliza todo o frame. Os cartões do carrinho reorganizam produto, quantidade e remoção em linhas próprias para evitar sobreposição e overflow. Login e cadastro mobile rolam dentro da página de autenticação, mantendo os botões sociais alcançáveis em telas baixas.
- O hero mobile mantém o card compacto da referência (302 × 191 px quando há largura disponível), com texto e destaque alinhados lado a lado. Os slides usam as artes em resolução original, em vez de miniaturas pequenas ampliadas, para preservar a nitidez em telas de alta densidade.
- Referência de transação, conexão de carteira, pagamento e login social são simulados. Conteúdo editorial fora do escopo e recuperação de senha mostram feedback de indisponibilidade após interação.

Capturas e inspeção do código em 1440 e 414 pixels ficam em `validation/pdf-match`. Há comparação manual com os frames; não se afirma igualdade pixel a pixel. As oito baselines Playwright representam o código verificado e detectam regressões, sem substituir essa comparação.
