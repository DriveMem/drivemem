import Link from "next/link"

export const metadata = {
  title: "Terms of Use - AI Drive",
  description: "AI Drive Terms of use and service agreement",
  openGraph: { title: "Terms of Use - AI Drive", description: "AI Drive Terms of use and service agreement" },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">AI Drive</Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Terms of Use</h1>
      <p className="mt-4 text-muted-foreground">Last updated: April 2026 · AI Drive</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Service scope</h2>
          <p>AI Drive is an AI-powered personal knowledge management platform. You can upload documents, and AI automatically parses, understands, and builds a knowledge index, allowing you to get analysis and answers about your file content through conversations at any time.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Free plan limits</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Storage: 5 GB</li>
            <li>Daily AI chats: 50</li>
            <li>Supported formats: PDF, Word, PPT, Excel, Markdown, TXT</li>
            <li>Single file size limit: 50 MB</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">User responsibility</h2>
          <p>You are responsible for the content you upload. Do not upload illegal, infringing, or inappropriate content. AI Drive reserves the right to suspend or terminate your account upon discovering violations.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">AI Answer disclaimer</h2>
          <p>AI 's answers are generated based on the content of your uploaded documents and may contain inaccuracies or omissions. AI Drive makes no guarantees about the accuracy of AI responses. Please refer to original documents for important decisions.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Service changes</h2>
          <p>AI Drive reserves the right to modify service features, pricing, and terms of use at any time. Significant changes will be communicated to registered users in advance.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p>If you have any questions, please contact support@ai-drive.net.</p>
        </section>
      </div>
      </div>
    </div>
  )
}
