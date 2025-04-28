import { ethers } from 'ethers';

declare global {
  interface Window {
    readonly ethereum: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    }
  }
}

// Monad testnet configuration
export const MONAD_TESTNET = {
  chainId: '0x279F', // Replace with actual Monad testnet chain ID
  chainName: 'Monad Testnet',
  rpcUrls: ['https://monad-api.blockvision.org/testnet/api'], // Replace with actual Monad testnet RPC URL
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18
  },
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz'] // Replace with actual Monad testnet explorer URL
};

// Contract address - replace with your deployed contract address
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

// Contract ABI - this will be generated when you compile the contract
export const CONTRACT_ABI = [
  "function createRoom(string memory _roomId, uint256 _betAmount) external payable",
  "function joinRoom(string memory _roomId) external payable",
  "function endGame(string memory _roomId, address _winner) external",
  "function withdraw() external",
  "function getRoomInfo(string memory _roomId) external view returns (string memory roomId, uint256 betAmount, uint256 potAmount, uint256 playerCount, bool isActive, address winner)",
  "function getPlayerBalance(address _player) external view returns (uint256)",
  "event RoomCreated(string roomId, uint256 betAmount)",
  "event PlayerJoined(string roomId, address player, uint256 betAmount)",
  "event GameEnded(string roomId, address winner, uint256 prize)",
  "event Withdrawn(address player, uint256 amount)"
];

// Function to check if MetaMask is installed
export const checkIfWalletIsInstalled = () => {
  return typeof window !== 'undefined' && window.ethereum !== undefined;
};

// Function to request account access
export const requestAccount = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0];
  } catch (error) {
    console.error('Error requesting account access:', error);
    throw error;
  }
};

// Function to add Monad testnet to MetaMask
export const addMonadTestnetToMetaMask = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: MONAD_TESTNET.chainId,
          chainName: MONAD_TESTNET.chainName,
          rpcUrls: MONAD_TESTNET.rpcUrls,
          nativeCurrency: MONAD_TESTNET.nativeCurrency,
          blockExplorerUrls: MONAD_TESTNET.blockExplorerUrls
        }
      ]
    });
  } catch (error) {
    console.error('Error adding Monad testnet to MetaMask:', error);
    throw error;
  }
};

// Function to switch to Monad testnet
export const switchToMonadTestnet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_TESTNET.chainId }]
    });
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      await addMonadTestnetToMetaMask();
    } else {
      console.error('Error switching to Monad testnet:', error);
      throw error;
    }
  }
};

// Function to get the contract instance
export const getContract = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

// Function to get the provider instance
export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return new ethers.providers.Web3Provider(window.ethereum);
};

// Function to get the signer instance
export const getSigner = () => {
  const provider = getProvider();
  return provider.getSigner();
};

// Function to get the current account
export const getCurrentAccount = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  return accounts[0];
};

// Function to get the current balance
export const getBalance = async (address: string) => {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return ethers.utils.formatEther(balance);
}; 