import { Box, CircularProgress, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useGetSprintBurndownQuery } from '../../api/sprintApi';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  sprintId: number;
  sprintName: string;
}

export const BurndownChart = ({ sprintId, sprintName }: Props) => {
  const { data, isLoading, error } = useGetSprintBurndownQuery(sprintId);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Typography color="error" sx={{ py: 2 }}>
        Failed to load burndown data.
      </Typography>
    );
  }

  if (data.total_tasks === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        No tasks in this sprint yet.
      </Typography>
    );
  }

  const chartData = {
    labels: data.labels.map((d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Ideal',
        data: data.ideal,
        borderColor: '#9e9e9e',
        borderDash: [6, 3],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        fill: false,
      },
      {
        label: 'Actual',
        data: data.actual,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.08)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ctx.parsed.y !== null ? `${ctx.dataset.label}: ${ctx.parsed.y} tasks remaining` : '',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Tasks remaining' },
        ticks: { stepSize: 1 },
      },
      x: {
        title: { display: true, text: 'Date' },
      },
    },
  };

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {sprintName} · {data.sprint_start} – {data.sprint_end} · {data.total_tasks} tasks
      </Typography>
      <Line data={chartData} options={options} />
    </Box>
  );
};
