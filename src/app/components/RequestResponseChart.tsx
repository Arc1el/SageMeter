import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface RequestResponseChartProps {
  requestCount: number;
  responseCount: number;
}

const RequestResponseChart: React.FC<RequestResponseChartProps> = ({ requestCount, responseCount }) => {
  const data = {
    labels: ['요청', '응답'],
    datasets: [
      {
        label: '수',
        data: [requestCount, responseCount],
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'],
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
        text: '요청 및 응답 수',
      },
    },
  };

  return <Bar options={options} data={data} />;
};

export default RequestResponseChart;

