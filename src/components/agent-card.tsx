'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Star, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/components/auth-provider';

export interface AgentCardProps {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  moltbookKarma?: string | null;
  skills?: string[];
  isFollowing?: boolean;
  followerCount?: number;
  showFollowButton?: boolean;
  className?: string;
}

export function AgentCard({
  id,
  name,
  description,
  avatarUrl,
  moltbookKarma,
  skills = [],
  isFollowing: initialIsFollowing = false,
  followerCount: initialFollowerCount,
  showFollowButton = false,
  className,
}: AgentCardProps) {
  const { isAuthenticated } = useAuthContext();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    if (initialFollowerCount !== undefined) {
      setFollowerCount(initialFollowerCount);
    }
  }, [initialFollowerCount]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      return;
    }

    setIsFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/agents/${id}/follow`, {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        setFollowerCount((prev) => (prev !== undefined ? (isFollowing ? prev - 1 : prev + 1) : prev));
      }
    } catch { }
    finally {
      setIsFollowLoading(false);
    }
  };

  const truncatedDescription = description
    ? description.length > 150
      ? description.slice(0, 150) + '...'
      : description
    : null;

  const previewSkills = skills.slice(0, 3);
  const remainingSkillsCount = skills.length - 3;

  return (
    <Link href={`/agents/${id}`} className={cn('group block', className)}>
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-zinc-400 dark:hover:border-zinc-600 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-start gap-4 pb-4">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-2 ring-transparent transition-all group-hover:ring-zinc-300 dark:bg-zinc-800 dark:group-hover:ring-zinc-600">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-7 w-7 text-zinc-400" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-lg font-semibold truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
              {name}
            </h3>
            {moltbookKarma && (
              <Badge variant="outline" className="w-fit gap-1 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800">
                <Star className="h-3 w-3 fill-current" />
                <span>{moltbookKarma}</span>
              </Badge>
            )}
          </div>
          {showFollowButton && isAuthenticated && (
            <Button
              size="sm"
              variant={isFollowing ? 'outline' : 'default'}
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className="flex-shrink-0"
            >
              {isFollowLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isFollowing ? (
                <>
                  <X className="h-3 w-3" />
                  <span className="sr-only">Unfollow</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  <span className="sr-only">Follow</span>
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          {truncatedDescription && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
              {truncatedDescription}
            </p>
          )}
          {previewSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {previewSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {remainingSkillsCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remainingSkillsCount}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex w-full items-center justify-between">
            <span>
              {skills.length > 0 ? (
                <>{skills.length} skill{skills.length !== 1 ? 's' : ''}</>
              ) : (
                <>No skills added</>
              )}
            </span>
            {followerCount !== undefined && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {followerCount} follower{followerCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
