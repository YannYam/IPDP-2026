require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../client/dist')));

// In-memory store for quick lookups
const sessions = {}; 
// e.g., { "CODE123": { state: "lobby", teams: [{ code: "T1", members: [], isReady: false }], currentPretestIndex: 0 } }

const PRETEST_QUESTIONS = [
  {
    question: "Banjir yang sering terjadi di kawasan Telang sekitar Universitas Trunojoyo Madura umumnya disebabkan oleh....",
    options: {
      A: "Letusan gunung berapi",
      B: "Curah hujan tinggi yang disertai sistem drainase yang kurang optimal",
      C: "Gempa bumi",
      D: "Kebakaran hutan"
    },
    answer: "B"
  },
  {
    question: "Salah satu aktivitas manusia yang dapat memperparah banjir di kawasan Telang adalah....",
    options: {
      A: "Menanam pohon",
      B: "Membersihkan saluran drainase",
      C: "Membuang sampah ke saluran air",
      D: "Membuat biopori"
    },
    answer: "C"
  },
  {
    question: "Dampak banjir yang paling mungkin dialami mahasiswa Universitas Trunojoyo Madura adalah....",
    options: {
      A: "Jalan menuju kampus tergenang sehingga aktivitas belajar terganggu",
      B: "Nilai kuliah meningkat",
      C: "Kampus menjadi lebih luas",
      D: "Cuaca menjadi lebih dingin"
    },
    answer: "A"
  },
  {
    question: "Mengapa pembangunan yang pesat dapat meningkatkan risiko banjir?",
    options: {
      A: "Karena jumlah pohon semakin banyak",
      B: "Karena permukaan tanah menjadi kedap air sehingga air hujan sulit meresap",
      C: "Karena hujan menjadi berhenti",
      D: "Karena sungai menjadi lebih dalam"
    },
    answer: "B"
  },
  {
    question: "Tindakan yang paling tepat untuk membantu mengurangi banjir di lingkungan kampus adalah....",
    options: {
      A: "Menutup saluran drainase",
      B: "Menjaga kebersihan saluran air dan tidak membuang sampah sembarangan",
      C: "Membuang sampah saat hujan deras",
      D: "Menimbun saluran air"
    },
    answer: "B"
  }
];

const POSTTEST_QUESTIONS = [
  {
    question: "Setelah mempelajari penyebab banjir di Telang, faktor yang paling memengaruhi terjadinya genangan adalah....",
    options: {
      A: "Intensitas hujan yang tinggi disertai drainase yang tidak mampu mengalirkan air secara optimal",
      B: "Aktivitas nelayan",
      C: "Perubahan arah angin",
      D: "Letusan gunung api"
    },
    answer: "A",
    referenceReasoning: "Banjir di kawasan Telang disebabkan oleh intensitas curah hujan yang tinggi dan sistem drainase yang tidak mampu menampung serta mengalirkan air secara optimal sehingga terjadi genangan."
  },
  {
    question: "Apabila saluran drainase dipenuhi sampah plastik, maka kemungkinan yang terjadi adalah....",
    options: {
      A: "Air mengalir lebih cepat",
      B: "Air hujan mudah meresap ke tanah",
      C: "Aliran air terhambat sehingga risiko banjir meningkat",
      D: "Tidak ada perubahan"
    },
    answer: "C",
    referenceReasoning: "Sampah plastik yang menumpuk di saluran drainase akan menyumbat aliran air sehingga air tidak dapat mengalir dengan lancar dan meluap ke permukaan menyebabkan risiko banjir meningkat."
  },
  {
    question: "Jika Anda melihat genangan air mulai terbentuk di sekitar kampus akibat saluran tersumbat, tindakan yang paling tepat adalah....",
    options: {
      A: "Membiarkannya",
      B: "Membersihkan atau melaporkan kepada pihak yang berwenang",
      C: "Menambah sampah ke saluran",
      D: "Menunggu hujan berhenti"
    },
    answer: "B",
    referenceReasoning: "Tindakan yang tepat adalah segera membersihkan saluran yang tersumbat atau melaporkan kepada pihak berwenang agar masalah dapat ditangani dengan cepat dan mencegah genangan semakin parah."
  },
  {
    question: "Salah satu cara meningkatkan resapan air di kawasan kampus adalah....",
    options: {
      A: "Menambah area beraspal",
      B: "Memperbanyak ruang terbuka hijau dan lubang resapan",
      C: "Menutup seluruh lahan kosong",
      D: "Menutup drainase"
    },
    answer: "B",
    referenceReasoning: "Memperbanyak ruang terbuka hijau dan lubang resapan biopori membantu air hujan meresap ke dalam tanah sehingga mengurangi volume air permukaan dan risiko banjir di kawasan kampus."
  },
  {
    question: "Berdasarkan kondisi banjir di Telang, solusi yang paling efektif dilakukan secara bersama adalah....",
    options: {
      A: "Menunggu bantuan pemerintah saja",
      B: "Menjaga kebersihan drainase, mengurangi sampah plastik, dan mendukung penambahan daerah resapan",
      C: "Menutup seluruh saluran air",
      D: "Membiarkan genangan mengering sendiri"
    },
    answer: "B",
    referenceReasoning: "Solusi efektif memerlukan kerja sama masyarakat dengan menjaga kebersihan saluran drainase, mengurangi penggunaan dan pembuangan sampah plastik sembarangan, serta mendukung penambahan area resapan air untuk mengurangi banjir."
  }
];

