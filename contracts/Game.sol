// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Game {
    struct Room {
        string roomId;
        uint256 betAmount;
        uint256 potAmount;
        address[] players;
        bool isActive;
        address winner;
    }
    
    mapping(string => Room) public rooms;
    mapping(address => uint256) public playerBalances;
    
    event RoomCreated(string roomId, uint256 betAmount);
    event PlayerJoined(string roomId, address player, uint256 betAmount);
    event GameEnded(string roomId, address winner, uint256 prize);
    event Withdrawn(address player, uint256 amount);
    event SinglePlayerReward(address player, uint256 amount);
    
    function createRoom(string memory _roomId, uint256 _betAmount) external payable {
        require(msg.value == _betAmount, "Incorrect bet amount sent");
        require(!rooms[_roomId].isActive, "Room already exists");
        
        address[] memory emptyPlayers = new address[](0);
        rooms[_roomId] = Room({
            roomId: _roomId,
            betAmount: _betAmount,
            potAmount: _betAmount,
            players: emptyPlayers,
            isActive: true,
            winner: address(0)
        });
        
        rooms[_roomId].players.push(msg.sender);
        playerBalances[msg.sender] += _betAmount;
        
        emit RoomCreated(_roomId, _betAmount);
    }
    
    function joinRoom(string memory _roomId) external payable {
        Room storage room = rooms[_roomId];
        require(room.isActive, "Room does not exist");
        require(msg.value == room.betAmount, "Incorrect bet amount sent");
        
        room.players.push(msg.sender);
        room.potAmount += msg.value;
        playerBalances[msg.sender] += msg.value;
        
        emit PlayerJoined(_roomId, msg.sender, msg.value);
    }
    
    function endGame(string memory _roomId, address _winner) external {
        Room storage room = rooms[_roomId];
        require(room.isActive, "Room does not exist");
        require(room.winner == address(0), "Game already ended");
        
        room.winner = _winner;
        
        address loser = room.players[0] == _winner ? room.players[1] : room.players[0];
        
        playerBalances[_winner] += room.betAmount;
        playerBalances[loser] -= room.betAmount;
        
        emit GameEnded(_roomId, _winner, room.betAmount * 2);
    }
    
    function withdraw() external {
        uint256 amount = playerBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        playerBalances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function getRoomInfo(string memory _roomId) external view returns (
        string memory roomId,
        uint256 betAmount,
        uint256 potAmount,
        uint256 playerCount,
        bool isActive,
        address winner
    ) {
        Room storage room = rooms[_roomId];
        require(room.isActive, "Room does not exist");
        
        return (
            room.roomId,
            room.betAmount,
            room.potAmount,
            room.players.length,
            room.isActive,
            room.winner
        );
    }
    
    function getPlayerBalance(address _player) external view returns (uint256) {
        return playerBalances[_player];
    }
    
    // Function to deposit or reward a player
    function depositToPlayer(address _player, uint256 _amount, bool _isReward) external payable {
        require(_player != address(0), "Invalid player address");
        require(_amount > 0, "Amount must be greater than 0");
            require(msg.value == _amount, "Incorrect amount sent");
        
        playerBalances[_player] += _amount;
        
        emit SinglePlayerReward(_player, _amount);
    }
    
    // Function to deposit funds from a private key to multiple players
    function depositToMultiplePlayers(address[] calldata _players, uint256[] calldata _amounts) external payable {
        require(_players.length == _amounts.length, "Arrays length mismatch");
        require(_players.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        for(uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        require(msg.value == totalAmount, "Incorrect total amount sent");
        
        for(uint256 i = 0; i < _players.length; i++) {
            require(_players[i] != address(0), "Invalid player address");
            require(_amounts[i] > 0, "Amount must be greater than 0");
            
            playerBalances[_players[i]] += _amounts[i];
            emit SinglePlayerReward(_players[i], _amounts[i]);
        }
    }
    
    receive() external payable {}
} 