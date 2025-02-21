
import { startGameSetup } from "./pong.js";
import {showModal, showCustomModal} from "./app.js";



function authenticateNow(playerName, tournamentId) {
// Create a Bootstrap modal for login
const modalHTML = `
  <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="loginModalLabel">Login to Authenticate</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="loginForm">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" class="form-control" id="username" placeholder="Enter your username" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" class="form-control" id="password" placeholder="Enter your password" required>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" id="submitLogin">Login</button>
        </div>
      </div>
    </div>
  </div>
`;

// Append modal to body
document.body.insertAdjacentHTML('beforeend', modalHTML);

// Show modal using Bootstrap's vanilla JS
const loginModal = document.getElementById('loginModal');
const modalBootstrap = new bootstrap.Modal(loginModal);
modalBootstrap.show();

// Handle form submission
document.getElementById('submitLogin').addEventListener('click', function() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  authenticatePlayer(username, password, playerName, tournamentId)
    .then(() => {
      updatePlayerStatusUI(playerName);
      // Hide modal manually since we're not using jQuery
      modalBootstrap.hide();
      // Remove modal from DOM after use
      loginModal.remove();
    })
    .catch(error => console.error("Error during authentication:", error));
});
}

function authenticatePlayer(username, password, playerName, tournamentId) {
return fetch(`/api/auth/tournament-player/${tournamentId}/`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: username,
    password: password,
    player_name: playerName
  }),
})
.then(response => {
  if (!response.ok) throw new Error("Authentication error:" + response.status);
  return response.json();
})
.then(data => {
  if (data.message !== "Player authenticated successfully") {
    throw new Error("Authentication failed");
  }
  return data;
});
}

function updatePlayerStatusUI(playerName) {
// This function would update the UI for the authenticated player
const playerElements = document.querySelectorAll('li');
playerElements.forEach(element => {
  if (element.textContent.includes(playerName)) {
    element.innerHTML = `${playerName} - ✔️ Authenticated`;
  }
});
}


