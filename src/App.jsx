// src/App.jsx (Updated with fetch debugging)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 30;

function App() {
  const [tokenCounts, setTokenCounts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const apiUrl = `${BACKEND_URL}/api/token-counts`;
    console.log(`Fetching initial data from: ${apiUrl}`); // Log the URL being fetched

    try {
      const response = await fetch(apiUrl);
      console.log(`Fetch response status: ${response.status}, ok: ${response.ok}`); // Log status

      // --- Debugging Step 1: Log Response Headers (Optional but useful for CORS) ---
      // Convert Headers object to a plain object for easier logging
      const headers = {};
      response.headers.forEach((value, key) => {
          headers[key] = value;
      });
      console.log("Response Headers:", headers);
      // Check specifically for CORS header
      console.log("Access-Control-Allow-Origin Header:", response.headers.get('access-control-allow-origin'));


      if (!response.ok) {
        // Try to get text even for errors, might contain clues
        const errorBody = await response.text().catch(() => 'Could not read error body');
        console.error(`Fetch failed! Status: ${response.status}, Body: ${errorBody}`);
        throw new Error(`HTTP error! status: ${response.status}`); // Simpler error for display
      }

      // --- Debugging Step 2: Log Raw Response Body ---
      // Clone the response before reading body as text, so it can be read again for JSON
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      console.log("Raw response text received:", responseText); // <<< SEE WHAT THIS SAYS

      // --- Debugging Step 3: Attempt JSON Parsing ---
      // Now parse the original response as JSON
      const data = await response.json();
      console.log("Parsed JSON data:", data); // Log parsed data

      if (!Array.isArray(data)) {
          console.error("Parsed data is not an array:", data);
          throw new Error("Invalid data format received from API.");
      }
      console.log(`Received ${data.length} initial token counts.`);
      data.sort((a, b) => b.mint_count - a.mint_count);
      setTokenCounts(data);

    } catch (err) {
      // Catch errors from fetch, text(), json(), or thrown errors
      console.error("Failed during fetch or parsing:", err);
      // Provide more context in the UI error message
      setError(`Could not load initial token data. ${err.message}. Check browser console/network tab.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    console.log('Setting up WebSocket connection...');
    const socket = io(BACKEND_URL); // Removed extra options for simplicity

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setIsConnected(true);
      // Clear error *only* if it was a connection error previously
      setError(prevError => prevError?.includes('Could not connect') ? null : prevError);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setIsConnected(false);
      if (!error) { // Don't overwrite existing fetch errors
          setError(`Could not connect to real-time updates (${err.message}).`);
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
          newCounts.push(updatedToken);
        }
        newCounts.sort((a, b) => b.mint_count - a.mint_count);
        return newCounts;
      });
    });

    return () => {
      console.log('Cleaning up WebSocket connection...');
      socket.disconnect();
      setIsConnected(false);
    };
  }, [error]); // Dependency array includes error

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
           <div className="chart-container">
             {tokenCounts.length > 0 ? (
               <TokenChart tokenData={tokenCounts} topN={TOP_N_TOKENS_TO_DISPLAY} />
             ) : (
               !error && <p>No token data available yet.</p>
             )}
           </div>
        )}
      </main>
    </div>
  );
}

export default App;
