import React, { useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import  CONTRACT_ABI  from '../utils/contractAbi.json';
import { encodeFuseKey } from '../utils/fuseEncoder';

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = '0x3543ab02430F5411775afd00310565305716b0e5'; // Add your contract address here

const MintContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(97, 218, 251, 0.2);
`;

const MintButton = styled.button`
  padding: 0.5rem 1rem;
  background: linear-gradient(45deg, #61dafb, #2196f3);
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

interface NFTMintProps {
  ethereumAddress: string;
  isBlockchainConnected: boolean;
}

const NFTMint: React.FC<NFTMintProps> = ({ ethereumAddress, isBlockchainConnected }) => {
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!isBlockchainConnected || !ethereumAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
     
      setIsMinting(true);

      // Encode the fuse key with the user's address
      const encodedFuseKey = encodeFuseKey(ethereumAddress);

      // First, get the signature from the server
      const signatureResponse = await fetch('http://localhost:3001/api/generate-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: ethereumAddress,
          encodedFuseKey,
        }),
      });

      const signatureData = await signatureResponse.json();

      if (!signatureResponse.ok) {
        throw new Error(signatureData.error || 'Failed to get signature');
      }

      // Get the provider and signer from the user's wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get the contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call the mint function directly from the user's wallet
      const tx = await contract.mint(signatureData.signature);
      
      // Wait for the transaction to be mined
      await tx.wait();

      toast.success('NFT minted successfully!', {
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      toast.error(error.message || 'Failed to mint NFT');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <MintContainer>
      <h3>Mint Your Game NFT</h3>
      <MintButton
        onClick={handleMint}
        disabled={!isBlockchainConnected || isMinting}
      >
        {isMinting ? 'Minting...' : 'Mint NFT'}
      </MintButton>
    </MintContainer>
  );
};

export default NFTMint; 