function displayTournamentGameList(data) {
  // Empty all containers
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const tournamentName = localStorage.getItem("tournamentName");
  const tournamentId = localStorage.getItem("tournamentId");
  localStorage.setItem("isTournamentMatch", true);

  const tournamentMatchesDiv = document.getElementById("app_main");

  // Fetch players with their status from the server
  fetch(`/api/tournament/players/${tournamentId}/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  .then(response => response.json())
  .then(playersData => {
    // Players list with simple styling
    let playersHTML = `
      <div class="card border-primary border-1 mb-4">
        <div class="card-body">
          <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Players</h3>
          <table class="table table-hover mb-0">
            <thead class="text-dark" style="background-color: #e9ecef;">
              <tr>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Name</th>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Status</th>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Action</th>
              </tr>
            </thead>
            <tbody>
    `;

    playersData.forEach(player => {
      let statusText = player.guest ? '<span class="badge bg-secondary">🕵️ Guest</span>' : (player.authenticated ? '<span class="badge bg-success">✔️ Authenticated</span>' : '<span class="badge bg-warning text-dark">🔒 Needs authentication</span>');
      let authButton = !player.guest && !player.authenticated ? `<button class="btn btn-success btn-sm auth-button" data-player="${player.name}" data-tournament="${tournamentId}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Authenticate Now</button>` : '';

      playersHTML += `
        <tr>
          <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.name}</td>
          <td class="text-center">${statusText}</td>
          <td class="text-center">${authButton}</td>
        </tr>
      `;
    });

    playersHTML += '</tbody></table></div></div>';

    // Matches list with simple styling
    let matchesHTML = `
      <div class="card border-primary border-1 mb-4">
        <div class="card-body">
          <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Match List</h3>
          <table class="table table-hover mb-0">
            <thead class="text-dark" style="background-color: #e9ecef;">
              <tr>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Match</th>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Score</th>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Winner</th>
                <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Action</th>
              </tr>
            </thead>
            <tbody>
    `;

    let playButtonDisplayed = false;
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((match) => {
        const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;
        const winner = (match.player1_sets_won === 0 && match.player2_sets_won === 0) ? '<span class="badge bg-info">Match to be played</span>' : (match.winner ? `<span class="badge bg-success">${match.winner}</span>` : '<span class="badge bg-warning text-dark">In progress</span>');
        let actionButton = '';

        if (!playButtonDisplayed && match.player1_sets_won === 0 && match.player2_sets_won === 0) {
          actionButton = `
            <button class="startGameButton btn btn-primary btn-sm"
                    data-player1="${match.player1_name}"
                    data-player2="${match.player2_name}"
                    data-sets-to-win="${match.sets_to_win}"
                    data-points-per-set="${match.points_per_set}"
                    data-match-id="${match.id}"
                    style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Start Game</button>
          `;
          playButtonDisplayed = true;
        }

        matchesHTML += `
          <tr>
            <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${match.player1_name} vs ${match.player2_name}</td>
            <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${score}</td>
            <td class="text-center">${winner}</td>
            <td class="text-center">${actionButton}</td>
          </tr>
        `;
      });

      matchesHTML += '</tbody></table></div></div>';

      // Combine players and matches HTML
      tournamentMatchesDiv.innerHTML = `
        <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Tournament: ${tournamentName}</h2>
        ${playersHTML}
        ${matchesHTML}
      `;

      // Adding event listeners for authentication buttons
      document.querySelectorAll('.auth-button').forEach(button => {
        button.addEventListener('click', function() {
          const playerName = this.getAttribute('data-player');
          authenticateNow(playerName, tournamentId);
        });
      });

      // Adding event listeners for starting games
      document.querySelectorAll('.startGameButton').forEach(button => {
        button.addEventListener('click', async event => {
          const player1 = event.target.getAttribute('data-player1');
          const player2 = event.target.getAttribute('data-player2');
          const setsToWin = parseInt(event.target.getAttribute('data-sets-to-win'));
          const pointsPerSet = parseInt(event.target.getAttribute('data-points-per-set'));
          const matchID = parseInt(event.target.getAttribute('data-match-id'));

          console.log("get player with tournament ID: ", tournamentId);
          try {
            const response = await fetch(`/api/tournament/players/${tournamentId}/`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });

            const playersData = await response.json();

            let player1Authenticated = playersData.some(player => (player.name === player1) && (player.authenticated || player.guest));
            if (!player1Authenticated) {
              alert("Authentification requise pour " + player1);
              return;
            }

            let player2Authenticated = playersData.some(player => (player.name === player2) && (player.authenticated || player.guest));
            if (!player2Authenticated) {
              alert("Authentification requise pour " + player2);
              return;
            }

            let gameSettings = {
              mode: "multiplayer",
              difficulty: "medium",
              design: "retro",
              numberOfGames: setsToWin,
              setsPerGame: pointsPerSet,
              player1: player1,
              player2: player2,
              control1: "wasd",
              control2: "arrows",
              isTournamentMatch: true,
            };
            localStorage.setItem("matchID", matchID);
            startGameSetup(gameSettings);
          } catch (error) {
            console.error("Erreur lors de la vérification de l'authentification des joueurs:", error);
            alert("Une erreur est survenue lors de la vérification de l'authentification. Veuillez réessayer.");
          }
        });
      });

      // Add standings to app_bottom
      displayTournamentStandings(data);
    } else {
      tournamentMatchesDiv.innerHTML += `
        <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">${tournamentName}</h2>
        ${playersHTML}
        <div class="alert alert-info text-center" role="alert">
          No match found for this tournament.
        </div>
      `;
    }
  })
  .catch((error) => {
    console.error("Error retrieving players:", error);
    tournamentMatchesDiv.innerHTML = `
      <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">${tournamentName}</h2>
      <div class="alert alert-danger text-center" role="alert">Error loading player information.</div>
    `;
  });
}

function displayTournamentStandings(data) {
  const appBottom = document.getElementById("app_bottom");

  // Calculer les standings à partir des données des matchs
  const standings = calculateStandings(data);

  // Trier les standings par points marqués en ordre décroissant
  const sortedStandings = standings.sort((a, b) => b.points_scored - a.points_scored);

  let standingsHTML = `
    <div class="card border-primary border-1 mb-4">
      <div class="card-body">
        <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Standings</h3>
        <table class="table table-striped table-hover mb-0">
          <thead class="text-dark" style="background-color: #e9ecef;">
            <tr>
              <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Player</th>
              <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Wins</th>
              <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Points Scored</th>
              <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Points Conceded</th>
            </tr>
          </thead>
          <tbody>
  `;

  sortedStandings.forEach((player, index) => {
    const isFirst = index === 0;
    const rowClass = isFirst ? 'table-success' : ''; // Vert pour le leader

    standingsHTML += `
      <tr class="${rowClass}">
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.name}</td>
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.wins}</td>
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.points_scored}</td>
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.points_conceded}</td>
      </tr>
    `;
  });

  standingsHTML += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  appBottom.innerHTML = standingsHTML;
}


