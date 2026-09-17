import { soundPieces } from '../model'
import '../stories.css'

/**
 * The story's text, part by part. While it is still being written the block
 * says so to screen readers. The sounds the parent acts out are set in bold
 * (JUG-170): styled words only, with nothing drawn and nothing moving inside
 * the text.
 * @param {{ parts: string[][], done: boolean }} props
 */
export function StoryText({ parts, done }) {
  return (
    <div className="story" aria-busy={!done}>
      {parts.map((part, index) => (
        <section key={index} className="story__part" data-part={index}>
          {/* By position, since a story repeats a refrain word for word. */}
          {part.map((paragraph, line) => (
            <p key={line}>
              {soundPieces(paragraph).map((piece, at) =>
                piece.sound ? (
                  <b key={at} className="story-sound">
                    {piece.text}
                  </b>
                ) : (
                  piece.text
                ),
              )}
            </p>
          ))}
        </section>
      ))}
    </div>
  )
}
