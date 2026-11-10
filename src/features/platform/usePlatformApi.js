import { useEffect, useState } from 'react'
import { api } from '../../shared/api/client'

export function usePlatformApi(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const next = await api(path)
        if (alive) setData(next)
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [path])

  return { data, loading, error }
}