function calculateStandings(matches) {
  let standings = {};
  matches.forEach(match => {
    const players = [match.player1_name, match.player2_name];
    players.forEach(player => {
      if (!standings[player]) {
        standings[player] = { name: player, wins: 0, points_scored: 0, points_conceded: 0 };
      }
    });

    if (match.sets && match.sets.length > 0) {
      match.sets.forEach(set => {
        standings[match.player1_name].points_scored += set.player1_score;
        standings[match.player1_name].points_conceded += set.player2_score;
        standings[match.player2_name].points_scored += set.player2_score;
        standings[match.player2_name].points_conceded += set.player1_score;
      });

      if (match.winner) {
        standings[match.winner].wins += 1;
      }
    }
  });
  return Object.values(standings);
}



export function DisplayTournamentGame() {
  // Empty all containers
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const tournamentName = localStorage.getItem("tournamentName");
  const tournamentId = localStorage.getItem("tournamentId");

  console.log("Tournament name: ", tournamentName);
  if (!tournamentId) {
    console.error("No tournament ID found. Please create a tournament first.");
    return;
  } else {
    console.log("Tournament ID is: ", tournamentId);
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Tournament: ${tournamentName}</h2>
    <div id="tournamentMatches"></div>
    <div id="game_panel" style="display: none;">
      <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Game Results</h2>
      <p id="summary" style="font-family: 'Press Start 2P', cursive; font-size: 15px;"></p>
    </div>
  `;

  fetch(`/api/tournament/matches/?tournament_id=${tournamentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      displayTournamentGameList(data);
    })
    .catch((error) => {
      console.error("Error retrieving tournament matches:", error);
    });
}


export function createTournamentForm() {
//empty all the containers
document.getElementById('app_top').innerHTML = '';
document.getElementById('app_main').innerHTML = '';
document.getElementById('app_bottom').innerHTML = '';

const appMain = document.getElementById("app_main");
if (!appMain) return;

appMain.innerHTML = getTournamentFormHTML();

initializePlayerManagement();
setupSubmitHandlers();
}



