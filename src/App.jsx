import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css'; // Basic styling

// --- Configuration ---
// URL of your backend server (the one running server.js)
// Make sure this matches where your backend is running.
// If backend is on the same machine during dev, localhost is fine.
// If backend is deployed (e.g., Fly.io), use its public URL.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function App() {
  // State to hold the token counts, initially empty
  const [tokenCounts, setTokenCounts] = useState([]);
  // State to track connection status
  const [isConnected, setIsConnected] = useState(false);
  // State for loading initial data
  const [isLoading, setIsLoading] = useState(true);
  // State for potential errors
  const [error, setError] = useState(null);

  // --- Fetch Initial Data ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching initial data from ${BACKEND_URL}/api/token-counts`);
    try {
      const response = await fetch(`${BACKEND_URL}/api/token-counts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Received ${data.length} initial token counts.`);
      // Sort data client-side as well, just in case (optional)
      data.sort((a, b) => b.mint_count - a.mint_count);
      setTokenCounts(data);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError("Could not load initial token data. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies, runs once

  // --- Effect for Initial Data Fetch ---
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]); // Run once on mount

  // --- Effect for WebSocket Connection ---
  useEffect(() => {
    console.log('Setting up WebSocket connection...');
    // Connect to the Socket.IO server running on the backend
    const socket = io(BACKEND_URL, {
        // Optional: Add reconnection options if needed
        // reconnectionAttempts: 5,
        // reconnectionDelay: 1000,
    });

    // --- Socket Event Listeners ---
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setIsConnected(true);
      setError(null); // Clear previous errors on successful connection
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      // Optionally show an error or attempt reconnect message
      // setError("Disconnected from real-time updates. Attempting to reconnect...");
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setIsConnected(false);
      setError(`Could not connect to real-time updates (${err.message}). Backend might be down.`);
    });

    // Listen for the 'tokenUpdate' event from the server
    socket.on('tokenUpdate', (updatedToken) => {
      console.log('Received tokenUpdate:', updatedToken);
      setTokenCounts(prevCounts => {
        // Find if the token already exists in our list
        const existingIndex = prevCounts.findIndex(t => t.tokenId === updatedToken.tokenId);
        let newCounts = [...prevCounts];

        if (existingIndex !== -1) {
          // Update existing token's count
          newCounts[existingIndex] = { ...newCounts[existingIndex], mint_count: updatedToken.mint_count };
        } else {
          // Add new token to the list
          newCounts.push(updatedToken);
        }

        // Re-sort the list after update/add
        newCounts.sort((a, b) => b.mint_count - a.mint_count);
        return newCounts;
      });
    });

    // --- Cleanup Function ---
    // Disconnect the socket when the component unmounts
    return () => {
      console.log('Cleaning up WebSocket connection...');
      socket.disconnect();
      setIsConnected(false);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

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
          <div className="token-table-container">
            <h2>Token Leaderboard</h2>
            {tokenCounts.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Token ID</th>
                    <th>Mint Count</th>
                    {/* Add more columns if you store names/metadata */}
                    {/* <th>Name</th> */}
                  </tr>
                </thead>
                <tbody>
                  {tokenCounts.map((token, index) => (
                    <tr key={token.tokenId || index}> {/* Use index as fallback key */}
                      <td>{index + 1}</td>
                      <td>{token.tokenId}</td>
                      <td>{token.mint_count?.toLocaleString() ?? 'N/A'}</td>
                      {/* Add more columns if needed */}
                      {/* <td>{token.name || '-'}</td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No token data available yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;