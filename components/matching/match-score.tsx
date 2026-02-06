interface MatchScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function MatchScore({ score, size = 'md' }: MatchScoreProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  }

  return (
    <span
      className={`${getColor(score)} text-white rounded-full font-semibold ${sizeClasses[size]}`}
    >
      {score}% Match
    </span>
  )
}
