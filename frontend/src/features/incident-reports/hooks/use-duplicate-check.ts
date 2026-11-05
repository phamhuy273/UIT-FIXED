import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { checkDuplicates, type DuplicateInput } from '../api/duplicates.api';

export function useDuplicateCheck(input: DuplicateInput) {
  const userId = useAuthStore((state) => state.user?.id);
  const key = JSON.stringify(input);
  const [debouncedKey, setDebouncedKey] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKey(key), 1000);
    return () => clearTimeout(timer);
  }, [key]);
  const eligible = input.locationId > 0 && input.categoryId > 0 && input.title.trim().length >= 5 && input.description.trim().length >= 10;
  const query = useQuery({
    queryKey: ['report-duplicates', userId, key],
    queryFn: ({ signal }) => checkDuplicates(JSON.parse(key) as DuplicateInput, signal),
    enabled: eligible && key === debouncedKey,
    retry: false, staleTime: 15_000, gcTime: 60_000, refetchOnWindowFocus: false,
  });
  return { key, eligible, query, waiting: eligible && key !== debouncedKey };
}
