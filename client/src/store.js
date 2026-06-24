import { create } from 'zustand';

export const useStore = create((set) => ({
  role: null, // 'host' or 'participant'
  sessionCode: null,
  participantInfo: null,
  teamInfo: null,
  participants: [],
  teams: [],
  sessionState: 'lobby', // 'lobby', 'grouping', 'preparation', 'quiz'
  pretestData: null,

  setRole: (role) => set({ role }),
  setSessionCode: (code) => set({ sessionCode: code }),
  setParticipantInfo: (info) => set({ participantInfo: info }),
  setTeamInfo: (info) => set({ teamInfo: info }),
  setParticipants: (participants) => set({ participants }),
  setTeams: (teams) => set({ teams }),
  setSessionState: (state) => set({ sessionState: state }),
  setPretestData: (data) => set({ pretestData: data }),
}));
