import { movegridApi } from '@movegrid/api-client'
import { useCallback, useEffect, useState } from 'react'
import {
  nativeStepCounter,
  type NativeStepSupport,
} from '@/lib/nativeSteps/nativeStepCounter'

type UseNativeStepsOptions = {
  token: string | null
  serverSteps?: number
  onSynced?: () => void
}

export function nativeStepSupportMessage(support: NativeStepSupport | null): string {
  if (!support) return ''
  switch (support.kind) {
    case 'checking':
      return 'Checking step sensors…'
    case 'unavailable':
      return 'This device has no step counter / pedometer sensor.'
    case 'permission_denied':
      return support.canAskAgain
        ? 'Allow physical activity / motion access to count steps.'
        : 'Step permission denied. Enable Activity recognition (Android) or Motion & Fitness (iOS) in Settings.'
    case 'ready':
      return ''
  }
}

export function useNativeSteps({ token, serverSteps = 0, onSynced }: UseNativeStepsOptions) {
  const [support, setSupport] = useState<NativeStepSupport | null>(null)
  const [deviceSteps, setDeviceSteps] = useState<number | null>(null)
  const [checking, setChecking] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setChecking(true)
    const unsubSteps = nativeStepCounter.subscribe((steps) => {
      setDeviceSteps(steps)
    })
    const unsubSupport = nativeStepCounter.subscribeSupport((next) => {
      setSupport(next)
      setChecking(next.kind === 'checking')
    })

    void nativeStepCounter.start().finally(() => {
      setChecking(false)
    })

    return () => {
      unsubSteps()
      unsubSupport()
    }
  }, [])

  const refreshSupport = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      const steps = await nativeStepCounter.refresh()
      setDeviceSteps(steps)
      setSupport(nativeStepCounter.getSupport())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Step refresh failed')
    } finally {
      setChecking(false)
    }
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    setChecking(true)
    try {
      const next = await nativeStepCounter.requestPermission()
      setSupport(next)
      if (next.kind !== 'ready') {
        setError(nativeStepSupportMessage(next))
        return
      }
      const steps = await nativeStepCounter.refresh()
      setDeviceSteps(steps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable step tracking')
    } finally {
      setChecking(false)
    }
  }, [])

  const syncToServer = useCallback(async () => {
    if (!token) return
    setSyncing(true)
    setError(null)
    try {
      const steps = await nativeStepCounter.refresh()
      setDeviceSteps(steps)
      await movegridApi.syncSteps(token, steps)
      onSynced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Step sync failed')
    } finally {
      setSyncing(false)
    }
  }, [token, onSynced])

  const needsConnect = support?.kind === 'permission_denied'
  const canSync =
    Boolean(token) && deviceSteps != null && support?.kind !== 'permission_denied' && support?.kind !== 'checking'

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
