// src/TokenTable.jsx
import React from 'react';

// Component to display token counts in a table
function TokenTable({ tokenData = [], topN = 30 }) { // Default or use prop

  // Take only the top N tokens based on the already sorted data
  const displayData = tokenData.slice(0, topN);

  if (displayData.length === 0) {
    return <p>No token data available yet.</p>;
  }

  return (
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
        {displayData.map((token, index) => (
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
  );
}

export default TokenTable;
