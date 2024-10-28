import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface LatencyChartProps {
  latencies: number[];
}

const LatencyChart: React.FC<LatencyChartProps> = ({ latencies }) => {
  const data = {
    labels: latencies.map((_, index) => index + 1),
    datasets: [
      {
        label: '응답 지연 시간 (ms)',
        data: latencies,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '응답 지연 시간 분포',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return <Line options={options} data={data} />;
};

export default LatencyChart;

