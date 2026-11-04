import { useLocations } from '../hooks/use-master-data';
import { LocationCascade, type LocationCascadeProps } from './location-cascade';

export type LocationSelectorProps = Omit<LocationCascadeProps, 'buildings' | 'loading' | 'loadError' | 'onRetry'>;

export function LocationSelector(props: LocationSelectorProps) {
  const query = useLocations();
  return <LocationCascade {...props} buildings={query.data ?? []} loading={query.isPending}
    loadError={query.isError} onRetry={() => { void query.refetch(); }} />;
}
