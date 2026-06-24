import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';
import { Users, Play, Settings } from 'lucide-react';

export default function HostDashboard() {
  const { sessionCode, sessionState, participants, teams, pretestData, quizData, setSessionCode, setParticipants, setTeams, setSessionState, setPretestData, setQuizData } = useStore();
  const [newParticipant, setNewParticipant] = useState('');

  useEffect(() => {
    socket.on('session_created', ({ sessionCode }) => setSessionCode(sessionCode));
    socket.on('lobby_update', (parts) => setParticipants(parts));
    socket.on('teams_assigned', ({ teams }) => setTeams(teams));
    socket.on('readiness_update', (teams) => setTeams(teams));
    socket.on('session_state_update', (state) => setSessionState(state));
    socket.on('pretest_question_update', (data) => setPretestData(data));
    socket.on('quiz_question_update', (data) => setQuizData(data));

    return () => {
      socket.off('session_created');
      socket.off('lobby_update');
      socket.off('teams_assigned');
      socket.off('readiness_update');
      socket.off('session_state_update');
      socket.off('pretest_question_update');
      socket.off('quiz_question_update');
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
              {quizData && (
                <div style={{ marginTop: '1rem' }}>
                  <p>Current Question: {quizData.index + 1} / {quizData.total}</p>

                  {teams.every(t => t.quizCompleted) && teams.length > 0 && (
                    <div style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px', marginTop: '2rem', textAlign: 'left' }}>
                      <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>Waktunya Diskusi</h3>
                      <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--success)', marginBottom: '2rem' }}>
                        <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Kunci Jawaban Benar:</h4>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{quizData.question.answer}. {quizData.question.options[quizData.question.answer]}</p>
                      </div>
                      
                      <h4>Jawaban & Alasan Tim:</h4>
                      <div className="grid-list">
                        {teams.map(t => (
                          <div key={t.code} className="card" style={{ borderLeft: `6px solid ${t.lastAnswer === quizData.question.answer ? 'var(--success)' : 'var(--danger)'}` }}>
                            <h4 style={{ margin: 0 }}>{t.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({t.lastAnswer})</span></h4>
                            <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>"{t.lastReasoning}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn btn-primary" 
                    onClick={() => socket.emit('host_next_quiz_question', { sessionCode })}
                    style={{ fontSize: '1.2rem', padding: '1rem', marginTop: '2rem' }}
                    disabled={!teams.every(t => t.quizCompleted)}
                  >
                    {quizData.index < quizData.total - 1 ? 'Next Question' : 'Finish Quiz'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {sessionState === 'leaderboard' && (
        <div className="card" style={{ marginTop: '2rem', textAlign: 'center', background: 'var(--surface-warm)', padding: '3rem' }}>
          <h2 style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase' }}>🏆 Leaderboard 🏆</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>Kuis telah selesai! Berikut adalah kelompok dengan skor tertinggi:</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {[...teams].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 2).map((t, index) => (
              <div key={t.code} className="card" style={{ width: '300px', transform: index === 0 ? 'scale(1.1)' : 'scale(1)', border: `4px solid ${index === 0 ? '#fbbf24' : '#9ca3af'}`, background: '#ffffff' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{index === 0 ? '🥇' : '🥈'}</div>
                <h3 style={{ margin: 0, color: index === 0 ? 'var(--accent-hover)' : 'var(--text-secondary)' }}>{t.name}</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', margin: '1rem 0' }}>{t.score || 0} Pts</div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t.members.map(m => m.name).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
