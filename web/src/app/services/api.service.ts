import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatTtsResponse {
  text: string;
  audio: string; // data: URL
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Set this to your Cloud Run URL when deployed
  private readonly baseUrl = (window as any).__API_BASE_URL__ || 'https://ainia-demo-server-369335474029.us-central1.run.app';

  constructor(private http: HttpClient) {}

  transcribe(formData: FormData): Observable<{ text: string } > {
    return this.http.post<{ text: string }>(`${this.baseUrl}/api/transcribe`, formData);
  }

  chatTts(messages: ChatMessage[], voice = 'alloy', ttsFormat: 'mp3' | 'wav' | 'aac' | 'flac' = 'mp3'): Observable<ChatTtsResponse> {
    return this.http.post<ChatTtsResponse>(`${this.baseUrl}/api/chat-tts`, { messages, voice, ttsFormat });
  }

  tts(text: string, voice = 'alloy', ttsFormat: 'mp3' | 'wav' | 'aac' | 'flac' = 'mp3'): Observable<{ audio: string }> {
    return this.http.post<{ audio: string }>(`${this.baseUrl}/api/tts`, { text, voice, ttsFormat });
  }
}


