import { io } from 'socket.io-client';

// Replace the URL with your actual deployed backend URL (e.g., from Cloud Run)
const URL = import.meta.env.PROD ? 'https://ecoflow-ten.vercel.app' : 'http://localhost:3002';

export const socket = io(URL);
