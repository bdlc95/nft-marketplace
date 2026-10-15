// SVGs exportados do Figma: mantemos as dimensões intrínsecas de cada arquivo.
export function FigmaIcon({
  name,
  className = '',
}: {
  name: string
  className?: string
}) {
  return (
    <img
      src={`/assets/figma/${name}.svg`}
      alt=""
      aria-hidden="true"
      className={`figma-icon ${className}`}
    />
  )
}
