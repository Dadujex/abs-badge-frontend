// src/App.jsx (Updated for Responsive Display)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart'; // Import the chart component
import TokenTable from './TokenTable'; // Import the new table component
import './App.css'; // Styles will handle hiding/showing

// --- Configuration ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 30; // How many tokens to show
const MAX_RECENT_MINTS_PER_TOKEN = 5; // How many recent mints to show
const ABSCAN_NFT_URL_BASE = "https://abscan.org/nft/0xbc176ac2373614f9858a118917d83b139bcb3f8c";

function App() {
  const [tokenCounts, setTokenCounts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenMetadata, setTokenMetadata] = useState(new Map());
  const [error, setError] = useState(null);
  const [recentMintsByToken, setRecentMintsByToken] = useState(new Map());

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

      const metadataMap = new Map();
      data.forEach(token => {
          // Only add if a name exists and is not just whitespace
          if (token.name?.trim()) {
              metadataMap.set(token.tokenId, token.name.trim());
          }
      });
      setTokenMetadata(metadataMap);

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

      setRecentMintsByToken(prevMap => {
        const newMintInfo = {
          id: `${updateData.tokenId}-${updateData.recipientAddress}-${Date.now()}`, // Unique key
          recipientAddress: updateData.recipientAddress,
          timestamp: new Date()
        };

        // Get current list for this token, or initialize if new
        const currentMints = prevMap.get(updateData.tokenId) || [];
        // Add new mint to the start and slice to keep only the last N
        const updatedMintsForToken = [newMintInfo, ...currentMints].slice(0, MAX_RECENT_MINTS_PER_TOKEN);

        // Create a new map to trigger state update
        const newMap = new Map(prevMap);
        newMap.set(updateData.tokenId, updatedMintsForToken);
        return newMap;
      });
    });

    return () => { socket.disconnect(); setIsConnected(false); };
  }, [error]);

  const shortenAddress = (address) => {
    if (!address || address.length < 10) return address || ''; // Handle null/short addresses
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
        {!isLoading && (isConnected || recentMintsByToken.size > 0) && (
          <aside className="recent-mints-section">
            <h2>Recent Mints Activity</h2>
            {/* Add a container for the grid layout */}
            <div className="recent-mints-grid">
              {recentMintsByToken.size > 0 ? (
                 tokenCounts.slice(0, TOP_N_TOKENS_TO_DISPLAY).map(token => {
                    const mintsForThisToken = recentMintsByToken.get(token.tokenId);
                    const nameForThisToken = tokenMetadata.get(token.tokenId);
                    // Render the component only if there are mints for this token
                    if (mintsForThisToken && mintsForThisToken.length > 0) {
                        return (
                            <TokenRecentMintsList
                                key={token.tokenId}
                                tokenId={token.tokenId}
                                tokenName={nameForThisToken}
                                mints={mintsForThisToken}
                                shortenAddress={shortenAddress}
                                abscanBaseUrl={ABSCAN_NFT_URL_BASE}
                            />
                        );
                    }
                    return null;
                 })
              ) : (
                <p className="no-mints-message">{isConnected ? 'Waiting for new mints...' : 'Connect to see recent mints.'}</p>
              )}
              {/* Message if no top tokens have recent mints */}
              {recentMintsByToken.size > 0 && tokenCounts.slice(0, TOP_N_TOKENS_TO_DISPLAY).every(t => !recentMintsByToken.has(t.tokenId)) && (
                  <p className="no-mints-message">No recent mints for the top {TOP_N_TOKENS_TO_DISPLAY} tokens.</p>
              )}
            </div> {/* End recent-mints-grid */}
          </aside>
        )}
      </div>
      
    </div>
  );
}

export default App;
