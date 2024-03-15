function appentUserToLeaderboard() {
  const box = document.createElement(`li`);
  box.innerHTML = `
          <span class="player-name">Player 1</span>
          <span class="player-score">Points: 100</span>
          <span class="player-time">Time: 1:30</span>
          <span class="player-result">Result: 514</span>
  `;

  document.getElementById(`leaderboardPlayersBox`).appendChild(box);
}

appentUserToLeaderboard();
appentUserToLeaderboard();
appentUserToLeaderboard();
appentUserToLeaderboard();
appentUserToLeaderboard();
appentUserToLeaderboard();
