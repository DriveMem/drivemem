/** Agent 信息 — 包含状态、任务统计、最后心跳时间 */
export interface Agent {
  id: string;
  name: string;
  emoji: string;
  /** 当前状态：online=在线, busy=忙碌, offline=离线, unknown=未知 */
  status: 'online' | 'busy' | 'offline' | 'unknown';
  lastHeartbeat: string;
  /** 各状态的任务数量统计 */
  tasks: { queue: number; active: number; blocked: number; done: number };
  /** 当前正在执行的任务描述 */
  currentTask?: string;
}

/** 任务条目 — Agent 的单个任务 */
export interface Task {
  id: string;
  title: string;
  status: 'queue' | 'active' | 'blocked' | 'done';
  created_at: string;
  updated_at: string;
  /** 最近检查点描述 */
  checkpoint?: string;
}

/** Memory 蒸馏记录条目 */
export interface MemoryEntry {
  agent: string;
  filename: string;
  date: string;
  /** Markdown 内容（展开时加载） */
  content?: string;
}

