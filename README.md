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
