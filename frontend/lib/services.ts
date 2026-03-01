import { apiClient } from "./api";

export const services = {
  processInterviewTurn: async (
    blob: Blob,
    profileId?: number
  ): Promise<{ transcript: string; reply_text: string; audio_base64?: string }> => {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    if (profileId) {
      formData.append("profile_id", profileId.toString());
    }

    const { data } = await apiClient.post("/api/voice/interview_turn", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
};
