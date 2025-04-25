import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { toast } from 'react-hot-toast';
import { endGameOnBlockchain, TransactionStatus } from '../services/blockchainService';

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: string;
  name?: string; // Add optional name field
  position: Position;
  snake: Position[];
  direction: string;
  score: number;
  betAmount: number;
  ready: boolean;
}

// Interface for winner information
interface WinnerInfo {
  address: string;
  name?: string;
  score: number;
}

interface GameState {
  players: Player[];
  food: Position;
  gridSize: number;
  gameStatus: 'waiting' | 'starting' | 'inProgress' | 'finished';
  startTime: number | null;
  endTime: number | null;
  potAmount: number;
}

interface GameBoardProps {
  gameState: GameState;
  playerId: string;
  onPlaceBet: (amount: number) => void;
  roomId: string;
  socket: any;
  isHost: boolean;
  betAmount: number;
  isBlockchainConnected: boolean;
  ethereumAddress?: string;
}

interface CellProps {
  type: 'empty' | 'food' | 'snake' | 'player';
  $isHead?: boolean;
  direction?: string;
  $isCollision?: boolean;
  $isTrail?: boolean;
  $isWinner?: boolean;
  $isLoser?: boolean;
}

// Define all keyframe animations first
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const spinnerRotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const foodAppear = keyframes`
  0% { transform: scale(0) rotate(180deg); opacity: 0; filter: hue-rotate(0deg) brightness(1.5); }
  20% { transform: scale(1.6) rotate(-60deg); opacity: 0.6; filter: hue-rotate(90deg) brightness(1.9); }
  40% { transform: scale(1.3) rotate(-30deg); opacity: 0.8; filter: hue-rotate(180deg) brightness(1.7); }
  60% { transform: scale(1.1) rotate(-15deg); opacity: 0.9; filter: hue-rotate(270deg) brightness(1.5); }
  80% { transform: scale(0.9) rotate(5deg); opacity: 1; filter: hue-rotate(320deg) brightness(1.3); }
  90% { transform: scale(1.1) rotate(0deg); opacity: 1; filter: hue-rotate(340deg) brightness(1.2); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; filter: hue-rotate(360deg) brightness(1); }
`;

const snakePulse = keyframes`
  0% { filter: brightness(1) saturate(1); }
  50% { filter: brightness(1.3) saturate(1.3); }
  100% { filter: brightness(1) saturate(1); }
`;

const confetti = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  25% { transform: translateY(25%) rotate(180deg) scale(1.2); opacity: 0.8; }
  50% { transform: translateY(50%) rotate(360deg) scale(0.8); opacity: 0.9; }
  75% { transform: translateY(75%) rotate(540deg) scale(1.1); opacity: 0.7; }
  100% { transform: translateY(1000%) rotate(720deg) scale(0.5); opacity: 0; }
`;

const fadeOut = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

const scoreFlash = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); color: var(--color-warning); }
  100% { transform: scale(1); }
`;

const gameOverScale = keyframes`
  0% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
  70% { transform: scale(1.1) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const particleFloat = keyframes`
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
  50% { transform: translateY(-15px) translateX(5px) scale(0.8); opacity: 0.5; }
  100% { transform: translateY(-30px) translateX(0) scale(0.5); opacity: 0; }
`;

const trailFade = keyframes`
  0% { opacity: 0.7; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.95); }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0) rotate(0deg); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) rotate(-2deg); }
  20%, 40%, 60%, 80% { transform: translateX(5px) rotate(2deg); }
`;

const pop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.3); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
`;

const celebrate = keyframes`
  0% { transform: scale(1) rotate(0deg); filter: hue-rotate(0deg); }
  25% { transform: scale(1.1) rotate(5deg); filter: hue-rotate(90deg); }
  50% { transform: scale(1) rotate(-3deg); filter: hue-rotate(180deg); }
  75% { transform: scale(1.05) rotate(2deg); filter: hue-rotate(270deg); }
  100% { transform: scale(1) rotate(0deg); filter: hue-rotate(360deg); }
`;

const statusPulse = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`;

// Add new keyframes for particle effects
const float3D = keyframes`
  0% { transform: translate3d(0, 0, 0); opacity: 1; }
  50% { transform: translate3d(${() => Math.random() * 20 - 10}px, -20px, 20px); opacity: 0.5; }
  100% { transform: translate3d(${() => Math.random() * 40 - 20}px, -40px, 0); opacity: 0; }
`;

// Define Grid shimmer effect
const gridShimmer = keyframes`
  0% { box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(97, 218, 251, 0.1); }
  50% { box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(97, 218, 251, 0.3); }
  100% { box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(97, 218, 251, 0.1); }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(97, 218, 251, 0.5),
                0 0 10px rgba(97, 218, 251, 0.3),
                0 0 15px rgba(97, 218, 251, 0.2);
  }
  50% {
    box-shadow: 0 0 10px rgba(97, 218, 251, 0.8),
                0 0 20px rgba(97, 218, 251, 0.5),
                0 0 30px rgba(97, 218, 251, 0.3);
  }
  100% {
    box-shadow: 0 0 5px rgba(97, 218, 251, 0.5),
                0 0 10px rgba(97, 218, 251, 0.3),
                0 0 15px rgba(97, 218, 251, 0.2);
  }
`;

// Now define styled components
const GameContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--gradient-dark);
  padding: 2vh;
  box-sizing: border-box;
  margin: 0;
  border-radius: 0;
  box-shadow: inset 0 0 50px rgba(97, 218, 251, 0.2);
  position: relative;
  overflow: hidden;
  perspective: var(--grid-perspective);
  transform-style: preserve-3d;
  transition: all var(--transition-speed) ease, 
             transform var(--transition-3d-slow), 
             perspective var(--transition-3d-slow);

  &[data-game-status="inProgress"] {
    animation: ${glow} 4s infinite ease-in-out;
  }
  
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(97, 218, 251, 0.05) 0%, transparent 70%);
    z-index: 0;
    pointer-events: none;
  }
  
  @media (max-width: 1200px) {
    padding: 1.5vh;
  }
  
  @media (max-width: 768px) {
    padding: 1vh;
  }
  
  @media (orientation: portrait) {
    height: 100vw;
    align-self: center;
  }
  
  @media (max-height: 600px) {
    padding: 0.5vh;
  }
`;

