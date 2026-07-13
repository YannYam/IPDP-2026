import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { socket } from '../socket';

import vid1 from '../assets/1.mp4';
import vid2 from '../assets/2.mp4';
import vid3 from '../assets/3.mp4';
import img4 from '../assets/4.jpeg';
import img5 from '../assets/5.jpeg';
import img6 from '../assets/6.png';
import img7 from '../assets/7.png';

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
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [step, setStep] = useState('login'); // 'login' or 'select_team'
  const [currentChapter, setCurrentChapter] = useState(0);

  const materialChapters = [
    {
      title: "Apa itu banjir?",
      mediaType: "video",
      mediaUrl: vid1,
      content: "Banjir adalah peristiwa ketika air menggenangi suatu wilayah yang biasanya tidak tergenang. Banjir terjadi karena air hujan tidak dapat mengalir atau meresap ke dalam tanah dengan baik sehingga menumpuk di suatu tempat. Di Indonesia, banjir merupakan salah satu bencana yang paling sering terjadi, terutama saat musim hujan."
    },
    {
      title: "Mengapa Suatu Kawasan Sering Mengalami Banjir?",
      mediaType: "video",
      mediaUrl: vid2,
      content: "Banyak kawasan saat ini berkembang dengan cukup pesat. Banyak lahan terbuka hijau yang berubah menjadi jalan, perumahan, pertokoan, dan bangunan perkotaan lainnya. Akibatnya, air hujan lebih sulit meresap ke dalam tanah dan memicu terjadinya genangan."
    },
    {
      title: "Penyebab Utama Banjir",
      mediaType: "video",
      mediaUrl: vid3,
      content: "Beberapa penyebab utama banjir antara lain:\nCurah hujan yang tinggi: Saat hujan turun dengan intensitas tinggi dalam waktu yang lama, jumlah air yang turun lebih banyak daripada kemampuan saluran air untuk mengalirkannya.\nSaluran drainase tersumbat sampah: Sampah plastik, botol, daun, dan berbagai jenis sampah lainnya dapat menyumbat saluran air sehingga air meluap ke jalan."
    },
    {
      title: "Resapan & Kapasitas",
      mediaType: "image",
      mediaUrl: img4,
      content: "Selain curah hujan dan penumpukan sampah, penyebab lainnya meliputi:\nBerkurangnya daerah resapan air: Semakin banyak bangunan dan jalan yang menggunakan beton atau aspal menyebabkan air hujan tidak dapat meresap ke dalam tanah.\nKapasitas drainase yang kurang memadai: Jika saluran drainase terlalu kecil atau tidak dirawat dengan baik, air akan lebih mudah meluap ketika hujan deras melanda."
    },
    {
      title: "Dampak Banjir",
      mediaType: "image",
      mediaUrl: img5,
      content: "Banjir tidak hanya menyebabkan genangan air, tetapi juga menimbulkan berbagai dampak yang merugikan, seperti:\n1. Jalan menjadi sulit dilewati.\n2. Aktivitas sekolah dan pekerjaan terganggu.\n3. Kendaraan mengalami kemacetan.\n4. Rumah warga dapat kemasukan air.\n5. Sampah terbawa arus dan mencemari lingkungan.\n6. Meningkatkan risiko munculnya penyakit seperti diare dan penyakit kulit."
    },
    {
      title: "Bagaimana Cara Mencegah Banjir?",
      mediaType: "image",
      mediaUrl: img6,
      content: "Risiko banjir dapat dikurangi apabila masyarakat ikut menjaga lingkungan secara aktif. Beberapa cara yang dapat dilakukan yaitu:\n1. Tidak membuang sampah ke sungai maupun saluran air.\n2. Membersihkan selokan secara rutin.\n3. Menanam pohon dan menjaga ruang terbuka hijau.\n4. Membuat lubang biopori atau sumur resapan agar air lebih mudah masuk ke dalam tanah.\n5. Mengurangi penggunaan plastik sekali pakai sehingga jumlah sampah berkurang."
    },
    {
      title: "Apa yang Bisa Dilakukan Siswa?",
      mediaType: "image",
      mediaUrl: img7,
      content: "Walaupun masih duduk di bangku Siswa, setiap siswa dapat ikut berperan penting dalam mencegah banjir. Contohnya:\n1. Selalu membuang sampah pada tempatnya.\n2. Mengikuti kegiatan kerja bakti di sekolah maupun lingkungan rumah.\n3. Mengingatkan teman agar tidak membuang sampah sembarangan.\n4. Mengurangi penggunaan plastik sekali pakai.\n5. kut menjaga kebersihan selokan di sekitar rumah atau sekolah.\nPerubahan kecil yang dilakukan secara kolektif dapat memberikan dampak yang sangat besar bagi kelestarian lingkungan."
    }
  ];

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
      setIsSubmittingQuiz(false);
      if (data.question.mediaType === 'video' && data.question.mediaUrl) {
        setIsVideoPlaying(true);
      } else {
        setIsVideoPlaying(false);
      }
    });

    socket.on('quiz_answer_result', (result) => {
      setQuizFeedback(result);
      setIsSubmittingQuiz(false);
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
    setIsSubmittingQuiz(true);
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
                {currentTeamData?.score || 0}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/{100 + 100 + (currentTeamData?.maxReasoningScore || 100)}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Pretest ({currentTeamData?.pretestScore || 0}) + PG ({currentTeamData?.quizScore || 0}) + Alasan ({currentTeamData?.totalReasoningScore || 0})
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', flexWrap: 'wrap', gap: '1.5rem' }}>
              {/* Pretest Score */}
              <div style={{ textAlign: 'center', flex: '1 1 150px', minWidth: '150px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-muted)' }}>Skor Pretest</h4>
                <div style={{ fontSize: '2.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  {currentTeamData?.pretestScore || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 'bold', color: 'var(--text-secondary)' }}>({currentTeamData?.correctPretest || 0} dari {pretestData?.total || 3} Soal Benar)</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>(Sebelum Materi)</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', color: 'var(--accent)' }}>➡️</div>

              {/* Quiz MC Score */}
              <div style={{ textAlign: 'center', flex: '1 1 150px', minWidth: '150px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-muted)' }}>Skor Pilihan Ganda</h4>
                <div style={{ fontSize: '2.5rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {currentTeamData?.quizScore || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 'bold', color: 'var(--text-secondary)' }}>({currentTeamData?.correctQuiz || 0} dari 5 Soal Benar)</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>(Sesudah Materi)</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', color: 'var(--accent)' }}>➕</div>

              {/* Reasoning Essay Score */}
              <div style={{ textAlign: 'center', flex: '1 1 150px', minWidth: '150px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-muted)' }}>Skor Alasan (Essai)</h4>
                <div style={{ fontSize: '2.5rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                  {currentTeamData?.totalReasoningScore || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{currentTeamData?.maxReasoningScore || 100}</span>
                </div>
                <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 'bold', color: 'var(--text-secondary)' }}>IndoBERT Scoring</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>(Kualitas Alasan)</p>
              </div>
            </div>

            {/* Per-question reasoning breakdown */}
            {currentTeamData?.reasoningDetails && currentTeamData.reasoningDetails.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>Detail Skor Alasan Per Soal</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {currentTeamData.reasoningDetails.map((detail, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Soal {detail.questionIndex + 1}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: detail.score > 0 ? 'var(--accent)' : 'var(--danger)' }}>{detail.score}/{detail.maxScore}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({detail.matchedKeywords}/{detail.totalKeywords} kata kunci)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '2px solid var(--accent)' }}>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Skor Keseluruhan</h4>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-hover)' }}>
                {currentTeamData?.score || 0}
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/{100 + 100 + (currentTeamData?.maxReasoningScore || 100)}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                Pretest ({currentTeamData?.pretestScore || 0}) + Pilihan Ganda ({currentTeamData?.quizScore || 0}) + Alasan ({currentTeamData?.totalReasoningScore || 0})
              </p>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
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
          <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Materi Belajar - {materialChapters[currentChapter].title}</h3>

          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            {materialChapters[currentChapter].mediaType === 'video' ? (
              <video
                src={materialChapters[currentChapter].mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--primary)' }}
              />
            ) : (
              <img
                src={materialChapters[currentChapter].mediaUrl}
                alt={materialChapters[currentChapter].title}
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--primary)' }}
              />
            )}
          </div>

          <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-main)', marginBottom: '2rem', textAlign: 'left', whiteSpace: 'pre-line' }}>
            <p>{materialChapters[currentChapter].content}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentChapter(prev => Math.max(0, prev - 1))}
              disabled={currentChapter === 0}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              ← Prev
            </button>
            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>
              Bagian {currentChapter + 1} / {materialChapters.length}
            </span>
            <button
              className="btn btn-primary"
              onClick={() => setCurrentChapter(prev => Math.min(materialChapters.length - 1, prev + 1))}
              disabled={currentChapter === materialChapters.length - 1}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Next →
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setActiveTab('selection');
              setCurrentChapter(0);
            }}
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
                  disabled={!reasoning.trim() || !selectedQuizAnswer || isSubmittingQuiz}
                  onClick={handleQuizDone}
                  style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isSubmittingQuiz ? (
                    <>
                      <div className="loading-spinner" style={{ width: '20px', height: '20px', margin: 0, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                      <span>Sedang Mengevaluasi...</span>
                    </>
                  ) : (
                    'Kirim Jawaban Tim'
                  )}
                </button>
              ) : (
                <div className="card" style={{ marginTop: '1rem', background: quizFeedback.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `2px solid ${quizFeedback.isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
                  <h3 style={{ color: quizFeedback.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                    {quizFeedback.isCorrect ? 'Benar!' : 'Salah!'}
                  </h3>
                  <p>Jawaban yang benar adalah <strong>{quizFeedback.correctAnswer}</strong>.</p>

                  {/* MC Score */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '140px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Skor Pilihan Ganda</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: quizFeedback.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                        +{quizFeedback.mcScoreAdded || 0}
                      </div>
                    </div>

                    {/* Reasoning Score */}
                    <div style={{ flex: 1, minWidth: '140px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Skor Alasan (Essai)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        +{quizFeedback.reasoningScore || 0}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/{quizFeedback.reasoningMaxScore || 20}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Kata kunci cocok: {quizFeedback.matchedKeywords || 0}/{quizFeedback.totalKeywords || 0}
                      </div>
                    </div>
                  </div>

                  {/* Total Reasoning Accumulated */}
                  <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Skor Alasan Kumulatif: </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1.1rem' }}>{quizFeedback.totalReasoningScore || 0}/{quizFeedback.maxReasoningScore || 100}</span>
                  </div>

                  {/* Total Skor Pilihan Ganda */}
                  <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Skor Pilihan Ganda: </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1.1rem' }}>{quizFeedback.quizScore || 0}/100</span>
                  </div>

                  {/* Total Skor Keseluruhan */}
                  <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '1rem', textAlign: 'center', border: '2px solid var(--accent)' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Total Skor Keseluruhan: </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-hover)', fontSize: '1.3rem' }}>{quizFeedback.totalScore || 0}/{100 + 100 + (quizFeedback.maxReasoningScore || 100)}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Pretest ({quizFeedback.pretestScore || 0}) + PG ({quizFeedback.quizScore || 0}) + Alasan ({quizFeedback.totalReasoningScore || 0})
                    </div>
                  </div>

                  <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Menunggu Host melanjutkan pertanyaan...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card waiting-phase" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div className="loading-spinner"></div>
              <h3 className="pulse-text" style={{ marginTop: '1rem', color: 'var(--secondary)' }}>Memuat Pertanyaan Kuis...</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
