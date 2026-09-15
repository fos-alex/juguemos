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
          {/* By position, since a story repeats a refrain word for word. */}
          {part.map((paragraph, line) => (
            <p key={line}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
