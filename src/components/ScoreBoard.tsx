import React from 'react';
import styled from 'styled-components';

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: string;
  position: Position;
  snake: Position[];
  direction: string;
  score: number;
}

interface ScoreBoardProps {
  players: Player[];
}

const ScoreBoardContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background-color: #444;
  border-radius: 5px;
  min-width: 200px;
`;

const Title = styled.h2`
  color: #61dafb;
  margin: 0 0 15px 0;
  text-align: center;
`;

const PlayerScore = styled.div`
  color: white;
  margin: 5px 0;
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  background-color: #333;
  border-radius: 3px;
`;

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ players }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <ScoreBoardContainer>
      <Title>Scoreboard</Title>
      {sortedPlayers.map((player) => (
        <PlayerScore key={player.id}>
          <span>Player {player.id.slice(0, 4)}</span>
          <span>{player.score}</span>
        </PlayerScore>
      ))}
    </ScoreBoardContainer>
  );
};

export default ScoreBoard; 