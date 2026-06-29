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
        <h2>Dashboard Host</h2>
        <p>Buat sesi baru untuk memulai.</p>
        <button className="btn" onClick={handleCreateSession}>
          <Settings style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Buat Sesi
        </button>
      </div>
    );
  }

  const allTeamsReady = teams.length > 0 && teams.every(t => t.isReady);

  return (
    <div className="panel">
      <h2>Sesi: {sessionCode}</h2>
      
      {sessionState === 'lobby' && (
        <>
          <h3>Lobi Menunggu ({participants.length} Bergabung)</h3>
          
          <form onSubmit={handleAddParticipant} style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <input 
              className="input-field" 
              style={{ marginBottom: 0 }}
              placeholder="Masukkan nama peserta..." 
              value={newParticipant} 
              onChange={e => setNewParticipant(e.target.value)} 
            />
            <button className="btn" type="submit" style={{ whiteSpace: 'nowrap' }}>Tambah Peserta</button>
          </form>

          <div className="grid-list">
            {participants.map(p => (
              <div key={p.id} className="card">
                <div>{p.name}</div>
              </div>
            ))}
          </div>
          <button className="btn" onClick={handleRandomize} style={{ marginTop: '2rem' }}>
            <Users style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Acak Tim
          </button>
        </>
      )}

      {sessionState === 'waiting_teams' && (
        <div style={{ textAlign: 'center', marginBottom: '2rem', background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px' }}>
          <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Menunggu Tim Login</h3>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Silakan arahkan peserta untuk login menggunakan ID Sesi: <strong>{sessionCode}</strong></p>
        </div>
      )}

      {sessionState === 'pretest' && pretestData && (
        <div style={{ textAlign: 'center' }}>
          <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Pretest Sedang Berlangsung ({pretestData.index + 1} / {pretestData.total})</h3>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Pertanyaan sedang dikerjakan oleh tim di perangkat masing-masing.</p>
          
          {teams.every(t => t.pretestCompleted) && teams.length > 0 && (
            <div style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px', marginTop: '2rem', textAlign: 'left' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>Evaluasi Pretest</h3>
              
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ color: 'white', margin: 0 }}>Pertanyaan: {pretestData.question.question}</h4>
              </div>

              <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--success)', marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Kunci Jawaban Benar:</h4>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{pretestData.question.answer}. {pretestData.question.options[pretestData.question.answer]}</p>
              </div>
              
              <h4>Jawaban Tim:</h4>
              <div className="grid-list">
                {teams.map(t => (
                  <div key={t.code} className="card" style={{ borderLeft: `6px solid ${t.lastPretestAnswer === pretestData.question.answer ? 'var(--success)' : 'var(--danger)'}` }}>
                    <h4 style={{ margin: 0 }}>{t.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({t.lastPretestAnswer || '-'})</span></h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            {pretestData.index < pretestData.total - 1 ? (
              <button 
                className="btn btn-primary" 
                onClick={() => socket.emit('host_next_pretest_question', { sessionCode })}
                style={{ flex: 1, fontSize: '1.2rem', padding: '1rem' }}
                disabled={!teams.every(t => t.pretestCompleted)}
              >
                Pertanyaan Selanjutnya
              </button>
            ) : (
              <button 
                className="btn btn-accent" 
                onClick={() => socket.emit('host_advance_state', { sessionCode, newState: 'preparation' })}
                style={{ flex: 1, fontSize: '1.2rem', padding: '1rem' }}
                disabled={!teams.every(t => t.pretestCompleted)}
              >
                Akhiri Pretest & Pindah ke Dashboard Utama
              </button>
            )}
          </div>
        </div>
      )}

      {(sessionState === 'waiting_teams' || sessionState === 'preparation') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Status Tim</h3>
          </div>
          <div className="grid-list">
            {teams.map(t => (
              <div key={t.code} className="card">
                <h4>{t.name}</h4>
                <div style={{ marginBottom: '1rem' }}>
                  {t.members.map(m => m.name).join(', ')}
                </div>
                {t.pretestCompleted && (
                  <span className="badge badge-success" style={{ marginRight: '0.5rem' }}>Pretest Selesai</span>
                )}
                {sessionState === 'preparation' ? (
                  <span className={`badge ${t.isReady ? 'badge-success' : 'badge-pending'}`}>
                    {t.isReady ? 'KUIS SIAP' : 'KUIS BELUM SIAP'}
                  </span>
                ) : (
                  <span className={`badge ${t.hasJoined ? 'badge-success' : 'badge-pending'}`}>
                    {t.hasJoined ? 'Online' : 'Menunggu Login...'}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {sessionState === 'waiting_teams' && (
            <button 
              className="btn btn-accent" 
              onClick={() => socket.emit('host_advance_state', { sessionCode, newState: 'pretest' })}
              style={{ marginTop: '2rem', width: '100%', fontSize: '1.2rem', padding: '1rem' }}
            >
              Semua Tim Telah Bergabung? Mulai Mode Pretest
            </button>
          )}

          {sessionState === 'preparation' && (
            <button 
              className="btn btn-primary" 
              onClick={handleStartQuiz} 
              disabled={!allTeamsReady}
              style={{ marginTop: '2rem', width: '100%', fontSize: '1.2rem', padding: '1rem' }}
            >
              <Play style={{ marginRight: '8px', verticalAlign: 'middle' }} /> 
              {allTeamsReady ? 'Mulai Kuis' : 'Menunggu semua tim siap kuis...'}
            </button>
          )}
        </>
      )}

      {sessionState === 'quiz' && (
        <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <h3 className="pulse-text" style={{ color: 'var(--secondary)' }}>Kuis Sedang Berlangsung!</h3>
          <p>Tim sedang menjawab pertanyaan.</p>
          {quizData && (
            <div style={{ marginTop: '1rem' }}>
              <p>Pertanyaan Saat Ini: {quizData.index + 1} / {quizData.total}</p>

              {teams.every(t => t.quizCompleted) && teams.length > 0 && (
                <div style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px', marginTop: '2rem', textAlign: 'left' }}>
                  <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>Waktunya Diskusi</h3>
                  
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ color: 'white', marginBottom: '1rem' }}>Pertanyaan: {quizData.question.question}</h4>
                    {quizData.question.mediaType === 'image' && quizData.question.mediaUrl && (
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <img src={quizData.question.mediaUrl} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} alt="Materi" />
                      </div>
                    )}
                    {quizData.question.mediaType === 'video' && quizData.question.mediaUrl && (
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <video src={quizData.question.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                      </div>
                    )}
                  </div>

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
                {quizData.index < quizData.total - 1 ? 'Pertanyaan Selanjutnya' : 'Selesaikan Kuis'}
              </button>
            </div>
          )}
        </div>
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
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', margin: '1rem 0' }}>
                  {t.score || 0}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/200 Pts</span>
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', background: 'var(--surface-soft)', padding: '0.5rem', borderRadius: '8px' }}>
                  <strong>Pretest:</strong> {t.pretestScore || 0}/100 <br/><span style={{fontSize: '0.8rem'}}>({t.correctPretest || 0} dari 3 Soal Benar)</span>
                  <hr style={{ margin: '0.5rem 0', borderColor: '#e5e7eb' }} />
                  <strong>Kuis:</strong> {t.quizScore || 0}/100 <br/><span style={{fontSize: '0.8rem'}}>({t.correctQuiz || 0} dari 5 Soal Benar)</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t.members.map(m => m.name).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
