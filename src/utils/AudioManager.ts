export class AudioManager {
  private static instance: AudioManager;
  public bgMusic: HTMLAudioElement | null = null;
  private clickSound: HTMLAudioElement | null = null;
  private isMuted: boolean;
  private musicVolume: number;
  private effectsVolume: number;
  private fadeInterval: number | null = null;
  private isAudioLoaded: boolean = false;
  private loadRetryCount: number = 0;
  private readonly MAX_RETRIES: number = 3;
  private bgMusicError: string | null = null;
  private clickSoundError: string | null = null;
  
  // Define paths as constants
  private readonly BG_MUSIC_PATH = '/assets/audio/background-music.mp3';
  private readonly CLICK_SOUND_PATH = '/assets/audio/click.wav';

  private constructor() {
    this.isMuted = localStorage.getItem('audioMuted') === 'true';
    
    // Initialize volumes from localStorage or defaults
    this.musicVolume = parseFloat(localStorage.getItem('musicVolume') ?? '0.3');
    this.effectsVolume = parseFloat(localStorage.getItem('effectsVolume') ?? '0.5');
    
    // Create audio elements
    this.bgMusic = new Audio();
    this.clickSound = new Audio();
    
    // Set initial volume for both audio elements
    if (this.bgMusic) {
      this.bgMusic.loop = true;
      this.bgMusic.volume = this.musicVolume;
    }
    
    if (this.clickSound) {
      this.clickSound.volume = this.effectsVolume;
    }

    // Apply initial mute state
    if (this.isMuted) {
      this.mute();
    }
    
    // Preload audio assets
    this.preloadAudio().catch(error => {
      console.error('Failed to preload audio:', error);
    });
  }
  
  public async preloadAudio(): Promise<void> {
    if (this.isAudioLoaded) return;

    // Reset error state
    this.bgMusicError = null;
    this.clickSoundError = null;

    const loadAudio = async () => {
      // Try loading both files independently to isolate errors
      let bgMusicLoaded = false;
      let clickSoundLoaded = false;
      
      // Load background music
      if (this.bgMusic) {
        try {
          this.bgMusic.src = this.BG_MUSIC_PATH;
          
          // Set up error handler before loading
          const bgMusicPromise = new Promise<void>((resolve, reject) => {
            this.bgMusic!.onloadeddata = () => {
              console.log('Background music loaded successfully');
              bgMusicLoaded = true;
              resolve();
            };
            
            this.bgMusic!.onerror = (e) => {
              const error = `Failed to load background music: ${this.bgMusic!.error?.message || 'Unknown error'}`;
              this.bgMusicError = error;
              console.error(error);
              console.warn(`Make sure ${this.BG_MUSIC_PATH} exists in the public folder and is a valid MP3 file (1-2 minutes, 8-bit/retro style). The file should be placed in 'public/assets/audio/'`);
              reject(new Error(error));
            };
          });
          
          this.bgMusic.load();
          await bgMusicPromise.catch(err => {
            // Continue with click sound even if background music fails
            console.warn('Background music loading failed, but will continue with click sound');
          });
        } catch (e) {
          this.bgMusicError = (e as Error).message;
          console.error('Error in background music loading:', e);
        }
      }
      
      // Load click sound
      if (this.clickSound) {
        try {
          this.clickSound.src = this.CLICK_SOUND_PATH;
          
          // Set up error handler before loading
          const clickSoundPromise = new Promise<void>((resolve, reject) => {
            this.clickSound!.onloadeddata = () => {
              console.log('Click sound loaded successfully');
              clickSoundLoaded = true;
              resolve();
            };
            
            this.clickSound!.onerror = (e) => {
              const error = `Failed to load click sound: ${this.clickSound!.error?.message || 'Unknown error'}`;
              this.clickSoundError = error;
              console.error(error);
              console.warn(`Make sure ${this.CLICK_SOUND_PATH} exists in the public folder and is a valid MP3 file (0.1-0.3 seconds, clean UI click sound). The file should be placed in 'public/assets/audio/'`);
              reject(new Error(error));
            };
          });
          
          this.clickSound.load();
          await clickSoundPromise.catch(err => {
            // Continue even if click sound fails
            console.warn('Click sound loading failed, but will continue with other functionality');
          });
        } catch (e) {
          this.clickSoundError = (e as Error).message;
          console.error('Error in click sound loading:', e);
        }
      }
      
      // Consider audio loaded if at least one file loaded successfully
      if (bgMusicLoaded || clickSoundLoaded) {
        this.isAudioLoaded = true;
        return;
      } else {
        throw new Error('Failed to load any audio files');
      }
    };

    // Implement retry logic
    while (!this.isAudioLoaded && this.loadRetryCount < this.MAX_RETRIES) {
      try {
        await loadAudio();
      } catch (error) {
        this.loadRetryCount++;
        if (this.loadRetryCount >= this.MAX_RETRIES) {
          console.error(`Failed to load audio after ${this.MAX_RETRIES} retries. Check if MP3 files exist at the correct locations.`);
          console.warn('Audio playback will not function until the required files are available.');
          break;
        }
        console.warn(`Audio loading failed, retrying (${this.loadRetryCount}/${this.MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
  
  // Method to check if specific audio files are available
  public getBgMusicStatus(): { loaded: boolean, error: string | null } {
    return {
      loaded: !!(this.bgMusic && !this.bgMusicError && this.isAudioLoaded),
      error: this.bgMusicError
    };
  }
  
  public getClickSoundStatus(): { loaded: boolean, error: string | null } {
    return {
      loaded: !!(this.clickSound && !this.clickSoundError && this.isAudioLoaded),
      error: this.clickSoundError
    };
  }

  public async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;
    localStorage.setItem('audioMuted', this.isMuted.toString());
    
    if (this.isMuted) {
      await this.mute();
    } else {
      await this.unmute();
    }
    
    return this.isMuted;
  }

  public async playBackgroundMusic(): Promise<void> {
    try {
      if (!this.isAudioLoaded) {
        await this.preloadAudio();
      }
      
      // Check if background music is available
      if (this.bgMusicError) {
        console.warn(`Cannot play background music: ${this.bgMusicError}`);
        console.info(`Please add a valid MP3 file at ${this.BG_MUSIC_PATH} (1-2 minutes, 8-bit/retro style)`);
        return;
      }
      
      if (!this.isMuted && this.bgMusic) {
        try {
          await this.bgMusic.play();
        } catch (playError) {
          console.error('Failed to play background music:', playError);
          console.warn(`Check if ${this.BG_MUSIC_PATH} exists in public folder and is a valid MP3 file. The file should be placed in 'public/assets/audio/'`);
          
          // If playing fails, try to reload the audio
          this.bgMusicError = (playError as Error).message;
          this.isAudioLoaded = false;
          
          // Try to reload on next attempt
          setTimeout(() => this.preloadAudio(), 1000);
        }
      }
    } catch (error) {
      console.error('Failed to play background music:', error);
      console.warn(`Check if ${this.BG_MUSIC_PATH} exists in public folder and is a valid MP3 file. The file should be placed in 'public/assets/audio/'`);
    }
  }

  public async playClickSound(): Promise<void> {
    try {
      if (!this.isAudioLoaded) {
        await this.preloadAudio();
      }
      
      // Check if click sound is available
      if (this.clickSoundError) {
        console.warn(`Cannot play click sound: ${this.clickSoundError}`);
        console.info(`Please add a valid MP3 file at ${this.CLICK_SOUND_PATH} (0.1-0.3 seconds, clean UI click sound)`);
        return;
      }
      
      if (!this.isMuted && this.clickSound) {
        try {
          const sound = this.clickSound.cloneNode() as HTMLAudioElement;
          await sound.play();
        } catch (playError) {
          console.error('Failed to play click sound:', playError);
          console.warn(`Check if ${this.CLICK_SOUND_PATH} exists in public folder and is a valid MP3 file. The file should be placed in 'public/assets/audio/'`);
          
          // If playing fails, try to reload the audio
          this.clickSoundError = (playError as Error).message;
          
          // Try to reload on next attempt
          setTimeout(() => this.preloadAudio(), 1000);
        }
      }
    } catch (error) {
      console.error('Failed to play click sound:', error);
      console.warn(`Check if ${this.CLICK_SOUND_PATH} exists in public folder and is a valid MP3 file. The file should be placed in 'public/assets/audio/'`);
    }
  }

  private async fadeVolume(from: number, to: number, duration: number = 500): Promise<void> {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = (to - from) / steps;
    let currentStep = 0;

    return new Promise((resolve) => {
      this.fadeInterval = window.setInterval(() => {
        currentStep++;
        const newVolume = from + (volumeStep * currentStep);
        
        if (this.bgMusic) {
          this.bgMusic.volume = Math.max(0, Math.min(1, newVolume));
        }

        if (currentStep >= steps) {
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          resolve();
        }
      }, stepDuration);
    });
  }

  private async mute(): Promise<void> {
    if (this.bgMusic && !this.bgMusic.paused) {
      const currentVolume = this.bgMusic.volume;
      await this.fadeVolume(currentVolume, 0);
      this.bgMusic.pause();
    }
  }

  private async unmute(): Promise<void> {
    if (this.bgMusic && !this.bgMusicError) {
      this.bgMusic.volume = 0;
      try {
        await this.bgMusic.play();
        await this.fadeVolume(0, this.musicVolume);
      } catch (error) {
        console.error('Failed to unmute background music:', error);
        console.warn(`Check if ${this.BG_MUSIC_PATH} exists in public folder and is a valid MP3 file. The file should be placed in 'public/assets/audio/'`);
      }
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public isMusicPlaying(): boolean {
    return !!(this.bgMusic && !this.bgMusic.paused);
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getEffectsVolume(): number {
    return this.effectsVolume;
  }

  public async setMusicVolume(volume: number): Promise<void> {
    const newVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic && !this.bgMusic.paused) {
      const currentVolume = this.bgMusic.volume;
      await this.fadeVolume(currentVolume, newVolume);
    }
    this.musicVolume = newVolume;
    localStorage.setItem('musicVolume', this.musicVolume.toString());
  }

  public setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
    if (this.clickSound) this.clickSound.volume = this.effectsVolume;
    localStorage.setItem('effectsVolume', this.effectsVolume.toString());
  }

  public getVolume(): number {
    return (this.musicVolume + this.effectsVolume) / 2;
  }

  public setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.setMusicVolume(normalizedVolume);
    this.setEffectsVolume(normalizedVolume);
  }

  public isAudioReady(): boolean {
    return this.isAudioLoaded;
  }

  public getAudioStatus(): { 
    isLoaded: boolean; 
    bgMusic: { loaded: boolean; error: string | null }; 
    clickSound: { loaded: boolean; error: string | null }; 
  } {
    return {
      isLoaded: this.isAudioLoaded,
      bgMusic: this.getBgMusicStatus(),
      clickSound: this.getClickSoundStatus()
    };
  }
}
