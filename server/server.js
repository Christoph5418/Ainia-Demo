/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({ origin: '*'}));
app.use(express.json({ limit: '25mb' }));

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.warn('OPENAI_API_KEY is not set. Set it in your environment for the server to work.');
}
const openai = new OpenAI({ apiKey: openaiApiKey });

// Multer storage to /tmp (writable in Cloud Run)
const upload = multer({ dest: '/tmp' });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Transcribe audio
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided (field name: audio)' });
    }
    const filePath = req.file.path;
    const fileName = req.file.originalname || 'audio.webm';

    // Ensure the file has the correct extension for OpenAI
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    let fileExtension = 'webm';
    
    // Try to determine format from original filename or mime type
    if (req.file.originalname) {
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      if (ext && supportedFormats.includes(ext)) {
        fileExtension = ext;
      }
    }
    
    // Create a new file with proper extension
    const newFilePath = filePath + '.' + fileExtension;
    fs.renameSync(filePath, newFilePath);

    const fileStream = fs.createReadStream(newFilePath);
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
      // language: 'en'
    });

    // Clean up the temp files
    fs.unlink(newFilePath, () => {});

    res.json({ text: transcription.text || transcription?.data?.text || '' });
  } catch (error) {
    console.error('Transcription error:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Direct TTS only (no chat)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'alloy', ttsFormat = 'mp3', ttsModel } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Text-to-Speech only
    const speech = await openai.audio.speech.create({
      model: ttsModel || process.env.OPENAI_TTS_MODEL || 'tts-1',
      voice,
      input: text,
      format: ttsFormat
    });

    const arrayBuffer = await speech.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mime = ttsFormat === 'wav' ? 'audio/wav' : (ttsFormat === 'aac' ? 'audio/aac' : (ttsFormat === 'flac' ? 'audio/flac' : 'audio/mpeg'));
    res.json({ audio: `data:${mime};base64,${base64Audio}` });
  } catch (error) {
    console.error('TTS error:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to generate TTS audio' });
  }
});

// Chat + TTS combined
app.post('/api/chat-tts', async (req, res) => {
  try {
    const { messages, voice = 'alloy', ttsFormat = 'mp3', chatModel, ttsModel } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Chat completion
    const chat = await openai.chat.completions.create({
      model: chatModel || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7
    });
    const responseText = chat.choices?.[0]?.message?.content?.trim?.() || '';

    // Text-to-Speech
    const speech = await openai.audio.speech.create({
      model: ttsModel || process.env.OPENAI_TTS_MODEL || 'tts-1',
      voice,
      input: responseText,
      format: ttsFormat
    });

    const arrayBuffer = await speech.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mime = ttsFormat === 'wav' ? 'audio/wav' : (ttsFormat === 'aac' ? 'audio/aac' : (ttsFormat === 'flac' ? 'audio/flac' : 'audio/mpeg'));
    res.json({ text: responseText, audio: `data:${mime};base64,${base64Audio}` });
  } catch (error) {
    console.error('Chat/TTS error:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to generate reply audio' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


