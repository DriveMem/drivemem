"use client"

import { useState } from "react"

const faqs = [
  {
    q: "Is DriveMem really free?",
    a: "Yes! The Free plan includes everything you need to get started. No credit card, no trial period.",
  },
  {
    q: "Will my data be safe?",
    a: "Your data is encrypted at rest and in transit. We never use your data to train AI models.",
  },
  {
    q: "What happens when Pro launches?",
    a: "Your Free plan stays exactly the same. Pro adds more storage and team features on top.",
  },
]

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-3 max-w-xl mx-auto">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            {faq.q}
            <svg
              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
