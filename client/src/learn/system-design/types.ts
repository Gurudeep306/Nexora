export type SystemCategory =
  | 'Distributed Core'
  | 'High-Concurrency & Social'
  | 'Low-Latency & Streaming'
  | 'Storage & Databases'
  | 'Geospatial & Search'
  | 'Financial & Reliability'

export type NodeType =
  | 'client'
  | 'gateway'
  | 'service'
  | 'cache'
  | 'queue'
  | 'database'
  | 'storage'
  | 'worker'

export type ProtocolType =
  | 'HTTPS'
  | 'gRPC'
  | 'TCP'
  | 'WebSocket'
  | 'Kafka'
  | 'SQL'
  | 'Redis'
  | 'UDP'

export interface ServiceNode {
  id: string
  name: string
  role: string
  type: NodeType
  x: number // percentage 0 - 100 for responsive canvas
  y: number // percentage 0 - 100
  icon: string
  techStack: string
  details: string
  status?: 'idle' | 'active' | 'processing' | 'success' | 'warning'
}

export interface ServiceConnection {
  id: string
  from: string
  to: string
  label: string
  protocol: ProtocolType
  curvature?: number // For curved SVG bezier paths
}

export interface AnimationStep {
  step: number
  title: string
  description: string
  fromNode: string
  toNode: string
  protocol: ProtocolType
  payload: Record<string, any>
  codeRef: {
    file: string
    lineHighlight: string // e.g. "12-18"
    funcName: string
    codeExplanation: string
  }
  stateChange: string
  durationMs?: number
}

export interface CodeFile {
  name: string
  language: 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'sql' | 'lua'
  role: string
  code: string
}

export interface Calculation {
  metric: string
  formula: string
  result: string
}

export interface SystemDesignModel {
  id: string
  name: string
  category: SystemCategory
  difficulty: 'Intermediate' | 'Advanced' | 'Expert'
  tagline: string
  throughput: string
  latency: string
  storageScale: string
  overview: string
  functionalReqs: string[]
  nonFunctionalReqs: string[]
  calculations: Calculation[]
  services: ServiceNode[]
  connections: ServiceConnection[]
  animationSteps: AnimationStep[]
  codeFiles: CodeFile[]
  deepDive: {
    architectureSummary: string
    databaseSchema: string
    apiEndpoints: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS'
      path: string
      desc: string
      payload?: string
    }[]
    bottlenecksAndTradeoffs: string[]
  }
}

export interface TheoryChapter {
  id: string
  unitId: string
  unitTitle: string
  chapterNumber: number
  title: string
  readingTimeMin: number
  summary: string
  coreConcepts: string[]
  deepContentMarkdown: string
  equationsAndMath?: { name: string; formula: string; explanation: string }[]
  tradeoffMatrix?: { option: string; pros: string[]; cons: string[]; bestFor: string }[]
  interviewKeypoints: string[]
}

export interface TheoryUnit {
  id: string
  title: string
  blurb: string
  chapterCount: number
}
