import { io } from 'socket.io-client';

// Use the VITE_BACKEND_URL environment variable from Vercel to point to Railway
const URL = import.meta.env.PROD ? import.meta.env.VITE_BACKEND_URL : 'http://localhost:3002';

export const socket = io(URL);
