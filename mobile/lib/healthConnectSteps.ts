import { Platform } from 'react-native'
import Constants from 'expo-constants'
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  type Permission,
} from 'react-native-health-connect'
import { istDayTimeRange } from '@/lib/ist'

const STEPS_READ: Permission = { accessType: 'read', recordType: 'Steps' }

export type HealthConnectSupport =
  | { kind: 'unsupported_platform' }
  | { kind: 'expo_go' }
  | { kind: 'sdk_unavailable'; status: number }
  | { kind: 'not_initialized' }
  | { kind: 'permission_denied' }
  | { kind: 'ready' }

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo'
}

function hasStepsRead(
  granted: { accessType?: string; recordType?: string }[],
): boolean {
  return granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps')
}

export async function resolveHealthConnectSupport(): Promise<HealthConnectSupport> {
  if (Platform.OS !== 'android') return { kind: 'unsupported_platform' }
  if (isExpoGo()) return { kind: 'expo_go' }

  const status = await getSdkStatus()
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return { kind: 'sdk_unavailable', status }
  }

  const ok = await initialize()
  if (!ok) return { kind: 'not_initialized' }

  const granted = await getGrantedPermissions()
  if (!hasStepsRead(granted)) return { kind: 'permission_denied' }

  return { kind: 'ready' }
}

export async function requestHealthConnectStepsAccess(): Promise<HealthConnectSupport> {
  if (Platform.OS !== 'android') return { kind: 'unsupported_platform' }
  if (isExpoGo()) return { kind: 'expo_go' }

  const status = await getSdkStatus()
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return { kind: 'sdk_unavailable', status }
  }

  const ok = await initialize()
  if (!ok) return { kind: 'not_initialized' }

  const granted = await requestPermission([STEPS_READ])
  if (!hasStepsRead(granted)) return { kind: 'permission_denied' }

  return { kind: 'ready' }
}

/** Total step count for the current IST day from Health Connect. */
export async function readTodayStepCount(): Promise<number> {
  const support = await resolveHealthConnectSupport()
  if (support.kind !== 'ready') {
    throw new Error(healthConnectSupportMessage(support))
  }

  const timeRangeFilter = {
    operator: 'between' as const,
    ...istDayTimeRange(),
  }

  const result = await aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter,
  })

  return result.COUNT_TOTAL ?? 0
}

export function healthConnectSupportMessage(support: HealthConnectSupport): string {
  switch (support.kind) {
    case 'unsupported_platform':
      return 'Health Connect is Android-only.'
    case 'expo_go':
      return 'Step sync needs a dev build (pnpm mobile:android:dev). Expo Go cannot load Health Connect.'
    case 'sdk_unavailable':
      return 'Install or update the Health Connect app from the Play Store, then try again.'
    case 'not_initialized':
      return 'Could not initialize Health Connect.'
    case 'permission_denied':
      return 'Allow MOVEGRID to read Steps in Health Connect.'
    case 'ready':
      return ''
  }
}
