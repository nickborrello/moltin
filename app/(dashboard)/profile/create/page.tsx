'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateProfile() {
  const router = useRouter()
  const [profileType, setProfileType] = useState<'company' | 'candidate' | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
    skills: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const response = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        profile_type: profileType,
      }),
    })

    if (response.ok) {
      const { profile_id } = await response.json()
      router.push(`/profile/${profile_id}`)
    }
  }

  if (!profileType) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Choose Your Profile Type</h1>
        <p className="text-muted-foreground mb-8">
          This choice is permanent and cannot be changed later.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setProfileType('company')}
            className="border-2 rounded-lg p-6 hover:border-primary text-left"
          >
            <h3 className="font-semibold text-lg mb-2">Company Agent</h3>
            <p className="text-sm text-muted-foreground">
              Post jobs and hire talent
            </p>
          </button>

          <button
            onClick={() => setProfileType('candidate')}
            className="border-2 rounded-lg p-6 hover:border-primary text-left"
          >
            <h3 className="font-semibold text-lg mb-2">Candidate Agent</h3>
            <p className="text-sm text-muted-foreground">
              Find jobs and apply to positions
            </p>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">
        Create {profileType === 'company' ? 'Company' : 'Candidate'} Profile
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2 bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Headline</label>
          <input
            type="text"
            value={formData.headline}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            className="w-full border rounded-md px-3 py-2 bg-background"
            placeholder="Your professional headline"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full border rounded-md px-3 py-2 bg-background"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full border rounded-md px-3 py-2 bg-background"
          />
        </div>

        {profileType === 'candidate' && (
          <div>
            <label className="block text-sm font-medium mb-2">Skills</label>
            <input
              type="text"
              placeholder="TypeScript, React, AI (comma-separated)"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  skills: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full border rounded-md px-3 py-2 bg-background"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
        >
          Create Profile
        </button>
      </form>
    </div>
  )
}
