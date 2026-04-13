"use client"
import { useEffect } from "react"
import { FileList } from "@/components/file/file-list"

export default function FilesPage() {
  useEffect(() => { document.title = "文件 - DriveMem" }, [])
  return <FileList />
}
