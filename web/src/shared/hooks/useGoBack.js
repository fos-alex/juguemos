import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'

/**
 * Back as the parent expects it: the previous screen when there is one (so
 * back from a new idea returns to the last idea), otherwise `fallback`.
 * @param {string} fallback
 * @param {Record<string, string>} [params]
 */
export function useGoBack(fallback, params) {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  return () => {
    if (canGoBack) router.history.back()
    else void navigate({ to: fallback, params, replace: true })
  }
}
