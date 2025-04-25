// src/TokenChart.jsx
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Component to display the token counts as a bar chart
function TokenChart({ tokenData = [], topN = 20 }) {

  // Prepare data for the chart
  // Take only the top N tokens based on the already sorted data
  const chartLabels = tokenData.slice(0, topN).map(token => `Token #${token.tokenId}`);
  const chartCounts = tokenData.slice(0, topN).map(token => token.mint_count);

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Mint Count',
        data: chartCounts,
        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue bars
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true, // Make chart responsive
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: {
        position: 'top', // Position the legend
      },
      title: {
        display: true,
        text: `Top ${topN} Minted Tokens`, // Chart title
        font: {
            size: 16
        }
      },
      tooltip: {
        callbacks: {
            label: function(context) {
                // Show 'Token ID: X - Count: Y' in tooltip
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    // Get the original tokenId from the label
                    const fullLabel = context.label || ''; // e.g., "Token #123"
                    const tokenId = fullLabel.replace('Token #','');
                    label = `Token ID ${tokenId} - Count: ${context.parsed.y.toLocaleString()}`;
                }
                return label;
            }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true, // Start y-axis at 0
        title: {
            display: true,
            text: 'Total Mints'
        }
      },
      x: {
         title: {
            display: true,
            text: 'Token ID'
         }
      }
    },
  };

  // Render the Bar chart component with the data and options
  // Add a container div to control chart size
  return (
    <div style={{ position: 'relative', height: '50vh', width: '100%' }}>
         <Bar options={options} data={data} />
    </div>
   );
}

export default TokenChart;