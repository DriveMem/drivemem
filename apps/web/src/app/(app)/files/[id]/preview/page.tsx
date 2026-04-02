import { FilePreview } from "@/components/file/file-preview"

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FilePreview fileId={id} />
}
