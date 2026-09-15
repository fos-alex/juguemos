import '../stories.css'

/**
 * The story's text, part by part. While it is still being written the block
 * says so to screen readers.
 * @param {{ parts: string[][], done: boolean }} props
 */
export function StoryText({ parts, done }) {
  return (
    <div className="story" aria-busy={!done}>
      {parts.map((part, index) => (
        <section key={index} className="story__part" data-part={index}>
          {part.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
