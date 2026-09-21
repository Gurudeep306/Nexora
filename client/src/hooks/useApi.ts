import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { skip?: boolean } = {},
): ApiState<T> & { refetch: () => void; setData: React.Dispatch<React.SetStateAction<T | null>> } {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: !options.skip, error: null })
  const mounted = useRef(true)
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestId.current++
    }
  }, [])

  const load = useCallback(() => {
    const id = ++requestId.current
    if (options.skip) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcherRef
      .current()
      .then((data) => {
        if (mounted.current && id === requestId.current) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (mounted.current && id === requestId.current)
          setState({
            data: null,
            loading: false,
            error: err instanceof ApiError ? err.message : 'Failed to load data',
          })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.skip, ...deps])

  useEffect(load, [load])

  const setData = useCallback<React.Dispatch<React.SetStateAction<T | null>>>((value) => {
    setState((previous) => ({
      ...previous,
      data: typeof value === 'function'
        ? (value as (data: T | null) => T | null)(previous.data)
        : value,
    }))
  }, [])

  return { ...state, refetch: load, setData }
}
