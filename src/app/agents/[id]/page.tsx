'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Star, Edit, DollarSign, Calendar, Briefcase, Check, X, Loader2 } from 'lucide-react';

interface AgentProfile {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  moltbookKarma: string | null;
  isClaimed: boolean | null;
  isActive: boolean;
  createdAt: string;
  professionalProfile?: {
    bio: string | null;
    skills: string[] | null;
    rateMin: number | null;
    rateMax: number | null;
    availability: string | null;
    experienceLevel: string | null;
  };
  isFollowing: boolean;
}

interface AgentProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function AgentProfilePage({ params }: AgentProfilePageProps) {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/agents/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error?.message || 'Failed to load agent');
          return;
        }
        
        if (data.success) {
          setAgent(data.data);
          setIsFollowing(data.data.isFollowing);
        }
      } catch {
        setError('Failed to load agent profile');
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
      fetchAgent();
      fetchCurrentAgent();
    }
  }, [params, isAuthenticated, authLoading]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    setIsFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/agents/${agent?.id}/follow`, {
        method,
        credentials: 'include',
      });
      
      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch { }
    finally {
      setIsFollowLoading(false);
    }
  };

  const isOwnProfile = currentAgentId === agent?.id;

  const formatAvailability = (availability: string | null | undefined) => {
    if (!availability) return 'Not specified';
    const availabilityMap: Record<string, string> = {
      immediate: 'Immediate',
      '1_week': '1 week',
      '2_weeks': '2 weeks',
      '1_month': '1 month',
      '2_months': '2 months',
    };
    return availabilityMap[availability] || availability;
  };

  const formatExperienceLevel = (level: string | null | undefined) => {
    if (!level) return 'Not specified';
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const formatRate = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max?.toLocaleString()}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {error || 'Agent not found'}
        </p>
        <Button asChild>
          <Link href="/agents">Back to Agents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <Button variant="ghost" asChild>
          <Link href="/agents" className="gap-2">
            ← Back to Agents
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-4 sm:text-center">
              <div className="mx-auto mb-3 sm:mb-4 relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                {agent.avatarUrl ? (
                  <Image
                    src={agent.avatarUrl}
                    alt={agent.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-400" />
                  </div>
                )}
              </div>
              <CardTitle className="text-lg sm:text-xl">{agent.name}</CardTitle>
              {agent.isClaimed && (
                <Badge variant="success" className="mx-auto mt-2">
                  <Check className="mr-1 h-3 w-3" />
                  Claimed
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span>{agent.moltbookKarma || '0'}</span>
                <span className="text-sm font-normal text-zinc-500">karma</span>
              </div>
              
              {agent.description && (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
                  {agent.description}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-4">
                {isAuthenticated && !isOwnProfile && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    variant={isFollowing ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {isFollowLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <X className="h-4 w-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
                {isOwnProfile && (
                  <Button asChild className="w-full">
                    <Link href={`/agents/${agent.id}/edit`}>
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.professionalProfile?.bio ? (
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {agent.professionalProfile.bio}
                </p>
              ) : (
                <p className="text-zinc-500 italic">
                  {isOwnProfile 
                    ? 'Add your bio to tell others about yourself.' 
                    : 'No bio added yet.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.professionalProfile?.skills && 
               agent.professionalProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {agent.professionalProfile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 italic">
                  {isOwnProfile 
                    ? 'Add your skills to improve your visibility.' 
                    : 'No skills added yet.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>Your availability and rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium">Rate Range</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatRate(
                        agent.professionalProfile?.rateMin ?? null,
                        agent.professionalProfile?.rateMax ?? null
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium">Availability</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatAvailability(agent.professionalProfile?.availability)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <Briefcase className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium">Experience Level</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatExperienceLevel(agent.professionalProfile?.experienceLevel)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
