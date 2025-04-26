// src/RefreshIndicator.jsx
import React from 'react';
import './Refreshindicator.css'; // Import CSS for styling and animation

const RefreshIndicator = () => {
  return (
    <div className="refresh-indicator" title="Refreshing counters every 5s">
      <div className="refresh-indicator-fill"></div>
    </div>
  );
};

export default RefreshIndicator;