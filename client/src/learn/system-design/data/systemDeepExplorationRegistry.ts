// Complete End-to-End Deep Architectural Exploration Registry for all 31 Systems
// Provides textbook-grade Staff+ explanations of every component, connection, request lifecycle,
// database schema, failure recovery playbook, and capacity calculation.

import { CORE_DEEP_EXPLORATION } from './exploration/coreDeepExploration'
import { SOCIAL_DEEP_EXPLORATION } from './exploration/socialDeepExploration'
import { MEDIA_STORAGE_DEEP_EXPLORATION } from './exploration/mediaAndStorageDeepExploration'
import { FINTECH_DEEP_EXPLORATION } from './exploration/fintechDeepExploration'
import { GEOSPATIAL_DEEP_EXPLORATION } from './exploration/geospatialDeepExploration'
import { INFRA_DEEP_EXPLORATION } from './exploration/infraDeepExploration'

export interface LifecycleStep {
  stepNumber: number
  component: string
  action: string
  latencyEstimate: string
  protocol: string
}

export interface SystemDataModel {
  storageType: string
  entity: string
  primaryKey: string
  partitionKey: string
  schemaDefinition: string
  indexingRationale: string
}

export interface ArchitecturalDecision {
  decision: string
  chosenApproach: string
  rejectedAlternative: string
  rationale: string
}

export interface FailureModePlaybook {
  failureScenario: string
  impact: string
  detectionMechanism: string
  automatedRecovery: string
}

export interface CapacitySizingItem {
  metric: string
  assumption: string
  calculation: string
  finalRequirement: string
}

export interface SystemDeepExploration {
  systemId: string
  executiveArchitectureSummary: string
  problemStatementAndWhyHard: string
  readPathLifecycle: LifecycleStep[]
  writePathLifecycle: LifecycleStep[]
  dataStorageAndSchemaDesign: SystemDataModel[]
  keyTradeoffsAndDecisions: ArchitecturalDecision[]
  failureModesAndRecovery: FailureModePlaybook[]
  capacityCalculationsDeepDive: CapacitySizingItem[]
}

const ALL_31_EXPLORATIONS: Record<string, SystemDeepExploration> = {
  ...CORE_DEEP_EXPLORATION,
  ...SOCIAL_DEEP_EXPLORATION,
  ...MEDIA_STORAGE_DEEP_EXPLORATION,
  ...FINTECH_DEEP_EXPLORATION,
  ...GEOSPATIAL_DEEP_EXPLORATION,
  ...INFRA_DEEP_EXPLORATION,
}

// Aliases for compatibility
ALL_31_EXPLORATIONS['twitter'] = ALL_31_EXPLORATIONS['twitter-feed']
ALL_31_EXPLORATIONS['netflix'] = ALL_31_EXPLORATIONS['youtube-stream']
ALL_31_EXPLORATIONS['uber'] = ALL_31_EXPLORATIONS['uber-dispatch']
ALL_31_EXPLORATIONS['collaborative-editor'] = ALL_31_EXPLORATIONS['collab-docs']
ALL_31_EXPLORATIONS['s3-object-storage'] = ALL_31_EXPLORATIONS['object-storage']
ALL_31_EXPLORATIONS['distributed-job-scheduler'] = ALL_31_EXPLORATIONS['job-scheduler']

export const SYSTEM_DEEP_EXPLORATION_REGISTRY: Record<string, SystemDeepExploration> = ALL_31_EXPLORATIONS

export function getSystemDeepExploration(
  systemId: string,
  _systemName?: string,
  _category?: string
): SystemDeepExploration {
  return SYSTEM_DEEP_EXPLORATION_REGISTRY[systemId] || SYSTEM_DEEP_EXPLORATION_REGISTRY['tinyurl']
}

