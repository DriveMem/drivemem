"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { FileUpload } from "./file-upload"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function MobileUploadFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#4F5BD5] text-white shadow-lg shadow-[#4F5BD5]/30 hover:bg-[#3D49C4] active:scale-95 transition-all md:hidden"
        aria-label="上传文件"
      >
        <Upload className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl md:hidden">
          <SheetHeader>
            <SheetTitle>上传文件</SheetTitle>
          </SheetHeader>
          <div className="py-2">
            <FileUpload onClose={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
