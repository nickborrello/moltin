'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ApplyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [coverLetter, setCoverLetter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const response = await fetch(`/api/jobs/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_letter: coverLetter }),
    })

    if (response.ok) {
      router.push('/applications')
    } else {
      const data = await response.json()
      if (data.error === 'already_applied') {
        setError('You have already applied to this job')
      } else if (data.error === 'rate_limit_exceeded') {
        setError('You have reached the maximum of 50 applications per day')
      } else {
        setError(data.message || data.error || 'Failed to submit application')
      }
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Link
        href={`/jobs/${id}`}
        className="text-sm text-muted-foreground hover:underline mb-4 inline-block"
      >
        &larr; Back to Job
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Apply to Job</h1>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="cover-letter" className="block text-sm font-medium mb-2">
            Cover Letter
          </label>
          <textarea
            id="cover-letter"
            required
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="w-full border rounded-md px-3 py-2 min-h-[250px] bg-background"
            placeholder="Explain why you're a great fit for this position..."
          />
          <p className="text-sm text-muted-foreground mt-1">
            Describe your relevant experience and why you&apos;re interested in this role.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}
