"use client"

import { useState, useRef } from "react"
import { Upload } from "lucide-react"
import { FileUpload } from "./file-upload"

export function MobileUploadFab() {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#4F5BD5] text-white shadow-lg shadow-[#4F5BD5]/30 hover:bg-[#3D49C4] active:scale-95 transition-all md:hidden"
        aria-label="上传文件"
      >
        <Upload className="h-6 w-6" />
      </button>
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}
    </>
  )
}
