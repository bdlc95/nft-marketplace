import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NftCard } from '@/components/nft-card'
import { ErrorState } from '@/components/error-state'
import { FigmaIcon } from '@/components/figma-icon'
import { FeatureInfo } from '@/components/feature-info'
import { CatalogFilters } from './catalog-filters'
import { CatalogHero } from './catalog-hero'
import { catalogOptions } from './queries'
import { errorMessage } from '@/services/http'
import type { CatalogSearch } from '@/types/contracts'
import { defaultSearch, validateCatalogSearch } from './search'

export function CatalogPage({ background = false }: { background?: boolean }) {
  const raw = useRouterState({ select: (state) => state.location.search })
  const search = background ? defaultSearch : validateCatalogSearch(raw)
  const navigate = useNavigate({ from: '/' })
  const hash = useRouterState({ select: (state) => state.location.hash })
  const [draft, setDraft] = useState(search.q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const result = useQuery(catalogOptions(search))
  useEffect(() => {
    setDraft(search.q)
  }, [search.q])
  useEffect(() => {
    if (!background) document.title = 'Kurio — Explore NFTs'
  }, [background])
  function change(patch: Partial<CatalogSearch>) {
    void navigate({
      search: { ...search, ...patch, page: patch.page ?? 1 },
      hash: 'catalog',
    })
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void navigate({
      search: { ...search, q: draft.trim(), page: 1 },
      hash: 'search-form',
    })
  }
  const sort = (
    <label className="catalog-sort">
      Ordenar por:
      <select
        aria-label="Ordenação"
        value={search.sort}
        onChange={(event) =>
          change({ sort: event.target.value as CatalogSearch['sort'] })
        }
      >
        <option value="recent">Listados recentemente</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
        <option value="name">Nome</option>
      </select>
    </label>
  )
  return (
    <>
      <form
        id="search-form"
        onSubmit={submit}
        className={`catalog-search ${hash === 'search-form' ? 'is-open' : ''}`}
      >
        <div className="search-field">
          <button type="submit" aria-label="Buscar">
            <FigmaIcon name="mh-imgSearch" />
          </button>
          <label htmlFor="search" className="sr-only">
            Buscar NFTs
          </label>
          <Input
            id="search"
            type="search"
            placeholder="Explorar coleções"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={100}
          />
        </div>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <Button className="filters-toggle" aria-label="Abrir filtros">
              <FigmaIcon name="mh-imgFilter" />
            </Button>
          </DialogTrigger>
          <DialogContent className="filter-dialog">
            <DialogHeader>
              <DialogTitle>Filtrar NFTs</DialogTitle>
              <DialogDescription>
                Combine categoria, rede, preço e disponibilidade.
              </DialogDescription>
            </DialogHeader>
            <CatalogFilters
              search={search}
              facets={result.data?.facets}
              change={change}
            />
            {sort}
            <Button onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </Button>
          </DialogContent>
        </Dialog>
      </form>
      <CatalogHero authBackdrop={background} />
      <section
        id="catalog"
        className="catalog-layout"
        aria-label="Catálogo de NFTs"
      >
        <aside className="catalog-sidebar">
          <CatalogFilters
            search={search}
            facets={result.data?.facets}
            change={change}
          />
          <div className="featured-nft">
            <h2>NFT EM DESTAQUE</h2>
            <p>OFERTA LIMITADA</p>
            <img
              src="/assets/figma/sage.png"
              width={310}
              height={368}
              alt="Sage Nomad, NFT em destaque"
              loading="lazy"
            />
          </div>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <div
              className="catalog-tabs"
              role="group"
              aria-label="Tipo de descoberta"
            >
              {(
                [
                  ['all', 'Todos os NFTs'],
                  ['new', 'Novos lançamentos'],
                  ['trending', 'Em alta'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={search.view === value}
                  onClick={() => change({ view: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            {sort}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {result.isPending
              ? 'Carregando NFTs…'
              : `${result.data?.total ?? 0} NFTs encontrados`}
            {result.isFetching && !result.isPending && ' · Atualizando…'}
          </p>
          {result.isPending ? (
            <div
              aria-label="Carregando catálogo"
              data-testid="catalog-skeleton"
              className="catalog-grid"
            >
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="nft-skeleton">
                  <Skeleton className="nft-art" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-5 w-1/2" />
                </div>
              ))}
            </div>
          ) : result.isError && !result.data ? (
            <ErrorState
              message={errorMessage(result.error)}
              retry={() => void result.refetch()}
            />
          ) : (
            <>
              {result.isError && (
                <ErrorState
                  message="Não foi possível atualizar o catálogo. Os últimos dados continuam visíveis."
                  retry={() => void result.refetch()}
                />
              )}
              {result.data?.items.length ? (
                <div className="catalog-grid">
                  {result.data.items.map((nft, i) => (
                    <NftCard
                      key={nft.id}
                      nft={
                        background
                          ? { ...nft, image: nft.authImage || nft.image }
                          : nft
                      }
                      priority={i < 2}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-catalog">
                  <h2>Nenhum NFT encontrado</h2>
                  <p>Experimente outro termo ou remova filtros.</p>
                </div>
              )}
              <nav
                aria-label="Paginação do catálogo"
                className="catalog-pagination"
              >
                <Button
                  variant="outline"
                  aria-label="Anterior"
                  disabled={search.page <= 1}
                  onClick={() => change({ page: search.page - 1 })}
                >
                  ‹
                </Button>
                {Array.from(
                  { length: Math.max(1, result.data?.totalPages ?? 1) },
                  (_, i) => (
                    <Button
                      key={i}
                      variant={search.page === i + 1 ? 'default' : 'outline'}
                      aria-label={`Página ${i + 1}`}
                      aria-current={search.page === i + 1 ? 'page' : undefined}
                      onClick={() => change({ page: i + 1 })}
                    >
                      {i + 1}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  aria-label="Próxima"
                  disabled={search.page >= (result.data?.totalPages ?? 1)}
                  onClick={() => change({ page: search.page + 1 })}
                >
                  <FigmaIcon name="imgArrowRight2" />
                </Button>
              </nav>
            </>
          )}
        </div>
      </section>
      <div className="home-promos desktop-only">
        {[
          [
            'genesis',
            'Lançamentos gênesis de edição limitada',
            'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
          ],
          [
            'curated',
            'Arte digital selecionada e muito mais',
            'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
          ],
        ].map(([image, title, text]) => (
          <section key={image} className="promo-card">
            <div className="promo-pattern">
              <FigmaIcon name="imgMaskGroup" />
            </div>
            <img
              src={`/assets/figma/${image === 'genesis' ? 'hero' : 'ivory'}.png`}
              width={292}
              height={250}
              alt=""
              loading="lazy"
            />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              <Button asChild>
                <a href="#catalog">
                  Explorar <FigmaIcon name="imgArrowRight" />
                </a>
              </Button>
            </div>
          </section>
        ))}
      </div>
      <section className="home-journal desktop-only">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div className="journal-grid">
          {[
            [
              '12 de setembro | Leitura de 6 min',
              'Como funciona a propriedade de NFTs',
              'Aprenda a colecionar, negociar e verificar ativos digitais.',
            ],
            [
              '13 de setembro | Leitura de 2 min',
              '10 artistas digitais para acompanhar',
              'Conheça criadores que moldam a cultura digital.',
            ],
            [
              '15 de setembro | Leitura de 3 min',
              'Raridade, atributos e procedência',
              'Entenda raridade, procedência, direitos autorais e utilidade.',
            ],
            [
              '15 de setembro | Leitura de 2 min',
              'Como proteger sua carteira',
              'Proteja sua carteira, seus ativos e sua identidade.',
            ],
          ].map(([date, title, text], i) => (
            <article key={title}>
              <img
                src={`/assets/figma/${['ivory', 'hero', 'sage', 'golden'][i]}.png`}
                width={268}
                height={195}
                alt=""
                loading="lazy"
              />
              <div>
                <p className="journal-date">{date}</p>
                <h3>{title}</h3>
                <p>{text}</p>
                <FeatureInfo>
                  <button type="button">Ler mais →</button>
                </FeatureInfo>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
