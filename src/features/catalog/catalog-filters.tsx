import { useEffect, useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { Button } from '@/components/ui/button'
import { FigmaIcon } from '@/components/figma-icon'
import { compareEth } from '@/lib/eth'
import { categoryLabels, collectionLabels, networkLabels } from './search'
import type {
  CatalogSearch,
  Category,
  Network,
  Nft,
  PageResponse,
} from '@/types/contracts'

export function CatalogFilters({
  search,
  facets,
  change,
  advanced = false,
}: {
  search: CatalogSearch
  facets?: PageResponse<Nft>['facets']
  change: (patch: Partial<CatalogSearch>) => void
  advanced?: boolean
}) {
  const [range, setRange] = useState([
    search.priceMin || '0.02',
    search.priceMax || '12.30',
  ])
  const [error, setError] = useState('')
  const [more, setMore] = useState(advanced)
  useEffect(() => {
    setRange([search.priceMin || '0.02', search.priceMax || '12.30'])
  }, [search.priceMin, search.priceMax])
  function apply() {
    if (compareEth(range[0], range[1]) > 0) {
      setError('O preço mínimo deve ser menor ou igual ao máximo.')
      return
    }
    setError('')
    change({ priceMin: range[0], priceMax: range[1] })
  }
  return (
    <div className="catalog-filters">
      <section>
        <h2>
          <button
            type="button"
            aria-label="Mais filtros"
            className="collection-heading"
            onClick={() => setMore(!more)}
          >
            Coleções
          </button>
        </h2>
        <div className="filter-options">
          {Object.entries(categoryLabels).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={search.category === value}
              onClick={() =>
                change({
                  category:
                    search.category === value ? 'all' : (value as Category),
                })
              }
            >
              <span>{label}</span>
              <span>({facets?.categories[value as Category] ?? 0})</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Faixa de preço</h2>
        <div className="price-range">
          {/* Number apenas para a posição do controle; cálculos e transporte usam strings/wei. */}
          <Slider.Root
            className="range-root"
            min={0}
            max={Math.max(18, ...range.map(Number))}
            step={0.01}
            minStepsBetweenThumbs={0}
            value={range.map(Number)}
            onValueChange={(values) =>
              setRange(values.map((value) => value.toFixed(2)))
            }
          >
            <Slider.Track className="range-track">
              <Slider.Range className="range-selection" />
            </Slider.Track>
            <Slider.Thumb className="range-thumb" aria-label="Preço mínimo">
              <FigmaIcon name="imgEllipse5" />
            </Slider.Thumb>
            <Slider.Thumb className="range-thumb" aria-label="Preço máximo">
              <FigmaIcon name="imgEllipse5" />
            </Slider.Thumb>
          </Slider.Root>
          <p>
            Preço: {range[0].replace('.', ',')} - {range[1].replace('.', ',')}{' '}
            ETH
          </p>
          <Button onClick={apply}>Aplicar</Button>
          {error && <p role="alert">{error}</p>}
        </div>
      </section>
      <section>
        <h2>Rede</h2>
        <div className="filter-options">
          {Object.entries(networkLabels).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={search.network === value}
              onClick={() =>
                change({
                  network:
                    search.network === value ? 'all' : (value as Network),
                })
              }
            >
              <span>{label}</span>
              <span>({facets?.networks[value as Network] ?? 0})</span>
            </button>
          ))}
        </div>
      </section>
      {more && (
        <div className="extra-filters">
          <label>
            Coleção
            <select
              aria-label="Coleção"
              className="control"
              value={search.collection}
              onChange={(event) =>
                change({
                  collection: event.target.value as CatalogSearch['collection'],
                })
              }
            >
              <option value="all">Todas</option>
              {Object.entries(collectionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="availability-filter">
            <input
              type="checkbox"
              checked={search.available}
              onChange={(event) => change({ available: event.target.checked })}
            />{' '}
            Disponíveis
          </label>
        </div>
      )}
      {(more ||
        search.category !== 'all' ||
        search.collection !== 'all' ||
        search.network !== 'all' ||
        search.priceMin ||
        search.priceMax ||
        search.available) && (
        <Button
          variant="ghost"
          onClick={() =>
            change({
              category: 'all',
              collection: 'all',
              network: 'all',
              priceMin: '',
              priceMax: '',
              available: false,
            })
          }
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