function getTournamentFormHTML() {
  return `
    <div class="container py-4">
      <!-- Étape 1 -->
      <div id="step1" style="display: block;">
        <div class="card border-primary border-1 mb-4">
          <div class="card-body">
            <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Step 1: Enter Tournament Name</h3>
            <div class="d-flex justify-content-center align-items-center gap-3">
              <input 
                type="text" 
                id="tournamentName" 
                class="form-control w-50" 
                placeholder="Tournament Name" 
                required
                style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              >
              <button 
                type="button" 
                id="validateTournamentName" 
                class="btn btn-primary"
                style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Étape 2 -->
      <div id="step2" style="display: none;">
        <div class="card border-primary border-1 mb-4">
          <div class="card-body">
            <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Step 2: Add Players</h3>
            <div id="playerContainer" class="mb-3"></div>
            <div class="d-flex justify-content-center gap-3">
              <button 
                type="button" 
                id="addPlayerButton" 
                class="btn btn-outline-primary"
                style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              >
                Add a Player
              </button>
              <button 
                type="button" 
                id="savePlayers" 
                class="btn btn-success"
                style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Étape 3 -->
      <div id="step3" style="display: none;">
        <div class="card border-primary border-1 mb-4">
          <div class="card-body">
            <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Step 3: Finalize Tournament</h3>
            <div class="d-flex flex-column align-items-center gap-3">
              <div class="form-group w-50">
                <label for="numberOfGames" class="form-label text-dark" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Number of Games:</label>
                <input 
                  type="number" 
                  id="numberOfGames" 
                  class="form-control" 
                  value="1" 
                  min="1"
                  style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
                >
              </div>
              <div class="form-group w-50">
                <label for="pointsToWin" class="form-label text-dark" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Points to Win:</label>
                <input 
                  type="number" 
                  id="pointsToWin" 
                  class="form-control" 
                  value="3" 
                  min="1"
                  style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
                >
              </div>
              <button 
                type="button" 
                id="submitButton" 
                class="btn btn-primary mt-3"
                style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              >
                Finalize Tournament
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function initializePlayerManagement() {
const playerContainer = document.getElementById('playerContainer');
const addButton = document.getElementById('addPlayerButton');
let playerCount = 1;
const players = new Map();

if (!playerContainer || !addButton) return;

// Ajouter la modale Bootstrap
document.body.insertAdjacentHTML('beforeend', `
  <div class="modal fade" id="duplicatePlayerModal" tabindex="-1" aria-labelledby="duplicatePlayerModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="duplicatePlayerModalLabel">Duplicate Player Detected</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          This player has already been added to the tournament. Please choose a different name.
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
        </div>
      </div>
    </div>
  </div>
`);

// Add host player automatically
const hostPlayerName = localStorage.getItem('username') || '';
const hostPlayerDiv = addPlayer(playerContainer, playerCount++, hostPlayerName, true);
updatePlayerStatus(hostPlayerDiv, { exists: true, is_guest: false, user_id: "host" });
players.set(hostPlayerName.toLowerCase(), { validated: true, div: hostPlayerDiv });

// Add an empty field for Player 2
const player2Div = addPlayer(playerContainer, playerCount++, '', false);
players.set('', { validated: false, div: player2Div });

// Event listener for checking player on blur
playerContainer.addEventListener('blur', async (event) => {
  if (event.target.tagName === 'INPUT') {
    const playerDiv = event.target.closest('div');
    const playerName = playerDiv.querySelector('input').value.trim().toLowerCase();

    if (!playerName || (players.has(playerName) && players.get(playerName).validated)) {
      if (players.has(playerName) && players.get(playerName).validated) {
        const modal = new bootstrap.Modal(document.getElementById('duplicatePlayerModal'));
        modal.show();
      }
      return;
    }

    try {
      cleanupPlayersMap(players);
      const userData = await checkUserExists(playerName);

      if (userData.exists) {
        updatePlayerStatus(playerDiv, userData);
        playerDiv.querySelector('.status-text').textContent = '🔒 Existing player, will need authentication';
        playerDiv.querySelector('.status-text').className = 'status-text text-warning ms-2';
        players.set(playerName, { validated: true, div: playerDiv });
      } else {
        const playerData = await checkPlayerExists(playerName);
        if (playerData.exists) {
          updatePlayerStatus(playerDiv, { exists: true, is_guest: true });
          playerDiv.querySelector('.status-text').textContent = '👤 Existing guest player';
          playerDiv.querySelector('.status-text').className = 'status-text text-info ms-2';
        } else {
          updatePlayerStatus(playerDiv, { exists: false, is_guest: true });
          playerDiv.querySelector('.status-text').textContent = '👾 New guest player';
          playerDiv.querySelector('.status-text').className = 'status-text text-success ms-2';
        }
        players.set(playerName, { validated: true, div: playerDiv });
      }
    } catch (error) {
      handleError(error, "Error checking player or user existence");
      playerDiv.querySelector('.status-text').textContent = 'Error checking player';
      playerDiv.querySelector('.status-text').className = 'status-text text-danger ms-2';
    }
  }
}, true);

// Event listener for removing a player
playerContainer.addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-player')) {
    const playerDiv = event.target.closest('div');
    const playerName = playerDiv.querySelector('input').value.trim().toLowerCase();
    players.delete(playerName);
    playerDiv.remove();
    console.log(`Removed player: ${playerName}`);
    cleanupPlayersMap(players);
  }
});

// Event listener for adding new player line
addButton.addEventListener('click', () => {
  const newPlayerDiv = addPlayer(playerContainer, playerCount++, '', false);
  players.set('', { validated: false, div: newPlayerDiv });
  console.log("New player line added");
});

// Updated addPlayer function
function addPlayer(container, count, initialValue = '', isHost = false) {
  const playerDiv = document.createElement('div');
  playerDiv.className = 'd-flex align-items-center mb-2';
  playerDiv.innerHTML = `
    <span class="me-2">${isHost ? 'Player 1 (host)' : `Player ${count}`}</span>
    <input 
      type="text" 
      class="form-control me-2" 
      placeholder="Pseudo" 
      value="${initialValue}" 
      ${initialValue ? 'readonly' : ''} 
    >
    <span class="status-text me-2"></span>
    ${!isHost ? '<button class="btn btn-sm remove-player">❌</button>' : ''}
  `;
  if (!isHost) {
    playerDiv.classList.add('additional-player');
  }
  container.appendChild(playerDiv);
  return playerDiv;
}

// Function for cleaning up the players Map
function cleanupPlayersMap(playersMap) {
  const existingPlayerDivs = Array.from(playerContainer.querySelectorAll('.additional-player'));
  const existingPlayerNames = existingPlayerDivs.map(div => div.querySelector('input').value.trim().toLowerCase());

  playersMap.forEach((value, key) => {
    if (key !== '' && !existingPlayerNames.includes(key)) {
      playersMap.delete(key);
    }
  });
}
}



export async function checkUserExists(username) {
const response = await fetch(`/api/user/exists/?username=${encodeURIComponent(username)}`, {
  method: 'GET',
  credentials: 'include'
});
return await response.json();
}

export async function checkPlayerExists(playerName) {
const response = await fetch(`/api/player/exists/?player_name=${encodeURIComponent(playerName)}`, {
  method: 'GET',
  credentials: 'include'
});
return await response.json();
}

function updatePlayerStatus(playerDiv, userData) {
// Check if there's already a status span
let statusSpan = playerDiv.querySelector('.status-text'); // Utiliser la classe existante
if (!statusSpan) {
  // Si inexistant, créer avec la classe appropriée
  statusSpan = document.createElement('span');
  statusSpan.className = 'status-text me-2';
  playerDiv.insertBefore(statusSpan, playerDiv.querySelector('.remove-player') || null); // Avant le bouton de suppression si présent
} else {
  // Si existant, vider le contenu
  statusSpan.textContent = '';
}

if (playerDiv.classList.contains('additional-player')) {
  if (userData.exists) {
    if (userData.is_guest) {
      // Joueur invité existant (statut géré dans initializePlayerManagement)
      playerDiv.setAttribute('data-user-id', '');
      playerDiv.setAttribute('data-is-guest', 'true');
      playerDiv.setAttribute('data-authenticated', 'false');
    } else {
      // Joueur existant nécessitant authentification (statut géré dans initializePlayerManagement)
      playerDiv.setAttribute('data-user-id', userData.user_id);
      playerDiv.setAttribute('data-is-guest', 'false');
      playerDiv.setAttribute('data-authenticated', 'false');
    }
  } else {
    // Nouveau joueur invité (statut géré dans initializePlayerManagement)
    playerDiv.setAttribute('data-user-id', '');
    playerDiv.setAttribute('data-is-guest', 'true');
    playerDiv.setAttribute('data-authenticated', 'false');
  }
} else {
  // Host player
  statusSpan.textContent = '✔️ Host';
  playerDiv.setAttribute('data-user-id', "host");
  playerDiv.setAttribute('data-is-guest', 'false');
  playerDiv.setAttribute('data-authenticated', 'true');
}
}



function setupSubmitHandlers() {
const validateButton = document.getElementById('validateTournamentName');
const submitButton = document.getElementById('submitButton');
const savePlayersButton = document.getElementById('savePlayers');

validateButton.onclick = () => {
  const tournamentName = document.getElementById('tournamentName').value.trim();
  if (!tournamentName) {
    showModal('genericModal', 'Error', 'The tournament name cannot be empty', 'OK', () => {});
    return;
  }
  fetch("/api/tournament/new/", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tournament_name: tournamentName
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.tournament_id && data.message === "Tournament created successfully") {
      localStorage.setItem("tournamentName", data.tournament_name);
      localStorage.setItem("tournamentId", data.tournament_id);
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
    } else {
      showModal('genericModal', 'Error', 'Error validating tournament name. Please try again.', 'OK', () => {});
    }
  })
  .catch(error => {
    console.error("Error validating tournament name:", error);
    showModal('genericModal', 'Error', 'There was an error validating the tournament name.', 'OK', () => {});
  });
};

savePlayersButton.onclick = () => {
  const players = Array.from(document.getElementById('playerContainer').querySelectorAll('input'))
    .map((input, index) => {
      const playerDiv = input.parentElement;
      return {
        name: input.value.trim(),
        authenticated: index === 0 ? true : false, // Only the first player (host) is authenticated
        guest: playerDiv.getAttribute('data-is-guest') === 'true'
      };
    })
    .filter(player => player.name !== '');

  if (players.length < 2) {
    showModal('genericModal', 'Error', 'At least 2 players are required to create a tournament', 'OK', () => {});
    return;
  }

  localStorage.setItem("players", JSON.stringify(players));
  showModal('genericModal', 'Success', 'Players saved successfully!', 'OK', () => {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
  });
};

submitButton.onclick = () => {
  const players = JSON.parse(localStorage.getItem("players") || "[]");
  if (players.length < 2) {
    showModal('genericModal', 'Error', 'At least 2 players are required to create a tournament', 'OK', () => {});
    return;
  }

  const numberOfGames = document.getElementById('numberOfGames').value;
  const pointsToWin = document.getElementById('pointsToWin').value;
  const tournamentId = localStorage.getItem("tournamentId");

  fetch(`/api/tournament/finalize/${tournamentId}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      players: players,
      number_of_games: numberOfGames,
      points_to_win: pointsToWin
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      console.log("Tournament finalized:", data);
      showModal('genericModal', 'Success', 'Tournament finalized successfully!', 'OK', () => {
        DisplayTournamentGame(); // Assuming this function shows the tournament game page
      });
    } else {
      showModal('genericModal', 'Error', 'Error finalizing tournament. Please try again.', 'OK', () => {});
    }
  })
  .catch(error => {
    console.error("Error finalizing tournament:", error);
    showModal('genericModal', 'Error', 'There was an error finalizing the tournament.', 'OK', () => {});
  });
};
}

