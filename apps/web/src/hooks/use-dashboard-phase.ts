/**
 * Dashboard phase & block visibility logic (Backlog #66)
 *
 * Phase 1 (files=0):  Welcome Hero + Quick Start Checklist only
 * Phase 2 (files=1-3): Welcome shrinks to banner, Files appear, CTA → "Connect AI Tool"
 * Phase 3 (has agent activity): Full Dashboard
 */

export type DashboardPhase = 1 | 2 | 3

export interface BlockVisibility {
  welcomeHero: boolean
  welcomeBanner: boolean
  quickStartChecklist: boolean
  files: boolean
  agentActivity: boolean
  recentActivity: boolean
  insights: boolean
  weeklyDigest: boolean
}

export interface ChecklistState {
  uploadFile: boolean
  connectAiTool: boolean
  askAi: boolean
  allDone: boolean
}

interface PhaseInput {
  fileCount: number
  hasAgentActivity: boolean
  totalActivityCount: number
  insightCount: number
  accountAgeDays: number
  /** From conversations or chat history */
  hasAskedAi: boolean
}

export function computeDashboardPhase(input: PhaseInput): DashboardPhase {
  if (input.fileCount === 0) return 1
  if (input.hasAgentActivity) return 3
  return 2
}

export function computeBlockVisibility(input: PhaseInput): BlockVisibility {
  const checklist = computeChecklist(input)
  return {
    welcomeHero: input.fileCount === 0,
    welcomeBanner: input.fileCount >= 1 && input.fileCount <= 3 && !input.hasAgentActivity,
    quickStartChecklist: input.fileCount < 5 && !checklist.allDone,
    files: input.fileCount >= 1,
    agentActivity: input.hasAgentActivity,
    recentActivity: input.totalActivityCount >= 3,
    insights: input.insightCount >= 3 || input.fileCount >= 3,
    weeklyDigest: input.accountAgeDays >= 7,
  }
}

export function computeChecklist(input: PhaseInput): ChecklistState {
  const uploadFile = input.fileCount >= 1
  const connectAiTool = input.hasAgentActivity
  const askAi = input.hasAskedAi
  return {
    uploadFile,
    connectAiTool,
    askAi,
    allDone: uploadFile && connectAiTool && askAi,
  }
}
