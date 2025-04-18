import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();


const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || 'your-server-private-key';
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
export const serverWallet = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);

// Contract configuration
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'your-contract-address';
export const CONTRACT_ABI = [
  // Game functions
  "function endGame(string memory roomId, address winner) public",
  "function getRoomInfo(string memory roomId) public view returns (bool isActive, uint256 betAmount, address creator, address[] memory players)",
  
  // Player balance functions
  "function depositToPlayer(address _player, uint256 _amount, bool _isReward) external payable",
  "function depositToMultiplePlayers(address[] calldata _players, uint256[] calldata _amounts) external payable",
  "function withdraw() external",
  "function getPlayerBalance(address _player) external view returns (uint256)",
  
  // Events
  "event SinglePlayerReward(address player, uint256 amount)",
  "event Withdrawn(address player, uint256 amount)"
]; 