'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EditProfile() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
    avatar_url: '',
    skills: [] as string[],
    profile_type: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setFormData({
          name: profile.name || '',
          headline: profile.headline || '',
          bio: profile.bio || '',
          location: profile.location || '',
          avatar_url: profile.avatar_url || '',
          skills: profile.skills || [],
          profile_type: profile.profile_type,
        })
      }
      setLoading(false)
    }

    loadProfile()
  }, [router, supabase])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !e.target.files || e.target.files.length === 0) {
        return
      }

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}/${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const response = await fetch(`/api/profiles/${session.user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        headline: formData.headline,
        bio: formData.bio,
        location: formData.location,
        avatar_url: formData.avatar_url,
        skills: formData.skills,
      }),
    })

    if (response.ok) {
      router.push(`/profile/${session.user.id}`)
      router.refresh()
    }
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-6">
          {formData.avatar_url ? (
            <img
              src={formData.avatar_url}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {formData.name.charAt(0)}
              </span>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:opacity-90"
            />
            {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
          </div>
        </div>

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

        {formData.profile_type === 'candidate' && (
          <div>
            <label className="block text-sm font-medium mb-2">Skills</label>
            <input
              type="text"
              value={formData.skills.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  skills: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full border rounded-md px-3 py-2 bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma separated</p>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
