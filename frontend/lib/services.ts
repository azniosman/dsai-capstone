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

  // AI Coach (Chat)
  sendChatMessage: async (messages: any[], profileId?: number) => {
    return api.post("/api/chat", { messages, profile_id: profileId });
  },
  
  // Market Insights
  getMarketInsights: async () => {
    return api.get("/api/market/insights");
  }
};
