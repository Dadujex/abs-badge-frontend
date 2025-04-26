// src/App.jsx (Updated for Responsive Display)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart'; // Import the chart component
import TokenTable from './TokenTable'; // Import the new table component
import './App.css'; // Styles will handle hiding/showing

// --- Configuration ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 30; // How many tokens to show

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
    console.log(`Fetching initial data from: ${apiUrl}`);
    try {
      const response = await fetch(apiUrl);
      console.log(`Fetch response status: ${response.status}, ok: ${response.ok}`);
      const headers = {};
      response.headers.forEach((value, key) => { headers[key] = value; });
      console.log("Response Headers:", headers);
      console.log("Access-Control-Allow-Origin Header:", response.headers.get('access-control-allow-origin'));

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read error body');
        console.error(`Fetch failed! Status: ${response.status}, Body: ${errorBody}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      console.log("Raw response text received:", responseText);
      const data = await response.json();
      console.log("Parsed JSON data:", data);

      if (!Array.isArray(data)) {
          console.error("Parsed data is not an array:", data);
          throw new Error("Invalid data format received from API.");
      }
      console.log(`Received ${data.length} initial token counts.`);
      data.sort((a, b) => b.mint_count - a.mint_count);
      setTokenCounts(data);

    } catch (err) {
      console.error("Failed during fetch or parsing:", err);
      setError(`Could not load initial token data. ${err.message}. Check browser console/network tab.`);
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

    socket.on('connect', () => { console.log('WebSocket connected:', socket.id); setIsConnected(true); setError(prevError => prevError?.includes('Could not connect') ? null : prevError); });
    socket.on('disconnect', (reason) => { console.log('WebSocket disconnected:', reason); setIsConnected(false); });
    socket.on('connect_error', (err) => { console.error('WebSocket connection error:', err.message); setIsConnected(false); if (!error) { setError(`Could not connect to real-time updates (${err.message}).`); } });

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

    return () => { console.log('Cleaning up WebSocket connection...'); socket.disconnect(); setIsConnected(false); };
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
                   <h2>Token Leaderboard (Top {TOP_N_TOKENS_TO_DISPLAY})</h2>
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
