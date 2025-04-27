# MonadRealm - Blockchain Gaming Platform

MonadRealm is a blockchain-powered gaming platform on the Monad testnet where players can compete in various games and earn MON tokens. Currently featuring Snake PvP as its flagship game, with plans to expand to more classic games.

## Project Structure

```
monad-realm/
├── client/           # Frontend React application
├── server/           # Node.js backend server
├── contracts/        # Smart contracts for blockchain integration
│   ├── MonadRealm.sol    # Main platform contract
│   └── SnakeGame.sol     # Snake game implementation
├── src/             # Main source code
├── public/          # Static assets
└── package.json     # Project dependencies
```

## Platform Features

### Gaming Platform
- Multi-game support (currently featuring Snake PvP)
- Real-time multiplayer gameplay
- Tournament and competitive modes
- Player ranking and statistics

### Current Game: Snake PvP
- Multiplayer snake gameplay with real-time synchronization
- 2D-3D hybrid view with smooth transitions
- Dynamic 3D effects and particle systems
- Responsive design for various screen sizes

### Blockchain Integration
- Smart contract-based room creation and betting
- MON token rewards for winners
- MetaMask wallet integration
- Monad testnet deployment

### Technical Features
- React with TypeScript for frontend
- Three.js for 3D rendering
- Socket.io for real-time multiplayer
- Ethers.js for blockchain interaction
- Styled-components for UI styling

## Prerequisites

- Node.js (v14 or higher)
- MetaMask browser extension
- MON tokens on the Monad testnet

## Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd monad-realm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. In a separate terminal, start the backend server:
   ```bash
   cd server
   npm install
   npm run dev
   ```

## Blockchain Setup

### Smart Contracts
The platform uses two main smart contracts:
- `MonadRealm.sol`: Main platform contract for room management, betting, and game coordination
- `SnakeGame.sol`: Game-specific contract for snake gameplay logic and rewards

### Wallet Configuration
1. Install MetaMask browser extension
2. Add the Monad testnet:
   - Network Name: Monad Testnet
   - RPC URL: https://testnet-rpc.monad.xyz
   - Chain ID: 0x279F
   - Currency Symbol: MON
   - Block Explorer URL: https://testnet-explorer.monad.xyz

### Getting Test Tokens
1. Visit the Monad testnet faucet
2. Connect your wallet
3. Request test tokens

## How to Play

1. Connect your MetaMask wallet to MonadRealm
2. Create a game room and set your bet amount in MON tokens
3. Share the room ID with other players
4. Players join the room and place their bets
5. Game starts automatically when all players are ready
6. Last player standing wins the pot

## Development

### Frontend Development
The platform frontend is built with:
- React 19
- Three.js for 3D graphics
- React Three Fiber for React integration
- Styled-components for styling

### Backend Development
The platform backend uses:
- Node.js
- Socket.io for real-time communication
- Express for API endpoints

### Smart Contract Development
To deploy platform contracts:
1. Install Hardhat: `npm install --save-dev hardhat`
2. Configure Hardhat for Monad testnet
3. Deploy contracts: `npx hardhat run scripts/deploy.js --network monadTestnet`

## Future Plans
- Integration of additional classic games
- Tournament system with larger prize pools
- Player ranking and achievement system
- Cross-game rewards and achievements

## License

MIT 
