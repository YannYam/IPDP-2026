require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

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

// In-memory store for quick lookups
const sessions = {}; 
// e.g., { "CODE123": { state: "lobby", teams: [{ code: "T1", members: [], isReady: false }] } }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates session
  socket.on('create_session', (data) => {
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    sessions[sessionCode] = { host: socket.id, state: 'lobby', participants: [], teams: [] };
    socket.join(sessionCode);
    socket.emit('session_created', { sessionCode });
  });

  // Team joins session
  socket.on('team_join_session', ({ sessionCode, teamCode }) => {
    if (sessions[sessionCode]) {
      const team = sessions[sessionCode].teams.find(t => t.code === teamCode);
      if (team) {
        // Team found, join socket to session and emit state
        socket.join(sessionCode);
        socket.emit('team_joined', { sessionCode, team });
        
        // Emit current state so team knows where they are
        socket.emit('session_state_update', sessions[sessionCode].state);
        socket.emit('teams_assigned', { teams: sessions[sessionCode].teams });
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
        isReady: false
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
      io.to(sessionCode).emit('session_state_update', newState);
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

  // Host starts quiz
  socket.on('start_quiz', ({ sessionCode }) => {
    if (sessions[sessionCode]) {
      const allReady = sessions[sessionCode].teams.every(t => t.isReady);
      if (allReady) {
        sessions[sessionCode].state = 'quiz';
        io.to(sessionCode).emit('quiz_started');
        io.to(sessionCode).emit('session_state_update', 'quiz');
      } else {
        socket.emit('error', 'Not all teams are ready');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // basic cleanup can be added here
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
