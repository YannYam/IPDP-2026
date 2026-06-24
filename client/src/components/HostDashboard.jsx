import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';
import { Users, Play, Settings } from 'lucide-react';

export default function HostDashboard() {
  const { sessionCode, sessionState, participants, teams, pretestData, setSessionCode, setParticipants, setTeams, setSessionState, setPretestData } = useStore();
  const [newParticipant, setNewParticipant] = useState('');

  useEffect(() => {
    socket.on('session_created', ({ sessionCode }) => setSessionCode(sessionCode));
    socket.on('lobby_update', (parts) => setParticipants(parts));
    socket.on('teams_assigned', ({ teams }) => setTeams(teams));
    socket.on('readiness_update', (teams) => setTeams(teams));
    socket.on('session_state_update', (state) => setSessionState(state));
    socket.on('pretest_question_update', (data) => setPretestData(data));

    return () => {
      socket.off('session_created');
      socket.off('lobby_update');
      socket.off('teams_assigned');
      socket.off('readiness_update');
      socket.off('session_state_update');
      socket.off('pretest_question_update');
      socket.off('quiz_started');
    };
  }, []);

  const handleCreateSession = () => {
    if (!socket.connected) {
      alert("Error: Cannot connect to the backend server. Please make sure you have started the server by running 'npm start' in the 'app_build/server' directory!");
      return;
    }
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

      {sessionState === 'pretest' && pretestData && (
        <div style={{ textAlign: 'center' }}>
          <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Pretest is Active ({pretestData.index + 1} / {pretestData.total})</h3>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Please display this screen to the teams.</p>
          
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: 'white', marginBottom: '2rem' }}>Question {pretestData.index + 1}: {pretestData.question.question}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left' }}>
              {Object.entries(pretestData.question.options).map(([key, value]) => (
                <div key={key} className="card" style={{ fontSize: '1.2rem', padding: '1.5rem' }}>
                  {key}. {value}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            {pretestData.index < pretestData.total - 1 ? (
              <button 
                className="btn btn-primary" 
                onClick={() => socket.emit('host_next_pretest_question', { sessionCode })}
                style={{ flex: 1, fontSize: '1.2rem', padding: '1rem' }}
                disabled={!teams.every(t => t.pretestCompleted)}
              >
                Next Question
              </button>
            ) : (
              <button 
                className="btn btn-accent" 
                onClick={() => socket.emit('host_advance_state', { sessionCode, newState: 'preparation' })}
                style={{ flex: 1, fontSize: '1.2rem', padding: '1rem' }}
                disabled={!teams.every(t => t.pretestCompleted)}
              >
                End Pretest & Move to Main Dashboard
              </button>
            )}
          </div>
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
                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>Score: {t.score || 0}</div>
                <div style={{ marginBottom: '1rem' }}>
                  {t.members.map(m => m.name).join(', ')}
                </div>
                {t.pretestCompleted && (
                  <span className="badge badge-success" style={{ marginRight: '0.5rem' }}>Pretest Done</span>
                )}
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
