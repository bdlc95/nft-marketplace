import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FigmaIcon } from '@/components/figma-icon'

const heroSlides = [
  {
    title: 'Emerald Ape',
    image: '/assets/figma/hero.png',
    mobileImage: '/assets/figma/mobile-hero-emerald.png',
    alt: 'Emerald Ape usando óculos escuros e jaqueta verde',
  },
  {
    title: 'Sage Nomad',
    image: '/assets/figma/sage.png',
    mobileImage: '/assets/figma/mobile-hero-sage.png',
    alt: 'Sage Nomad, arte digital da Kurio',
  },
  {
    title: 'Ivory Baron',
    image: '/assets/figma/ivory.png',
    mobileImage: '/assets/figma/mobile-hero.png',
    alt: 'Ivory Baron, arte digital da Kurio',
  },
]

export function CatalogHero({
  authBackdrop = false,
}: {
  authBackdrop?: boolean
}) {
  const [activeSlide, setActiveSlide] = useState(0)
  const slide = heroSlides[activeSlide]
  return (
    <section className="catalog-hero" aria-labelledby="hero-title">
      <div className="hero-background mobile-only">
        <FigmaIcon name="mh-imgMaskGroup" />
      </div>
      <div className="hero-copy">
        <p className="hero-welcome">Bem-vindo à Kurio</p>
        <h1 id="hero-title">
          <span className="desktop-only">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </span>
          <span className="mobile-only">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </span>
        </h1>
        <p className="hero-description">
          <span className="desktop-only">
            {authBackdrop
              ? 'Descubra NFTs selecionados de criadores do mundo todo e colecione arte digital verificada.'
              : 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.'}
          </span>
          <span className="mobile-only">
            Descubra NFTs selecionados de criadores do mundo todo.
          </span>
        </p>
        <Button asChild className="hero-explore">
          <a href="#catalog">
            EXPLORAR{' '}
            <span className="mobile-only">
              <FigmaIcon name="mh-imgArrowRight" />
            </span>
          </a>
        </Button>
        {!authBackdrop && (
          <div
            className="hero-dots desktop-only"
            role="group"
            aria-label="Destaques"
          >
            {heroSlides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Mostrar destaque ${index + 1}: ${item.title}`}
                aria-current={activeSlide === index ? 'true' : undefined}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="hero-art">
        <img
          className="desktop-only"
          src={slide.image}
          width={450}
          height={450}
          alt={`${slide.title}, NFT em destaque. ${slide.alt}`}
          fetchPriority="high"
        />
        <img
          className="mobile-only mobile-hero-primary"
          src={slide.mobileImage}
          width={138}
          height={138}
          alt={`${slide.title}, NFT em destaque`}
          fetchPriority="high"
        />
        {activeSlide === 0 && (
          <img
            className="mobile-only mobile-hero-secondary"
            src="/assets/figma/mobile-hero-sage.png"
            width={58}
            height={58}
            alt="Sage Nomad"
          />
        )}
      </div>
      {!authBackdrop && (
        <div
          className="hero-mobile-dots mobile-only"
          role="group"
          aria-label="Destaques"
        >
          {heroSlides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Mostrar destaque ${index + 1}: ${item.title}`}
              aria-current={activeSlide === index ? 'true' : undefined}
              onClick={() => setActiveSlide(index)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
