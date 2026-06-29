import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';

export default function ParticipantFlow() {
  const { sessionCode, teamInfo, teams, sessionState, pretestData, quizData, setSessionCode, setTeamInfo, setTeams, setSessionState, setPretestData, setQuizData } = useStore();
  const [inputSession, setInputSession] = useState('');
  const [inputTeam, setInputTeam] = useState('');
  const [activeTab, setActiveTab] = useState('selection');
  const [reasoning, setReasoning] = useState('');
  const [selectedPretestAnswer, setSelectedPretestAnswer] = useState(null);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [step, setStep] = useState('login'); // 'login' or 'select_team'

  useEffect(() => {
    socket.on('team_joined', ({ sessionCode, team }) => {
      setSessionCode(sessionCode);
      setTeamInfo(team);
    });

    socket.on('session_teams_list', ({ teams }) => {
      setTeams(teams);
      setStep('select_team');
    });

    socket.on('error', (msg) => {
      alert(msg);
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

    socket.on('pretest_question_update', (data) => {
      setPretestData(data);
      setSelectedPretestAnswer(null); // Reset choice on new question
    });

    socket.on('quiz_question_update', (data) => {
      setQuizData(data);
      setSelectedQuizAnswer(null);
      setQuizFeedback(null);
      setReasoning('');
      if (data.question.mediaType === 'video' && data.question.mediaUrl) {
        setIsVideoPlaying(true);
      } else {
        setIsVideoPlaying(false);
      }
    });

    socket.on('quiz_answer_result', (result) => {
      setQuizFeedback(result);
    });

    return () => {
      socket.off('team_joined');
      socket.off('teams_assigned');
      socket.off('readiness_update');
      socket.off('session_state_update');
      socket.off('pretest_question_update');
      socket.off('quiz_question_update');
      socket.off('quiz_answer_result');
      socket.off('session_teams_list');
      socket.off('error');
    };
  }, [teamInfo]);

  const handleCheckSession = (e) => {
    e.preventDefault();
    socket.emit('check_session_teams', { sessionCode: inputSession });
  };

  const handleChangeTeam = () => {
    socket.emit('team_leave_session', { sessionCode, teamCode: teamInfo.code });
    setSessionCode(null);
    setTeamInfo(null);
    setStep('select_team');
  };

  const handleToggleReady = () => {
    socket.emit('toggle_ready', { sessionCode, teamCode: teamInfo.code });
  };

  const handlePretestDone = () => {
    socket.emit('team_submit_pretest', { sessionCode, teamCode: teamInfo.code, answer: selectedPretestAnswer });
  };

  const handleQuizDone = () => {
    socket.emit('team_submit_quiz', { sessionCode, teamCode: teamInfo.code, answer: selectedQuizAnswer, reasoning });
  };

  if (!sessionCode && step === 'login') {
    return (
      <div className="panel" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Login Tim</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Masukkan kode yang diberikan oleh Host untuk masuk.</p>
        <form onSubmit={handleCheckSession}>
          <input 
            className="input-field" 
            placeholder="ID Sesi" 
            value={inputSession} 
            onChange={e => setInputSession(e.target.value)} 
            required 
          />
          <button className="btn btn-accent" type="submit" style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}>
            Cek Sesi
          </button>
        </form>
      </div>
    );
  }

  if (!sessionCode && step === 'select_team') {
    return (
      <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Pilih Tim</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Pilih tim Anda dari daftar di bawah.</p>
        
        {teams.length === 0 ? (
          <div style={{ background: 'var(--panel-bg)', padding: '2rem', borderRadius: '12px' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '1rem' }}>Host belum membagi tim. Menunggu...</p>
          </div>
        ) : (
          <div className="grid-list" style={{ textAlign: 'left' }}>
            {teams.map(t => (
              <div 
                key={t.code} 
                className="card" 
                style={{ cursor: t.hasJoined ? 'not-allowed' : 'pointer', opacity: t.hasJoined ? 0.6 : 1 }}
                onClick={() => {
                  if (!t.hasJoined) {
                    socket.emit('team_join_session', { sessionCode: inputSession, teamCode: t.code });
                  }
                }}
              >
                <h4>{t.name}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t.members.map(m => m.name).join(', ')}</p>
                {t.hasJoined && <span className="badge badge-pending" style={{ marginTop: '0.5rem', display: 'inline-block' }}>Sudah Login</span>}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-secondary" onClick={() => setStep('login')} style={{ marginTop: '2rem', width: '100%' }}>
          Kembali
        </button>
      </div>
    );
  }

  const allTeamsPretestCompleted = teams.length > 0 && teams.every(t => t.pretestCompleted);

  if (sessionState === 'leaderboard') {
    // Gunakan data tim yang paling update dari array teams
    const currentTeamData = teams.find(t => t.code === teamInfo?.code) || teamInfo;

    return (
      <div className="panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase' }}>🎉 Kuis Selesai! 🎉</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>Terima kasih telah berpartisipasi. Silakan lihat hasil klasemen akhir di layar proyektor Host!</p>
        
        {!showJourney ? (
          <>
            <div className="card" style={{ display: 'inline-block', background: 'var(--surface-warm)', border: '4px solid var(--accent)', padding: '2rem 4rem', marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem' }}>Total Skor Tim Kamu</h3>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--accent-hover)', marginTop: '0.5rem' }}>
                {currentTeamData?.score || 0}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/200</span>
              </div>
            </div>
            <div>
              <button className="btn btn-secondary" onClick={() => setShowJourney(true)} style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
                🗺️ Lihat Perjalananmu
              </button>
            </div>
          </>
        ) : (
          <div className="card" style={{ background: 'var(--panel-bg)', textAlign: 'left', marginTop: '1rem' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '2rem', textAlign: 'center' }}>Perjalanan Belajar Tim</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--text-muted)' }}>Skor Pretest</h4>
                <div style={{ fontSize: '3rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  {currentTeamData?.pretestScore || 0}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <p style={{ fontSize: '1rem', margin: 0, fontWeight: 'bold', color: 'var(--text-secondary)' }}>({currentTeamData?.correctPretest || 0} dari 3 Soal Benar)</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>(Sebelum Materi)</p>
              </div>
              <div style={{ fontSize: '2rem', color: 'var(--accent)' }}>➡️</div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: 'var(--text-muted)' }}>Skor Kuis</h4>
                <div style={{ fontSize: '3rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {currentTeamData?.quizScore || 0}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <p style={{ fontSize: '1rem', margin: 0, fontWeight: 'bold', color: 'var(--text-secondary)' }}>({currentTeamData?.correctQuiz || 0} dari 5 Soal Benar)</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>(Sesudah Materi)</p>
              </div>
            </div>
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowJourney(false)}>Kembali</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (sessionState === 'lobby' || sessionState === 'waiting_teams' || sessionState === 'pretest') {
    return (
      <div className="panel waiting-phase">
        <h3 className="pulse-text" style={{ color: 'var(--primary)', fontSize: '2rem' }}>
          {(sessionState === 'lobby' || sessionState === 'waiting_teams') ? 'Menunggu Host...' : 'Pretest Dimulai!'}
        </h3>
        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
          {(sessionState === 'lobby' || sessionState === 'waiting_teams') 
            ? 'Host sedang mengatur sesi. Harap tunggu.' 
            : 'Silakan diskusikan pertanyaan Pretest dengan tim Anda!'}
        </p>
        {sessionState === 'waiting_teams' && (
          <button 
            className="btn btn-secondary" 
            onClick={handleChangeTeam} 
            style={{ marginTop: '1rem' }}
          >
            Salah pilih tim? Ganti Tim
          </button>
        )}
        {sessionState === 'pretest' && !teamInfo?.pretestCompleted && pretestData && (
          <div className="card" style={{ marginTop: '2rem', textAlign: 'left', padding: '2rem' }}>
            <h3 style={{ color: 'var(--accent)' }}>Pertanyaan {pretestData.index + 1}</h3>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{pretestData.question.question}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {Object.entries(pretestData.question.options).map(([key, value]) => (
                <button 
                  key={key}
                  className={`btn ${selectedPretestAnswer === key ? 'btn-accent' : 'btn-secondary'}`}
                  onClick={() => setSelectedPretestAnswer(key)}
                  style={{ textAlign: 'left', padding: '1rem' }}
                >
                  {key}. {value}
                </button>
              ))}
            </div>
            <button 
              className="btn btn-accent" 
              onClick={handlePretestDone} 
              disabled={!selectedPretestAnswer}
              style={{ width: '100%', padding: '1rem' }}
            >
              Kirim Jawaban Pretest
            </button>
          </div>
        )}
        {sessionState === 'pretest' && teamInfo?.pretestCompleted && !allTeamsPretestCompleted && (
          <div className="card" style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>✔ Jawaban Terkirim</h3>
            <p style={{ fontSize: '1.2rem', margin: 0 }}>Menunggu tim lain selesai...</p>
          </div>
        )}
        {sessionState === 'pretest' && teamInfo?.pretestCompleted && allTeamsPretestCompleted && (
          <div className="card" style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)' }}>
            <h3 style={{ color: 'var(--success)', marginBottom: '1rem' }}>✔ Pretest Selesai!</h3>
            <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Kunci Jawaban: <strong style={{ color: 'white' }}>{pretestData?.question.answer || 'B'}</strong></p>
            <p style={{ fontSize: '1.5rem', color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>
              Skor Pretest Sementara: {teamInfo?.pretestScore || 0}/100
            </p>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
              ({teamInfo?.correctPretest || 0} dari {pretestData?.total || 3} Soal Benar)
            </p>
          </div>
        )}
      </div>
    );
  }

  // Preparation or Quiz phase (Main Dashboard)
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>{teamInfo?.name || 'Tim Kamu'}</h2>
          <div style={{ color: 'var(--text-muted)' }}>Anggota: {teamInfo?.members.map(m => m.name).join(', ')}</div>
        </div>
        <span className="badge badge-success" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>{teamInfo?.code}</span>
      </div>

      {activeTab === 'selection' && (
        <div className="menu-choices">
          <div className="choice-card material" onClick={() => setActiveTab('material')}>
            <div className="choice-icon">📚</div>
            <h3>Materi Belajar</h3>
            <p>Pelajari modul dan video sebelum mulai</p>
          </div>
          <div className="choice-card quiz" onClick={() => setActiveTab('quiz')}>
            <div className="choice-icon">🎮</div>
            <h3>Mulai Quiz</h3>
            <p>Ayo uji pengetahuan tim kalian!</p>
          </div>
        </div>
      )}

      {activeTab === 'material' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--primary)' }}>Materi Belajar</h3>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Pelajari modul dan tonton video sebelum memulai kuis bersama tim.</p>
          
          <div style={{ marginBottom: '2rem' }}>
            <iframe 
              width="100%" 
              height="315" 
              src="https://www.youtube.com/embed/vQ_a7_xP-G0" 
              title="WebSocket Tutorial" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              style={{ borderRadius: '12px', border: '2px solid var(--primary-light)' }}
            ></iframe>
          </div>

          <ul style={{ lineHeight: '2', color: 'var(--text-main)', marginBottom: '2rem' }}>
            <li><strong>Modul 1:</strong> Pengantar WebSockets dan Sinkronisasi data Real-time.</li>
            <li><strong>Modul 2:</strong> Manajemen State Kolaboratif di React.</li>
          </ul>
          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveTab('selection')}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            ← Kembali ke Pilihan
          </button>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="quiz-container">
          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveTab('selection')}
            style={{ alignSelf: 'flex-start', marginBottom: '1rem' }}
          >
            ← Kembali ke Pilihan
          </button>
          
          {sessionState === 'preparation' ? (
            <div className="waiting-phase">
              <div className="loading-spinner"></div>
              <h3 className="pulse-text">Fase Persiapan</h3>
              <p>Kuis tidak dapat dimulai sampai semua tim menekan tombol Siap.</p>
              <div style={{ marginTop: '2rem' }}>
                <button 
                  className={`btn ${teamInfo?.isReady ? 'btn-secondary' : 'btn-accent'}`} 
                  onClick={handleToggleReady}
                  style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}
                >
                  {teamInfo?.isReady ? 'Batal Siap' : 'Tandai Tim SIAP KUIS'}
                </button>
              </div>
            </div>
          ) : quizData && isVideoPlaying && quizData.question.mediaType === 'video' ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Perhatikan Video baik-baik!</h3>
              <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Pertanyaan akan muncul otomatis setelah video selesai.</p>
              <video 
                src={quizData.question.mediaUrl} 
                autoPlay 
                controls 
                onEnded={() => setIsVideoPlaying(false)}
                style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--primary)' }}
              />
              <button className="btn btn-secondary" onClick={() => setIsVideoPlaying(false)} style={{ marginTop: '1rem' }}>Lewati Video</button>
            </div>
          ) : quizData ? (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ color: 'var(--accent)' }}>Pertanyaan {quizData.index + 1}</h3>
              
              {quizData.question.mediaType === 'image' && quizData.question.mediaUrl && (
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  <img 
                    src={quizData.question.mediaUrl} 
                    alt="Materi Pertanyaan" 
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', border: '1px solid var(--primary)' }} 
                  />
                </div>
              )}

              <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{quizData.question.question}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                {Object.entries(quizData.question.options).map(([key, value]) => (
                  <button 
                    key={key} 
                    className={`btn ${selectedQuizAnswer === key ? 'btn-accent' : 'btn-secondary'}`} 
                    style={{ textAlign: 'left' }}
                    onClick={() => setSelectedQuizAnswer(key)}
                    disabled={quizFeedback !== null}
                  >
                    {key}. {value}
                  </button>
                ))}
              </div>

              <h4>Alasan (Wajib)</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Diskusikan dengan tim dan jelaskan mengapa memilih jawaban ini.</p>
              <textarea 
                className="input-field" 
                rows="5" 
                placeholder="Ketik alasan tim Anda di sini..."
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                disabled={quizFeedback !== null}
              ></textarea>
              
              {!quizFeedback ? (
                <button 
                  className="btn btn-accent" 
                  disabled={!reasoning.trim() || !selectedQuizAnswer}
                  onClick={handleQuizDone}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  Kirim Jawaban Tim
                </button>
              ) : (
                <div className="card" style={{ marginTop: '1rem', background: quizFeedback.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `2px solid ${quizFeedback.isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
                  <h3 style={{ color: quizFeedback.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                    {quizFeedback.isCorrect ? 'Benar!' : 'Salah!'}
                  </h3>
                  <p>Jawaban yang benar adalah <strong>{quizFeedback.correctAnswer}</strong>.</p>
                  {quizFeedback.isCorrect && <p style={{ fontSize: '1.2rem', color: 'var(--success)' }}>Skor bertambah: +{quizFeedback.scoreAdded}</p>}
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Menunggu Host melanjutkan pertanyaan...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              Memuat Pertanyaan Kuis...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
