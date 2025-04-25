// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MonadRealm is ERC721, Ownable {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    Counters.Counter private _tokenIdCounter;
    
    // Constants
    uint256 public constant MAX_SUPPLY = 1000;
    string private _baseTokenURI;
    address private _signerAddress;

    // Mapping to track minted addresses
    mapping(address => bool) private _hasMinted;

    // Events
    event BaseURIUpdated(string newBaseURI);
    event SignerAddressUpdated(address newSignerAddress);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        address signerAddress
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
        _signerAddress = signerAddress;
    }

    // Modifier to check if address has already minted
    modifier hasNotMinted() {
        require(!_hasMinted[msg.sender], "Address has already minted");
        _;
    }

    // Function to verify the signature
    function verifySignature(
        address user,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(user));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        return ethSignedMessageHash.recover(signature) == _signerAddress;
    }

    // Updated mint function with one-per-wallet check
    function mint(bytes memory signature) external hasNotMinted {
        require(verifySignature(msg.sender, signature), "Invalid signature");
        require(_tokenIdCounter.current() < MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _hasMinted[msg.sender] = true;
        _safeMint(msg.sender, tokenId);
    }

    // Function to check if an address has minted
    function hasAddressMinted(address user) public view returns (bool) {
        return _hasMinted[user];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        try this.ownerOf(tokenId) returns (address) {
            return _baseURI();
        } catch {
            revert("ERC721Metadata: URI query for nonexistent token");
        }
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setSignerAddress(address newSignerAddress) external onlyOwner {
        _signerAddress = newSignerAddress;
        emit SignerAddressUpdated(newSignerAddress);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function getSignerAddress() external view returns (address) {
        return _signerAddress;
    }
} 