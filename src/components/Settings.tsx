import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AudioManager } from '../utils/AudioManager';
import { SoundOnIcon } from '../assets/icons/sound-on';
import { SoundOffIcon } from '../assets/icons/sound-off';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: var(--gradient-dark);
  width: min(450px, 90%);
  border-radius: var(--border-radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg), 0 0 20px rgba(97, 218, 251, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideIn 0.3s ease;
  max-height: 90vh;
  overflow-y: auto;

  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const Title = styled.h2`
  color: var(--color-secondary);
  margin-bottom: 20px;
  font-size: 1.8rem;
  text-align: center;
  text-shadow: 0 0 10px rgba(97, 218, 251, 0.3);
`;

const SectionTitle = styled.h3`
  color: var(--color-text);
  margin: 20px 0 10px;
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(97, 218, 251, 0.2);
  padding-bottom: 5px;
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 15px 0;
  padding: 4px 0;
`;

const VolumeSlider = styled.input`
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(97, 218, 251, 0.2);
  border-radius: 2px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
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
    box-shadow: 0 0 10px rgba(97, 218, 251, 0.5);
  }

  &::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 10px rgba(97, 218, 251, 0.5);
  }
`;

const VolumeLabel = styled.span`
  color: var(--color-text);
  font-size: 1rem;
  min-width: 90px;
`;

const VolumeValue = styled.span`
  color: var(--color-secondary);
  font-size: 1rem;
  min-width: 50px;
  text-align: right;
`;

const PresetButtons = styled.div`
  display: flex;
  gap: 10px;
  margin: 10px 0 20px;
`;

const PresetButton = styled.button`
  flex: 1;
  padding: 8px 12px;
  font-size: 0.9rem;
  background: rgba(97, 218, 251, 0.1);
  border: 1px solid rgba(97, 218, 251, 0.3);
  border-radius: var(--border-radius-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(97, 218, 251, 0.3);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Button = styled.button`
  background: var(--gradient-secondary);
  color: black;
  border: none;
  padding: 12px 20px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: 1rem;
  margin: 20px 0 10px;
  width: 100%;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
  
  &:hover {
    background: var(--color-secondary-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: var(--shadow-sm);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--color-secondary);
    transform: scale(1.1);
  }
`;

const MuteToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
  padding: 10px 15px;
  background: rgba(97, 218, 251, 0.05);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(97, 218, 251, 0.1);
`;

const ToggleButton = styled.button<{ isMuted: boolean }>`
  background: ${props => props.isMuted ? 'var(--color-danger)' : 'var(--color-secondary)'};
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

const ToggleLabel = styled.span`
  color: var(--color-text);
  font-size: 1rem;
  flex: 1;
`;

const IconWrapper = styled.div`
  margin-right: 5px;
  display: inline-flex;
  align-items: center;
`;

const StatusText = styled.div`
  color: var(--color-secondary);
  font-size: 0.9rem;
  text-align: center;
  margin-top: 15px;
  opacity: 0.8;
`;

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const audioManager = AudioManager.getInstance();
  const [musicVolume, setMusicVolume] = useState(() => {
    return audioManager.getMusicVolume();
  });
  const [effectsVolume, setEffectsVolume] = useState(() => {
    return audioManager.getEffectsVolume();
  });
  const [isMuted, setIsMuted] = useState(() => {
    return audioManager.isSoundMuted();
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('modal-overlay')) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setMusicVolume(volume);
    audioManager.setMusicVolume(volume);
    audioManager.playClickSound();
    
    setStatus('Music volume updated');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleEffectsVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setEffectsVolume(volume);
    audioManager.setEffectsVolume(volume);
    audioManager.playClickSound();
    
    setStatus('Effects volume updated');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleMusicPreset = (preset: 'low' | 'medium' | 'high') => {
    let volume = 0.5;
    switch (preset) {
      case 'low':
        volume = 0.25;
        break;
      case 'medium':
        volume = 0.5;
        break;
      case 'high':
        volume = 0.75;
        break;
    }
    setMusicVolume(volume);
    audioManager.setMusicVolume(volume);
    audioManager.playClickSound();
    
    setStatus(`Music volume set to ${preset}`);
    setTimeout(() => setStatus(''), 2000);
  };

  const handleEffectsPreset = (preset: 'low' | 'medium' | 'high') => {
    let volume = 0.5;
    switch (preset) {
      case 'low':
        volume = 0.25;
        break;
      case 'medium':
        volume = 0.5;
        break;
      case 'high':
        volume = 0.75;
        break;
    }
    setEffectsVolume(volume);
    audioManager.setEffectsVolume(volume);
    audioManager.playClickSound();
    
    setStatus(`Effects volume set to ${preset}`);
    setTimeout(() => setStatus(''), 2000);
  };

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioManager.toggleMute();
    
    setStatus(newMutedState ? 'Sound muted' : 'Sound unmuted');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleClose = () => {
    audioManager.playClickSound();
    onClose();
  };

  return (
    <ModalOverlay className="modal-overlay">
      <ModalContent>
        <CloseButton onClick={handleClose}>×</CloseButton>
        <Title>Game Settings</Title>
        
        <SectionTitle>Sound Controls</SectionTitle>
        
        <MuteToggle>
          <ToggleLabel>Game Audio</ToggleLabel>
          <ToggleButton isMuted={isMuted} onClick={handleMuteToggle}>
            <IconWrapper>
              {isMuted ? <SoundOffIcon /> : <SoundOnIcon />}
            </IconWrapper>
            {isMuted ? 'Unmute' : 'Mute'}
          </ToggleButton>
        </MuteToggle>
        
        <VolumeControl>
          <VolumeLabel>Music Volume</VolumeLabel>
          <VolumeSlider
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={musicVolume}
            onChange={handleMusicVolumeChange}
          />
          <VolumeValue>{Math.round(musicVolume * 100)}%</VolumeValue>
        </VolumeControl>
        
        <PresetButtons>
          <PresetButton onClick={() => handleMusicPreset('low')}>Low</PresetButton>
          <PresetButton onClick={() => handleMusicPreset('medium')}>Medium</PresetButton>
          <PresetButton onClick={() => handleMusicPreset('high')}>High</PresetButton>
        </PresetButtons>
        
        <VolumeControl>
          <VolumeLabel>Effects Volume</VolumeLabel>
          <VolumeSlider
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effectsVolume}
            onChange={handleEffectsVolumeChange}
          />
          <VolumeValue>{Math.round(effectsVolume * 100)}%</VolumeValue>
        </VolumeControl>
        
        <PresetButtons>
          <PresetButton onClick={() => handleEffectsPreset('low')}>Low</PresetButton>
          <PresetButton onClick={() => handleEffectsPreset('medium')}>Medium</PresetButton>
          <PresetButton onClick={() => handleEffectsPreset('high')}>High</PresetButton>
        </PresetButtons>
        
        <Button onClick={handleClose}>Save & Close</Button>
        
        {status && <StatusText>{status}</StatusText>}
      </ModalContent>
    </ModalOverlay>
  );
};

export default Settings;

