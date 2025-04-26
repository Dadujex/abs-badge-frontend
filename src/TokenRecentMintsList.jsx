// src/TokenRecentMintsList.jsx
import React from 'react';

// Component to display recent mints for a SINGLE token ID
function TokenRecentMintsList({ tokenId, tokenName, mints = [], shortenAddress, abscanBaseUrl }) {

  const abscanTxBaseUrl = "https://abscan.org/tx";
  // Determine the display name/ID for the header
  const displayIdentifier = tokenName ? tokenName : `Token #${tokenId}`;
  const tokenLink = `${abscanBaseUrl}/${tokenId}`;

  // Don't render anything if there are no mints for this token
  if (mints.length === 0) {
    return null; // Or return a placeholder like <p>No recent activity</p> if preferred
  }

  function formatTimeAgo(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      return 'Invalid date'; // Handle cases where timestamp might be invalid
    }
  
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30); // Approximate
    const years = Math.round(days / 365); // Approximate
  
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else if (weeks < 5) { // Show weeks up to about a month
      return `${weeks}w ago`;
    } else if (months < 12) {
      return `${months}mo ago`;
    } else {
      return `${years}y ago`;
    }
  }

  return (
    <div className="token-recent-mints-item">
      {/* Sub-header with link */}
      <h3 className="token-mints-header">
        <a href={tokenLink} target="_blank" rel="noopener noreferrer" title={`View ${displayIdentifier} on AbsScan`}>
          {displayIdentifier}
        </a>
      </h3>
      {/* List of mints */}
      <ul className="token-mints-sublist">
        {mints.map((mint) => (
          <li key={mint.id}>
            <span className="mint-recipient" title={mint.recipientAddress}>
              {mint.recipientAddress ? `To: ${shortenAddress(mint.recipientAddress)}` : 'Recipient N/A'}
            </span>
            <a href={mint.transactionHash ? `${abscanTxBaseUrl}/${mint.transactionHash}` : '#'}>
              <span className="mint-time" title={mint.timestamp.toLocaleString()}>
                {/* Format time nicely */}
                {formatTimeAgo(mint.timestamp)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TokenRecentMintsList;
