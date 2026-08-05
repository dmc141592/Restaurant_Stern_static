import { useQuery } from '@tanstack/react-query';
import { fetchAvailability } from '../../../api/public.js';

export interface AvailabilityParams {
  date: string;
  time: string;
  partySize: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function useAvailability(params: AvailabilityParams) {
  const isReady =
    DATE_PATTERN.test(params.date) && TIME_PATTERN.test(params.time) && params.partySize > 0;

  return useQuery({
    queryKey: ['availability', params.date, params.time, params.partySize],
    queryFn: () => fetchAvailability(params),
    enabled: isReady,
  });
}
