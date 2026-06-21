import React, { useEffect } from 'react';
import './App.css';
import { useStore } from './store';
import HostDashboard from './components/HostDashboard';
import ParticipantFlow from './components/ParticipantFlow';

function App() {
  const { role, setRole } = useStore();

  useEffect(() => {
    if (window.location.pathname.startsWith('/host')) {
      setRole('host');
    } else {
      setRole('participant');
    }
  }, [setRole]);

  return (
    <div className="app-container">
      {role === 'host' && <HostDashboard />}
      {role === 'participant' && <ParticipantFlow />}
    </div>
  );
}

export default App;
