import { useQuery } from '@tanstack/react-query';
import { getCategories, getLocations } from '../api/master-data.api';

export const masterDataKeys = {
  locations: ['master-data', 'locations'] as const,
  categories: ['master-data', 'categories'] as const,
};

export function useLocations() {
  return useQuery({ queryKey: masterDataKeys.locations, queryFn: ({ signal }) => getLocations(signal) });
}

export function useCategories() {
  return useQuery({ queryKey: masterDataKeys.categories, queryFn: ({ signal }) => getCategories(signal) });
}
