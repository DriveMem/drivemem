"use client"

import { useEffect, useState } from "react"
import { UserPlus, MoreHorizontal, Shield } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  email: string
  avatar?: string
  role: "owner" | "admin" | "member" | "viewer"
}

const ROLES = ["admin", "member", "viewer"] as const
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  member: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  viewer: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export default function MembersPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [members, setMembers] = useState<Member[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("member")
  const [inviting, setInviting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)

  const wsId = currentWorkspace?.id

  const fetchMembers = async () => {
    if (!wsId) return
    try {
      const data = await apiFetch(`/api/v1/workspaces/${wsId}/members`)
      setMembers(data?.members ?? data ?? [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wsId || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await apiFetch(`/api/v1/workspaces/${wsId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      setInviteEmail("")
      setInviteOpen(false)
      fetchMembers()
    } catch {
      // error handled by apiFetch
    } finally {
      setInviting(false)
    }
  }

  const handleChangeRole = async (member: Member, role: string) => {
    if (!wsId) return
    try {
      await apiFetch(`/api/v1/workspaces/${wsId}/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      })
      fetchMembers()
    } catch {
      // silent
    }
  }

  const handleRemove = async () => {
    if (!wsId || !removeTarget) return
    try {
      await apiFetch(`/api/v1/workspaces/${wsId}/members/${removeTarget.id}`, {
        method: "DELETE",
      })
      setRemoveTarget(null)
      fetchMembers()
    } catch {
      // silent
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Members</h1>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {member.avatar ? (
                <img src={member.avatar} alt="" className="h-9 w-9 rounded-full" />
              ) : (
                member.name?.charAt(0)?.toUpperCase() || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{member.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{member.email}</p>
            </div>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", ROLE_COLORS[member.role] || ROLE_COLORS.member)}>
              {member.role}
            </span>
            {member.role !== "owner" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ROLES.filter((r) => r !== member.role).map((role) => (
                    <DropdownMenuItem key={role} onClick={() => handleChangeRole(member, role)}>
                      <Shield className="h-3.5 w-3.5 mr-2" />
                      Make {role}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem className="text-red-600" onClick={() => setRemoveTarget(member)}>
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">No members yet</div>
        )}
      </div>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!inviteEmail.trim() || inviting}>
                {inviting ? "Inviting…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to remove <strong>{removeTarget?.name}</strong> from this workspace?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
