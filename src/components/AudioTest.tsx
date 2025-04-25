// src/components/AudioTest.tsx
import React from 'react';
import styled from 'styled-components';
import { AudioManager } from '../utils/AudioManager';

const TestContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: var(--border-radius-md);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(97, 218, 251, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TestButton = styled.button`
  padding: 8px 12px;
  background: var(--color-secondary);
  color: black;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-secondary-hover);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

const MuteButton = styled(TestButton)<{ isMuted?: boolean }>`
  background: ${props => props.isMuted ? 'var(--color-danger)' : 'var(--color-secondary)'};
  font-size: 0.8rem;
  padding: 6px 10px;
  
  &:hover {
    background: ${props => props.isMuted ? '#d32f2f' : 'var(--color-secondary-hover)'};
  }
`;

const StatusText = styled.div`
  color: var(--color-text);
  font-size: 0.8rem;
  text-align: center;
  margin-top: 4px;
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 4px 0;
`;

const VolumeSlider = styled.input`
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(97, 218, 251, 0.2);
  border-radius: 2px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-secondary);
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  &::-moz-range-thumb:hover {
    transform: scale(1.2);
  }
`;

const VolumeLabel = styled.span`
  color: var(--color-text);
  font-size: 0.8rem;
  min-width: 40px;
