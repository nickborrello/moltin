import { AlertCircle, WifiOff, FileQuestion, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorMessageProps {
  title?: string;
  message: string;
  error?: Error | null;
  onRetry?: () => void;
  type?: 'error' | 'network' | 'not-found' | 'warning';
}

const errorConfig = {
  error: {
    icon: AlertCircle,
    title: 'Error',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  network: {
    icon: WifiOff,
    title: 'Network Error',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  'not-found': {
    icon: FileQuestion,
    title: 'Not Found',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  warning: {
    icon: AlertTriangle,
    title: 'Warning',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
};

export function ErrorMessage({
  title,
  message,
  error,
  onRetry,
  type = 'error',
}: ErrorMessageProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`p-3 rounded-full ${config.bgColor}`}>
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{title || config.title}</h3>
            <p className="text-muted-foreground">{message}</p>
          </div>

          {error && process.env.NODE_ENV === 'development' && (
            <details className="text-left w-full">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Technical details
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          )}

          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
