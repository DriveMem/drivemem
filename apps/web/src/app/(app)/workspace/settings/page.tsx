"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { apiFetch } from "@/lib/api"

export default function WorkspaceSettingsPage() {
  const { currentWorkspace, setCurrentWorkspace, setWorkspaces, workspaces } = useWorkspaceStore()
  const [name, setName] = useState(currentWorkspace?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  const wsId = currentWorkspace?.id
  const isOwner = currentWorkspace?.role === "owner"

  const handleSave = async () => {
    if (!wsId || !name.trim()) return
    setSaving(true)
    try {
      const data = await apiFetch(`/api/v1/workspaces/${wsId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      })
      setCurrentWorkspace(data)
      setWorkspaces(workspaces.map((ws) => (ws.id === wsId ? data : ws)))
    } catch {
      // error handled by apiFetch
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!wsId) return
    setDeleting(true)
    try {
      await apiFetch(`/api/v1/workspaces/${wsId}`, { method: "DELETE" })
      const remaining = workspaces.filter((ws) => ws.id !== wsId)
      setWorkspaces(remaining)
      if (remaining.length > 0) {
        setCurrentWorkspace(remaining[0])
      }
      setDeleteOpen(false)
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Workspace Settings</h1>

      <div className="space-y-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="space-y-2">
          <Label htmlFor="ws-name">Workspace Name</Label>
          <div className="flex gap-2">
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              maxLength={100}
            />
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Slug</Label>
          <p className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
            {currentWorkspace?.slug ?? "—"}
          </p>
        </div>

        <div className="space-y-1">
          <Label>Members</Label>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {currentWorkspace?.memberCount ?? "—"} members
          </p>
        </div>
      </div>

      {isOwner && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Permanently delete this workspace and all its data. This action cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete Workspace
          </Button>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Type <strong>{currentWorkspace?.name}</strong> to confirm deletion.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Workspace name"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== currentWorkspace?.name || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
