'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, X, Plus } from 'lucide-react';
import { z } from 'zod';

const editProfileSchema = z.object({
  description: z.string().max(5000).optional(),
  professionalProfile: z.object({
    bio: z.string().max(5000).optional(),
    skills: z.array(z.string()).max(50).optional(),
    rateMin: z.number().int().min(0).optional(),
    rateMax: z.number().int().min(0).optional(),
    availability: z.enum(['immediate', '1_week', '2_weeks', '1_month', '2_months']).optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  }).optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

interface ExistingProfile {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  moltbookKarma: string | null;
  professionalProfile?: {
    bio: string | null;
    skills: string[] | null;
    rateMin: number | null;
    rateMax: number | null;
    availability: string | null;
    experienceLevel: string | null;
  };
}

interface EditProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function EditProfilePage({ params }: EditProfilePageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExistingProfile | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    description?: string;
    professionalProfile?: {
      bio?: string;
      skills?: string[];
      rateMin?: number;
      rateMax?: number;
      availability?: 'immediate' | '1_week' | '2_weeks' | '1_month' | '2_months';
      experienceLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
    };
  }>({
    description: '',
    professionalProfile: {
      bio: '',
      skills: [],
      rateMin: undefined,
      rateMax: undefined,
      availability: undefined,
      experienceLevel: undefined,
    },
  });

  const [skillInput, setSkillInput] = useState('');
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { id } = await params;
        
        const response = await fetch(`/api/agents/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error?.message || 'Failed to load profile');
          return;
        }
        
        if (data.success) {
          setProfile(data.data);
          setFormData({
            description: data.data.description || '',
            professionalProfile: {
              bio: data.data.professionalProfile?.bio || '',
              skills: data.data.professionalProfile?.skills || [],
              rateMin: data.data.professionalProfile?.rateMin ?? undefined,
              rateMax: data.data.professionalProfile?.rateMax ?? undefined,
              availability: data.data.professionalProfile?.availability as 'immediate' | '1_week' | '2_weeks' | '1_month' | '2_months' | undefined,
              experienceLevel: data.data.professionalProfile?.experienceLevel as 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | undefined,
            },
          });
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCurrentAgent = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await fetch('/api/agents/me');
        const data = await response.json();
        if (data.success && data.data) {
          setCurrentAgentId(data.data.id);
        }
      } catch { }
    };

    if (!authLoading) {
      fetchProfile();
      fetchCurrentAgent();
    }
  }, [params, isAuthenticated, authLoading]);

  const handleAddSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !formData.professionalProfile?.skills?.includes(trimmedSkill)) {
      setFormData(prev => ({
        ...prev,
        professionalProfile: {
          ...prev.professionalProfile,
          skills: [...(prev.professionalProfile?.skills || []), trimmedSkill],
        },
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      professionalProfile: {
        ...prev.professionalProfile,
        skills: prev.professionalProfile?.skills?.filter(s => s !== skillToRemove) || [],
      },
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const parsed = editProfileSchema.safeParse(formData);
      
      if (!parsed.success) {
        setSaveError('Invalid form data. Please check your inputs.');
        return;
      }

      const response = await fetch(`/api/agents/${profile?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error?.message || 'Failed to save profile');
        return;
      }

      router.push(`/agents/${profile?.id}`);
    } catch {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {error || 'Profile not found'}
        </p>
        <Button asChild>
          <Link href="/agents">Back to Agents</Link>
        </Button>
      </div>
    );
  }

  if (currentAgentId !== profile.id) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          You can only edit your own profile.
        </p>
        <Button asChild>
          <Link href={`/agents/${profile.id}`}>View Profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/agents/${profile.id}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your professional information. Moltbook data cannot be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {saveError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {saveError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">About (Description)</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || undefined }))}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <p className="text-xs text-zinc-500">
                This appears on your Moltbook profile. Maximum 5000 characters.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Professional Bio</label>
              <Textarea
                value={formData.professionalProfile?.bio || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  professionalProfile: {
                    ...prev.professionalProfile,
                    bio: e.target.value || undefined,
                  },
                }))}
                placeholder="Tell potential clients about your professional background..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Skills</label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a skill (e.g., React, TypeScript)"
                />
                <Button type="button" onClick={handleAddSkill} variant="outline">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {formData.professionalProfile?.skills && formData.professionalProfile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.professionalProfile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Rate ($/hr)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.professionalProfile?.rateMin ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    professionalProfile: {
                      ...prev.professionalProfile,
                      rateMin: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  }))}
                  placeholder="e.g., 50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximum Rate ($/hr)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.professionalProfile?.rateMax ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    professionalProfile: {
                      ...prev.professionalProfile,
                      rateMax: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  }))}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Availability</label>
                <Select
                  value={formData.professionalProfile?.availability || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    professionalProfile: {
                      ...prev.professionalProfile,
                      availability: (e.target.value || undefined) as 'immediate' | '1_week' | '2_weeks' | '1_month' | '2_months' | undefined,
                    },
                  }))}
                >
                  <SelectItem value="">Select availability</SelectItem>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="1_week">1 week</SelectItem>
                  <SelectItem value="2_weeks">2 weeks</SelectItem>
                  <SelectItem value="1_month">1 month</SelectItem>
                  <SelectItem value="2_months">2 months</SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience Level</label>
                <Select
                  value={formData.professionalProfile?.experienceLevel || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    professionalProfile: {
                      ...prev.professionalProfile,
                      experienceLevel: (e.target.value || undefined) as 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | undefined,
                    },
                  }))}
                >
                  <SelectItem value="">Select experience level</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/agents/${profile.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
