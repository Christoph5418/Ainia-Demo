import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, ChatMessage } from '../../services/api.service';
import '@lottiefiles/lottie-player';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent implements OnInit, OnDestroy {
  isRecording = false;
  isProcessing = false;
  isListening = false;
  mediaRecorder?: MediaRecorder;
  recordedChunks: Blob[] = [];
  currentBotText = '';
  isTyping = false;
  currentStage = 1;
  maxStages = 3;
  currentImage = 'assets/demo/activity_1.png';
  imageLoaded = true;
  imageSwapToken = true;
  stageCompleted = false;
  conversation: ChatMessage[] = [
    { role: 'system', content: 'You are a friendly educational assistant for kids. Start by telling a story: "Hi there! The dinosaurs are setting up a picnic and they need to get some things for it. Terry the T-Rex is trying to help, but he needs your help too! Can you help Terry count how many apples are on the tree?" The current image shows a dinosaur picking an apple from a tree. There are exactly 6 apples visible in the image. Guide the child to count the apples and discover there are 6. Keep responses encouraging, brief (1-2 sentences), and kid-friendly. If they get the answer wrong, gently guide them to count again. Once they say 6 or get close, celebrate and move to the next stage. IMPORTANT: If the child doesn\'t respond or is silent, do NOT prompt them or say anything like "don\'t go" or "are you there?" - just wait patiently for their response. Do NOT use apple emojis or any emojis in your responses - keep text clean and simple.' }
  ];
  audio = new Audio();
  errorMessage = '';
  micPermissionGranted = false;
  conversationStarted = false;
  isLoading = true; // Loading state for initial setup
  preparedGreeting?: any; // Store the prepared greeting
  isImageTransitioning = false; // no longer used for fade, kept for safety
  showEnding = false; // Show ending screen
  showConfetti = false; // Show confetti animation
  showReturnHome = false; // Show return home button
  confettiPieces: Array<{left: number, delay: number, color: string}> = [];
  // Ending view state
  endingImage = 'assets/demo/ending.png';
  endingImageLoaded = false;
  isEndingTransitioning = false;
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private microphone?: MediaStreamAudioSourceNode;
  private dataArray?: Uint8Array;
  private silenceTimer?: any;
  private readonly SILENCE_THRESHOLD = 30; // Adjust based on testing
  private readonly SILENCE_DURATION = 3000; // 4 seconds of silence before processing
  private isAssistantSpeaking = false; // Flag to prevent double talking

  constructor(private api: ApiService, private router: Router, private cdr: ChangeDetectorRef, private zone: NgZone) {}

  async prepareConversation(): Promise<void> {
    try {
      // Get initial greeting from API but don't play it yet
      const greeting = await firstValueFrom(this.api.chatTts(this.conversation, 'nova'));
      if (greeting.text) {
        this.conversation.push({ role: 'assistant', content: greeting.text });
        // Store the greeting for later use
        this.preparedGreeting = greeting;
      }
    } catch (error) {
      console.error('Failed to prepare conversation:', error);
      this.errorMessage = 'Failed to prepare conversation. Please try again.';
    }
  }

  async ngOnInit() {
    // Call API first to get initial greeting
    await this.prepareConversation();
    
    // Show loading screen for 3 seconds, then start conversation
    setTimeout(() => {
      this.isLoading = false;
      this.startConversation();
    }, 3000);
  }

  async startConversation(): Promise<void> {
    if (this.conversationStarted) return;
    
    try {
      this.errorMessage = '';
      
      // Use the prepared greeting with 0.5 second delay
      if (this.preparedGreeting && this.preparedGreeting.text) {
        // Wait 0.5 seconds before starting to talk
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.isAssistantSpeaking = true;
        
        // Start both text typing and audio playback simultaneously
        const textPromise = this.typeText(this.preparedGreeting.text);
        const audioPromise = this.preparedGreeting.audio ? this.playAudio(this.preparedGreeting.audio) : Promise.resolve();
        
        await Promise.all([textPromise, audioPromise]);
        this.isAssistantSpeaking = false;
      }
      
      // Start continuous listening after greeting
      await this.startContinuousListening();
      this.conversationStarted = true;
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      this.errorMessage = 'Failed to start conversation. Please try again.';
      this.isLoading = false; // Hide loading screen even on error
    }
  }

  async startContinuousListening(): Promise<void> {
    try {
      this.errorMessage = '';
      
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported. Please use HTTPS or a modern browser.');
      }
      
      // Request microphone permission with iOS-friendly settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      this.micPermissionGranted = true;
      this.isListening = true;
      
      // Set up audio analysis for voice activity detection
      this.audioContext = new AudioContext();
      
      // Resume audio context if suspended (required for iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Start voice activity detection
      this.detectVoiceActivity();
      
    } catch (error: any) {
      console.error('Microphone error:', error);
      if (error.name === 'NotAllowedError') {
        this.errorMessage = 'Microphone access denied. Please tap "Allow" when prompted, then refresh the page and try again.';
      } else if (error.name === 'NotFoundError') {
        this.errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else {
        this.errorMessage = 'Failed to access microphone. Please check your device settings and try again.' + error;
      }
    }
  }

  private detectVoiceActivity(): void {
    if (!this.analyser || !this.dataArray) return;
    
    const checkVolume = () => {
      if (!this.isListening) return;
      
      this.analyser!.getByteFrequencyData(this.dataArray!);
      const average = this.dataArray!.reduce((a, b) => a + b) / this.dataArray!.length;
      
      if (average > this.SILENCE_THRESHOLD && !this.isRecording) {
        // Voice detected, start recording
        this.startRecording();
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = undefined;
        }
      } else if (average <= this.SILENCE_THRESHOLD && this.isRecording) {
        // Silence detected, start timer to stop recording
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.stopRecording();
          }, this.SILENCE_DURATION);
        }
      }
      
      requestAnimationFrame(checkVolume);
    };
    
    checkVolume();
  }

  async startRecording(): Promise<void> {
    if (this.isRecording || this.isProcessing) return;
    
    try {
      this.errorMessage = '';
      this.recordedChunks = [];
      
      // Get microphone stream (reuse if already available)
      let stream: MediaStream;
      if (this.microphone) {
        stream = this.microphone.mediaStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
      }
      
      // Check if MediaRecorder supports webm
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        this.onRecordingComplete();
      };
      
      mediaRecorder.start();
      this.isRecording = true;
      
    } catch (error) {
      this.errorMessage = 'Failed to start recording. Please try again.';
      console.error('Recording error:', error);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
  }

  private checkForCorrectAnswer(userText: string): boolean {
    const text = userText.toLowerCase();
    
    if (this.currentStage === 1) {
      // Check for "6", "six", "six apples", etc.
      return text.includes('6') || text.includes('six') || 
             (text.includes('apple') && (text.includes('6') || text.includes('six'))) ||
             text.includes('6 apples') || text.includes('six apples');
    } else if (this.currentStage === 2) {
      // Check for "sandwich", "sandwiches", etc.
      return text.includes('sandwich') || text.includes('sandwiches');
    } else if (this.currentStage === 3) {
      // Check for "green", "green balloon", etc.
      return text.includes('green') || 
             (text.includes('green') && text.includes('balloon')) ||
             text.includes('green balloon');
    }
    
    return false;
  }

  private async moveToNextStage(): Promise<void> {
    if (this.currentStage < this.maxStages) {
      this.currentStage++;
      this.stageCompleted = false; // Reset stage completion flag
      
      // Update conversation context for new stage
      if (this.currentStage === 2) {
        this.conversation = [
          { role: 'system', content: 'You are a friendly educational assistant for kids. You are now on stage 2 of a fun dinosaur activity. Great job counting the apples! Now, Larry the dinosaur needs your help getting the main entree for the picnic. Can you help Larry find the main entree? Larry can choose from sandwiches, wood, or a dirt pile. Ask them what Larry should bring to the picnic. Guide them to choose sandwiches as the correct answer. Keep responses encouraging, brief (1-2 sentences), and kid-friendly. If they choose wood or dirt pile, gently guide them to think about what would be good to eat at a picnic. Once they say sandwiches or get close, celebrate and move to the next stage. IMPORTANT: If the child doesn\'t respond or is silent, do NOT prompt them or say anything like "don\'t go" or "are you there?" - just wait patiently for their response. Do NOT use apple emojis or any emojis in your responses - keep text clean and simple.' }
        ];
      } else if (this.currentStage === 3) {
        this.conversation = [
          { role: 'system', content: 'You are a friendly educational assistant for kids. You are now on stage 3 of a fun dinosaur activity. Great job helping Larry with the sandwiches! Now, Ben the dinosaur needs your help finding the right balloon. Ben needs to get the balloon that matches Terry the T-Rex\'s color. Terry is green, so Ben needs to find the green balloon. Ask them which balloon Ben should choose. Guide them to choose the green balloon as the correct answer. Keep responses encouraging, brief (1-2 sentences), and kid-friendly. If they choose orange or blue balloon, gently guide them to think about Terry\'s color. Once they say green balloon or get close, celebrate and move to the next stage. IMPORTANT: If the child doesn\'t respond or is silent, do NOT prompt them or say anything like "don\'t go" or "are you there?" - just wait patiently for their response. Do NOT use apple emojis or any emojis in your responses - keep text clean and simple.' }
        ];
      } else {
        this.conversation = [
          { role: 'system', content: `You are a friendly educational assistant for kids. You are now on stage ${this.currentStage} of a fun dinosaur activity. This is a placeholder for the next stage. Celebrate that they completed the previous stage and introduce the next challenge. Keep responses encouraging and kid-friendly. IMPORTANT: If the child doesn't respond or is silent, do NOT prompt them or say anything like "don't go" or "are you there?" - just wait patiently for their response. Do NOT use apple emojis or any emojis in your responses - keep text clean and simple.` }
        ];
      }
      
      // Update image
      const nextImage = `assets/demo/activity_${this.currentStage}.png`;
      try {
        await this.preloadImage(nextImage);
      } catch (error) {
        console.warn('Failed to preload next stage image:', nextImage, error);
      }
      await this.swapImage(nextImage);
      this.forceReflow();
      
      // Get next stage greeting with kid-friendly voice
      const nextStageGreeting = await firstValueFrom(this.api.chatTts(this.conversation, 'nova'));
      if (nextStageGreeting.text) {
        this.conversation.push({ role: 'assistant', content: nextStageGreeting.text });
        this.isAssistantSpeaking = true;
        
        // Start both text typing and audio playback simultaneously
        const textPromise = this.typeText(nextStageGreeting.text);
        const audioPromise = nextStageGreeting.audio ? this.playAudio(nextStageGreeting.audio) : Promise.resolve();
        
        await Promise.all([textPromise, audioPromise]);
        this.isAssistantSpeaking = false;
      }
    }
  }

  private async showEndingSequence(): Promise<void> {
    console.log('Starting ending sequence...');
    
    // Stop listening
    this.isListening = false;
    
    // Prepare ending view and switch templates (no fade)
    this.showEnding = true; // switch to dedicated ending view
    this.endingImageLoaded = false;
    try {
      await this.preloadImage(this.endingImage);
    } catch (error) {
      console.warn('Failed to preload ending image:', this.endingImage, error);
    }
    this.forceReflow();
    console.log('Ending image should be visible now');
    
    // Wait a moment for image to load, then show confetti
    await new Promise(resolve => setTimeout(resolve, 300));
    this.generateConfetti();
    this.showConfetti = true;
    console.log('Confetti should be showing now');
    
    // Play ending message
    const endingMessage = "Great job, now they can enjoy their picnic. Thank you so much for your help! You have unlocked a beanie for your avatar.  ";
    this.isAssistantSpeaking = true;
    // ensure bubble shows immediately
    this.currentBotText = '';
    this.isTyping = true;
    this.cdr.detectChanges();
    this.forceReflow();
    const textPromise = this.typeText(endingMessage);
    const audioPromise = this.generateTtsAudio(endingMessage);
    await Promise.all([textPromise, audioPromise]);
    this.isAssistantSpeaking = false;
    
    // Wait for confetti to finish, then show return home button
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.showReturnHome = true;
    console.log('Return home button should be showing now');
  }

  returnHome(): void {
    this.router.navigate(['/']);
  }

  private generateConfetti(): void {
    this.confettiPieces = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    
    for (let i = 0; i < 50; i++) {
      this.confettiPieces.push({
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private async typeText(text: string): Promise<void> {
    console.log('Starting to type text:', text);
    this.isTyping = true;
    this.currentBotText = '';
    
    // No initial delay since audio starts immediately
    for (let i = 0; i < text.length; i++) {
      this.currentBotText += text[i];
      if (i % 5 === 0) { this.cdr.detectChanges(); this.forceReflow(); }
      // Faster typing to match voice pace better
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between letters
    }
    
    this.isTyping = false;
    console.log('Finished typing text');
  }

  private async playAudio(audioUrl: string): Promise<void> {
    this.audio.src = audioUrl;
    this.audio.load();
    await this.audio.play().catch((error) => {
      console.warn('Audio playback failed:', error);
    });
  }

  private async generateTtsAudio(text: string): Promise<void> {
    try {
      console.log('Generating TTS audio for:', text);
      const reply = await firstValueFrom(this.api.tts(text, 'nova'));
      if (reply.audio) {
        console.log('TTS audio generated successfully');
        await this.playAudio(reply.audio);
      } else {
        console.warn('No audio returned from TTS');
      }
    } catch (error) {
      console.warn('TTS generation failed:', error);
    }
  }

  private async onRecordingComplete(): Promise<void> {
    if (this.recordedChunks.length === 0) {
      this.isRecording = false;
      return;
    }

    // Don't process if assistant is already speaking
    if (this.isAssistantSpeaking) {
      this.isRecording = false;
      return;
    }

    this.isProcessing = true;
    this.isRecording = false;
    this.errorMessage = '';

    try {
      // Create blob with proper MIME type
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');

      // Transcribe user audio
      const { text } = await firstValueFrom(this.api.transcribe(form));
      const userText = text?.trim?.() || '';
      
      if (!userText) {
        this.isProcessing = false;
        return; // Just continue listening if no speech detected
      }

      // Check if they got the right answer BEFORE generating response
      if ((this.currentStage === 1 || this.currentStage === 2 || this.currentStage === 3) && this.checkForCorrectAnswer(userText) && !this.stageCompleted) {
        this.stageCompleted = true;
        
        // Create a celebration response (don't add to conversation to avoid AI outro)
        const celebrationMessage = this.currentStage === 1 
          ? "Great job! You counted 6 apples perfectly! Terry is so happy!"
          : this.currentStage === 2
          ? "Excellent choice! Sandwiches are perfect for a picnic! Larry is excited!"
          : "Perfect! The green balloon matches Terry perfectly! Ben is so happy!";
        
        this.isAssistantSpeaking = true;
        
        // Start both text typing and audio playback simultaneously
        // ensure bubble shows immediately
        this.currentBotText = '';
        this.isTyping = true;
        this.cdr.detectChanges();
        this.forceReflow();
        const textPromise = this.typeText(celebrationMessage);
        const audioPromise = this.generateTtsAudio(celebrationMessage);
        
        await Promise.all([textPromise, audioPromise]);
        this.isAssistantSpeaking = false;
        
        // Wait a bit more for the celebration to sink in, then move to next stage
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if this is the final stage (stage 3)
        if (this.currentStage === 3) {
          await this.showEndingSequence();
        } else {
          await this.moveToNextStage();
        }
        
        this.isProcessing = false;
        return;
      }

      // Add user message to conversation (but don't display it)
      this.conversation.push({ role: 'user', content: userText });

      // Get assistant response with TTS using kid-friendly voice
      const reply = await firstValueFrom(this.api.chatTts(this.conversation, 'nova'));
      const assistantText = reply.text?.trim?.() || '';
      
      if (assistantText) {
        this.conversation.push({ role: 'assistant', content: assistantText });
        this.isAssistantSpeaking = true;
        
        // Start both text typing and audio playback simultaneously
        const textPromise = this.typeText(assistantText);
        const audioPromise = reply.audio ? this.playAudio(reply.audio) : Promise.resolve();
        
        await Promise.all([textPromise, audioPromise]);
        this.isAssistantSpeaking = false;
      }

    } catch (error) {
      console.error('Processing error:', error);
      this.errorMessage = 'Error processing your request. Continuing to listen...';
    } finally {
      this.isProcessing = false;
    }
  }

  private preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  onImageLoad(): void {
    // Called from template when <img> finishes loading
    this.imageLoaded = true;
    this.forceReflow();
  }

  onEndingImageLoad(): void {
    this.endingImageLoaded = true;
    this.forceReflow();
  }

  private forceReflow(): void {
    try {
      // Force layout by dispatching resize and reading offset
      this.zone.runOutsideAngular(() => {
        const burst = () => {
          window.dispatchEvent(new Event('resize'));
          // tslint:disable-next-line:no-unused-expression
          (document.body && document.body.offsetHeight);
        };
        burst();
        setTimeout(burst, 0);
        setTimeout(burst, 50);
        setTimeout(burst, 120);
      });
    } catch {}
  }

  private async swapImage(url: string): Promise<void> {
    this.imageLoaded = false;
    this.imageSwapToken = false;
    // Next microtask: set src and re-create img element for a clean load/fade
    await Promise.resolve();
    this.currentImage = url;
    this.imageSwapToken = true;
  }

  ngOnDestroy(): void {
    try {
      this.isListening = false;
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
    } catch {}
  }
}
