import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components AND the datalabels plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Component to display the token counts as a bar chart
function TokenChart({ tokenData = [], topN = 20 }) {

  // Prepare data for the chart
  const topTokens = tokenData.slice(0, topN);

  // Generate labels: Use name if available, otherwise use Token ID
  const chartLabels = topTokens.map(token => {
    // Check if name exists and is not just whitespace
    return token.name?.trim() ? token.name : `Token #${token.tokenId}`;
  });
  const chartCounts = topTokens.map(token => token.mint_count);

  const data = {
    labels: chartLabels, // Use the generated labels
    datasets: [
      {
        label: 'Mint Count',
        data: chartCounts,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Top ${topN} Minted Tokens`,
        font: {
            size: 16
        }
      },
      tooltip: {
        callbacks: {
            label: function(context) {
                // Get the original token data for this bar/label index
                const index = context.dataIndex;
                const token = topTokens[index]; // Get the full token object

                if (!token) return ''; // Safety check

                const displayName = token.name?.trim() ? token.name : `Token ID ${token.tokenId}`;
                const count = context.parsed.y !== null ? context.parsed.y.toLocaleString() : 'N/A';

                return `${displayName} - Count: ${count}`;
            }
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        formatter: (value, context) => {
          return value > 0 ? value.toLocaleString() : '';
        },
        color: '#555',
        font: {
          weight: 'bold',
          size: 10,
        },
        offset: 4,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
            display: true,
            text: 'Total Mints'
        },
        ticks: {
            callback: function(value) {
                 return value.toLocaleString();
            }
        },
        grace: '10%'
      },
      x: {
         title: {
            display: true,
            // Update axis title to reflect content
            text: 'Token Name / ID'
         }
      }
    },
  };

  return (
    <div style={{ position: 'relative', height: '50vh', width: '100%' }}>
         <Bar options={options} data={data} />
    </div>
   );
}

export default TokenChart;