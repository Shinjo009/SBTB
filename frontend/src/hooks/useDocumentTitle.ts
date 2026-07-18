import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} · Scrunchies By The Bunch` : 'Scrunchies By The Bunch'
    return () => { document.title = prev }
  }, [title])
}
