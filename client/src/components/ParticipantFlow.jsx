import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';

export default function ParticipantFlow() {
  const { sessionCode, teamInfo, teams, sessionState, setSessionCode, setTeamInfo, setTeams, setSessionState } = useStore();
  const [inputSession, setInputSession] = useState('');
  const [inputTeam, setInputTeam] = useState('');
  const [activeTab, setActiveTab] = useState('material');
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    socket.on('team_joined', ({ sessionCode, team }) => {
      setSessionCode(sessionCode);
      setTeamInfo(team);
    });

    socket.on('teams_assigned', ({ teams }) => {
      setTeams(teams);
      if (teamInfo) {
        const myTeam = teams.find(t => t.code === teamInfo.code);
        if (myTeam) setTeamInfo(myTeam);
      }
    });

    socket.on('readiness_update', (updatedTeams) => {
      setTeams(updatedTeams);
      if (teamInfo) {
        const myTeam = updatedTeams.find(t => t.code === teamInfo.code);
        if (myTeam) setTeamInfo(myTeam);
      }
    });

    socket.on('session_state_update', (state) => {
      setSessionState(state);
    });

    return () => {
      socket.off('team_joined');
      socket.off('teams_assigned');
      socket.off('readiness_update');
      socket.off('session_state_update');
    };
  }, [teamInfo]);

  const handleJoin = (e) => {
    e.preventDefault();
    socket.emit('team_join_session', { sessionCode: inputSession, teamCode: inputTeam });
  };

  const handleToggleReady = () => {
    socket.emit('toggle_ready', { sessionCode, teamCode: teamInfo.code });
  };

  if (!sessionCode) {
    return (
      <div className="panel" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Team Login</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Enter the codes provided by the Host to log in your team device.</p>
        <form onSubmit={handleJoin}>
          <input 
            className="input-field" 
            placeholder="Session ID" 
            value={inputSession} 
            onChange={e => setInputSession(e.target.value)} 
            required 
          />
          <input 
            className="input-field" 
            placeholder="Team Code (e.g. TEAM-XXXX)" 
            value={inputTeam} 
            onChange={e => setInputTeam(e.target.value)} 
            required 
          />
          <button className="btn btn-accent" type="submit" style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}>
            Enter Session
          </button>
        </form>
      </div>
    );
  }

  if (sessionState === 'lobby' || sessionState === 'waiting_teams' || sessionState === 'pretest') {
    return (
      <div className="panel waiting-phase">
        <h3 className="pulse-text" style={{ color: 'var(--primary)', fontSize: '2rem' }}>
          {(sessionState === 'lobby' || sessionState === 'waiting_teams') ? 'Waiting for Host...' : 'Pretest is Active!'}
        </h3>
        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
          {(sessionState === 'lobby' || sessionState === 'waiting_teams') 
            ? 'The host is currently organizing the session. Please wait.' 
            : 'Please look at the Host\'s screen and discuss the Pretest questions with your team!'}
        </p>
      </div>
    );
  }

  // Preparation or Quiz phase (Main Dashboard)
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>{teamInfo?.name || 'Your Team'}</h2>
          <div style={{ color: 'var(--text-muted)' }}>Members: {teamInfo?.members.map(m => m.name).join(', ')}</div>
        </div>
        <span className="badge badge-success" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>{teamInfo?.code}</span>
      </div>

      <div className="tabs">
        <div className={`tab ${activeTab === 'material' ? 'active' : ''}`} onClick={() => setActiveTab('material')}>Material</div>
        <div className={`tab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveTab('quiz')}>Quiz</div>
      </div>

      {activeTab === 'material' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--primary)' }}>Study Materials</h3>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Read the modules and watch the videos before starting the quiz with your team.</p>
          <ul style={{ lineHeight: '2' }}>
            <li><strong style={{ color: 'white' }}>Module 1:</strong> Introduction to WebSockets and Real-time data sync.</li>
            <li><strong style={{ color: 'white' }}>Module 2:</strong> Collaborative State Management in React.</li>
          </ul>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="quiz-container">
          {sessionState === 'preparation' ? (
            <div className="waiting-phase">
              <div className="loading-spinner"></div>
              <h3 className="pulse-text">Waiting Phase</h3>
              <p>The quiz cannot begin until all teams click Ready.</p>
              <div style={{ marginTop: '2rem' }}>
                <button 
                  className={`btn ${teamInfo?.isReady ? 'btn-secondary' : 'btn-accent'}`} 
                  onClick={handleToggleReady}
                  style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}
                >
                  {teamInfo?.isReady ? 'Cancel Ready State' : 'Mark Team as READY'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ color: 'var(--accent)' }}>Question 1</h3>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Why is Socket.io used in this application instead of traditional HTTP polling?</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                <button className="btn btn-secondary" style={{ textAlign: 'left' }}>A. It relies entirely on MongoDB to push updates</button>
                <button className="btn btn-secondary" style={{ textAlign: 'left' }}>B. It provides event-based, low-latency bi-directional synchronization</button>
                <button className="btn btn-secondary" style={{ textAlign: 'left' }}>C. It is the only way to style React components dynamically</button>
              </div>

              <h4>Reasoning (Required)</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Discuss with your team and explain why you chose this answer.</p>
              <textarea 
                className="input-field" 
                rows="5" 
                placeholder="Type your team's reasoning here..."
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
              ></textarea>
              
              <button 
                className="btn btn-accent" 
                disabled={!reasoning.trim()}
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Submit Team Answer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
