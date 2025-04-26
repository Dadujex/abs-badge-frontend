// src/App.jsx (Updated for Responsive Display)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart'; // Import the chart component
import TokenTable from './TokenTable'; // Import the new table component
import './App.css'; // Styles will handle hiding/showing

// --- Configuration ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 30; // How many tokens to show
const MAX_RECENT_MINTS = 10; // How many recent mints to show
const ABSCAN_NFT_URL_BASE = "https://abscan.org/nft/0xbc176ac2373614f9858a118917d83b139bcb3f8c";

function App() {
  const [tokenCounts, setTokenCounts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentMints, setRecentMints] = useState([]);

  // --- Fetch Initial Data (Keep as before) ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const apiUrl = `${BACKEND_URL}/api/token-counts`;

    try {
      const response = await fetch(apiUrl);

      const headers = {};
      response.headers.forEach((value, key) => { headers[key] = value; });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      const data = await response.json();

      if (!Array.isArray(data)) {
          console.error("Parsed data is not an array:", data);
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

      setRecentMints(prevMints => {
        const newMint = {
          id: `<span class="math-inline">\{updatedToken\.tokenId\}\-</span>{updatedToken.recipientAddress}-${Date.now()}`,
          tokenId: updatedToken.tokenId,
          recipientAddress: updatedToken.recipientAddress, // Get recipient from payload
          timestamp: new Date()
        }
        const updatedMints = [newMint, ...prevMints].slice(0, MAX_RECENT_MINTS);
        return updatedMints;
      })
    });

    return () => { socket.disconnect(); setIsConnected(false); };
  }, [error]);

  const shortenAddress = (address) => {
    if (!address || address.length < 10) return address || ''; // Handle null/short addresses
    return `<span class="math-inline">\{address\.substring\(0, 6\)\}\.\.\.</span>{address.substring(address.length - 4)}`;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Token Mint Counts</h1>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </div>
        {error && <p className="error-message">{error}</p>}
      </header>

      <div className='main-layout'>
        <section className="data-display-section">
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
        </section>
        <aside className="recent-mints-section">
          <h2>Recent Mints</h2>
          {recentMints.length > 0 ? (
            <ul className="recent-mints-list">
              {recentMints.map((mint) => (
                <li key={mint.id}>
                  {/* Display Recipient Address */}
                  <span className="mint-recipient" title={mint.recipientAddress}>
                    {mint.recipientAddress ? `To: ${shortenAddress(mint.recipientAddress)}` : 'Recipient N/A'}
                  </span>
                  {/* Display Token ID as a Link */}
                  <span className="mint-token">
                    <a
                      href={`<span class="math-inline">\{ABSCAN\_NFT\_URL\_BASE\}/</span>{mint.tokenId}`}
                      target="_blank" // Open in new tab
                      rel="noopener noreferrer" // Security best practice
                      title={`View Token ID ${mint.tokenId} on AbsScan`}
                    >
                      Token #{mint.tokenId}
                    </a>
                  </span>
                  <span className="mint-time">
                    {mint.timestamp.toLocaleTimeString()}
                  </span> 
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-mints-message">{isConnected ? 'Waiting for new mints...' : 'Connect to see recent mints.'}</p>
          )}
        </aside>
      </div>
      
    </div>
  );
}

export default App;
