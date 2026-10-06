const API=import.meta.env.VITE_API_URL||"http://localhost:5000";
export async function getVoices(){const response=await fetch(API+"/api/voices");if(!response.ok)throw new Error("Unable to load voices");return response.json();}
export function createVoiceSocket(voice="Kore"){return new WebSocket(API.replace(/^http/,"ws")+"/ws/voice?voice="+encodeURIComponent(voice));}
