import api from "./api-client";

export const services = {
  // Voice
  textToSpeech: async (text: string, voiceId = "Matthew"): Promise<Blob> => {
    const response = await api.post("/api/voice/speak", { text, voice_id: voiceId }, {
      responseType: "blob"
    });
    return response.data;
  },

  transcribeAudio: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/api/voice/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  processInterviewTurn: async (file: Blob, profileId?: number) => {
    const formData = new FormData();
    formData.append("audio", file, "recording.webm");
    if (profileId) {
       formData.append("profile_id", profileId.toString());
    }
    const response = await api.post("/api/voice/interview_turn", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  // AI Coach (Chat)
  sendChatMessage: async (messages: { role: string; content: string }[], profileId?: number) => {
    return api.post("/api/chat", { messages, profile_id: profileId });
  },
  
  // Market Insights
  getMarketInsights: async () => {
    return api.get("/api/market/insights");
  }
};