function handleError(error, message) {
console.error(message, error);
alert(message);
}

function sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin) {
fetch("/api/tournament/new/", {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tournament_name: tournamentName,
    players: players,
    number_of_games: numberOfGames,
    points_to_win: pointsToWin
  }),
})
.then((response) => {
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
})
.then((data) => {
  console.log("Tournament created:", data);
  localStorage.setItem("tournamentId", data.tournament_id);
  DisplayTournamentGame();
})
.catch((error) => {
  console.error("Error creating tournament:", error);
});
}

export function selectTournament(tournamentId, tournamentName) {
localStorage.setItem("tournamentId", tournamentId);
localStorage.setItem("tournamentName", tournamentName);
DisplayTournamentGame();
}


export function validateSearch() {
let tournamentName;

// Vérifiez si le nom du tournoi est déjà dans le stockage local
tournamentName = localStorage.getItem("tournamentName");

if (!tournamentName) {
  alert("Please enter a tournament name.");
  return;
}

const appMain = document.getElementById("app_main");
appMain.innerHTML = `
  <div id="tournamentList"></div>
`;

fetch(`/api/tournaments/?name=${tournamentName}`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
})
  .then((response) => response.json())
  .then((data) => {
    const tournamentListDiv = document.getElementById("tournamentList");
    tournamentListDiv.innerHTML = "<h3>Tournaments Found:</h3>";
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((tournament) => {
        const tournamentDiv = document.createElement('div');
        // Ajoute une coche pour les tournois terminés ou une raquette pour ceux en cours
        const emoji = tournament.is_finished ? '✅' : '🏓';
        tournamentDiv.innerHTML = `
          <p>
            ${emoji} Name: ${tournament.tournament_name}, ID: ${tournament.id}, Date: ${new Date(tournament.date).toLocaleDateString()}
            <button class="selectTournamentButton" data-id="${tournament.id}" data-name="${tournament.tournament_name}">Select</button>
          </p>`;
        tournamentListDiv.appendChild(tournamentDiv);
      });

      document.querySelectorAll('.selectTournamentButton').forEach(button => {
        button.addEventListener('click', event => {
          const tournamentId = event.target.getAttribute('data-id');
          const tournamentName = event.target.getAttribute('data-name');
          selectTournament(tournamentId, tournamentName);
        });
      });
    } else {
      tournamentListDiv.innerHTML += "<p>No tournament found with that name.</p>";
    }
  })
  .catch((error) => {
    console.error("Error while searching for tournaments:", error);
  });
}

