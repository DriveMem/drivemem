import { FileList } from "@/components/file/file-list"
import { MemoryOverview } from "@/components/dashboard/memory-overview"
import { KnowledgeLinks } from "@/components/dashboard/knowledge-links"

export default function FilesPage() {
  return (
    <div className="flex flex-col h-full">
      <MemoryOverview />
      <KnowledgeLinks />
      <div className="flex-1 min-h-0">
        <FileList />
      </div>
    </div>
  )
}
