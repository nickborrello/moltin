'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  debounceMs?: number;
  onSearch?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  isLoading = false,
  debounceMs = 300,
  onSearch,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Sync internal state with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    if (inputValue === value) return;

    setIsDebouncing(true);
    const timer = setTimeout(() => {
      onChange(inputValue);
      setIsDebouncing(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, value, onChange, debounceMs]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
  }, [onChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.();
  }, [onSearch]);

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="pr-10 pl-10"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {onSearch && (
        <Button type="submit" variant="default" size="sm" className="ml-2" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      )}
    </form>
  );
}
