import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  useHelper, 
  Text, 
  useTexture, 
  Environment, 
  Sparkles, 
  Effects, 
  Shadow,
  useGLTF
} from '@react-three/drei';
import * as THREE from 'three';
import { PointLightHelper, DirectionalLightHelper, Vector3 } from 'three';
import { ethers } from 'ethers';
// Removed problematic postprocessing imports

// Define types for 3D rendering
interface Position {
  x: number;
  y: number;
  z?: number;
}

interface Snake3DProps {
  snake: Position[];
  food: Position;
  gridSize: number;
  direction: string;
  score: number; // Score in wei (needs to be converted to MON for display)
  gameStatus: 'waiting' | 'inProgress' | 'finished';
  isCurrentPlayer?: boolean;
}

// Custom hook for grid cell highlighting
const useGridHighlight = (size: number, currentPosition: Position) => {
  const highlightPositions = useMemo(() => {
    const positions = [];
    // Add current row and column
    for (let i = 0; i < size; i++) {
      positions.push({ x: i, y: currentPosition.y, intensity: 0.2 });
      positions.push({ x: currentPosition.x, y: i, intensity: 0.2 });
    }
    return positions;
  }, [size, currentPosition.x, currentPosition.y]);
  
  return highlightPositions;
};

// Custom hook for grid cell highlighting
// Grid component to render the game board
const Grid: React.FC<{ 
  size: number,
  currentPosition?: Position, 
  highlightIntensity?: number 
}> = ({ size, currentPosition = { x: 0, y: 0 }, highlightIntensity = 0.2 }) => {
  const gridRef = useRef<THREE.Group>(null);
  const highlightMaterial = useRef(new THREE.MeshStandardMaterial({ 
    color: '#61DAFB', 
    transparent: true, 
    opacity: 0.3,
    emissive: '#61DAFB',
    emissiveIntensity: 0.3
  }));
  
  // Get grid highlight positions based on current snake head position
  const highlightPositions = useGridHighlight(size, currentPosition);
  
  return (
    <group ref={gridRef}>
      {/* Base platform with clean surface */}
      <mesh 
        receiveShadow 
        rotation-x={-Math.PI / 2} 
        position={[size / 2 - 0.5, -0.5, size / 2 - 0.5]}
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial 
          color="#111" 
          roughness={0.8} 
          metalness={0.2}
          emissive="#304050" 
          emissiveIntensity={0.05} // Subtle glow from moon reflection
        />
      </mesh>
      
      {/* Boundary Walls */}
      <group>
        {/* North wall */}
        <mesh 
          position={[size / 2 - 0.5, 0, -0.5]} 
          receiveShadow 
          castShadow
        >
          <boxGeometry args={[size, 1, 0.1]} />
          <meshStandardMaterial 
            color="#61DAFB" 
            transparent 
            opacity={0.2} 
            emissive="#61DAFB"
            emissiveIntensity={0.5}
          />
        </mesh>
        
        {/* South wall */}
        <mesh 
          position={[size / 2 - 0.5, 0, size - 0.5]} 
          receiveShadow
          castShadow
        >
          <boxGeometry args={[size, 1, 0.1]} />
          <meshStandardMaterial 
            color="#61DAFB" 
            transparent 
            opacity={0.2} 
            emissive="#61DAFB"
            emissiveIntensity={0.5}
          />
        </mesh>
        
        {/* West wall */}
        <mesh 
          position={[-0.5, 0, size / 2 - 0.5]} 
          receiveShadow
          castShadow
        >
          <boxGeometry args={[0.1, 1, size]} />
          <meshStandardMaterial 
            color="#61DAFB" 
            transparent 
            opacity={0.2} 
            emissive="#61DAFB"
            emissiveIntensity={0.5}
          />
        </mesh>
        
        {/* East wall */}
        <mesh 
          position={[size - 0.5, 0, size / 2 - 0.5]} 
          receiveShadow
          castShadow
        >
          <boxGeometry args={[0.1, 1, size]} />
          <meshStandardMaterial 
            color="#61DAFB" 
            transparent 
            opacity={0.2} 
            emissive="#61DAFB"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
      
      {/* Highlighted grid cells based on snake position */}
      {highlightPositions.map((pos, index) => (
        <mesh
          key={`highlight-${index}`}
          position={[pos.x, -0.47, pos.y]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.9, 0.9]} />
          <meshStandardMaterial 
            color="#61DAFB" 
            transparent 
            opacity={highlightIntensity * pos.intensity} 
            emissive="#61DAFB"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
      
      {/* Environment sparkles for ambience */}
      <Sparkles 
        count={50} 
        scale={size} 
        size={2} 
        speed={0.3} 
        opacity={0.2} 
        color="#61DAFB" 
        position={[size / 2 - 0.5, 2, size / 2 - 0.5]} 
      />
    </group>
  );
};

// Position interpolation hook for smooth movement
const usePositionInterpolation = (targetPosition: Position, speed: number = 0.1) => {
  const [currentPosition, setCurrentPosition] = useState<Position>({ ...targetPosition });
  const prevPosition = useRef<Position>({ ...targetPosition });
  
  useEffect(() => {
    prevPosition.current = { ...currentPosition };
  }, [currentPosition]);
  
  useFrame(() => {
    if (prevPosition.current.x !== targetPosition.x || 
        prevPosition.current.y !== targetPosition.y || 
        prevPosition.current.z !== targetPosition.z) {
      setCurrentPosition(prev => ({
        x: prev.x + (targetPosition.x - prev.x) * speed,
        y: prev.y + ((targetPosition.y ?? 0) - (prev.y ?? 0)) * speed,
        z: (prev.z ?? 0) + ((targetPosition.z ?? 0) - (prev.z ?? 0)) * speed,
      }));
    }
  });
  
  return currentPosition;
};

// Particle effect for snake movement
const SnakeTrail: React.FC<{ position: Position, color: string }> = ({ position, color }) => {
  return (
    <Sparkles
      count={15}
      scale={[0.5, 0.5, 0.5]}
      size={0.5}
      speed={0.3}
      position={[position.x, 0.1, position.y]}
      color={color}
      opacity={0.3}
    />
  );
};

// Snake segment component with interpolation
const SnakeSegment: React.FC<{ 
  position: Position; 
  isHead: boolean; 
  direction: string;
  isCurrentPlayer?: boolean;
}> = ({ position, isHead, direction, isCurrentPlayer = false }) => {
  // Use position interpolation for smooth movement
  const interpolatedPosition = usePositionInterpolation(position, 0.15);
  
  // Create ref for animations and material effects
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Apply different colors for head vs body and player vs opponent
  const segmentBaseColor = isCurrentPlayer 
    ? (isHead ? '#00e676' : '#00c853') 
    : (isHead ? '#ff5252' : '#d32f2f');
    
  // Create emissive color variation
  const emissiveColor = isCurrentPlayer 
    ? (isHead ? '#00a676' : '#007d33') 
    : (isHead ? '#b71c1c' : '#7f0000');
  
  // Calculate rotation based on direction for the head
  let rotationY = 0;
  if (isHead) {
    switch (direction) {
      case 'UP':
        rotationY = Math.PI;
        break;
      case 'DOWN':
        rotationY = 0;
        break;
      case 'LEFT':
        rotationY = Math.PI / 2;
        break;
      case 'RIGHT':
        rotationY = -Math.PI / 2;
        break;
    }
  }
  
  // Animation and effects
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth rotation interpolation for head
      if (isHead) {
        meshRef.current.rotation.y += (rotationY - meshRef.current.rotation.y) * 0.15;
        
        // Subtle bobbing for head
        meshRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        
        // Apply glow effects to head
        if (glowRef.current && glowRef.current.material instanceof THREE.MeshBasicMaterial) {
          glowRef.current.material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
      } else {
        // Subtle scale pulsing for body segments
        const scaleValue = 0.85 + Math.sin(state.clock.elapsedTime * 1.5 + position.x * 2 + position.y * 3) * 0.04;
        meshRef.current.scale.set(scaleValue, scaleValue, scaleValue);
      }
      
      // Update material effects
      if (materialRef.current) {
        // Pulse emissive intensity
        materialRef.current.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });
  
  return (
    <group position={[interpolatedPosition.x, 0, interpolatedPosition.y]}>
      {/* Snake trail effects when moving */}
      {!isHead && <SnakeTrail position={interpolatedPosition} color={isCurrentPlayer ? "#00e676" : "#ff5252"} />}
      
      {isHead ? (
        // Head segment
        <group>
          {/* Glow effect for head */}
          <mesh 
            ref={glowRef}
            scale={[1.05, 1.05, 1.05]}
          >
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshBasicMaterial 
              color={isCurrentPlayer ? "#00e676" : "#ff5252"} 
              transparent={true} 
              opacity={0.4} 
            />
          </mesh>
          
          {/* Main head mesh */}
          <mesh 
            ref={meshRef} 
            castShadow
            receiveShadow
            position={[0, 0.1, 0]}
          >
            <boxGeometry args={[0.85, 0.85, 0.85]} />
            <meshStandardMaterial 
              ref={materialRef}
              color={segmentBaseColor}
              emissive={emissiveColor}
              emissiveIntensity={0.3}
              roughness={0.4}
              metalness={0.5}
            />
            
            
            {/* Direction indicator on top */}
            <mesh position={[0, 0.43, 0]} rotation={[0, rotationY, 0]}>
              <coneGeometry args={[0.15, 0.3, 8]} />
              <meshStandardMaterial 
                color={segmentBaseColor} 
                emissive={emissiveColor}
                emissiveIntensity={0.5}
              />
            </mesh>
          </mesh>
        </group>
      ) : (
        // Body segment with effects
        <group>
          {/* Subtle glow effect */}
          <mesh scale={[1.02, 1.02, 1.02]}>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshBasicMaterial 
              color={segmentBaseColor} 
              transparent={true} 
              opacity={0.2} 
            />
          </mesh>
          
          {/* Main body mesh */}
          <mesh 
            ref={meshRef} 
            castShadow
            receiveShadow
            position={[0, 0.1, 0]}
          >
            <boxGeometry args={[0.75, 0.75, 0.75]} />
            <meshStandardMaterial 
              ref={materialRef}
              color={segmentBaseColor}
              emissive={emissiveColor}
              emissiveIntensity={0.2}
              roughness={0.6}
              metalness={0.3}
            />
          </mesh>
          
          {/* Add pointlight for subtle illumination from each segment */}
          <pointLight 
            color={segmentBaseColor} 
            intensity={0.1} 
            distance={1.5} 
            position={[0, 0.2, 0]} 
          />
        </group>
      )}
      
      {/* Shadow underneath the segment */}
      <Shadow 
        position={[0, -0.47, 0]} 
        scale={[0.8, 0.8, 1]} 
        color="black" 
        opacity={0.2} 
        rotation={[-Math.PI / 2, 0, 0]} 
      />
    </group>
  );
};

// Food component with animation and particle effects
const Food: React.FC<{ position: Position }> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Use position interpolation for smooth movement
  const interpolatedPosition = usePositionInterpolation(position, 0.1);
  
  // Keep track of last position for particle effects
  const lastPosition = useRef<Position>(position);
  const [showParticles, setShowParticles] = useState(false);
  
  // Check if food position has changed to trigger particles
  useEffect(() => {
    if (lastPosition.current.x !== position.x || lastPosition.current.y !== position.y) {
      setShowParticles(true);
      // Hide particles after animation completes
      const timer = setTimeout(() => setShowParticles(false), 1000);
      lastPosition.current = { ...position };
      return () => clearTimeout(timer);
    }
  }, [position]);
  
  // Enhanced animation for the food
  useFrame((state) => {
    if (meshRef.current) {
      // Spinning rotation
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // Floating animation
      meshRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
    
    if (glowRef.current && glowRef.current.material instanceof THREE.MeshBasicMaterial) {
      glowRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
    
    if (materialRef.current) {
      // Color cycling effect
      materialRef.current.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });
  
  return (
    <group position={[interpolatedPosition.x, 0, interpolatedPosition.y]}>
      {/* Glow effect */}
      <mesh 
        ref={glowRef}
        position={[0, 0.2, 0]}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial 
          color="red" 
          transparent={true} 
          opacity={0.3} 
        />
      </mesh>
      
      {/* Main food object */}
      <mesh 
        ref={meshRef} 
        castShadow
        position={[0, 0.2, 0]}
      >
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          ref={materialRef}
          color="#ff3333" 
          emissive="red" 
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.6}
        />
        
        {/* Stem */}
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshStandardMaterial color="#2e7d32" />
        </mesh>
        
        {/* Leaf */}
        <mesh position={[0.05, 0.5, 0]} rotation={[0, 0, 0.6]}>
          <sphereGeometry args={[0.1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#388e3c" />
        </mesh>
      </mesh>
      
      {/* Point light for food glow */}
      <pointLight 
        color="red" 
        intensity={0.6} 
        distance={2.5} 
        position={[0, 0.2, 0]}
      />
      
      {/* Shadow underneath */}
      <Shadow 
        position={[0, -0.47, 0]} 
        scale={[0.7, 0.7, 1]} 
        color="black" 
        opacity={0.3} 
        rotation={[-Math.PI / 2, 0, 0]} 
      />
      
      {/* Particle effects when food appears */}
      {showParticles && (
        <Sparkles
          count={100}
          scale={[1, 1, 1]}
          size={0.6}
          speed={0.7}
          position={[0, 0.3, 0]}
          color="red"
        />
      )}
    </group>
  );
};

// Moon component that orbits the game board
const Moon: React.FC<{ gridSize: number }> = ({ gridSize }) => {
  const moonRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const craterMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const moonMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Set up moon orbit animation
  useFrame((state) => {
    if (moonRef.current) {
      // Create an orbit path
      const time = state.clock.getElapsedTime() * 0.1;
      
      // Define orbit radius relative to grid size
      const orbitRadius = gridSize * 1.5;
      
      // Set position on orbital path
      moonRef.current.position.x = Math.sin(time) * orbitRadius;
      moonRef.current.position.z = Math.cos(time) * orbitRadius;
      
      // Slowly rotate the moon
      if (moonMeshRef.current) {
        moonMeshRef.current.rotation.y += 0.001;
      }
      
      // Pulse the glow effect
      if (glowRef.current && glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        glowRef.current.material.opacity = 0.4 + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
      }
      
      // Animate moon surface materials for subtle visual effects
      if (moonMaterialRef.current) {
        // Subtle emissive pulsing
        moonMaterialRef.current.emissiveIntensity = 0.15 + Math.sin(state.clock.getElapsedTime() * 0.2) * 0.05;
      }
    }
  });
  
  // Create noise for crater generation
  const generateNoisePattern = (size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Fill with base color
      context.fillStyle = '#e0e0e0';
      context.fillRect(0, 0, size, size);
      
      // Add various sized craters
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = 1 + Math.random() * 15;
        
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        const shade = 180 + Math.floor(Math.random() * 70);
        gradient.addColorStop(0, `rgb(${shade}, ${shade}, ${shade})`);
        gradient.addColorStop(1, '#e0e0e0');
        
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.fill();
      }
    }
    
    return new THREE.CanvasTexture(canvas);
  };
  
  // Create moon texture at mount
  const moonDisplacementTexture = useMemo(() => generateNoisePattern(1024), []);
  
  return (
    <group ref={moonRef} position={[0, gridSize * 1.2, 0]}>
      {/* Atmosphere glow effect */}
      <mesh ref={glowRef} scale={[5.5, 5.5, 5.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color="#b4c7e0" 
          transparent={true} 
          opacity={0.4} 
        />
      </mesh>
      
      {/* Moon surface with procedural material */}
      <mesh 
        ref={moonMeshRef} 
        castShadow 
        receiveShadow
        scale={[5, 5, 5]}
      >
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial 
          ref={moonMaterialRef}
          color="#e0e0e0"
          roughness={0.9} 
          metalness={0.2}
          emissive="#304878"
          emissiveIntensity={0.15}
          displacementMap={moonDisplacementTexture}
          displacementScale={0.05}
          bumpMap={moonDisplacementTexture}
          bumpScale={0.05}
        />
      </mesh>
      
      {/* Add craters for more detail */}
      <mesh scale={[5.05, 5.05, 5.05]} rotation={[Math.PI * 0.2, Math.PI * 0.3, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial 
          ref={craterMaterialRef}
          color="#c0c0c0"
          roughness={1.0}
          metalness={0.1}
          transparent={true}
          opacity={0.4}
          wireframe={false}
          flatShading={true}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Moon light - soft blue glow */}
      <pointLight 
        color="#b4c7e0" 
        intensity={2} 
        distance={gridSize * 4} 
        castShadow
        shadow-camera-far={100}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-radius={8}
        shadow-bias={-0.0001}
      />
      
      {/* Sparkles around the moon for additional effect */}
      <Sparkles 
        count={50} 
        scale={[10, 10, 10]} 
        size={1} 
        speed={0.3} 
        opacity={0.4} 
        color="#ffffff" 
      />
    </group>
  );
};

// Lighting setup component
const SceneLighting: React.FC = () => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  
  // Helpers for development (uncomment to debug)
  // useHelper(directionalLightRef, DirectionalLightHelper, 1, 'red');
  // useHelper(pointLightRef, PointLightHelper, 0.5, 'blue');
  
  return (
    <>
      {/* Reduced ambient light intensity to make moon light more noticeable */}
      <ambientLight intensity={0.2} color="#203040" />
      
      {/* Main directional light (sun) */}
      <directionalLight
        ref={directionalLightRef}
        position={[10, 10, 10]}
        intensity={0.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Overhead light, intensity reduced to balance with moon light */}
      <pointLight 
        ref={pointLightRef}
        position={[0, 8, 0]} 
        intensity={0.3} 
        castShadow 
      />
      
      {/* Moon-reflected ambient light - subtle blue */}
      <hemisphereLight 
        color="#b4c7e0" 
        groundColor="#000000" 
        intensity={0.2} 
      />
    </>
  );
};

// Camera controls
interface CameraControllerProps {
  headPosition: Position;
  snake: Position[];
  direction: string;
  gridSize: number;
  gameStatus: 'waiting' | 'inProgress' | 'finished';
}

const CameraController: React.FC<CameraControllerProps> = ({ 
  headPosition,
  snake,
  direction,
  gridSize,
  gameStatus
}) => {
  const { camera } = useThree();
  const cameraPositionRef = useRef<{ x: number; y: number; z: number }>({ x: 15, y: 15, z: 20 });
  const lookAtPositionRef = useRef<{ x: number; y: number; z: number }>({ x: 15, y: 0, z: 15 });
  
  // Camera interpolation speed - higher values are more responsive but less smooth
  const cameraLerpSpeed = 0.05;
  
  // Update camera settings for a better third-person view
  const cameraHeight = 1.5; // Slightly higher for better view
  const cameraDistance =10; // Increased distance to see more of the snake
  
  // Initialize camera position on mount
  useEffect(() => {
    // Initial camera position to get a good overview of the board
    camera.position.set(gridSize / 2, cameraHeight + 5, gridSize + 5);
    camera.lookAt(gridSize / 2, 0, gridSize / 2);
  }, [camera, gridSize, cameraHeight]);
  
  useFrame(() => {
    if (gameStatus !== 'inProgress') {
      // Use default overview position when not in active game
      const targetPosition = { 
        x: gridSize / 2, 
        y: cameraHeight + 5, 
        z: gridSize + 5 
      };
      const targetLookAt = { 
        x: gridSize / 2, 
        y: 0, 
        z: gridSize / 2 
      };
      
      // Smooth interpolation to default position
      cameraPositionRef.current = {
        x: cameraPositionRef.current.x + (targetPosition.x - cameraPositionRef.current.x) * cameraLerpSpeed,
        y: cameraPositionRef.current.y + (targetPosition.y - cameraPositionRef.current.y) * cameraLerpSpeed,
        z: cameraPositionRef.current.z + (targetPosition.z - cameraPositionRef.current.z) * cameraLerpSpeed
      };
      
      lookAtPositionRef.current = {
        x: lookAtPositionRef.current.x + (targetLookAt.x - lookAtPositionRef.current.x) * cameraLerpSpeed * 1.5,
        y: lookAtPositionRef.current.y + (targetLookAt.y - lookAtPositionRef.current.y) * cameraLerpSpeed * 1.5,
        z: lookAtPositionRef.current.z + (targetLookAt.z - lookAtPositionRef.current.z) * cameraLerpSpeed * 1.5
      };
    } else {
      // Calculate camera position based on direction
      let targetPosition = { x: 0, y: 0, z: 0 };
      let targetLookAt = { x: 0, y: 0, z: 0 };
      
      // Place camera behind snake based on direction
      switch (direction.toUpperCase()) {
        case 'UP':
          targetPosition = {
            x: snake[0].x,
            y: cameraHeight,
            z: snake[0].y + cameraDistance // Position camera far behind (south) when moving up
          };
          targetLookAt = {
            x: snake[0].x,
            y: 10,
            z: snake[0].y - 10 // Look ahead in direction of movement (north)
          };
          break;
        case 'DOWN':
          targetPosition = {
            x: snake[0].x +10,
            y: cameraHeight+10,
            z: snake[0].y - cameraDistance // Position camera far behind (north) when moving down
          };
          targetLookAt = {
            x: snake[0].x,
            y: 10,
            z: snake[0].y + 30 // Look ahead in direction of movement (south)
          };
          break;
        case 'RIGHT':
          targetPosition = {
            x: snake[0].x - cameraDistance + 10,                  
            y: cameraHeight + 12,
            z: snake[0].y +20
          };
          targetLookAt = {
            x: snake[0].x + 1, // Look ahead in direction of movement (east)
            y: 10,
            z: snake[0].y + 1
          };
          break;
        case 'LEFT':
          targetPosition = {
            x: snake[0].x + cameraDistance, // Position camera far behind (east) when moving left
            y: cameraHeight,
            z: snake[0].y
          };
          targetLookAt = {
            x: snake[0].x - 10, // Look ahead in direction of movement (west)
            y: 1,
            z: snake[0].y
          };
          break;
      }
      
      // Apply smooth interpolation
      cameraPositionRef.current = {
        x: cameraPositionRef.current.x + (targetPosition.x - cameraPositionRef.current.x) * cameraLerpSpeed,
        y: cameraPositionRef.current.y + (targetPosition.y - cameraPositionRef.current.y) * cameraLerpSpeed,
        z: cameraPositionRef.current.z + (targetPosition.z - cameraPositionRef.current.z) * cameraLerpSpeed
      };
      
      lookAtPositionRef.current = {
        x: lookAtPositionRef.current.x + (targetLookAt.x - lookAtPositionRef.current.x) * cameraLerpSpeed * 1.5,
        y: lookAtPositionRef.current.y + (targetLookAt.y - lookAtPositionRef.current.y) * cameraLerpSpeed * 1.5,
        z: lookAtPositionRef.current.z + (targetLookAt.z - lookAtPositionRef.current.z) * cameraLerpSpeed * 1.5
      };
    }
    
    // Update camera position and look-at target
    camera.position.set(
      cameraPositionRef.current.x, 
      cameraPositionRef.current.y, 
      cameraPositionRef.current.z
    );
    
    camera.lookAt(
      lookAtPositionRef.current.x,
      lookAtPositionRef.current.y,
      lookAtPositionRef.current.z
    );
  });
  
  return (
    <OrbitControls 
      enablePan={false}
      enableZoom={true}
      enabled={gameStatus !== 'inProgress'} // Disable orbit controls during gameplay for the third-person view
      minDistance={10}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
};

// Convert wei to MON using ethers.js utility for accurate decimal handling
const weiToMON = (weiValue: number): string => {
  try {
    // Handle NaN or negative values
    if (isNaN(weiValue) || weiValue < 0) return '0.00';
    
    // Convert number to BigNumber (ethers.js expects a string or BigNumber)
    const weiBigNumber = ethers.BigNumber.from(String(Math.floor(weiValue)));
    
    // Format wei to ETH/MON (1 MON = 10^18 wei)
    return ethers.utils.formatEther(weiBigNumber);
  } catch (error) {
    console.error('Error converting wei to MON:', error);
    return '0.00';
  }
};
// Main game scene component
const GameScene: React.FC<Snake3DProps> = ({ 
  snake, 
  food, 
  gridSize, 
  direction,
  score,
  gameStatus,
  isCurrentPlayer = true
}) => {
  // Get current head position for grid highlighting
  const headPosition = snake.length > 0 ? snake[0] : { x: 0, y: 0 };
  // Convert score from wei to MON for display
  const monValue = weiToMON(score);
  const formattedMON = parseFloat(monValue).toFixed(6);
  
  
  return (
    <>
      {/* Camera and lighting */}
      <CameraController 
        headPosition={headPosition}
        snake={snake}
        direction={direction}
        gridSize={gridSize}
        gameStatus={gameStatus}
      />
      <SceneLighting />
      <Environment preset="night" background={false} />
      
      {/* Moon that orbits the game board */}
      <Moon gridSize={gridSize} />
      
      {/* Game board */}
      <Grid 
        size={gridSize} 
        currentPosition={headPosition}
        highlightIntensity={0.2}
      />
      {/* Snake segments */}
      {snake.map((segment, index) => (
        <SnakeSegment 
          key={`snake-segment-${index}`}
          position={segment}
          isHead={index === 0}
          direction={direction}
          isCurrentPlayer={isCurrentPlayer}
        />
      ))}
      
      {/* Food */}
      <Food position={food} />
      
      {/* Score display */}
      <Text
        position={[gridSize / 2, 5, gridSize / 2]}
        color="white"
        fontSize={1.5}
        anchorX="center"
        anchorY="middle"
        castShadow
        fillOpacity={1}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {`Total MON: ${formattedMON}`}
      </Text>
      
      {gameStatus === 'finished' && (
        <>
          <Text
            position={[gridSize / 2, 3, gridSize / 2]}
            color="#ff5252"
            fontSize={2}
            anchorX="center"
            anchorY="middle"
            castShadow
            fillOpacity={1}
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            Game Over!
          </Text>
          
          {/* Add game over particles */}
          <Sparkles 
            count={100} 
            scale={[gridSize, 5, gridSize]} 
            size={1} 
            speed={0.5} 
            color="#ff5252" 
            position={[gridSize / 2 - 0.5, 2, gridSize / 2 - 0.5]} 
          />
        </>
      )}
    </>
  );
};

// Main 3D Snake component
const Snake3D: React.FC<Snake3DProps> = (props) => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas shadows>
        <fog attach="fog" args={['#030511', 25, 80]} />
        <GameScene {...props} />
      </Canvas>
    </div>
  );
}

declare module '*.glb' {
  const content: string;
  export default content;
}

export default Snake3D;
