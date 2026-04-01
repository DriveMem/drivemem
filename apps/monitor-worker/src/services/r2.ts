import type { Task, TaskStatus, MemoryListItem, AgentId } from '@ai-drive/shared-types';

export async function listTaskFiles(
  r2: R2Bucket,
  agentId: string,
  status: TaskStatus
): Promise<Task[]> {
  const prefix = `agents/${agentId}/tasks/${status}/`;
  try {
    const listed = await r2.list({ prefix });
    const tasks: Task[] = [];
    for (const obj of listed.objects) {
      if (!obj.key.endsWith('.json')) continue;
      try {
        const item = await r2.get(obj.key);
        if (!item) continue;
        const task = (await item.json()) as Task;
        tasks.push(task);
      } catch {
        // skip malformed files
      }
    }
    if (status === 'done') {
      tasks.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return tasks.slice(0, 20);
    }
    return tasks;
  } catch {
    return [];
  }
}

export async function getMemoryList(
  r2: R2Bucket,
  agentId: string,
  date: string
): Promise<MemoryListItem[]> {
  const prefix = `memory/${agentId}/${date}`;
  try {
    const listed = await r2.list({ prefix });
    return listed.objects.map((obj) => {
      const filename = obj.key.split('/').pop() || '';
      return {
        agent: agentId as AgentId,
        filename,
        date,
      };
    });
  } catch {
    return [];
  }
}

export async function getMemoryContent(
  r2: R2Bucket,
  agentId: string,
  filename: string
): Promise<string | null> {
  try {
    const obj = await r2.get(`memory/${agentId}/${filename}`);
    if (!obj) return null;
    return await obj.text();
  } catch {
    return null;
  }
}
