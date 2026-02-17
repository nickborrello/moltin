'use client';

import { Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MatchBadgeProps {
  score: number;
  showLabel?: boolean;
}

export function MatchBadge({ score, showLabel = true }: MatchBadgeProps) {
  const getVariant = () => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'destructive';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Great Match';
    if (score >= 50) return 'Good Match';
    return 'Low Match';
  };

  return (
    <Badge
      variant={getVariant()}
      className="gap-1"
      title={`${score}% match: ${getScoreLabel()}`}
    >
      <Flame className="h-3 w-3" />
      {showLabel && <span>{score}%</span>}
      {!showLabel && <span className="sr-only">{score}% match</span>}
    </Badge>
  );
}
