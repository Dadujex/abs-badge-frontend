// src/App.jsx (Updated for Responsive Display)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart'; // Import the chart component
import TokenTable from './TokenTable'; // Import the new table component
import './App.css'; // Styles will handle hiding/showing

// --- Configuration ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 30; // How many tokens to show
const API_KEY = import.meta.env.VITE_API_SECRET_KEY;

function App() {
  const [tokenCounts, setTokenCounts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Fetch Initial Data (Keep as before) ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const apiUrl = `${BACKEND_URL}/api/token-counts`;

    const requestHeaders = new Headers();
    // Only add the header if the API_KEY is actually present
    if (API_KEY) {
        requestHeaders.append('X-API-Key', API_KEY);
    } else {
        // Handle missing API key - crucial for production
        console.error("API Key is missing! Cannot authenticate API request.");
        setError("Configuration error: Frontend API Key is missing. Deployment requires VITE_API_SECRET_KEY.");
        setIsLoading(false);
        return; // Stop fetching if key is missing
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: requestHeaders,
      });

      const headers = {};
      response.headers.forEach((value, key) => { headers[key] = value; });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      const data = await response.json();

      if (!Array.isArray(data)) {
          throw new Error("Invalid data format received from API.");
      }

      data.sort((a, b) => b.mint_count - a.mint_count);
      setTokenCounts(data);

    } catch (err) {
      console.error("Failed during fetch or parsing",);
      setError(`Could not load initial token data.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Effect for Initial Data Fetch (Keep as before) ---
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- Effect for WebSocket Connection (Keep as before) ---
  useEffect(() => {
    console.log('Setting up WebSocket connection...');
    const socket = io(BACKEND_URL);

    socket.on('connect', () => { setIsConnected(true); setError(prevError => prevError?.includes('Could not connect') ? null : prevError); });
    socket.on('disconnect', (reason) => { setIsConnected(false); });
    socket.on('connect_error', (err) => { setIsConnected(false); if (!error) { setError(`Could not connect to real-time updates.`); } });

    socket.on('tokenUpdate', (updatedToken) => {
      // console.log('Received tokenUpdate:', updatedToken); // Reduce log noise
      setTokenCounts(prevCounts => {
        const existingIndex = prevCounts.findIndex(t => t.tokenId === updatedToken.tokenId);
        let newCounts = [...prevCounts];
        if (existingIndex !== -1) {
          newCounts[existingIndex] = { ...newCounts[existingIndex], mint_count: updatedToken.mint_count };
        } else {
          newCounts.push(updatedToken);
        }
        newCounts.sort((a, b) => b.mint_count - a.mint_count);
        return newCounts;
      });
    });

    return () => { socket.disconnect(); setIsConnected(false); };
  }, [error]);

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
          <> {/* Use Fragment to return multiple elements */}
            {tokenCounts.length > 0 ? (
              <>
                {/* Chart Container - Hidden on mobile */}
                <div className="chart-container display-desktop">
                  <TokenChart tokenData={tokenCounts} topN={TOP_N_TOKENS_TO_DISPLAY} />
                </div>
                {/* Table Container - Hidden on desktop */}
                <div className="table-container display-mobile">
                   <TokenTable tokenData={tokenCounts} topN={TOP_N_TOKENS_TO_DISPLAY} />
                </div>
              </>
            ) : (
              !error && <p>No token data available yet.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
