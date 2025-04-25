// src/TokenChart.jsx (Updated with datalabels)
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
// Import the datalabels plugin
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components AND the datalabels plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels // Register the plugin
);

// Component to display the token counts as a bar chart
function TokenChart({ tokenData = [], topN = 20 }) {

  // Prepare data for the chart
  const chartLabels = tokenData.slice(0, topN).map(token => `Token #${token.tokenId}`);
  const chartCounts = tokenData.slice(0, topN).map(token => token.mint_count);

  const data = {
    labels: chartLabels,
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
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    const fullLabel = context.label || '';
                    const tokenId = fullLabel.replace('Token #','');
                    label = `Token ID ${tokenId} - Count: ${context.parsed.y.toLocaleString()}`;
                }
                return label;
            }
        }
      },
      // --- Configure Datalabels Plugin ---
      datalabels: {
        // Anchor labels to the top of the bars
        anchor: 'end',
        // Align labels above the bars
        align: 'end',
        // Format the label (display the number)
        formatter: (value, context) => {
          // Only display labels for bars with a count > 0
          return value > 0 ? value.toLocaleString() : '';
        },
        // Style the labels
        color: '#555', // Label color
        font: {
          weight: 'bold',
          size: 10, // Adjust size as needed
        },
        // Optional: Add padding between label and bar top
        offset: 4,
        // Optional: Rotate labels if they overlap (e.g., -45)
        // rotation: 0,
      }
      // --- End Datalabels Configuration ---
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
            display: true,
            text: 'Total Mints'
        },
        // Optional: Add some extra space at the top for the labels
        ticks: {
            callback: function(value) {
                 // Format y-axis ticks if needed
                 return value.toLocaleString();
            }
        },
        grace: '10%' // Add 10% padding to the top of the y-axis
      },
      x: {
         title: {
            display: true,
            text: 'Token ID'
         }
      }
    },
  };

  // Render the Bar chart component
  return (
    <div style={{ position: 'relative', height: '50vh', width: '100%' }}>
         <Bar options={options} data={data} />
    </div>
   );
}

export default TokenChart;