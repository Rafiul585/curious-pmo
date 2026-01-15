import { Chip } from '@mui/material';

const colorMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  'to-do': 'default',
  'in-progress': 'info',
  review: 'warning',
  done: 'success',
};

export const StatusBadge = ({ status }: { status: string }) => (
  <Chip size="small" label={status} color={colorMap[status] ?? 'default'} />
);
