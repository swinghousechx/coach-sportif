export type SessionType = 'course' | 'salle'

export interface Exercise {
  name: string
  sets: string
  target?: string
}

export interface Day {
  day: string
  type: SessionType
  title: string
  detail?: string
  exercises?: Exercise[]
  note?: string
  done?: boolean
}

export interface Program {
  blockName: string
  blockValidUntil: string // ISO date "YYYY-MM-DD"
  weekNumber: number
  weekOfBlock: string
  priority: string
  runningRule: string
  days: Day[]
  nutrition: string
  progression: string
  vigilance: string
}
