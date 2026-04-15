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
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 active:scale-95 transition-all md:hidden"
        aria-label="Upload files"
      >
        <Upload className="h-6 w-6" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl md:hidden">
          <SheetHeader>
            <SheetTitle>Upload files</SheetTitle>
          </SheetHeader>
          <div className="py-2">
            <FileUpload onClose={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
