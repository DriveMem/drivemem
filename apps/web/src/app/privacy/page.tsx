import Link from "next/link"

export const metadata = {
  title: "Privacy Policy — DriveMem",
  description: "DriveMem Privacy policy and data protection",
  openGraph: { title: "Privacy Policy — DriveMem", description: "DriveMem Privacy policy and data protection" },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-bold">DriveMem</Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Data Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">Last updated: April 2026 · DriveMem</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Data storage</h2>
          <p>Your uploaded files are stored on a MinIO object storage server located in China. File metadata and conversation records are stored in PostgreSQL. Vector indexes are stored in Qdrant.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Data isolation</h2>
          <p>Each user's files, conversations, and AI analysis data are completely isolated. Only you can access your data; other users cannot see or search your file content.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">How AI uses your data</h2>
          <p>When you upload files, AI automatically parses file content, generates summaries, and builds vector indexes for semantic search and conversations. This AI processing is limited to your account scope and your file content will not be used for training AI models or shared with third parties.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Third-party services</h2>
          <p>DriveMem uses Bailian API (Alibaba Cloud) for text embeddings and LLM conversations.Your file content fragments are sent to Bailian API for processing but are not stored or used for model training.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Data export</h2>
          <p>You can export all data (files + conversation history) as a ZIP archive at any time in Settings.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Delete account</h2>
          <p>You can delete your account at any time in Settings. After deletion, all files, conversations, and AI analysis data will be permanently removed and cannot be recovered.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact us</h2>
          <p>For privacy-related questions, please contact privacy@ai-drive.net.</p>
        </section>
      </div>
      </div>
    </div>
  )
}
