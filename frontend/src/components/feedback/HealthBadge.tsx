import { Chip } from '@mui/material';

export type HealthStatus = 'on_track' | 'at_risk' | 'behind' | 'critical';

const LABELS: Record<HealthStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
  critical: 'Critical',
};

// MUI named colors for on_track/at_risk/critical; 'behind' gets a custom sx override
const CHIP_COLOR: Record<HealthStatus, 'success' | 'warning' | 'error' | 'default'> = {
  on_track: 'success',
  at_risk: 'warning',
  behind: 'default',
  critical: 'error',
};

interface Props {
  status: HealthStatus | string | null | undefined;
}

export const HealthBadge = ({ status }: Props) => {
  if (!status) return null;
  const key = status as HealthStatus;
  const label = LABELS[key] ?? status;
  const color = CHIP_COLOR[key] ?? 'default';
  const isBehind = key === 'behind';

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      sx={isBehind ? { bgcolor: '#f57c00', color: 'white', fontWeight: 500 } : { fontWeight: 500 }}
    />
  );
};
