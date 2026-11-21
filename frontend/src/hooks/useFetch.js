import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../services/api'

/** GET helper: const { data, loading, error, reload } = useFetch('/facilities/', { params }) */
export default function useFetch(url, { params, enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const key = JSON.stringify(params || {})
  const load = useCallback(async () => {
    if (!enabled || !url) return
    setLoading(true); setError('')
    try { const r = await api.get(url, { params: params || undefined }); setData(r.data) }
    catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, enabled])
  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load, setData }
}
