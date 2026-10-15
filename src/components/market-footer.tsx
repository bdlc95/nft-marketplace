import { Link } from '@tanstack/react-router'
import { defaultSearch } from '@/features/catalog/search'
import { Button } from '@/components/ui/button'
import { FigmaIcon } from './figma-icon'
import { FeatureInfo } from './feature-info'

const features = [
  [
    'W',
    'Segurança da carteira',
    'Proteja sua carteira e colecione arte digital verificada com confiança.',
  ],
  [
    'C',
    'Criadores em destaque',
    'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  ],
  [
    'D',
    'Alertas de lançamentos',
    'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  ],
]

export function MarketFooter() {
  return (
    <footer className="market-footer">
      <div className="footer-features">
        {features.map(([letter, title, text]) => (
          <section key={letter}>
            <span className="feature-medallion" aria-hidden="true">
              {letter}
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section className="newsletter">
          <h2>Antecipe-se ao próximo lançamento</h2>
          <div className="newsletter-input">
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para novidades
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="digite seu e-mail..."
            />
            <FeatureInfo message="Inscrições para novidades não estão disponíveis.">
              <Button>Enviar</Button>
            </FeatureInfo>
          </div>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </section>
      </div>
      <div className="footer-brand">
        <Link className="wordmark" to="/" search={defaultSearch}>
          KURIO
        </Link>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="footer-links">
        {[
          [
            'Meu perfil',
            'Meu perfil',
            'Minha coleção',
            'Atividade',
            'Estúdio do criador',
            'Lista de interesse',
          ],
          [
            'Central de ajuda',
            'Central de ajuda',
            'Como comprar NFTs',
            'Carteira e segurança',
            'Política do mercado',
            'Denunciar item',
          ],
        ].map(([heading, ...links]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {links.map((text) =>
              text === 'Meu perfil' ? (
                <Link key={text} to="/profile">
                  {text}
                </Link>
              ) : text === 'Minha coleção' || text === 'Atividade' ? (
                <Link key={text} to="/orders">
                  {text}
                </Link>
              ) : text === 'Lista de interesse' ? (
                <Link key={text} to="/favorites">
                  {text}
                </Link>
              ) : text === 'Carteira e segurança' ? (
                <Link key={text} to="/wallets">
                  {text}
                </Link>
              ) : (
                <FeatureInfo key={text}>
                  <button type="button">{text}</button>
                </FeatureInfo>
              ),
            )}
          </section>
        ))}
        <section>
          <h2>Coleções</h2>
          {['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'].map(
            (label, i) => (
              <Link
                key={label}
                to="/"
                search={{
                  ...defaultSearch,
                  category: (
                    ['art', 'photography', 'music', '3d', 'utility'] as const
                  )[i],
                }}
                hash="catalog"
              >
                {label}
              </Link>
            ),
          )}
        </section>
        <section>
          <h2>Redes sociais</h2>
          <div className="social-links">
            {['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube'].map(
              (label, i) => (
                <FeatureInfo key={label}>
                  <button type="button" aria-label={label}>
                    <FigmaIcon name={`imgFrame${108 + i}`} />
                  </button>
                </FeatureInfo>
              ),
            )}
          </div>
          <h2 className="wallet-heading">Carteiras compatíveis</h2>
          <p className="wallet-chip">METAMASK • WALLETCONNECT • COINBASE</p>
        </section>
      </div>
      <p className="copyright">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