const Grid = styled.div<{ size: number; $is3D?: boolean }>`
  display: grid;
  grid-template-columns: repeat(${props => props.size}, 1fr);
  grid-template-rows: repeat(${props => props.size}, 1fr);
  gap: clamp(1px, 0.2vmin, 3px);
  background-color: var(--color-grid-line);
  padding: clamp(4px, 1vmin, 10px);
  border-radius: var(--border-radius-md);
  width: min(95vh, 95vw);
  height: min(95vh, 95vw);
  box-sizing: border-box;
  box-shadow: 
    inset 0 0 15px rgba(0, 0, 0, 0.4),
    inset 0 0 5px rgba(255, 255, 255, 0.1),
    var(--shadow-offset-x) var(--shadow-offset-y) var(--shadow-blur) var(--shadow-color);
  animation: ${fadeIn} 0.5s ease-out, ${gridShimmer} 5s ease-in-out infinite;
  position: relative;
  border: min(2px, 0.3vmin) solid rgba(97, 218, 251, 0.2);
  transform: ${props => props.$is3D !== false ? `
    perspective(var(--grid-perspective))
    rotateX(var(--grid-tilt))
    rotateY(var(--grid-rotation))
    rotateZ(var(--board-rotation-z))
    scale3d(var(--grid-scale), var(--grid-scale), 1)
  ` : 'none'};
  transform-style: preserve-3d;
  transition: all var(--transition-3d-slow), transform var(--transition-3d-slow);
  transform-origin: center center;
  backface-visibility: hidden;
  margin: auto;
  box-shadow: ${props => props.$is3D !== false ? `
    0 var(--shadow-depth-snake) var(--shadow-blur) rgba(0, 0, 0, 0.3),
    0 var(--shadow-depth-food) var(--shadow-blur) var(--color-food-shadow)
  ` : 'none'};
  
  ${props => props.$is3D !== false && css`
    &:hover {
      box-shadow: 
        0 30px 40px rgba(0, 0, 0, 0.4),
        0 0 30px rgba(97, 218, 251, 0.2);
    }
  `}
  
  &:hover {
    transform: ${props => props.$is3D !== false ? `
      rotateX(5deg)
      rotateY(5deg)
      rotateZ(var(--board-rotation-z))
    ` : 'none'};
  }
  
  @media (max-width: 768px) {
    &:hover {
      transform: ${props => props.$is3D !== false ? `
        rotateX(var(--board-rotation-x))
        rotateY(var(--board-rotation-y))
        rotateZ(var(--board-rotation-z))
      ` : 'none'};
    }
  }
`;
const Cell = styled.div<CellProps & { $is3D?: boolean }>`
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--border-radius-sm);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transition: all var(--transition-3d-fast), transform var(--transition-3d-slow);

  ${props => props.$is3D && css`
    &:hover {
      transform: ${props => {
        const baseTransform = props.type === 'food' 
          ? 'translateZ(calc(var(--shadow-depth-food) + 5px))' 
          : props.$isHead 
            ? 'translateZ(calc(var(--shadow-depth-head) + 5px))' 
            : 'translateZ(calc(var(--shadow-depth-snake) + 5px))';
        
        return `${baseTransform} scale(1.1)`;
      }};
      filter: brightness(1.2);
      z-index: 10;
    }
  `}
  background: ${props => {
    switch (props.type) {
      case 'food':
        return 'radial-gradient(circle, var(--color-food) 60%, var(--color-food-dark, #c62828) 100%)';
      case 'snake':
        if (props.$isWinner) {
          return 'linear-gradient(135deg, #4CAF50, #2e7d32)';
        } else if (props.$isLoser) {
          return 'linear-gradient(135deg, #f44336, #c62828)';
        }
        return 'linear-gradient(135deg, var(--color-opponent-snake), var(--color-opponent-snake-dark, #444))';
      case 'player':
        if (props.$isWinner) {
          return 'linear-gradient(135deg, #4CAF50, #2e7d32)';
        } else if (props.$isLoser) {
          return 'linear-gradient(135deg, #f44336, #c62828)';
        }
        if (props.$isHead) {
          return 'linear-gradient(135deg, var(--color-snake-head), var(--color-snake-head-dark, #0d8a6f))';
        } else {
          return 'linear-gradient(135deg, var(--color-snake-body), var(--color-snake-body-dark, #0a6e5a))';
        }
      default:
        return 'var(--color-cell-empty)';
    }
  }};
  transition: all 0.15s cubic-bezier(0.34, 1.26, 0.64, 1);
  box-shadow: ${props => {
    if (!props.$is3D) return props.type === 'food' ? '0 0 12px rgba(244, 67, 54, 0.8)' : 'none';
    
    const depth = props.type === 'food' 
      ? 'var(--shadow-depth-food)' 
      : props.$isHead 
        ? 'var(--shadow-depth-head)' 
        : 'var(--shadow-depth-snake)';
    
    return `
      0 ${depth} ${props.type === 'food' ? '20px' : '15px'} 
      ${props.type === 'food' 
        ? 'rgba(244, 67, 54, 0.4)' 
        : props.$isHead 
          ? 'rgba(0, 200, 170, 0.4)' 
          : 'rgba(76, 175, 80, 0.3)'},
      inset 0 0 10px rgba(255, 255, 255, 0.2)
    `;
  }};
  transform: ${props => {
    if (props.$is3D === false) {
      return props.type === 'food' ? 'scale(0.85)' :
             props.$isCollision ? 'scale(1.15)' :
             props.$isTrail ? 'scale(0.95)' :
             props.$isHead ? 'scale(1.08)' : 'scale(1)';
    }
    
    // Enhanced 3D transforms
    const depth = props.type === 'food' ? 
      'var(--shadow-depth-food)' : 
      props.$isHead ? 
        'var(--shadow-depth-head)' : 
        'var(--shadow-depth-snake)';
    
    let scale = props.type === 'food' ? 0.85 :
                props.$isCollision ? 1.15 :
                props.$isTrail ? 0.95 :
                props.$isHead ? 1.08 : 1;
    
    let rotateX = 0;
    let rotateY = 0;
    
    // Add dynamic rotation based on movement direction
    if (props.direction) {
      switch(props.direction) {
        case 'up':
          rotateX = -15;
          break;
        case 'down':
          rotateX = 15;
          break;
        case 'left':
          rotateY = -15;
          break;
        case 'right':
          rotateY = 15;
          break;
      }
    }
    
    return `
      translate3d(0, 0, ${depth})
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(${scale})
    `;
  }};
  position: relative;
  overflow: hidden;
  z-index: ${props => props.type === 'empty' ? 1 : props.$isHead ? 3 : 2};
  animation: ${props => {
    if (props.type === 'food') return 'none'; /* Food animation is handled in the Food specific styling */
    if (props.$isHead) return css`${snakePulse} 1.5s infinite ease-in-out`;
    if (props.$isCollision) return css`${shake} 0.6s ease-in-out`;
    if (props.$isTrail) return css`${trailFade} 0.5s ease-out forwards`;
    return 'none';
  }};
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    
    ${props => {
      if (props.$is3D === false) return '';
      
      if (props.$isHead) {
        return css`
          background: radial-gradient(circle at center, white 0%, transparent 70%);
          transform: translateZ(2px);
          opacity: 0.4;
        `;
      }
      
      if (props.type === 'food') {
        return css`
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
          transform: translateZ(4px);
          opacity: 0.6;
          box-shadow: 0 0 15px rgba(255, 100, 100, 0.8);
        `;
      }
      
      return css`
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
        transform: translateZ(1px);
        opacity: 0.2;
      `;
    }}
  }
  
  &::after {
    content: ${props => props.$isHead || props.type === 'food' ? "''" : 'none'};
    position: absolute;
    top: 50%;
    left: 50%;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    z-index: 2;
    
    ${props => {
      if (props.$is3D === false) return '';
      
      if (props.$isHead && props.direction) {
        // Enhanced 3D direction indicator
        return css`
          width: 0;
          height: 0;
          border: 8px solid transparent;
          transform: translate(-50%, -50%) translateZ(4px);
          
          ${(() => {
            switch(props.direction) {
              case 'up':
                return `
                  border-bottom-color: rgba(255, 255, 255, 0.9);
                  margin-top: -4px;
                  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2);
                `;
              case 'down':
                return `
                  border-top-color: rgba(255, 255, 255, 0.9);
                  margin-top: 4px;
                  box-shadow: 0 -3px 5px rgba(0, 0, 0, 0.2);
                `;
              case 'right':
                return `
                  border-left-color: rgba(255, 255, 255, 0.9);
                  margin-left: 3px;
                  box-shadow: -3px 0 5px rgba(0, 0, 0, 0.2);
                `;
              case 'left':
                return `
                  border-right-color: rgba(255, 255, 255, 0.9);
                  margin-left: -3px;
                  box-shadow: 3px 0 5px rgba(0, 0, 0, 0.2);
                `;
              default:
                return '';
            }
          })()}
        `;
      }
      
      if (props.type === 'food') {
        return css`
          width: 30%;
          height: 30%;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          transform: translate(-50%, -50%) translateZ(6px);
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
        `;
      }
      
      return '';
    }}
  }
  /* Food specific styling */
  ${props => props.type === 'food' && css`
    &::after {
      content: '';
      position: absolute;
      top: 15%;
      left: 15%;
      width: 30%;
      height: 30%;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
    }
    
    animation: ${css`${foodAppear} 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), ${pulse} 2s infinite ease-in-out 0.7s, ${wiggle} 4s infinite ease-in-out 1s`};
    will-change: transform, filter;
    filter: saturate(1.7) brightness(1.3) drop-shadow(0 0 8px rgba(255, 100, 100, 0.6));
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
      border-radius: inherit;
      animation: ${css`${pulse} 2s infinite ease-in-out 0.2s`};
      opacity: 0.5;
    }
  `}
  /* Enhanced transitions for smooth movement */
  ${props => (props.type === 'player' || props.type === 'snake') && !props.$isHead && css`
    transition: all 0.18s cubic-bezier(0.34, 1.26, 0.64, 1);
    transform-origin: center;
    will-change: transform, box-shadow, opacity;
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50%;
      height: 50%;
      background: ${props.type === 'player' ? 
        'radial-gradient(circle, rgba(0, 255, 200, 0.3) 0%, rgba(0, 255, 200, 0) 70%)' : 
        'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%)'};
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0.8;
      animation: ${css`${particleFloat} 0.8s ease-out`};
      will-change: transform, opacity;
    }
  `}
  
  /* Collision effects */
  ${props => props.$isCollision && css`
    animation: ${shake} 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both, ${pulse} 0.25s ease-in-out infinite;
    box-shadow: 0 0 25px rgba(255, 0, 0, 0.9), inset 0 0 20px rgba(255, 0, 0, 0.8);
    z-index: 20;
    transform: scale(1.4);
    filter: brightness(1.9) saturate(2.0) contrast(1.3);
    &::before {
      background: radial-gradient(circle at center, rgba(255, 0, 0, 0.8) 0%, transparent 80%);
      opacity: 0.8;
      animation: ${pulse} 0.3s ease-in-out infinite;
    }
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.4);
      border-radius: inherit;
      animation: ${css`${fadeIn} 0.1s ease-out, ${fadeOut} 0.3s ease-in 0.1s forwards`};
      z-index: 20;
    }
  `}
`;

