import { FileList } from "@/components/file/file-list"
import { MemoryOverview } from "@/components/dashboard/memory-overview"

export default function FilesPage() {
  return (
    <div className="flex flex-col h-full">
      <MemoryOverview />
      <div className="flex-1 min-h-0">
        <FileList />
      </div>
    </div>
  )
}
