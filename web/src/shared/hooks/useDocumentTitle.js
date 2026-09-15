import { useEffect } from 'react'

/**
 * Sets the tab and app-switcher title while the screen shows. With no title
 * yet (the data is still coming), the previous one stays.
 * @param {string | null | undefined | false} title
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}
