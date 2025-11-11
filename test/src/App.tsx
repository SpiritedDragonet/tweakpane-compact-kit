import React from 'react';
import { OfficialDemo } from './OfficialDemo';

// Simple app that just shows the official plugin demo
export const App: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12, boxSizing: 'border-box', gap: 12 }}>
      {/* Official Plugin Demo (self-contained, using compiled plugins) */}
      <div style={{ flex: '1 1 auto', border: '1px solid #666', borderRadius: 8, background: '#0a0b0e', minHeight: 0, padding: 8 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#888', textAlign: 'center' }}>
          Plugin Demo (Using Built Plugins)
        </h3>
        <OfficialDemo />
      </div>
    </div>
  );
};

export default App;