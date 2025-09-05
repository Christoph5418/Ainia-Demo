# Ainia Demo - AI-Powered Kids Learning Platform

A web application that combines AI-powered voice interaction with gamified learning experiences for children.


## 🎯 Project Overview

This demo showcases an AI-powered learning platform designed for kids, featuring:

Interactive avatar creation and AI-guided micro-quests
Real-time speech recognition and AI responses with kid-friendly TTS
Mini portal for parents

## 🚀 Tech Stack

### Frontend
- **Angular** - Modern web framework
- **DiceBear Avatars** - Customizable avatar generation
- **Lottie Animations** - Smooth UI animations
- **Firebase Hosting** - Static site deployment

### Backend
- **Node.js** - Server runtime
- **OpenAI API** - Real Time API

## 🤖 AI Prompt Design

For the AI prompts, I explicitly mentioned that the system was designed for children, so it uses friendly, age appropriate language. The AI is programmed to guide children toward the correct answer when they're struggling, and if they go off-topic, it gently redirects them back to the learning content.

## 📊 Data Handling & Day-7 Retention

For data handling and retention tracking, I would store comprehensive metrics for parents to review. The system would show the avatar the child has created and track how much time they spent using the app, distinguishing between idle time and active engagement. It would store the number of learning events completed and keep transcripts of interactions for review. Potentially, we could grade the child's performance so parents can see improvement over time, measuring response speed to questions, comprehension levels, and overall engagement quality.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Angular App   │◄──►│  Node.js API    │◄──►│   OpenAI API    │
│                 │    │                 │    │                 │
│ • Avatar Builder│    │ • Speech-to-Text│    │ • GPT-4o-mini   │
│ • Voice Chat    │    │ • Text-to-Speech│    │ • Whisper-1     │
│ • Parent Portal │    │ • Chat Completions│  │ • TTS-1         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```