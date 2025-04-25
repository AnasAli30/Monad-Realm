# PVP Snake Game with 2D-3D Mixture UI

This is a multiplayer snake game with an enhanced 2D-3D mixture UI that provides an immersive gaming experience while maintaining the classic snake game mechanics.

## Features

### 3D View Controls
- Toggle between 2D and 3D views with a simple button click
- Manual rotation through mouse drag interaction
- Auto-rotation option for hands-free 3D viewing
- Smooth transitions between different view modes

### Enhanced 3D Depth Effects
- Proper perspective and 3D transformations
- Dynamic shadows and lighting effects
- Depth-based layering for game elements (snake, food, grid)
- Direction-based rotation for snake segments

### Particle and Visual Effects
- 3D particle effects when scoring points
- Enhanced confetti with 3D transformations
- Smooth transitions for game state changes
- Dynamic lighting based on movement

### Responsive Design
- Adaptive 3D effects based on screen size
- Properly scaled for different devices
- Optimized performance for various hardware

## Future Enhancement Opportunities
1. Touch controls for mobile 3D rotation
2. Varying depths for different food types
3. Power-up effects with 3D animations
4. Optional performance mode for lower-end devices

## Implementation Details
The 2D-3D mixture UI is implemented using CSS 3D transforms and React state management, with no changes to the server-side game logic. The implementation leverages CSS variables for easy customization and styled-components for component-based styling.

The UI allows players to seamlessly switch between traditional 2D gameplay and an enhanced 3D perspective, providing visual depth while maintaining the same game mechanics and controls.

# MonadRealm

A blockchain-powered gaming platform on the Monad testnet where players can compete in various games and earn MON tokens.

## About MonadRealm

MonadRealm is a comprehensive gaming platform that combines blockchain technology with classic games. Currently featuring Snake PvP, with plans to add more games like Ludo and other classic games. Players can compete against each other, place bets using MON tokens, and win rewards.

## Features

- **Multi-Game Platform**: Currently featuring Snake PvP, with more games coming soon
- **Blockchain Integration**: Built on the Monad testnet
- **Token Rewards**: Earn MON tokens by winning games
- **Real-time Gameplay**: Using Socket.io for seamless multiplayer experience
- **Betting System**: Place bets using MON tokens
- **Wallet Integration**: Connect with MetaMask

## Prerequisites

- Node.js (v14 or higher)
- MetaMask browser extension
- MON tokens on the Monad testnet

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   cd server
   npm install
   npm run dev
   ```
4. Start the client:
   ```
   npm run dev
   ```

## Blockchain Integration

### Smart Contract

The platform uses smart contracts deployed on the Monad testnet to handle:
- Room creation with betting
- Player joining with betting
- Game ending and prize distribution
- Player balance management

### Wallet Connection

1. Install MetaMask browser extension
2. Add the Monad testnet to MetaMask:
   - Network Name: Monad Testnet
   - RPC URL: https://testnet-rpc.monad.xyz
   - Chain ID: 0x279F
   - Currency Symbol: MON
   - Block Explorer URL: https://testnet-explorer.monad.xyz

### Getting MON Tokens

To get MON tokens for testing:
1. Visit the Monad testnet faucet
2. Connect your wallet
3. Request test tokens

## How to Play

1. Connect your wallet using the WalletConnect component
2. Create a room and set your bet amount in MON tokens
3. Share the room ID with other players
4. Players can join the room by entering the room ID and bet amount
5. Once all players have placed their bets, the game starts
6. The winner receives the entire pot of MON tokens

## Current Games

### Snake PvP
- Classic snake gameplay with multiplayer competition
- Real-time movement and collision detection
- Collect food to grow your snake and increase your score
- Last player standing wins the pot

### Coming Soon
- More classic games with blockchain rewards

## Development

### Smart Contract Deployment

To deploy the smart contract:
1. Install Hardhat: `npm install --save-dev hardhat`
2. Configure Hardhat for Monad testnet
3. Deploy the contract: `npx hardhat run scripts/deploy.js --network monadTestnet`
4. Update the contract address in `src/config/blockchain.ts`

## License

MIT 
