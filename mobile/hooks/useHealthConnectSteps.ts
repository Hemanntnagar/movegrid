import { movegridApi } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import {
  healthConnectSupportMessage,
  readTodayStepCount,
  requestHealthConnectStepsAccess,
  resolveHealthConnectSupport,
  type HealthConnectSupport,
} from '@/lib/healthConnectSteps'

type UseHealthConnectStepsOptions = {
  token: string | null
  serverSteps?: number
  onSynced?: () => void
}

export function useHealthConnectSteps({ token, serverSteps = 0, onSynced }: UseHealthConnectStepsOptions) {
  const [support, setSupport] = useState<HealthConnectSupport | null>(null)
  const [deviceSteps, setDeviceSteps] = useState<number | null>(null)
  const [checking, setChecking] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSupport = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      const next = await resolveHealthConnectSupport()
      setSupport(next)
      if (next.kind === 'ready') {
        const steps = await readTodayStepCount()
        setDeviceSteps(steps)
      } else {
        setDeviceSteps(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Health Connect check failed')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    refreshSupport()
  }, [refreshSupport])

  const connect = useCallback(async () => {
    setError(null)
    setChecking(true)
    try {
      const next = await requestHealthConnectStepsAccess()
      setSupport(next)
      if (next.kind !== 'ready') {
        setError(healthConnectSupportMessage(next))
        return
      }
      const steps = await readTodayStepCount()
      setDeviceSteps(steps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect Health Connect')
    } finally {
      setChecking(false)
    }
  }, [])

  const syncToServer = useCallback(async () => {
    if (!token) return
    setSyncing(true)
    setError(null)
    try {
      const steps = await readTodayStepCount()
      setDeviceSteps(steps)
      await movegridApi.syncSteps(token, steps)
      onSynced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Step sync failed')
    } finally {
      setSyncing(false)
    }
  }, [token, onSynced])

  const canSync = support?.kind === 'ready' && Boolean(token)
  const needsConnect = support?.kind === 'permission_denied'

  return {
    support,
    deviceSteps,
    serverSteps,
    checking,
    syncing,
    error,
    canSync,
    needsConnect,
    connect,
    syncToServer,
    refreshSupport,
  }
}
