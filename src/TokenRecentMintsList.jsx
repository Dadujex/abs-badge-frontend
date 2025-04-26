// src/TokenRecentMintsList.jsx
import React from 'react';

// Component to display recent mints for a SINGLE token ID
function TokenRecentMintsList({ tokenId, tokenName, mints = [], shortenAddress, abscanBaseUrl }) {

  // Determine the display name/ID for the header
  const displayIdentifier = tokenName ? tokenName : `Token #${tokenId}`;
  const tokenLink = `${abscanBaseUrl}/${tokenId}`;

  // Don't render anything if there are no mints for this token
  if (mints.length === 0) {
    return null; // Or return a placeholder like <p>No recent activity</p> if preferred
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
            <span className="mint-time" title={mint.timestamp.toLocaleString()}>
              {/* Format time nicely */}
              {mint.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TokenRecentMintsList;
