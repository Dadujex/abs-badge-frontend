import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart'; // Import the new chart component
import './App.css';

// --- Configuration ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 20; // How many tokens to show in the chart

function App() {
  const [tokenCounts, setTokenCounts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Fetch Initial Data ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const apiUrl = `${BACKEND_URL}/api/token-counts`;
    console.log(`Fetching initial data from: ${apiUrl}`);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorBody = await response.text(); // Get more error details
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }
      const data = await response.json();
       // Ensure data is an array before sorting/setting
      if (!Array.isArray(data)) {
          throw new Error("Invalid data format received from API.");
      }
      console.log(`Received ${data.length} initial token counts.`);
      data.sort((a, b) => b.mint_count - a.mint_count);
      setTokenCounts(data);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(`Could not load initial token data: ${err.message}. Please try refreshing.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Effect for Initial Data Fetch ---
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- Effect for WebSocket Connection ---
  useEffect(() => {
    console.log('Setting up WebSocket connection...');
    const socket = io(BACKEND_URL, {
        // Optional: Add reconnection options if needed
        // reconnectionAttempts: 5,
        // reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setIsConnected(false);
      // Don't overwrite fetch errors if already present
      if (!error) {
          setError(`Could not connect to real-time updates (${err.message}). Backend might be down.`);
      }
    });

    socket.on('tokenUpdate', (updatedToken) => {
      console.log('Received tokenUpdate:', updatedToken);
      setTokenCounts(prevCounts => {
        const existingIndex = prevCounts.findIndex(t => t.tokenId === updatedToken.tokenId);
        let newCounts = [...prevCounts];

        if (existingIndex !== -1) {
          newCounts[existingIndex] = { ...newCounts[existingIndex], mint_count: updatedToken.mint_count };
        } else {
          // Only add if it wasn't there before
          newCounts.push(updatedToken);
        }

        // Re-sort the list after update/add
        newCounts.sort((a, b) => b.mint_count - a.mint_count);
        return newCounts;
      });
    });

    return () => {
      console.log('Cleaning up WebSocket connection...');
      socket.disconnect();
      setIsConnected(false);
    };
  }, [error]); // Re-run if error changes (e.g., to clear connection error message)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Token Mint Counts</h1>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </div>
        {error && <p className="error-message">{error}</p>}
      </header>

      <main>
        {isLoading ? (
          <p>Loading initial token counts...</p>
        ) : (
           // Use a container for the chart
           <div className="chart-container">
             {tokenCounts.length > 0 ? (
               // Render the chart component, passing the data and how many items to show
               <TokenChart tokenData={tokenCounts} topN={TOP_N_TOKENS_TO_DISPLAY} />
             ) : (
               // Show message if there's no data after loading (and no error)
               !error && <p>No token data available yet.</p>
             )}
           </div>
        )}
      </main>
    </div>
  );
}

export default App;