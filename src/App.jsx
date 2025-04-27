// src/App.jsx (Updated for Responsive Display)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import TokenChart from './TokenChart'; // Import the chart component
import TokenTable from './TokenTable'; // Import the new table component
import './App.css'; // Styles will handle hiding/showing
import TokenRecentMintsList from './TokenRecentMintsList';

// --- Configuration ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TOP_N_TOKENS_TO_DISPLAY = 30; // How many tokens to show
const MAX_RECENT_MINTS_PER_TOKEN = 5; // How many recent mints to show
const ABSCAN_NFT_URL_BASE = "https://abscan.org/nft/0xbc176ac2373614f9858a118917d83b139bcb3f8c";
const COUNTER_UPDATE_INTERVAL_MS = 5000; // Update counters every 5 seconds
const TIMESTAMP_TTL_MS = 30 * 60 * 1000; // Keep timestamps for 30 minutes (used for filtering)

function App() {
  const [tokenCounts, setTokenCounts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenMetadata, setTokenMetadata] = useState(new Map());
  const [error, setError] = useState(null);
  const [recentMintsByToken, setRecentMintsByToken] = useState(new Map());
  const [allRecentTimestamps, setAllRecentTimestamps] = useState([]);
  const [mintCountsByWindow, setMintCountsByWindow] = useState({ min1: 0, min5: 0, min15: 0, min30: 0 });

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

      if (!data || !Array.isArray(data.tokenCounts) || typeof data.initialRecentMints !== 'object') {
        console.error("Invalid response structure received:", data);
        throw new Error("Invalid data structure received from API.");
      }

      const countsData = data.tokenCounts;
      countsData.sort((a, b) => b.mint_count - a.mint_count);
      setTokenCounts(countsData);

      const metadataMap = new Map();
      countsData.forEach(token => {
          // Only add if a name exists and is not just whitespace
          if (token.name?.trim()) {
              metadataMap.set(token.tokenId, token.name.trim());
          }
      });
      setTokenMetadata(metadataMap);

      const initialMintsObject = data.initialRecentMints;
      const initialMintsMap = new Map();
      let parsedMintsCount = 0;
      for (const tokenId in initialMintsObject) {
          const mintsArray = initialMintsObject[tokenId];
          if (Array.isArray(mintsArray)) {
              const mintsWithDates = mintsArray.map(mint => {
                  parsedMintsCount++;
                  return {
                      ...mint,
                      // Ensure timestamp exists before trying to parse
                      timestamp: mint.timestamp ? new Date(mint.timestamp) : new Date() // Fallback to now if missing
                  };
              }).sort((a, b) => b.timestamp - a.timestamp); // Ensure sorted descending by time
              initialMintsMap.set(tokenId, mintsWithDates);
          } else {
              console.warn(`Expected array for initialRecentMints[${tokenId}], but got:`, mintsArray);
          }
      }

      setRecentMintsByToken(initialMintsMap);

      const timestampStrings = data.initialTimestamps;
      const nowForFilter = Date.now();
      const cutoffTime = nowForFilter - TIMESTAMP_TTL_MS;
      const initialTimestamps = timestampStrings
          .map(tsStr => new Date(tsStr)) // Convert ISO strings to Date objects
          .filter(ts => !isNaN(ts) && ts.getTime() >= cutoffTime); // Filter out invalid/old dates
      initialTimestamps.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first (optional but good practice)
      setAllRecentTimestamps(initialTimestamps);

      const oneMinuteAgo = nowForFilter - (1 * 60 * 1000);
      const fiveMinutesAgo = nowForFilter - (5 * 60 * 1000);
      const fifteenMinutesAgo = nowForFilter - (15 * 60 * 1000);
      // Use cutoffTime for the 30 min boundary, matching the filter
      const thirtyMinutesAgo = cutoffTime;

      let initialCount1 = 0, initialCount5 = 0, initialCount15 = 0, initialCount30 = 0;

      // Use the 'initialTimestamps' array we just created
      for (const ts of initialTimestamps) {
        if (ts instanceof Date && !isNaN(ts)) {
            const time = ts.getTime();
            if (time >= oneMinuteAgo) initialCount1++;
            if (time >= fiveMinutesAgo) initialCount5++;
            if (time >= fifteenMinutesAgo) initialCount15++;
            // Count everything remaining after the initial filter for 30m
            initialCount30++;
        }
      }
      const initialCounts = {
          min1: initialCount1,
          min5: initialCount5,
          min15: initialCount15,
          min30: initialCount30
      };
      setMintCountsByWindow(initialCounts);

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
          id: `${updatedToken.tokenId}-${updatedToken.recipientAddress}-${Date.now()}`, // Unique key
          recipientAddress: updatedToken.recipientAddress,
          transactionHash: updatedToken.transactionHash,
          timestamp: new Date()
        };

        // Get current list for this token, or initialize if new
        const currentMints = prevMap.get(updatedToken.tokenId) || [];
        // Add new mint to the start and slice to keep only the last N
        const updatedMintsForToken = [newMintInfo, ...currentMints].slice(0, MAX_RECENT_MINTS_PER_TOKEN);

        // Create a new map to trigger state update
        const newMap = new Map(prevMap);
        newMap.set(updatedToken.tokenId, updatedMintsForToken);
        return newMap;
      });

      if (updatedToken.timestamp) { // Check if timestamp exists in payload
        const newTimestamp = new Date(updatedToken.timestamp); // Parse ISO string from backend
        if (!isNaN(newTimestamp)) { // Check if parsing was successful
            setAllRecentTimestamps(prevTimestamps => {
                const nowForFilter = Date.now();
                // Define cutoff based on TTL (e.g., 30 minutes ago)
                const cutoffTime = nowForFilter - TIMESTAMP_TTL_MS;
                // Add new timestamp and filter out old ones in one go
                // Prepend the new timestamp
                const updatedTimestamps = [newTimestamp, ...prevTimestamps]
                    .filter(ts => ts.getTime() >= cutoffTime); // Keep only timestamps within TTL
                // No need to sort here if we always prepend
                return updatedTimestamps;
            });

            const now = Date.now();
            const oneMinuteAgo = now - (1 * 60 * 1000);
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            const fifteenMinutesAgo = now - (15 * 60 * 1000);
            const thirtyMinutesAgo = now - TIMESTAMP_TTL_MS; // Use TTL as boundary

            let count1 = 0, count5 = 0, count15 = 0, count30 = 0;

            // Read directly from the state variable `allRecentTimestamps`
            const currentTimestamps = allRecentTimestamps;

            for (const ts of currentTimestamps) {
              console.log(ts instanceof Date)
              if (ts instanceof Date && !isNaN(ts)) {
                  const time = ts.getTime();

                  if (time >= oneMinuteAgo) count1++;
                  if (time >= fiveMinutesAgo) count5++;
                  if (time >= fifteenMinutesAgo) count15++;
                  if (time >= thirtyMinutesAgo) count30++;
              }
            }

            // Update the state with the new counts
            const newCounts = { min1: count1, min5: count5, min15: count15, min30: count30 };
              setMintCountsByWindow(newCounts);
            } 
        } 
    });

    return () => { socket.disconnect(); setIsConnected(false); };
  }, [error]);

  useEffect(() => {
    console.log("Setting up counter interval...");
    const intervalId = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - (1 * 60 * 1000);
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const fifteenMinutesAgo = now - (15 * 60 * 1000);
      const thirtyMinutesAgo = now - TIMESTAMP_TTL_MS; // Use TTL as boundary

      let count1 = 0, count5 = 0, count15 = 0, count30 = 0;

      // Read directly from the state variable `allRecentTimestamps`
      const currentTimestamps = allRecentTimestamps;

      for (const ts of currentTimestamps) {
        // Ensure ts is a valid Date object before calling getTime
        if (ts instanceof Date && !isNaN(ts)) {
            const time = ts.getTime();
            // Check against pre-calculated boundaries
            if (time >= oneMinuteAgo) count1++;
            if (time >= fiveMinutesAgo) count5++;
            if (time >= fifteenMinutesAgo) count15++;
            // Count if it's within the 30-minute TTL window (already filtered)
            if (time >= thirtyMinutesAgo) count30++;
        }
      }

      // Update the state with the new counts
      const newCounts = { min1: count1, min5: count5, min15: count15, min30: count30 };
      setMintCountsByWindow(newCounts);

    }, COUNTER_UPDATE_INTERVAL_MS);

    // Cleanup interval on component unmount
    return () => { console.log("Clearing counter interval..."); clearInterval(intervalId); }

  }, [allRecentTimestamps]); // Re-run calculation IF the timestamp list state changes

  const shortenAddress = (address) => {
    if (!address || address.length < 10) return address || ''; // Handle null/short addresses
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Token Mint Counts</h1>
        <div className="status-container">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '● Connected' : '○ Disconnected'}
            </div>
            {/* Add the refresh indicator next to the connection status */}
        </div>
        {error && <p className="error-message">{error}</p>}
      </header>

      <section className="counter-section">
         <div className="counter-item">
            <span className="counter-value">{mintCountsByWindow.min1.toLocaleString()}</span>
            <span className="counter-label">Mints (1m)</span>
        </div>
         <div className="counter-item">
            <span className="counter-value">{mintCountsByWindow.min5.toLocaleString()}</span>
            <span className="counter-label">Mints (5m)</span>
        </div>
         <div className="counter-item">
            <span className="counter-value">{mintCountsByWindow.min15.toLocaleString()}</span>
            <span className="counter-label">Mints (15m)</span>
        </div>
         <div className="counter-item">
            <span className="counter-value">{mintCountsByWindow.min30.toLocaleString()}</span>
            <span className="counter-label">Mints (30m)</span>
        </div>
      </section>

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
