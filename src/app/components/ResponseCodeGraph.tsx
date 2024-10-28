import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ResponseCodeGraphProps = {
  responseCodes: { [key: number]: number };
};

const ResponseCodeGraph: React.FC<ResponseCodeGraphProps> = ({ responseCodes }) => {
  const data = {
    labels: Object.keys(responseCodes),
    datasets: [
      {
        label: 'Response Codes',
        data: Object.values(responseCodes),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
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
        text: 'Response Code Distribution',
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default ResponseCodeGraph;
