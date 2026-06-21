import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';
import { Users, Play, Settings } from 'lucide-react';

export default function HostDashboard() {
  const { sessionCode, sessionState, participants, teams, setSessionCode, setParticipants, setTeams, setSessionState } = useStore();
  const [newParticipant, setNewParticipant] = useState('');

  useEffect(() => {
    socket.on('session_created', ({ sessionCode }) => setSessionCode(sessionCode));
    socket.on('lobby_update', (parts) => setParticipants(parts));
    socket.on('teams_assigned', ({ teams }) => setTeams(teams));
    socket.on('readiness_update', (teams) => setTeams(teams));
    socket.on('session_state_update', (state) => setSessionState(state));

    return () => {
      socket.off('session_created');
      socket.off('lobby_update');
      socket.off('teams_assigned');
      socket.off('readiness_update');
      socket.off('quiz_started');
    };
  }, []);

  const handleCreateSession = () => {
    socket.emit('create_session');
  };

  const handleRandomize = () => {
    const teamCount = parseInt(prompt('How many teams?', '2'), 10);
    if (teamCount > 0) {
      socket.emit('randomize_teams', { sessionCode, teamCount });
    }
  };

  const handleStartQuiz = () => {
    socket.emit('start_quiz', { sessionCode });
  };

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (newParticipant.trim()) {
      socket.emit('host_add_participant', { sessionCode, name: newParticipant.trim() });
      setNewParticipant('');
    }
  };

  if (!sessionCode) {
    return (
      <div className="panel" style={{ textAlign: 'center' }}>
        <h2>Host Dashboard</h2>
        <p>Create a new session to get started.</p>
        <button className="btn" onClick={handleCreateSession}>
          <Settings style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Create Session
        </button>
      </div>
    );
  }

  const allTeamsReady = teams.length > 0 && teams.every(t => t.isReady);

  return (
    <div className="panel">
      <h2>Session: {sessionCode}</h2>
      
      {sessionState === 'lobby' && (
        <>
          <h3>Waiting Lobby ({participants.length} Joined)</h3>
          
          <form onSubmit={handleAddParticipant} style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <input 
              className="input-field" 
              style={{ marginBottom: 0 }}
              placeholder="Enter participant name..." 
              value={newParticipant} 
              onChange={e => setNewParticipant(e.target.value)} 
            />
            <button className="btn" type="submit" style={{ whiteSpace: 'nowrap' }}>Add Participant</button>
          </form>

          <div className="grid-list">
            {participants.map(p => (
              <div key={p.id} className="card">
                <div>{p.name}</div>
                <span className={`badge ${p.pretestCompleted ? 'badge-success' : 'badge-pending'}`}>
                  {p.pretestCompleted ? 'Pretest Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
          <button className="btn" onClick={handleRandomize} style={{ marginTop: '2rem' }}>
            <Users style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Randomize Teams
          </button>
        </>
      )}

      {sessionState === 'waiting_teams' && (
        <div style={{ textAlign: 'center', marginBottom: '2rem', background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px' }}>
          <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Waiting for Teams to Log In</h3>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Please share the generated Team Codes below with each team so they can log in on their shared device.</p>
          <button 
            className="btn btn-accent" 
            onClick={() => socket.emit('host_advance_state', { sessionCode, newState: 'pretest' })}
            style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}
          >
            Start Pretest Mode
          </button>
        </div>
      )}

      {sessionState === 'pretest' && (
        <div style={{ textAlign: 'center' }}>
          <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Pretest is Active</h3>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Please display this screen to the teams.</p>
          
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: 'white', marginBottom: '2rem' }}>Question 1: What is the primary purpose of WebSocket in our app?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left' }}>
              <div className="card" style={{ fontSize: '1.2rem', padding: '1.5rem' }}>A. To style the page</div>
              <div className="card" style={{ fontSize: '1.2rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid var(--primary)' }}>B. To establish bi-directional real-time communication</div>
              <div className="card" style={{ fontSize: '1.2rem', padding: '1.5rem' }}>C. To save data locally</div>
              <div className="card" style={{ fontSize: '1.2rem', padding: '1.5rem' }}>D. To replace HTML</div>
            </div>
          </div>

          <button 
            className="btn btn-accent" 
            onClick={() => socket.emit('host_advance_state', { sessionCode, newState: 'preparation' })}
            style={{ marginTop: '2rem', width: '100%', fontSize: '1.2rem', padding: '1rem' }}
          >
            End Pretest & Move to Main Dashboard
          </button>
        </div>
      )}

      {(sessionState === 'waiting_teams' || sessionState === 'preparation' || sessionState === 'quiz') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Teams Status</h3>
            <span className="badge badge-success">Share these codes with the teams!</span>
          </div>
          <div className="grid-list">
            {teams.map(t => (
              <div key={t.code} className="card">
                <h4>{t.name} (Code: {t.code})</h4>
                <div style={{ marginBottom: '1rem' }}>
                  {t.members.map(m => m.name).join(', ')}
                </div>
                <span className={`badge ${t.isReady ? 'badge-success' : 'badge-pending'}`}>
                  {t.isReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
          </div>
          
          {sessionState === 'preparation' && (
            <button 
              className="btn" 
              onClick={handleStartQuiz} 
              disabled={!allTeamsReady}
              style={{ marginTop: '2rem', width: '100%' }}
            >
              <Play style={{ marginRight: '8px', verticalAlign: 'middle' }} /> 
              {allTeamsReady ? 'Start Quiz' : 'Waiting for all teams to be ready...'}
            </button>
          )}

          {sessionState === 'quiz' && (
            <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Quiz is Live!</h3>
              <p>Teams are currently answering questions.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
