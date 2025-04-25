import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { ethers } from 'ethers';
import CONTRACT_ABI from '../utils/contractAbi.json';
import { toast } from 'react-hot-toast';
import { encodeFuseKey } from '../utils/fuseEncoder';

const CONTRACT_ADDRESS = '0x3543ab02430F5411775afd00310565305716b0e5';

interface NFTPassDisplayProps {
  ethereumAddress: string;
  onNFTStatusChange: (hasNFT: boolean) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 2rem;
  gap: 2rem;
  width: 110%;
  max-width: 600px;
`;

const NFTImage = styled.img`
  width: 300px;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
//   margin-bottom: 1rem;
`;

const InfoContainer = styled.div`
  text-align: center;
  color: white;
  width: 100%;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  background: rgba(97, 218, 251, 0.1);
  border-radius: 10px;
  padding: 3px;
  margin: 1.5rem 0;
  border: 1px solid rgba(97, 218, 251, 0.2);
  position: relative;
`;

const ProgressText = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  z-index: 2;
`;

const ProgressBarFill = styled.div<{ progress: number }>`
  height: 20px;
  width: ${props => props.progress}%;
  background: linear-gradient(90deg, #61dafb, #2196f3);
  border-radius: 8px;
  transition: width 0.5s ease-in-out;
  position: relative;
`;

const SupplyInfo = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin: 0.5rem 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
`;

const SupplyLabel = styled.span`
  color: #61dafb;
  font-weight: 600;
`;

const SupplyValue = styled.span`
  color: white;
`;

const MintButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(45deg, #61dafb, #2196f3);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
  margin-top: 1rem;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3);
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
    opacity: 0.7;
  }
`;

const Description = styled.p`
  font-size: 1.1rem;
  line-height: 1.5;
  font-weight: 600;
  margin: 1rem 0;

  color: rgba(237, 245, 17, 0.82);
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  padding: 2rem;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(97, 218, 251, 0.1);
  border-left: 4px solid #61dafb;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  color: #61dafb;
  font-size: 1.1rem;
  text-align: center;
  margin-top: 1rem;
`;

const NFTPassDisplay: React.FC<NFTPassDisplayProps> = ({ ethereumAddress, onNFTStatusChange }) => {
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [mintedSupply, setMintedSupply] = useState<number>(0);
  const [isMinting, setIsMinting] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    checkNFTStatus();
    fetchSupplyInfo();
  }, [ethereumAddress]);

  const checkNFTStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const balance = await contract.balanceOf(ethereumAddress);
      const hasNFT = balance.toNumber() > 0;
      setHasNFT(hasNFT);
      onNFTStatusChange(hasNFT);
    } catch (error) {
      console.error('Error checking NFT status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const fetchSupplyInfo = async () => {
    try {
      setIsLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const total = await contract.MAX_SUPPLY();
      const minted = await contract.getCurrentTokenId();
      setTotalSupply(total.toNumber());
      setMintedSupply(minted.toNumber());
    } catch (error) {
      console.error('Error fetching supply info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!ethereumAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsMinting(true);
      const encodedFuseKey = encodeFuseKey(ethereumAddress);

      // Get the signature from the server
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

      // Get the provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Mint the NFT
      const tx = await contract.mint(signatureData.signature);
      await tx.wait();

      toast.success('NFT minted successfully!');
      checkNFTStatus();
      fetchSupplyInfo();
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      toast.error(error.message || 'Failed to mint NFT');
    } finally {
      setIsMinting(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <LoaderContainer>
        <Spinner />
        <LoadingText>Checking NFT status...</LoadingText>
      </LoaderContainer>
    );
  }

  return (
    <Container>
      <NFTImage src="/images/nft-pass.jpeg" alt="Game Pass NFT" />
      <InfoContainer>
        <Description>
          Mint your Monad Realm Game Pass NFT to access the full game experience including PvP mode and rewards.
        </Description>
        {isLoading ? (
          <LoaderContainer>
            <Spinner />
            <LoadingText>Loading supply info...</LoadingText>
          </LoaderContainer>
        ) : (
          <>
            <SupplyInfo>
              <div>
                <SupplyLabel></SupplyLabel>
                <SupplyValue>{mintedSupply}/{totalSupply}</SupplyValue>
              </div>
            </SupplyInfo>
            <ProgressBarContainer>
              <ProgressText>
                {totalSupply > 0 ? (mintedSupply / totalSupply * 100).toFixed(1) : 0}%
              </ProgressText>
              <ProgressBarFill 
                progress={totalSupply > 0 ? (mintedSupply / totalSupply) * 100 : 0} 
              />
            </ProgressBarContainer>
          </>
        )}
        {!hasNFT && (
          <MintButton onClick={handleMint} disabled={isMinting || isLoading}>
            {isMinting ? 'Minting...' : 'Mint Game Pass NFT'}
          </MintButton>
        )}
      </InfoContainer>
    </Container>
  );
};

export default NFTPassDisplay; 