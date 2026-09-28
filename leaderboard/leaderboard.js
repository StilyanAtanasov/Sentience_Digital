import { readUserData } from "../JS/core.js";

const loader = document.getElementById("loaderBox");
const status = document.getElementById("leaderboardStatus");

async function appendUsersToLeaderboard() {
  const leaderboard = document.getElementById(`leaderboardPlayersBox`);
  leaderboard.innerHTML = ``;

  try {
    const userData = await readUserData();
    if (status) {
      status.textContent = userData.length
        ? "Ranked by result, with answer points weighted first."
        : "No results yet.";
    }

    userData.forEach((value, index) => {
      const box = document.createElement(`li`);
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = index + 1;

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = value.username;

      const points = document.createElement("span");
      points.className = "player-score";
      points.textContent = `${value.points} points`;

      const time = document.createElement("span");
      time.className = "player-time";
      time.textContent = `${value.time}s`;

      const score = document.createElement("strong");
      score.className = "player-result";
      score.textContent = value.score;

      box.append(rank, name, points, time, score);

      leaderboard.appendChild(box);
    });
  } catch (error) {
    console.error(error);
    if (status) {
      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.textContent = "Try again";
      retryButton.addEventListener("click", appendUsersToLeaderboard);
      status.replaceChildren("Could not load results. ", retryButton);
    }
  } finally {
    loader.classList.add("hidden");
  }
}

appendUsersToLeaderboard();