// Left-side room info component
const RoomInfoPanel = styled.div`
  position: fixed;
  top: min(20px, 2vh);
  left: min(20px, 2vw);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 30, 30, 0.85) 100%);
  padding: clamp(10px, 2vmin, 20px);
  border-radius: var(--border-radius-md);
  color: var(--color-text);
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(97, 218, 251, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${slideIn} 0.4s ease-out;
  z-index: 100;
  font-size: clamp(0.9rem, 1.5vmin, 1.1rem);
  transition: all 0.3s ease;
  width: min(200px, 20vw);
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(97, 218, 251, 0.2);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 10px 15px;
    width: min(160px, 20vw);
    font-size: 0.85rem;
  }
  
  @media (max-height: 600px) {
    padding: 8px 12px;
    top: 10px;
  }
`;
// Right-side scoreboard component
const ScoreboardPanel = styled.div<{ $scoreChanged?: boolean }>`
  position: fixed;
  top: min(20px, 2vh);
  right: min(20px, 2vw);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 30, 30, 0.85) 100%);
  padding: clamp(10px, 2vmin, 20px);
  border-radius: var(--border-radius-md);
  color: var(--color-text);
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(97, 218, 251, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${slideIn} 0.4s ease-out;
  z-index: 100;
  font-size: clamp(0.9rem, 1.5vmin, 1.1rem);
  transition: all 0.3s ease;
  width: min(200px, 20vw);
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(97, 218, 251, 0.2);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 10px 15px;
    width: min(160px, 20vw);
    font-size: 0.85rem;
  }
  
  @media (max-height: 600px) {
    padding: 8px 12px;
    top: 10px;
  }
  .time-value {
    font-weight: bold;
    color: var(--color-warning);
    animation: ${pulse} 2s infinite ease-in-out;
  }
  
  .score-value {
    font-weight: bold;
    color: var(--color-secondary);
    text-shadow: 0 0 8px rgba(97, 218, 251, 0.5);
    animation: ${props => props.$scoreChanged ? css`${scoreFlash} 0.5s ease-out` : 'none'};
  }
  
  .pot-value {
    font-weight: bold;
    color: var(--color-success);
  }
`;
const ScoreItem = styled.div<{ isCurrentPlayer?: boolean, $scoreChanged?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${props => props.isCurrentPlayer ? 'rgba(97, 218, 251, 0.15)' : 'rgba(0, 0, 0, 0.2)'};
  padding: clamp(5px, 1vmin, 8px);
  border-radius: var(--border-radius-sm);
  margin-bottom: 5px;
  border: 1px solid ${props => props.isCurrentPlayer ? 'rgba(97, 218, 251, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
  transition: all 0.3s ease;
  animation: ${props => props.$scoreChanged ? css`${scoreFlash} 0.5s ease-out` : 'none'};
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .player-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .player-name {
    font-size: clamp(0.75rem, 1.7vmin, 0.9rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
    text-align: left;
    display: flex;
    align-items: center;
    
    &::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${props => props.isCurrentPlayer ? '#4caf50' : '#cccccc'};
      margin-right: 5px;
      box-shadow: 0 0 3px ${props => props.isCurrentPlayer ? 'rgba(76, 175, 80, 0.7)' : 'rgba(204, 204, 204, 0.7)'};
    }
  }
  
  .score-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .score {
    font-weight: bold;
    color: ${props => props.isCurrentPlayer ? 'var(--color-secondary)' : 'var(--color-text)'};
  }
`;

const RoomIdDisplay = styled.div`
  font-size: clamp(1rem, 2.2vmin, 1.3rem);
  font-weight: bold;
  color: var(--color-secondary);
  margin: 5px 0;
  text-shadow: 0 0 10px rgba(97, 218, 251, 0.5);
  background-color: rgba(97, 218, 251, 0.1);
  padding: clamp(5px, 1vmin, 8px);
  border-radius: var(--border-radius-sm);
  border: 1px solid rgba(97, 218, 251, 0.2);
  word-break: break-all;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(97, 218, 251, 0.15);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const RoomLabel = styled.div`
  font-size: clamp(0.8rem, 1.8vmin, 1rem);
  color: var(--color-text);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: "🎮";
    margin-right: 5px;
  }
`;

const CopyButton = styled.button`
  background-color: var(--color-secondary);
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  margin-left: 10px;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
  
  &:hover {
    background-color: var(--color-secondary-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: translateY(0px);
  }
`;

const Button = styled.button`
  padding: clamp(8px, 1.5vmin, 15px) clamp(12px, 2vmin, 25px);
  border-radius: var(--border-radius-md);
  border: none;
  background: var(--gradient-primary);
  color: white;
  cursor: pointer;
  font-size: clamp(14px, 1.8vmin, 18px);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0)
    );
    transition: left 0.7s ease;
  }

  &:hover:not(:disabled):before {
    left: 100%;
  }

  &:disabled {
    background: #7a7a7a;
    cursor: not-allowed;
    opacity: 0.7;
  }

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: var(--shadow-sm);
  }
`;

const PlayButton = styled(Button)`
  background: var(--gradient-primary);
  font-size: clamp(16px, 2vmin, 20px);
  padding: clamp(10px, 1.8vmin, 15px) clamp(20px, 3vmin, 35px);
  letter-spacing: 0.5px;
  font-weight: bold;
  
  &:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.02);
    box-shadow: var(--shadow-lg);
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px) scale(1);
  }
`;

const BettingUI = styled.div`
  position: fixed;
  bottom: min(20px, 2vh);
  left: 50%;
  transform: translateX(-50%);
  background: var(--gradient-dark);
  padding: clamp(10px, 2vmin, 20px);
  border-radius: var(--border-radius-md);
  color: var(--color-text);
  text-align: center;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${slideIn} 0.3s ease-out;
  width: min(90%, 350px);
  z-index: 100;
  font-size: clamp(0.9rem, 1.5vmin, 1.1rem);
  
  @media (max-width: 768px) {
    padding: 10px 15px;
    bottom: min(10px, 1vh);
  }
  
  @media (max-height: 600px) {
    bottom: 5px;
    padding: 5px 10px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
`;

const Input = styled.input`
  padding: clamp(8px, 1.5vmin, 14px);
  border-radius: var(--border-radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-right: clamp(5px, 1vmin, 12px);
  width: clamp(80px, 20vw, 150px);
  background-color: rgba(0, 0, 0, 0.3);
  color: var(--color-text);
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 2px rgba(97, 218, 251, 0.3);
  }
`;
// End of styled components

interface ConfettiProps {
  color: string;
  left: number;
  style?: React.CSSProperties;
}

const Confetti = styled.div<ConfettiProps>`
  position: absolute;
  width: ${props => 5 + Math.random() * 10}px;
  height: ${props => 5 + Math.random() * 10}px;
  background-color: ${props => props.color};
  top: -10px;
  animation: ${confetti} 4s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
  will-change: transform, opacity;
  left: ${props => props.left}%;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
  border-radius: ${props => Math.random() > 0.5 ? '50%' : '3px'};
  transform-origin: center;
  opacity: 0.9;
  z-index: 5;
  
  /* Add some variety to confetti shapes */
  &:nth-child(3n) {
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  }
  
  &:nth-child(4n) {
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  }
`;

const Particle3D = styled.div<{ delay: number; color: string }>`
  position: absolute;
  width: 6px;
  height: 6px;
  background: ${props => props.color};
  border-radius: 50%;
  pointer-events: none;
  transform-style: preserve-3d;
  animation: ${float3D} 1s ease-out forwards;
  animation-delay: ${props => props.delay}ms;
  box-shadow: 0 0 10px ${props => props.color}80;
  z-index: 100;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    background: radial-gradient(circle at center, ${props => props.color}80 0%, transparent 70%);
    transform: translateZ(2px);
    opacity: 0.6;
  }
`;

const GameOverModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease-out;

  h2 {
    color: white;
    margin-bottom: 20px;
    font-size: 28px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    animation: ${pulse} 2s ease-in-out;
  }

  p {
    color: white;
    margin-bottom: 20px;
    font-size: 18px;
  }

  .winner-text {
    color: var(--color-warning);
    font-weight: bold;
    font-size: 20px;
    margin-bottom: 25px;
    margin-bottom: 25px;
    display: block;
  }

  /* Use lowercase for the class name to match the styled component */
  .buttonGroup {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 25px;
  }
  
  .winner-info {
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius-md);
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);
  }
  
  .winner-text {
    color: #ffd700;
    font-size: 24px;
    margin-bottom: 15px;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .winner-address {
    color: var(--color-text);
    font-family: monospace;
    font-size: 16px;
    margin-bottom: 12px;
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border-radius: var(--border-radius-sm);
  }
  
  .winner-score {
    color: var(--color-success);
    font-size: 20px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    &::before {
      content: "🏆";
      font-size: 24px;
    }
  }
  
  .error-message {
    color: var(--color-error, #f44336);
    background: rgba(244, 67, 54, 0.1);
    padding: 12px 15px;
    border-radius: var(--border-radius-sm);
    margin: 15px 0;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(244, 67, 54, 0.3);
    font-weight: 500;
  }
  
  .error-icon {
    color: var(--color-error, #f44336);
    font-size: 20px;
    animation: ${shake} 0.5s ease-in-out;
  }
  
  .loading-spinner, .success-icon {
    margin-right: 8px;
  }
`;


const TransactionStatusIndicator = styled.div<{ $status: TransactionStatus }>`
  margin: 20px auto;
  padding: 15px 20px;
  border-radius: var(--border-radius-md);
  text-align: center;
  font-weight: bold;
  max-width: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease-in-out;
  animation: ${props => {
    switch (props.$status) {
      case 'pending':
        return css`${statusPulse} 1.5s infinite ease-in-out`;
      case 'confirmed':
        return css`${pop} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
      case 'failed':
        return css`${shake} 0.5s ease-in-out`;
      default:
        return 'none';
    }
  }};
  
  background-color: ${props => {
    switch (props.$status) {
      case 'pending':
        return 'rgba(255, 215, 0, 0.15)';
      case 'confirmed':
        return 'rgba(76, 175, 80, 0.15)';
      case 'failed':
        return 'rgba(244, 67, 54, 0.15)';
      default:
        return 'transparent';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'pending':
        return '#ffd700';
      case 'confirmed':
        return '#4caf50';
      case 'failed':
        return '#f44336';
      default:
        return 'transparent';
    }
  }};
  
  color: ${props => {
    switch (props.$status) {
      case 'pending':
        return '#ffd700';
      case 'confirmed':
        return '#4caf50';
      case 'failed':
        return '#f44336';
      default:
        return 'white';
    }
  }};
  
  box-shadow: 0 0 15px ${props => {
    switch (props.$status) {
      case 'pending':
        return 'rgba(255, 215, 0, 0.2)';
      case 'confirmed':
        return 'rgba(76, 175, 80, 0.2)';
      case 'failed':
        return 'rgba(244, 67, 54, 0.2)';
      default:
        return 'transparent';
    }
  }};
  
  .loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid currentColor;
    border-radius: 50%;
    border-top-color: transparent;
    animation: ${spinnerRotate} 1s linear infinite;
    transform-origin: center;
    margin-right: 8px;
  }
  
  .success-icon {
    font-size: 20px;
    animation: ${props => props.$status === 'confirmed' ? css`${celebrate} 2s ease-in-out` : 'none'};
  }

  .error-icon {
    font-size: 20px;
  }
`;

const GameOverContent = styled.div`
  background: var(--gradient-dark);
  padding: clamp(20px, 4vmin, 40px);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 450px;
  width: 90%;
  text-align: center;
  position: relative;
  animation: ${gameOverScale} 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  overflow: hidden;
  will-change: transform, opacity;
  
  @media (max-width: 768px) {
    padding: clamp(15px, 3vmin, 30px);
    width: 85%;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 3000; /* Ensure it's above all other components including game over modal */
  animation: ${fadeIn} 0.3s ease-out;
  backdrop-filter: blur(5px);
`;

const LoadingContent = styled.div`
  text-align: center;
  color: white;
  padding: 30px;
  border-radius: var(--border-radius-lg);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 400px;
  width: 90%;
  
  h3 {
    margin-bottom: 20px;
    color: var(--color-warning);
    font-size: 24px;
  }
  
  p {
    margin: 15px 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const LoadingSpinnerLarge = styled.div`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: var(--color-warning);
  border-radius: 50%;
  margin: 20px auto;
  animation: ${spinnerRotate} 1s linear infinite;
`;

const TransactionDetails = styled.div`
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: var(--border-radius-md);
  margin: 20px 0;
  font-family: monospace;
  font-size: 14px;
  
  .label {
    color: var(--color-warning);
    margin-bottom: 8px;
  }
  
  .value {
    word-break: break-all;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const WinnerCalculationOverlay = styled(LoadingOverlay)`
  background: rgba(0, 0, 0, 0.9);
  z-index: 2500;
  backdrop-filter: blur(5px);
`;

const WinnerCalculationContent = styled(LoadingContent)`
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(97, 218, 251, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(97, 218, 251, 0.1);
  
  h3 {
    color: var(--color-warning);
    animation: ${pulse} 2s infinite ease-in-out;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }

  p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0.5rem 0;
    font-size: 1rem;
    line-height: 1.5;
  }
`;

const WinnerDetails = styled.div`
  margin: 1.5rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(97, 218, 251, 0.1);

  .label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .value {
    color: var(--color-warning);
    font-size: 1.1rem;
    font-weight: 500;
  }
`;

const ViewControls = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 1000;
`;

const ViewButton = styled(Button)`
  padding: 8px 12px;
  font-size: 0.9em;
  opacity: 0.8;
  transition: all 0.3s ease;
  transform-style: preserve-3d;

  &:hover {
    opacity: 1;
    transform: translateY(-2px) translateZ(5px);
  }

  &.active {
    background: var(--color-secondary);
    color: white;
    transform: translateZ(10px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
`;

// Component props
const GameBoard = ({
  gameState,
  playerId,
  onPlaceBet, 
  roomId, 
  socket, 
  isHost, 
  betAmount,
  isBlockchainConnected,
  ethereumAddress
}) => {
  const { gridSize, food, players, gameStatus, startTime, endTime, potAmount } = gameState;
  const [inputBetAmount, setInputBetAmount] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle');
  const [scoreChanged, setScoreChanged] = useState(false);
  const [isCalculatingWinner, setIsCalculatingWinner] = useState(false);
  const [is3DView, setIs3DView] = useState(true);
  const [viewRotation, setViewRotation] = useState({ x: 15, y: 0, z: 0 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
  }>>([]);
  // Define currentPlayer before using it in any hooks
  const currentPlayer = players.find(p => p.id === playerId);
  const allPlayers = players.length;
  const readyPlayers = players.filter(p => p.ready).length;

  // Add useEffect for time tracking
  useEffect(() => {
    if (!endTime) return;
    
    const interval = setInterval(() => {
      try {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error updating time left:', error);
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('Error clearing interval:', error);
      }
    };
  }, [endTime]);
  // Track score changes to trigger animation
  useEffect(() => {
    // Safe check for currentPlayer with proper typing
    if (currentPlayer && typeof currentPlayer === 'object' && 
        'score' in currentPlayer && 
        currentPlayer.score !== undefined && 
        typeof currentPlayer.score === 'number') {
      setScoreChanged(true);
      const timer = setTimeout(() => setScoreChanged(false), 500);
      return () => {
        try {
          clearTimeout(timer);
        } catch (error) {
          console.error('Error clearing timeout:', error);
        }
      };
    }
  }, [currentPlayer]);

  // Create particles when score increases
  useEffect(() => {
    if (currentPlayer && currentPlayer.score > 0) {
      // Create particles when score increases
      const newParticles = Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i,
        x: currentPlayer.position.x,
        y: currentPlayer.position.y,
        color: 'var(--color-secondary)'
      }));
      setParticles(prev => [...prev, ...newParticles]);

      // Clean up particles after animation
      const timer = setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id < Date.now()));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentPlayer?.score]);

  // Add mouse interaction for 3D rotation
  useEffect(() => {
    if (!is3DView) return;

    // Disable auto-rotation when manual dragging begins
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;

      setViewRotation(prev => ({
        ...prev,
        y: prev.y + deltaX * 0.5,
        x: Math.max(0, Math.min(30, prev.x + deltaY * 0.5))
      }));

      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const grid = document.querySelector('.game-container');
    if (grid) {
      grid.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (grid) {
        grid.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [is3DView]);

  // Add useEffect for auto-rotation
  useEffect(() => {
    if (!is3DView || !autoRotate) return;

    let animationFrame: number;
    const animate = () => {
      setViewRotation(prev => ({
        ...prev,
        y: (prev.y + 0.2) % 360
      }));
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [is3DView, autoRotate, gameStatus]);

  useEffect(() => {
    if (socket) {
      socket.on('gameOver', async (data: { winner: string | WinnerInfo }) => {
        setIsCalculatingWinner(true); // Start loading state
        setGameOver(true);
        
        try {
          // Handle both string and WinnerInfo formats for backward compatibility
          if (typeof data.winner === 'string') {
            // Find the player in the players array to get their name
            const winnerPlayer = players.find(p => p.id === data.winner);
            const winnerInfo: WinnerInfo = {
              address: data.winner,
              name: winnerPlayer?.name,
              score: findPlayerScore(data.winner)
            };
            setWinner(winnerInfo);
            await handleGameEnd(data.winner);
          } else {
            setWinner(data.winner);
            await handleGameEnd(data.winner.address);
          }
        } catch (error) {
          console.error('Error processing winner:', error);
          setError('Failed to process winner');
        }
      });

      return () => {
        socket.off('gameOver');
      };
    }
  }, [socket, players]);
  
  // Helper function to find player's score by ID
  const findPlayerScore = (playerId: string): number => {
    const player = players.find(p => p.id === playerId);
    return player ? player.score : 0;
  };
  
  // Helper function to truncate Ethereum addresses for display
  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  const getCellType = (pos: Position): 'empty' | 'food' | 'snake' | 'player' => {
    if (pos.x === food.x && pos.y === food.y) return 'food';

    for (const player of players) {
      for (const segment of player.snake) {
        if (segment.x === pos.x && segment.y === pos.y) {
          return player.id === playerId ? 'player' : 'snake';
        }
      }
    }

    return 'empty';
  };

  const isSnakeHead = (pos: Position, player: Player): boolean => {
    const head = player.snake[0];
    return head.x === pos.x && head.y === pos.y;
  };

  const getSnakeDirection = (pos: Position): string | undefined => {
    for (const player of players) {
      if (isSnakeHead(pos, player)) {
        return player.direction;
      }
    }
    return undefined;
  };

  const renderGrid = () => {
    const cells: React.ReactNode[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const pos = { x, y };
        const cellType = getCellType(pos);
        
        // Check if this is a snake head
        let isHead = false;
        let direction: string | undefined;
        let isWinner = false;
        let isLoser = false;
        
        if (cellType === 'player' || cellType === 'snake') {
          for (const player of players) {
            if (isSnakeHead(pos, player)) {
              isHead = true;
              direction = player.direction;
              // Check if this player is the winner or loser
              if (gameStatus === 'finished' && winner) {
                isWinner = player.id === winner.address;
                isLoser = !isWinner && player.id !== winner.address;
              }
              break;
            }
          }
        }
        
        // Check if it's a collision (for visual effects)
        const isCollision = gameStatus === 'finished' && cellType !== 'empty' && cellType !== 'food';
        
        cells.push(
          <Cell
            key={`${x}-${y}`}
            type={cellType}
            $isHead={isHead}
            direction={direction}
            $isCollision={isCollision}
            $isTrail={cellType !== 'empty' && cellType !== 'food' && !isHead}
            $isWinner={isWinner}
            $isLoser={isLoser}
            $is3D={!is3DView}
          />
        );
      }
    }
    return cells;
  };

  const handlePlaceBet = () => {
    const amount = parseFloat(inputBetAmount);
    if (!isNaN(amount) && amount > 0) {
      onPlaceBet(amount);
      setInputBetAmount('');
    }
  };

  // currentPlayer is now defined at the top of the component

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied!', {
      icon: '📋',
      style: {
        background: 'rgba(30, 30, 30, 0.9)',
        color: '#fff',
        border: '1px solid rgba(97, 218, 251, 0.2)',
      },
    });
  };
  const handleGameEnd = async (winnerAddress: string) => {
    if (!isBlockchainConnected) {
      setError('Wallet not connected. Cannot process winnings.');
      setTransactionStatus('failed');
      setIsCalculatingWinner(false);
      toast.error('Wallet not connected. Cannot process winnings.', {
        style: {
          background: 'rgba(30, 30, 30, 0.9)',
          color: '#fff',
          border: '1px solid rgba(244, 67, 54, 0.2)',
        },
      });
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTransactionStatus('pending');
      
      // Show initial processing toast
      toast.loading('Processing winner rewards...', {
        style: {
          background: 'rgba(30, 30, 30, 0.9)',
          color: '#fff',
          border: '1px solid rgba(255, 215, 0, 0.2)',
        },
      });
      
      // End game on blockchain and distribute winnings
      await endGameOnBlockchain(
        roomId, 
        winnerAddress, 
        (status) => {
          setTransactionStatus(status);
          
          switch (status) {
            case 'confirmed':
              setError('');
              console.log('Transaction confirmed, waiting for blockchain state to update...');
              // Add a delay to ensure blockchain state is updated
              setTimeout(() => {
                console.log('Dispatching balance update event...');
                window.dispatchEvent(new CustomEvent('gameWalletBalanceUpdate'));
                toast.success(
                  `Winner: ${truncateAddress(winnerAddress)}\nWinnings distributed successfully!`, 
                  {
                    duration: 5000,
                    icon: '🏆',
                    style: {
                      background: 'rgba(30, 30, 30, 0.9)',
                      color: '#fff',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                    },
                  }
                );
              }, 3000); // Wait 3 seconds for blockchain state to update
              break;
            case 'failed':
              setError('Failed to process winnings');
              break;
          }
        }
      );
    } catch (error: any) {
      console.error('Error ending game:', error);
      const errorMessage = error.message || 'Failed to process winnings';
      setError(errorMessage);
      setTransactionStatus('failed');
      toast.error(errorMessage, {
        style: {
          background: 'rgba(30, 30, 30, 0.9)',
          color: '#fff',
          border: '1px solid rgba(244, 67, 54, 0.2)',
        },
      });
    } finally {
      setIsLoading(false);
      setIsCalculatingWinner(false);
    }
  };

  const handleRestart = () => {
    setGameOver(false);
    setWinner(null);
    setError('');
    // Emit restart event to socket
    if (socket) {
      socket.emit('restartGame', { roomId });
    }
  };

  const handlePlay = () => {
    if (socket && roomId) {
      socket.emit('placeBet', { roomId });
    }
  };

  return (
    <>
      <RoomInfoPanel>
        <RoomLabel>Room ID</RoomLabel>
        <RoomIdDisplay onClick={copyRoomId} title="Click to copy">
          {roomId}
        </RoomIdDisplay>
        <CopyButton onClick={copyRoomId}>Copy Room ID</CopyButton>
      </RoomInfoPanel>
      
      <ScoreboardPanel $scoreChanged={scoreChanged}>
        <div>
          {gameStatus === 'waiting' && (
            <div>
              Waiting for players... ({readyPlayers}/{allPlayers} ready)
            </div>
          )}
          {gameStatus === 'starting' && (
            <div>Game starting...</div>
          )}
          {gameStatus === 'inProgress' && (
            <div>
              Time left: <span className="time-value">{Math.ceil(timeLeft / 1000)}s</span>
            </div>
          )}
          {gameStatus === 'finished' && (
            <div>Game Over!</div>
          )}
          <div>
            Pot: <span className="pot-value">${potAmount}</span>
          </div>
        </div>
      </ScoreboardPanel>
      
      {/* Display player scores */}
      {gameStatus === 'inProgress' && (
        <ScoreboardPanel $scoreChanged={scoreChanged}>
          <div>
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map(player => (
                <ScoreItem 
                  key={player.id} 
                  isCurrentPlayer={player.id === playerId}
                  $scoreChanged={player.id === playerId && scoreChanged}
                >
                  <div className="player-info">
                    <div className="player-name">
                      {player.id.substring(0, 6)}
                    </div>
                  </div>
                  <div className="score-container">
                    <div className="score">
                      {player.score}
                    </div>
                    <div className="timer">
                      {Math.ceil(timeLeft / 1000)}s
                    </div>
                  </div>
                </ScoreItem>
              ))}
          </div>
        </ScoreboardPanel>
      )}
      
      <GameContainer 
        className="game-container" 
        data-game-status={gameStatus}
        style={{
          '--board-rotation-x': `${viewRotation.x}deg`,
          '--board-rotation-y': `${viewRotation.y + (autoRotate ? Date.now() * 0.01 % 360 : 0)}deg`,
          '--board-rotation-z': `${viewRotation.z}deg`
        } as React.CSSProperties}
      >
        <Grid 
          size={gridSize} 
          className={gameStatus === 'inProgress' ? 'active-grid' : ''}
          $is3D={is3DView}
        >
          {renderGrid()}
          {particles.map((particle) => (
            <Particle3D
              key={particle.id}
              delay={particle.id % 5 * 100}
              color={particle.color}
              style={{
                left: `${(particle.x * 100) / gridSize}%`,
                top: `${(particle.y * 100) / gridSize}%`
              }}
            />
          ))}
        </Grid>
      </GameContainer>

      {gameStatus === 'waiting' && !currentPlayer?.ready && (
        <BettingUI>
          <PlayButton onClick={handlePlay} disabled={isLoading}>
            {isLoading ? 'Joining...' : 'Play Now'}
          </PlayButton>
        </BettingUI>
      )}

      {gameOver && (
        <GameOverModal>
          <GameOverContent className="game-over-content">
            <h2>Game Over!</h2>
            {winner && (
              <div className="winner-info">
                <p className="winner-text">
                  Winner: {winner.name || 'Unknown Player'}
                </p>
                <p className="winner-address">
                  Address: {truncateAddress(winner.address)}
                </p>
                <p className="winner-score">
                  Score: {winner.score}
                </p>
              </div>
            )}
            
            {/* Only show transaction status when not pending */}
            {transactionStatus !== 'idle' && transactionStatus !== 'pending' && (
              <TransactionStatusIndicator $status={transactionStatus}>
                {transactionStatus === 'confirmed' && (
                  <>
                    <span className="success-icon">✓</span>
                    <span>Winnings distributed successfully!</span>
                  </>
                )}
                {transactionStatus === 'failed' && (
                  <>
                    <span className="error-icon">✗</span>
                    <span>{error || 'Transaction failed'}</span>
                  </>
                )}
              </TransactionStatusIndicator>
            )}
            
            {error && transactionStatus !== 'failed' && (
              <div className="error-message">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}
            
            <div className="buttonGroup">
              <Button onClick={handleRestart} disabled={isLoading || transactionStatus === 'pending'}>
                {isLoading ? 'Processing...' : 'Play Again'}
              </Button>
              <Button onClick={() => window.location.reload()}>Exit</Button>
            </div>
            
            {/* Confetti effect for winner */}
            {winner && transactionStatus === 'confirmed' && (
              <>
                {Array.from({ length: 100 }).map((_, i) => (
                  <Confetti 
                    key={i} 
                    color={`hsl(${Math.random() * 360}, ${80 + Math.random() * 20}%, ${60 + Math.random() * 20}%)`}
                    left={Math.random() * 100}
                    style={{ 
                      animationDelay: `${Math.random()}s`, // Reduced delay for quicker start
                      animationDuration: `${1.5 + Math.random() * 2}s`, // Adjusted duration
                      transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.4})`,
                      filter: `brightness(${1 + Math.random() * 0.7})`
                    }}
                  />
                ))}
              </>
            )}
          </GameOverContent>
        </GameOverModal>
      )}

      {/* Transaction Loading Overlay */}
      {transactionStatus === 'pending' && (
        <LoadingOverlay>
          <LoadingContent>
            <h3>Processing Transaction</h3>
            <LoadingSpinnerLarge />
            <p>Please wait while we process the winner's rewards...</p>
            
            <TransactionDetails>
              <div className="label">Winner</div>
              <div className="value">
                {winner?.name || 'Unknown Player'}<br />
                {winner && truncateAddress(winner.address)}
              </div>
            </TransactionDetails>
            
            <p>Please keep this window open.<br />
            This may take a few moments.</p>
          </LoadingContent>
        </LoadingOverlay>
      )}

      {isCalculatingWinner && (
        <WinnerCalculationOverlay>
          <WinnerCalculationContent>
            <h3>Calculating Winner</h3>
            <LoadingSpinnerLarge />
            <p>Processing final scores and determining the winner...</p>
            
            <WinnerDetails>
              <div className="label">Current Status</div>
              <div className="value">Verifying game results</div>
            </WinnerDetails>
            
            <p>Please keep this window open.<br />
            This may take a few moments.</p>
          </WinnerCalculationContent>
        </WinnerCalculationOverlay>
      )}

     
    </>
  );
};

export default GameBoard; 