`;

const PresetButtons = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

const PresetButton = styled.button`
  padding: 2px 6px;
  font-size: 0.7rem;
  background: rgba(97, 218, 251, 0.2);
  border: 1px solid rgba(97, 218, 251, 0.3);
  border-radius: var(--border-radius-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(97, 218, 251, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }
`;

// Add new styled components for loading status
const LoadingIndicator = styled.div<{ isError?: boolean }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-top: 8px;
  text-align: center;
  background: ${props => props.isError ? 'rgba(244, 67, 54, 0.2)' : 'rgba(97, 218, 251, 0.2)'};
  color: ${props => props.isError ? '#f44336' : 'var(--color-secondary)'};
  border: 1px solid ${props => props.isError ? 'rgba(244, 67, 54, 0.3)' : 'rgba(97, 218, 251, 0.3)'};
`;

const RetryButton = styled(TestButton)`
  background: var(--color-danger);
  font-size: 0.8rem;
  padding: 4px 8px;
  margin-top: 4px;
  
  &:hover {
    background: #d32f2f;
  }
`;

export const AudioTest: React.FC = () => {
  const audioManager = AudioManager.getInstance();
  const [status, setStatus] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [musicVolume, setMusicVolume] = React.useState(() => {
    return Math.round(audioManager.getMusicVolume() * 100).toString();
  });
  const [effectsVolume, setEffectsVolume] = React.useState(() => {
    return Math.round(audioManager.getEffectsVolume() * 100).toString();
  });
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(() => {
    return audioManager.isSoundMuted();
  });

  // Add keyboard controls
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if audio is ready
      if (isLoading || loadError) return;

      switch(event.key.toLowerCase()) {
        case 'm': // Toggle music
          handleTest(
            () => audioManager.playBackgroundMusic(),
            'Background music toggled'
          );
          break;
        case 'arrowup': // Increase music volume
          if (event.ctrlKey || event.metaKey) {
            const newVolume = Math.min(100, parseInt(musicVolume) + 5);
            setMusicVolume(newVolume.toString());
            audioManager.setMusicVolume(newVolume / 100);
            setStatus(`Music Volume: ${newVolume}%`);
          }
          break;
        case 'arrowdown': // Decrease music volume
          if (event.ctrlKey || event.metaKey) {
            const newVolume = Math.max(0, parseInt(musicVolume) - 5);
            setMusicVolume(newVolume.toString());
            audioManager.setMusicVolume(newVolume / 100);
            setStatus(`Music Volume: ${newVolume}%`);
          }
          break;
        case 'arrowright': // Increase effects volume
          if (event.ctrlKey || event.metaKey) {
            const newVolume = Math.min(100, parseInt(effectsVolume) + 5);
            setEffectsVolume(newVolume.toString());
            audioManager.setEffectsVolume(newVolume / 100);
            setStatus(`Effects Volume: ${newVolume}%`);
          }
          break;
        case 'arrowleft': // Decrease effects volume
          if (event.ctrlKey || event.metaKey) {
            const newVolume = Math.max(0, parseInt(effectsVolume) - 5);
            setEffectsVolume(newVolume.toString());
            audioManager.setEffectsVolume(newVolume / 100);
            setStatus(`Effects Volume: ${newVolume}%`);
          }
          break;
        case ' ': // Space to test click sound
          if (event.target === document.body) {
            event.preventDefault();
            handleTest(
              () => audioManager.playClickSound(),
              'Click sound played'
            );
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, loadError, musicVolume, effectsVolume]);

  // Load saved volumes on mount
  React.useEffect(() => {
    const savedMusicVolume = localStorage.getItem('musicVolume');
    if (savedMusicVolume) {
      const parsedVolume = parseFloat(savedMusicVolume);
      if (!isNaN(parsedVolume)) {
        setMusicVolume(Math.round(parsedVolume * 100).toString());
        audioManager.setMusicVolume(parsedVolume);
      }
    }
    
    const savedEffectsVolume = localStorage.getItem('effectsVolume');
    if (savedEffectsVolume) {
      const parsedVolume = parseFloat(savedEffectsVolume);
      if (!isNaN(parsedVolume)) {
        setEffectsVolume(Math.round(parsedVolume * 100).toString());
        audioManager.setEffectsVolume(parsedVolume);
      }
    }
  }, []);

  // Check audio loading status
  React.useEffect(() => {
    const checkAudioStatus = async () => {
      try {
        if (!audioManager.isAudioReady()) {
          setIsLoading(true);
          setLoadError(null);
          
          // Wait for audio to be ready
          const checkInterval = setInterval(() => {
            if (audioManager.isAudioReady()) {
              setIsLoading(false);
              clearInterval(checkInterval);
            }
          }, 500);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!audioManager.isAudioReady()) {
              setLoadError('Audio loading timed out');
              setIsLoading(false);
            }
          }, 10000);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setLoadError((error as Error).message);
        setIsLoading(false);
      }
    };

    checkAudioStatus();
  }, []);

  // Add effect to update music playing state
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsMusicPlaying(audioManager.isMusicPlaying());
      setIsMuted(audioManager.isSoundMuted());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTest = (action: () => void, message: string) => {
    try {
      action();
      setStatus(message);
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus('Error: ' + (error as Error).message);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleRetry = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      await audioManager.preloadAudio();
      setIsLoading(false);
    } catch (error) {
      setLoadError((error as Error).message);
      setIsLoading(false);
    }
  };

  const handleMusicVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value) / 100;
    setMusicVolume(event.target.value);
    try {
      audioManager.setMusicVolume(newVolume);
      setStatus(`Music Volume: ${event.target.value}%`);
    } catch (error) {
      setStatus('Error adjusting music volume');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleEffectsVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value) / 100;
    setEffectsVolume(event.target.value);
    try {
      audioManager.setEffectsVolume(newVolume);
      setStatus(`Effects Volume: ${event.target.value}%`);
    } catch (error) {
      setStatus('Error adjusting effects volume');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleMusicPreset = (preset: 'low' | 'medium' | 'high') => {
    const presetValues = {
      low: 20,
      medium: 50,
      high: 80
    };
    
    const newVolume = presetValues[preset];
    setMusicVolume(newVolume.toString());
    try {
      audioManager.setMusicVolume(newVolume / 100);
      setStatus(`Music Volume: ${newVolume}%`);
    } catch (error) {
      setStatus('Error adjusting music volume');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleEffectsPreset = (preset: 'low' | 'medium' | 'high') => {
    const presetValues = {
      low: 20,
      medium: 50,
      high: 80
    };
    
    const newVolume = presetValues[preset];
    setEffectsVolume(newVolume.toString());
    try {
      audioManager.setEffectsVolume(newVolume / 100);
      setStatus(`Effects Volume: ${newVolume}%`);
    } catch (error) {
      setStatus('Error adjusting effects volume');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const handleMuteToggle = () => {
    handleTest(
      () => {
        const newMutedState = audioManager.toggleMute();
        setIsMuted(newMutedState);
        return newMutedState;
      },
      isMuted ? 'Audio unmuted' : 'Audio muted'
    );
  };

  return (
    <TestContainer>
      {isLoading && (
        <LoadingIndicator>
          Loading audio assets...
        </LoadingIndicator>
      )}
      
      {loadError && (
        <>
          <LoadingIndicator isError>
            {loadError}
          </LoadingIndicator>
          <RetryButton onClick={handleRetry}>
            Retry Loading
          </RetryButton>
        </>
      )}
      
      {!isLoading && !loadError && (
        <>
          <TestButton 
            onClick={() => handleTest(
              () => audioManager.playClickSound(),
              'Click sound played'
            )}
          >
            Test Click Sound
          </TestButton>
          
          <TestButton 
            onClick={() => handleTest(
              () => audioManager.playBackgroundMusic(),
              'Background music started'
            )}
          >
            {isMusicPlaying ? 'Music Playing' : 'Play Music'}
          </TestButton>
          
          <MuteButton 
            onClick={handleMuteToggle}
            isMuted={isMuted}
          >
            {isMuted ? 'Unmute Audio' : 'Mute Audio'}
          </MuteButton>
          
          <VolumeControl>
            <VolumeLabel>
              Music: {musicVolume}%
              {isMuted && <span style={{ color: '#f44336', marginLeft: '4px' }}>(Muted)</span>}
            </VolumeLabel>
            <VolumeSlider
              type="range"
              min="0"
              max="100"
              value={musicVolume}
              onChange={handleMusicVolumeChange}
              style={{ opacity: isMuted ? 0.5 : 1 }}
            />
          </VolumeControl>
          <PresetButtons>
            <PresetButton onClick={() => handleMusicPreset('low')}>Low</PresetButton>
            <PresetButton onClick={() => handleMusicPreset('medium')}>Med</PresetButton>
            <PresetButton onClick={() => handleMusicPreset('high')}>High</PresetButton>
          </PresetButtons>
          
          <VolumeControl>
            <VolumeLabel>
              Effects: {effectsVolume}%
              {isMuted && <span style={{ color: '#f44336', marginLeft: '4px' }}>(Muted)</span>}
            </VolumeLabel>
            <VolumeSlider
              type="range"
              min="0"
              max="100"
              value={effectsVolume}
              onChange={handleEffectsVolumeChange}
              style={{ opacity: isMuted ? 0.5 : 1 }}
            />
          </VolumeControl>
          <PresetButtons>
            <PresetButton onClick={() => handleEffectsPreset('low')}>Low</PresetButton>
            <PresetButton onClick={() => handleEffectsPreset('medium')}>Med</PresetButton>
            <PresetButton onClick={() => handleEffectsPreset('high')}>High</PresetButton>
          </PresetButtons>
          <StatusText style={{ fontSize: '0.7rem', opacity: 0.7 }}>
            Shortcuts: M (toggle music) | Ctrl+↑↓ (music volume) | Ctrl+←→ (effects volume) | Space (test click)
          </StatusText>
          {status && <StatusText>{status}</StatusText>}
        </>
      )}
    </TestContainer>
  );
};