export function displayUserTournaments() {
const username = localStorage.getItem("username");

if (!username) {
  showModal('genericModal', 'Login Required', 'Please log in to view your tournaments.', 'OK', function() {});
  return;
}

const appMain = document.getElementById("app_main");
appMain.innerHTML = `
  <div class="card mb-4 shadow-sm border-primary border-1">
    <div class="card-body p-3">
      <!-- Bouton Show all tournaments aligné à gauche -->
      <div class="mb-4">
        <button id="toggleAllTournaments" class="btn btn-secondary btn-sm shadow-sm rounded-pill">Show all tournaments</button>
      </div>
      <!-- Card interne pour le tableau -->
      <div id="userTournamentList">
        <div class="card shadow-sm border-primary border-1">
          <div class="card-header text-center" style="background: white;">
            <h2 class="display-6 mb-0 text-primary">Your Tournaments</h2>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="bg-primary text-white">
                  <tr>
                    <th scope="col" class="text-center" data-priority="1">Tournament Name</th>
                    <th scope="col" class="text-center" data-priority="2">Status</th>
                    <th scope="col" class="text-center" data-priority="3">ID</th>
                    <th scope="col" class="text-center" data-priority="4">Date</th>
                    <th scope="col" class="text-center" data-priority="2">Action</th>
                  </tr>
                </thead>
                <tbody id="tournamentsBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

fetch(`/api/user/tournaments/?username=${username}`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
})
  .then((response) => response.json())
  .then((data) => {
    const userTournamentListDiv = document.getElementById("userTournamentList");

    // Ensure data is an array before manipulating it
    const tournaments = Array.isArray(data) ? data : [data]; // Convert single object to array or use as-is if already array

    if (tournaments.length > 0) {
      // Reverse tournaments if it's an array
      const reversedTournaments = Array.isArray(tournaments) ? [...tournaments].reverse() : tournaments;

      const tournamentsBody = document.getElementById("tournamentsBody");
      reversedTournaments.forEach((tournament) => {
        const emoji = tournament.is_finished ? '✅' : '🏓';
        const statusBadge = tournament.is_finished ? 
          '<span class="badge bg-success">Finished</span>' : 
          '<span class="badge bg-info text-dark">Ongoing</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="text-center align-middle">${tournament.tournament_name} ${emoji}</td>
          <td class="text-center align-middle">${statusBadge}</td>
          <td class="text-center align-middle">${tournament.id}</td>
          <td class="text-center align-middle">${new Date(tournament.date).toLocaleDateString()}</td>
          <td class="text-center align-middle">
            <button class="btn btn-primary btn-sm selectTournamentButton shadow rounded" data-id="${tournament.id}" data-name="${tournament.tournament_name}">
              <i class="bi bi-play-fill"></i> Select
            </button>
          </td>
        `;
        tournamentsBody.appendChild(row);
      });

      // Filter for ongoing tournaments by default
      filterTournaments('ongoing');

      document.getElementById("toggleAllTournaments").addEventListener('click', () => {
        const button = document.getElementById("toggleAllTournaments");
        const tournamentsBody = document.getElementById("tournamentsBody");
        if (button.textContent.includes("Show all tournaments")) {
          filterTournaments('all');
          button.textContent = "Show only ongoing tournaments";
          button.classList.remove('btn-secondary');
          button.classList.add('btn-info');
        } else {
          filterTournaments('ongoing');
          button.textContent = "Show all tournaments";
          button.classList.remove('btn-info');
          button.classList.add('btn-secondary');
        }
      });

      // Relier le bouton "Select" pour naviguer vers la page du tournoi
      document.querySelectorAll('.selectTournamentButton').forEach(button => {
        button.addEventListener('click', event => {
          const tournamentId = event.target.getAttribute('data-id');
          const tournamentName = event.target.getAttribute('data-name');
          selectTournament(tournamentId, tournamentName);
        });
      });
    } else {
      userTournamentListDiv.innerHTML += `
        <div class="alert alert-warning text-center" role="alert">
          You are not participating in any tournament.
        </div>
      `;
    }
  })
  .catch((error) => {
    console.error("Error retrieving user's tournaments:", error);
    userTournamentListDiv.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        Error loading tournament information.
      </div>
    `;
  });

function filterTournaments(filter) {
  const rows = document.querySelectorAll('#tournamentsBody tr');
  rows.forEach(row => {
    const statusBadge = row.querySelector('.badge');
    if (filter === 'all' || 
        (filter === 'ongoing' && statusBadge.classList.contains('bg-info')) || 
        (filter === 'finished' && statusBadge.classList.contains('bg-success'))) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
}