// Max reasoning score per question
const REASONING_POINTS_PER_QUESTION = 20;

// Helper: Score reasoning using IndoBERT Python script
function scoreReasoning(studentReasoning, referenceReasoning, maxPoints = REASONING_POINTS_PER_QUESTION) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      student: studentReasoning,
      reference: referenceReasoning,
      max_points: maxPoints
    });
    const b64 = Buffer.from(data).toString('base64');
    const scriptPath = path.join(__dirname, 'score_reasoning.py');
    
    execFile('python', [scriptPath, b64], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Python scoring error:', error.message);
        resolve({ score: 0, matched_keywords: 0, total_keywords: 0 });
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          console.error('Scoring script error:', result.error);
          resolve({ score: 0, matched_keywords: 0, total_keywords: 0 });
        } else {
          resolve(result);
        }
      } catch (e) {
        console.error('Failed to parse scoring output:', stdout);
        resolve({ score: 0, matched_keywords: 0, total_keywords: 0 });
      }
    });
  });
}
// Helper: Strip sensitive fields from questions before sending to clients
function sanitizeQuestion(q) {
  const { referenceReasoning, ...safe } = q;
  return safe;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates session
  socket.on('create_session', (data) => {
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    sessions[sessionCode] = { host: socket.id, state: 'lobby', participants: [], teams: [], currentPretestIndex: 0 };
    socket.join(sessionCode);
    socket.emit('session_created', { sessionCode });
  });

  // Team joins session
  socket.on('team_join_session', ({ sessionCode, teamCode }) => {
    if (sessions[sessionCode]) {
      const team = sessions[sessionCode].teams.find(t => t.code === teamCode);
      if (team) {
        team.hasJoined = true;
        socket.sessionCode = sessionCode;
        socket.teamCode = teamCode;
        
        // Team found, join socket to session and emit state
        socket.join(sessionCode);
        socket.emit('team_joined', { sessionCode, team });
        
        io.to(sessionCode).emit('readiness_update', sessions[sessionCode].teams);
        
        // Emit current state so team knows where they are
        socket.emit('session_state_update', sessions[sessionCode].state);
        socket.emit('teams_assigned', { teams: sessions[sessionCode].teams });
        
        if (sessions[sessionCode].state === 'pretest') {
          socket.emit('pretest_question_update', {
            index: sessions[sessionCode].currentPretestIndex,
            total: PRETEST_QUESTIONS.length,
            question: PRETEST_QUESTIONS[sessions[sessionCode].currentPretestIndex]
          });
        }
      } else {
        socket.emit('error', 'Invalid Team Code');
      }
    } else {
      socket.emit('error', 'Session not found');
    }
  });

  // Host manually adds a participant
  socket.on('host_add_participant', ({ sessionCode, name }) => {
    if (sessions[sessionCode]) {
      const participant = { id: `manual-${Date.now()}-${Math.random()}`, name, pretestCompleted: true };
      sessions[sessionCode].participants.push(participant);
      io.to(sessionCode).emit('lobby_update', sessions[sessionCode].participants);
    }
  });

  // Check available teams for a session (used by participant before joining a team)
  socket.on('check_session_teams', ({ sessionCode }) => {
    if (sessions[sessionCode]) {
      socket.join(sessionCode); // Join room to listen for teams_assigned event
      socket.emit('session_teams_list', { teams: sessions[sessionCode].teams });
    } else {
      socket.emit('error', 'Session not found');
    }
  });

  // Participant leaves a team (to change team)
  socket.on('team_leave_session', ({ sessionCode, teamCode }) => {
    if (sessions[sessionCode]) {
      const team = sessions[sessionCode].teams.find(t => t.code === teamCode);
      if (team) {
        team.hasJoined = false;
        socket.sessionCode = null;
        socket.teamCode = null;
        io.to(sessionCode).emit('readiness_update', sessions[sessionCode].teams);
      }
    }
  });

  // Participant completes pretest
  socket.on('submit_pretest', ({ sessionCode }) => {
    if (sessions[sessionCode]) {
      const p = sessions[sessionCode].participants.find(p => p.id === socket.id);
      if (p) p.pretestCompleted = true;
      io.to(sessionCode).emit('lobby_update', sessions[sessionCode].participants);
    }
  });

  // Host randomizes teams
  socket.on('randomize_teams', ({ sessionCode, teamCount }) => {
    if (sessions[sessionCode]) {
      const session = sessions[sessionCode];
      session.state = 'grouping';
      
      const parts = [...session.participants];
      const teams = Array.from({ length: teamCount }, (_, i) => ({
        code: `TEAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: `Team ${i + 1}`,
        members: [],
        hasJoined: false,
        isReady: false,
        score: 0,
        pretestScore: 0,
        quizScore: 0,
        correctPretest: 0,
        correctQuiz: 0
      }));

      // Distribute
      parts.sort(() => Math.random() - 0.5);
      parts.forEach((p, i) => {
        const teamIndex = i % teamCount;
        teams[teamIndex].members.push(p);
      });

      session.teams = teams;
      io.to(sessionCode).emit('teams_assigned', { teams });
      session.state = 'waiting_teams'; // Wait for teams to join
      io.to(sessionCode).emit('session_state_update', 'waiting_teams');
    }
  });

  // Host advances session state
  socket.on('host_advance_state', ({ sessionCode, newState }) => {
    if (sessions[sessionCode]) {
      sessions[sessionCode].state = newState;
      if (newState === 'pretest') {
        sessions[sessionCode].currentPretestIndex = 0;
        sessions[sessionCode].teams.forEach(t => t.pretestCompleted = false);
      }
      io.to(sessionCode).emit('session_state_update', newState);
      
      if (newState === 'pretest') {
        io.to(sessionCode).emit('pretest_question_update', {
          index: 0,
          total: PRETEST_QUESTIONS.length,
          question: PRETEST_QUESTIONS[0]
        });
      }
    }
  });

  // Host next pretest question
  socket.on('host_next_pretest_question', ({ sessionCode }) => {
    if (sessions[sessionCode]) {
      const session = sessions[sessionCode];
      if (session.currentPretestIndex < PRETEST_QUESTIONS.length - 1) {
        session.currentPretestIndex += 1;
        session.teams.forEach(t => t.pretestCompleted = false);
        
        io.to(sessionCode).emit('readiness_update', session.teams);
        io.to(sessionCode).emit('pretest_question_update', {
          index: session.currentPretestIndex,
          total: PRETEST_QUESTIONS.length,
          question: PRETEST_QUESTIONS[session.currentPretestIndex]
        });
      }
    }
  });

  // Participant toggle ready
  socket.on('toggle_ready', ({ sessionCode, teamCode }) => {
    if (sessions[sessionCode]) {
      const team = sessions[sessionCode].teams.find(t => t.code === teamCode);
      if (team) {
        team.isReady = !team.isReady;
        io.to(sessionCode).emit('readiness_update', sessions[sessionCode].teams);
      }
    }
  });

  // Team submits pretest
  socket.on('team_submit_pretest', ({ sessionCode, teamCode, answer }) => {
    if (sessions[sessionCode]) {
      const session = sessions[sessionCode];
      const team = session.teams.find(t => t.code === teamCode);
      if (team && !team.pretestCompleted) {
        team.pretestCompleted = true;
        team.lastPretestAnswer = answer;
        const currentQ = PRETEST_QUESTIONS[session.currentPretestIndex];
        if (currentQ && answer === currentQ.answer) {
          team.correctPretest = (team.correctPretest || 0) + 1;
        }
        team.pretestScore = Math.round((team.correctPretest / PRETEST_QUESTIONS.length) * 100) || 0;
        team.score = team.pretestScore + (team.quizScore || 0);
        io.to(sessionCode).emit('readiness_update', session.teams);
      }
    }
  });

  // Host starts quiz
  socket.on('start_quiz', ({ sessionCode }) => {
    if (sessions[sessionCode]) {
      const allReady = sessions[sessionCode].teams.every(t => t.isReady);
      if (allReady) {
        sessions[sessionCode].state = 'quiz';
        sessions[sessionCode].currentQuizIndex = 0;
        sessions[sessionCode].teams.forEach(t => t.quizCompleted = false);
        io.to(sessionCode).emit('quiz_started');
        io.to(sessionCode).emit('session_state_update', 'quiz');
        io.to(sessionCode).emit('quiz_question_update', {
          index: 0,
          total: POSTTEST_QUESTIONS.length,
          question: sanitizeQuestion(POSTTEST_QUESTIONS[0])
        });
      } else {
        socket.emit('error', 'Not all teams are ready');
      }
    }
  });

  // Team submits quiz (with essay scoring for reasoning)
  socket.on('team_submit_quiz', async ({ sessionCode, teamCode, answer, reasoning }) => {
    if (sessions[sessionCode]) {
      const session = sessions[sessionCode];
      const team = session.teams.find(t => t.code === teamCode);
      if (team && !team.quizCompleted) {
        team.quizCompleted = true;
        team.lastAnswer = answer;
        team.lastReasoning = reasoning;
        const currentQ = POSTTEST_QUESTIONS[session.currentQuizIndex];
        const isCorrect = currentQ && answer === currentQ.answer;
        
        // Initialize reasoning tracking arrays if not present
        if (!team.reasoningScores) team.reasoningScores = [];
        if (!team.reasoningDetails) team.reasoningDetails = [];
        
        // Score the multiple choice answer
        const mcScore = isCorrect ? Math.round((1 / POSTTEST_QUESTIONS.length) * 100) : 0;
        if (isCorrect) {
          team.correctQuiz = (team.correctQuiz || 0) + 1;
        }
        team.quizScore = Math.round((team.correctQuiz / POSTTEST_QUESTIONS.length) * 100) || 0;

        // Score the reasoning essay using IndoBERT
        let reasoningResult = { score: 0, matched_keywords: 0, total_keywords: 0 };
        if (reasoning && reasoning.trim() && currentQ?.referenceReasoning) {
          try {
            reasoningResult = await scoreReasoning(reasoning, currentQ.referenceReasoning);
          } catch (err) {
            console.error('Essay scoring failed:', err);
          }
        }

        // Store per-question reasoning score
        team.reasoningScores.push(reasoningResult.score);
        team.reasoningDetails.push({
          questionIndex: session.currentQuizIndex,
          score: reasoningResult.score,
          maxScore: REASONING_POINTS_PER_QUESTION,
          matchedKeywords: reasoningResult.matched_keywords,
          totalKeywords: reasoningResult.total_keywords
        });

        // Calculate total reasoning score
        team.totalReasoningScore = team.reasoningScores.reduce((sum, s) => sum + s, 0);
        team.maxReasoningScore = POSTTEST_QUESTIONS.length * REASONING_POINTS_PER_QUESTION; // e.g. 5 x 20 = 100
        
        // Total score = pretest + quiz MC + reasoning
        team.score = (team.pretestScore || 0) + team.quizScore + team.totalReasoningScore;
        
        // Send immediate feedback with reasoning score
        socket.emit('quiz_answer_result', { 
          isCorrect, 
          correctAnswer: currentQ?.answer, 
          mcScoreAdded: mcScore,
          reasoningScore: reasoningResult.score,
          reasoningMaxScore: REASONING_POINTS_PER_QUESTION,
          matchedKeywords: reasoningResult.matched_keywords,
          totalKeywords: reasoningResult.total_keywords,
          totalReasoningScore: team.totalReasoningScore,
          maxReasoningScore: team.maxReasoningScore
        });
        io.to(sessionCode).emit('readiness_update', session.teams);
      }
    }
  });

  // Host next quiz question
  socket.on('host_next_quiz_question', ({ sessionCode }) => {
    if (sessions[sessionCode]) {
      const session = sessions[sessionCode];
      if (session.currentQuizIndex < POSTTEST_QUESTIONS.length - 1) {
        session.currentQuizIndex += 1;
        session.teams.forEach(t => t.quizCompleted = false);
        
        io.to(sessionCode).emit('readiness_update', session.teams);
        io.to(sessionCode).emit('quiz_question_update', {
          index: session.currentQuizIndex,
          total: POSTTEST_QUESTIONS.length,
          question: sanitizeQuestion(POSTTEST_QUESTIONS[session.currentQuizIndex])
        });
      } else {
        // Quiz finished
        session.state = 'leaderboard';
        io.to(sessionCode).emit('session_state_update', 'leaderboard');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.sessionCode && socket.teamCode) {
      if (sessions[socket.sessionCode]) {
        const team = sessions[socket.sessionCode].teams.find(t => t.code === socket.teamCode);
        if (team) {
          team.hasJoined = false;
          io.to(socket.sessionCode).emit('readiness_update', sessions[socket.sessionCode].teams);
        }
      }
    }
  });
});

// Anything that doesn't match the above, send back index.html
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
