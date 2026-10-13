import React from 'react'

type Media = { url?: string | null; alt?: string | null; filename?: string | null }

function mediaUrl(image: unknown): { src?: string; alt?: string } {
  if (!image || typeof image !== 'object') return {}
  const media = image as Media
  return {
    src: media.url || (media.filename ? `/api/media/file/${media.filename}` : undefined),
    alt: media.alt || '',
  }
}

export function RenderBlocks({ blocks }: { blocks?: Array<Record<string, unknown>> | null }) {
  if (!blocks?.length) return null
  return (
    <div className="blocks">
      {blocks.map((block, index) => {
        const key = String(block.id || index)
        if (block.blockType === 'richText') {
          return (
            <section key={key} className="block-richtext">
              <pre>{JSON.stringify(block.content)}</pre>
            </section>
          )
        }
        if (block.blockType === 'banner') {
          const image = mediaUrl(block.image)
          return (
            <section key={key} className="block-banner">
              {image.src ? <img src={image.src} alt={image.alt || String(block.heading || '')} /> : null}
              {block.heading ? <h2>{String(block.heading)}</h2> : null}
              {block.text ? <p>{String(block.text)}</p> : null}
            </section>
          )
        }
        if (block.blockType === 'slider') {
          const slides = Array.isArray(block.slides) ? block.slides : []
          return (
            <section key={key} className="block-slider">
              {slides.map((slide, slideIndex) => {
                const row = slide as Record<string, unknown>
                const image = mediaUrl(row.image)
                return (
                  <article key={slideIndex}>
                    {image.src ? <img src={image.src} alt={image.alt || String(row.heading || '')} /> : null}
                    {row.heading ? <h3>{String(row.heading)}</h3> : null}
                  </article>
                )
              })}
            </section>
          )
        }
        if (block.blockType === 'logoSlider') {
          const logos = Array.isArray(block.logos) ? block.logos : []
          return (
            <section key={key} className="block-logos">
              {logos.map((logo, logoIndex) => {
                const row = logo as Record<string, unknown>
                const image = mediaUrl(row.image)
                return image.src ? <img key={logoIndex} src={image.src} alt={String(row.alt || '')} /> : null
              })}
            </section>
          )
        }
        return null
      })}
    </div>
  )
}
