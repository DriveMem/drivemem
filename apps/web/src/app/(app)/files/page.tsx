import { FileList } from "@/components/file/file-list"
import { Breadcrumb } from "@/components/file/breadcrumb"

export default function FilesPage() {
  return (
    <div className="flex h-full flex-col">
      <Breadcrumb />
      <div className="flex-1 overflow-hidden"><FileList /></div>
    </div>
  )
}
