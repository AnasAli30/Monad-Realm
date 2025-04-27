import React from 'react';
import '../styles/MobileWarning.css';

const MobileWarning: React.FC = () => {
  return (
    <div className="mobile-warning">
    <div className="warning-content">
  <h1>Oops!</h1>
  <h1>Desktop Required</h1>
  <p>This game is crafted for a bigger screen!</p>
  <p>For the best experience, please visit us on a PC or laptop. We'll be waiting 🎮✨</p>
</div>

    </div>
  );
};

export default MobileWarning; 