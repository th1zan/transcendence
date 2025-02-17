
import { startGameSetup } from "./pong.js";



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
  return fetch(`/api/tournament/authenticate-player/${tournamentId}/`, {
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

function displayTournamentGameList(data){
  
  // Empty all containers
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const tournamentName = localStorage.getItem("tournamentName");
  const tournamentId = localStorage.getItem("tournamentId");
  localStorage.setItem("context", "tournament");
  
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
    let playersHTML = '<div class="players-list"><h3>Players:</h3><ul>';
    
    playersData.forEach(player => {
      let statusText = '';
      if (player.guest) {
        statusText = '🕵️ Guest';
      } else {
        statusText = player.authenticated ? '✔️ Authenticated' : '🔒 Needs authentication';
      }
      
      // Add authentication button if not authenticated and not a guest
      let authButton = '';
      if (!player.guest && !player.authenticated) {
        authButton = `<button class="auth-button" data-player="${player.name}" data-tournament="${tournamentId}">Authenticate Now</button>`;
      }
      
      playersHTML += `<li>${player.name} - ${statusText} ${authButton}</li>`;
    });
    
    playersHTML += '</ul></div>';
    
    tournamentMatchesDiv.innerHTML = `
      <h2>Selected Tournament: ${tournamentName}</h2>
      ${playersHTML}
      <h3>Match List:</h3>
    `;

    // Now handle the match data
    let playButtonDisplayed = false;
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((match) => {
        const date = new Date(match.date_played).toLocaleString();
        const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;
        
        const winner = (match.player1_sets_won === 0 && match.player2_sets_won === 0) ? "Match to be played" : match.winner || "In progress";

        let matchHTML = `
          <p>
            ${match.player1_name} vs ${match.player2_name}
            <br>
            Score: ${score}
            <br>
            Winner: ${winner}
        `;

        if (!playButtonDisplayed && match.player1_sets_won === 0 && match.player2_sets_won === 0) {
          matchHTML += `
            <button class="startGameButton" 
                    data-player1="${match.player1_name}" 
                    data-player2="${match.player2_name}" 
                    data-sets-to-win="${match.sets_to_win}" 
                    data-points-per-set="${match.points_per_set}"
                    data-match-id="${match.id}">Start Game</button>
          `;
          playButtonDisplayed = true;
        }

        matchHTML += `</p>`;
        tournamentMatchesDiv.innerHTML += matchHTML;
      });

      document.querySelectorAll('.startGameButton').forEach(button => {
          button.addEventListener('click', async event => {
            const player1 = event.target.getAttribute('data-player1');
            const player2 = event.target.getAttribute('data-player2');
            const setsToWin = parseInt(event.target.getAttribute('data-sets-to-win'));
            const pointsPerSet = parseInt(event.target.getAttribute('data-points-per-set'));
            const matchID = parseInt(event.target.getAttribute('data-match-id'));
            
            console.log("get player with tournament ID: ", tournamentId);
            try {
              // 1. Récupérer la liste des joueurs correspondant à l'id du tournoi avec fetch et stocker la réponse.
              const response = await fetch(`/api/tournament/players/${tournamentId}/`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              });
              
              const playersData = await response.json();

              // 2. Chercher la variable player1 et vérifier si le joueur est authentifié ou invité.
              let player1Authenticated = false;
              for (let player of playersData) {
                if (player.name === player1) {
                  player1Authenticated = player.authenticated || player.guest;
                  break;
                }
              }
              if (!player1Authenticated) {
                // 3. Si player1 n'est pas authentifié ni invité, message d'erreur.
                alert("Authentification requise pour " + player1);
                return;
              }

              // 4. Chercher la variable pour player2 et vérifier.
              let player2Authenticated = false;
              for (let player of playersData) {
                if (player.name === player2) {
                  player2Authenticated = player.authenticated || player.guest;
                  break;
                }
              }
              if (!player2Authenticated) {
                // 5. Message d'erreur si nécessaire.
                alert("Authentification requise pour " + player2);
                return;
              }

              // 6. Si pas de message d'erreur, startGameSetup est actionnée.
              localStorage.setItem("matchID", matchID);
              startGameSetup(player1, player2, setsToWin, pointsPerSet);

            } catch (error) {
              console.error("Erreur lors de la vérification de l'authentification des joueurs:", error);
              alert("Une erreur est survenue lors de la vérification de l'authentification. Veuillez réessayer.");
            }
          });
        });


      document.querySelectorAll('.auth-button').forEach(button => {
        button.addEventListener('click', function() {
          const playerName = this.getAttribute('data-player');
          const tournamentId = this.getAttribute('data-tournament');
          authenticateNow(playerName, tournamentId);
        });
      });

      // Add standings to app_bottom
      displayTournamentStandings(data);
    } else {
      tournamentMatchesDiv.innerHTML += "<p>No match found for this tournament.</p>";
    }
  })
  .catch((error) => {
    console.error("Error retrieving players:", error);
    tournamentMatchesDiv.innerHTML = `<h2>Selected Tournament: ${tournamentName}</h2><h3>Match List:</h3><p>Error loading player information.</p>`;
  });
}


// function displayTournamentGameList(data){
//
//   //empty all the containers
//   // document.getElementById('app_top').innerHTML = '';
//   document.getElementById('app_main').innerHTML = '';
//   document.getElementById('app_bottom').innerHTML = '';
//
//   const tournamentName = localStorage.getItem("tournamentName");
//   localStorage.setItem("context", "tournament");
//
//   const tournamentMatchesDiv = document.getElementById("app_main");
//   tournamentMatchesDiv.innerHTML = `
//     <h2>Selected Tournament: ${tournamentName}</h2>
//     <h3>Match List:</h3>
//   `;
//
//   let playButtonDisplayed = false; // Variable pour contrôler l'affichage du bouton
//
//   if (Array.isArray(data) && data.length > 0) {
//     data.forEach((match) => {
//       const date = new Date(match.date_played).toLocaleString();
//       const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;
//
//       // Détermine le texte du gagnant ou "match à jouer"
//       const winner = (match.player1_sets_won === 0 && match.player2_sets_won === 0) ? "Match to be played" : match.winner || "In progress";
//
//       let matchHTML = `
//         <p>
//           ${match.player1_name} vs ${match.player2_name}
//           <br>
//           Score: ${score}
//           <br>
//           Winner: ${winner}
//       `;
//
//       // Afficher le bouton "Commencer le jeu" uniquement pour le premier match à jouer
//       if (!playButtonDisplayed && match.player1_sets_won === 0 && match.player2_sets_won === 0) {
//         matchHTML += `
//           <button class="startGameButton" 
//                   data-player1="${match.player1_name}" 
//                   data-player2="${match.player2_name}" 
//                   data-sets-to-win="${match.sets_to_win}" 
//                   data-points-per-set="${match.points_per_set}"
//                   data-match-id="${match.id}">Start Game</button>
//         `;
//         playButtonDisplayed = true; // Mettre à jour la variable pour indiquer que le bouton a été affiché
//       }
//
//       matchHTML += `</p>`;
//       tournamentMatchesDiv.innerHTML += matchHTML;
//     });
//
//     document.querySelectorAll('.startGameButton').forEach(button => {
//       button.addEventListener('click', event => {
//         const player1 = event.target.getAttribute('data-player1');
//         const player2 = event.target.getAttribute('data-player2');
//         const setsToWin = parseInt(event.target.getAttribute('data-sets-to-win'));
//         const pointsPerSet = parseInt(event.target.getAttribute('data-points-per-set'));
//         const matchID = parseInt(event.target.getAttribute('data-match-id'));
//         localStorage.setItem("matchID", matchID);
//
//         startGameSetup(player1, player2, setsToWin, pointsPerSet);
//       });
//     });
//
//     // Ajouter le classement dans app_bottom
//     displayTournamentStandings(data);
//   }
//   else {
//     tournamentMatchesDiv.innerHTML += "<p>No match found for this tournament.</p>";
//   }
// }

function displayTournamentStandings(data) {
  const appBottom = document.getElementById("app_bottom");

  // Supposons que les données de match contiennent des informations sur les scores cumulés
  // Ici, nous devons calculer les standings à partir des données des matchs
  const standings = calculateStandings(data);

  let standingsHTML = "<h3>Standings:</h3>";
  standingsHTML += `
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Wins</th>
          <th>Points Scored</th>
          <th>Points Conceded</th>
        </tr>
      </thead>
      <tbody>
  `;

  standings.forEach(player => {
    standingsHTML += `
      <tr>
        <td>${player.name}</td>
        <td>${player.wins}</td>
        <td>${player.points_scored}</td>
        <td>${player.points_conceded}</td>
      </tr>
    `;
  });

  standingsHTML += `
      </tbody>
    </table>
  `;

  appBottom.innerHTML = standingsHTML;
}

function calculateStandings(matches) {
  // Cette fonction doit être implémentée selon votre logique de calcul des standings
  // Voici un exemple très simplifié où chaque joueur commence avec 0 victoires, points marqués et encaissés
  let standings = {};

  matches.forEach(match => {
    const players = [match.player1_name, match.player2_name];
    players.forEach(player => {
      if (!standings[player]) {
        standings[player] = { name: player, wins: 0, points_scored: 0, points_conceded: 0 };
      }
    });

    // Supposons que les sets contiennent les scores
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

  // Convertir l'objet standings en tableau et trier par nombre de victoires
  return Object.values(standings).sort((a, b) => b.wins - a.wins);
}

export function DisplayTournamentGame() {
  
  //empty all the containers
  // document.getElementById('app_top').innerHTML = '';
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
    <h2>Tournament: ${tournamentName}</h2>
    <div id="tournamentMatches"></div>    
    <div id="game_panel" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>    
    <!-- <button id="backToSearchButton" class="btn btn-secondary">Back to Search</button> -->
    <!-- <canvas id="pong" width="800" height="400"></canvas> -->
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
    })
}

// export function createTournamentForm() {
//
//  //empty all the containers
//   document.getElementById('app_top').innerHTML = '';
//   document.getElementById('app_main').innerHTML = '';
//   document.getElementById('app_bottom').innerHTML = '';
//
//   const appMain = document.getElementById("app_main");
//   if (!appMain) return;
//
//   appMain.innerHTML = getTournamentFormHTML();
//
//   initializePlayerManagement();
//   setupSubmitHandler();
// }

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


// function getTournamentFormHTML() {
//   return `
//     <form id="tournamentForm">
//       <input type="text" id="tournamentName" placeholder="Tournament Name" required>
//       <div id="playerContainer"></div>
//       <button type="button" id="addPlayerButton">Add a Player</button>
//       <br><br>
//       <label for="numberOfGames">Number of Games:</label>
//       <input type="number" id="numberOfGames" value="1" min="1"><br><br>
//       <label for="pointsToWin">Points to Win:</label>
//       <input type="number" id="pointsToWin" value="3" min="1"><br><br>
//       <button type="button" id="submitButton">Submit</button>
//     </form>
//   `;
// }


function getTournamentFormHTML() {
  return `
    <div id="step1" style="display: block;">
      <h3>Step 1: Enter Tournament Name</h3>
      <input type="text" id="tournamentName" placeholder="Tournament Name" required>
      <button type="button" id="validateTournamentName">Validate Name</button>
    </div>
    <div id="step2" style="display: none;">
      <h3>Step 2: Add Players</h3>
      <div id="playerContainer"></div>
      <button type="button" id="addPlayerButton">Add a Player</button>
      <button type="button" id="savePlayers">Save Players</button>  <!-- New button here -->
    </div>
    <div id="step3" style="display: none;">
      <h3>Step 3: Finalize Tournament</h3>
      <label for="numberOfGames">Number of Games:</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points to Win:</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <button type="button" id="submitButton">Finalize Tournament</button>
    </div>
  `;
}

async function validatePlayer(playerDiv, userData) {
  const playerName = playerDiv.querySelector('input').value.trim().toLowerCase();
  const playerData = players.get(playerName);
  
  if (!playerData) {
    console.warn(`Player ${playerName} not found in players Map`);
    return;
  }

  if (playerData.validated) return; // Already validated

  try {
    if (userData.exists) {
      playerDiv.querySelector('span').innerHTML = '✔️ Validated';
    } else {
      const playerDataFromAPI = await checkPlayerExists(playerName);
      playerDiv.querySelector('span').innerHTML = playerDataFromAPI.exists ? '⚠️ Validated (Player exists)' : '✔️ Validated (New Player)';
    }
    playerData.validated = true; // Update the existing player data
  } catch (error) {
    handleError(error, "Error validating player");
  }
}

async function initializePlayerManagement() {
  const playerContainer = document.getElementById('playerContainer');
  const addButton = document.getElementById('addPlayerButton');
  let playerCount = 1;
  const players = new Map();
  const warnedPlayers = new Set();

  if (!playerContainer || !addButton) return; // Early exit if elements not found

  // Add host player automatically
  const hostPlayerName = localStorage.getItem('username') || '';
  const hostPlayerDiv = addPlayer(playerContainer, playerCount++, hostPlayerName, true);
  updatePlayerStatus(hostPlayerDiv, { exists: true, is_guest: false, user_id: "host" });
  players.set(hostPlayerName.toLowerCase(), { validated: true, div: hostPlayerDiv });

  // Add an empty field for Player 2 immediately after the host
  const player2Div = addPlayer(playerContainer, playerCount++, '', false, true);  
  players.set('', { validated: false, div: player2Div }); // Placeholder for Player 2

  // Event listener for checking player
  playerContainer.addEventListener('click', async (event) => {
    if (event.target.classList.contains('check-player')) {
      // Cleanup function before checking or adding new player
      cleanupPlayersMap(players);

      const playerDiv = event.target.closest('div');
      const playerName = playerDiv.querySelector('input').value.trim().toLowerCase();

      if (!playerName) {
        alert("Please fill in the player's username before checking.");
        return;
      }

      // Check if player is already added
      if (players.has(playerName) && players.get(playerName).validated) {
        alert("This player is already added and validated.");
        return;
      }

      try {
        const userData = await checkUserExists(playerName);

        if (userData.exists) {
          updatePlayerStatus(playerDiv, userData);
          players.set(playerName, { validated: true, div: playerDiv });
        } else {
          const playerData = await checkPlayerExists(playerName);
          if (playerData.exists && !warnedPlayers.has(playerName)) {
            alert("Player already exists. You can use this player or choose a different name.");
            warnedPlayers.add(playerName);
          }
          updatePlayerStatus(playerDiv, { exists: false, is_guest: true, user_id: "" });
          players.set(playerName, { validated: true, div: playerDiv });
        }
      } catch (error) {
        handleError(error, "Error checking player or user existence");
      }
    }
  });

  // Event listener for adding new player line
  addButton.addEventListener('click', () => {
    const newPlayerDiv = addPlayer(playerContainer, playerCount++, '', false, true);
    players.set('', { validated: false, div: newPlayerDiv }); // Placeholder for new player
    console.log("New player line added");
  });

  function addPlayer(container, count, initialValue = '', isHost = false, withCheckButton = false) {
    const playerDiv = document.createElement('div');
    playerDiv.innerHTML = `
      Player No.: ${count} <input type="text" placeholder="Pseudo" value="${initialValue}" ${initialValue ? 'readonly' : ''}>
      <span style="margin-left: 10px;"></span>
    `;
    if (withCheckButton) {
      playerDiv.innerHTML += `<button class="check-player" style="margin-left: 10px;">Check Player</button>`;
    }
    if (!isHost) {
      playerDiv.classList.add('additional-player');
    }
    container.appendChild(playerDiv);
    return playerDiv;
  }

  // function for cleaning up the players Map
  function cleanupPlayersMap(playersMap) {
    const existingPlayerDivs = Array.from(playerContainer.querySelectorAll('.additional-player'));
    const existingPlayerNames = existingPlayerDivs.map(div => div.querySelector('input').value.trim().toLowerCase());

    // Check if there are any players in the Map that are not in the DOM
    playersMap.forEach((value, key) => {
      if (key !== '' && !existingPlayerNames.includes(key)) { // Skip placeholder
        playersMap.delete(key);  // Remove from Map if the player is not found in the DOM
      }
    });
  }
}

// function initializePlayerManagement() {
//   const playerContainer = document.getElementById('playerContainer');
//   const addButton = document.getElementById('addPlayerButton');
//   let playerCount = 1;
//   const players = new Set(); // Utiliser un Set pour une vérification rapide de l'unicité
//
//   // Ajout automatique du premier joueur
//   addPlayer(playerContainer, playerCount++, localStorage.getItem('username') || '');
//
//   addButton.onclick = async () => {
//     const inputs = playerContainer.querySelectorAll('input');
//     const lastInput = inputs[inputs.length - 1];
//     const playerName = lastInput.value.trim();
//
//     if (!playerName) {
//       alert("Please fill in the current player's username before adding a new one.");
//       return;
//     }
//
//     if (players.has(playerName.toLowerCase())) {
//       alert("This player is already added.");
//       return;
//     }
//
//     try {
//       const userData = await checkUserExists(playerName);
//      console.log("player'es existence will be checked:", playerName); 
//       updatePlayerStatus(lastInput.parentElement, userData);
//       addPlayer(playerContainer, playerCount++);
//       players.add(playerName.toLowerCase()); // Ajouter le nom en minuscule pour vérifier l'unicité
//     } catch (error) {
//       handleError(error, "Error checking user existence");
//     }
//   };
// }

// async function checkUserExists(username) {
//   const response = await fetch(`/api/user/exists/?username=${encodeURIComponent(username)}`, {
//     method: 'GET',
//     credentials: 'include'
//   });
//   return await response.json();
// }
//
// function addPlayer(container, count, initialValue = '') {
//   const playerDiv = document.createElement('div');
//   playerDiv.innerHTML = `Player No.: ${count} <input type="text" placeholder="Pseudo" value="${initialValue}" ${initialValue ? 'readonly' : ''}>`;
//   container.appendChild(playerDiv);
// }


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

function addPlayer(container, count, initialValue = '', isHost = false) {
  const playerDiv = document.createElement('div');
  playerDiv.innerHTML = `Player No.: ${count} <input type="text" placeholder="Pseudo" value="${initialValue}" ${initialValue ? 'readonly' : ''}>`;
  if (!isHost) {
    playerDiv.classList.add('additional-player');
  }
  container.appendChild(playerDiv);
  return playerDiv;
}

function updatePlayerStatus(playerDiv, userData) {
  // Check if there's already a status span
  let statusSpan = playerDiv.querySelector('span');
  if (!statusSpan) {
    // If there isn't one, create it
    statusSpan = document.createElement('span');
    statusSpan.style.marginLeft = '10px';
    playerDiv.appendChild(statusSpan);
  } else {
    // If there is one, clear its content
    statusSpan.textContent = '';
  }

  if (playerDiv.classList.contains('additional-player')) {
    if (userData.exists) {
      if (userData.is_guest) {
        statusSpan.textContent = '👤 Guest';
        playerDiv.setAttribute('data-user-id', '');
        playerDiv.setAttribute('data-is-guest', 'true');
        playerDiv.setAttribute('data-authenticated', 'false');
      } else {
        statusSpan.innerHTML = '🔒 Existing user, needs further authentication';
        playerDiv.setAttribute('data-user-id', userData.user_id);
        playerDiv.setAttribute('data-is-guest', 'false');
        playerDiv.setAttribute('data-authenticated', 'false');
      }
    } else {
      statusSpan.textContent = '👤 Guest';
      playerDiv.setAttribute('data-user-id', '');
      playerDiv.setAttribute('data-is-guest', 'true');
      playerDiv.setAttribute('data-authenticated', 'false');
    }
  } else {
    // Host player - no check needed, already set as existing and authenticated
    statusSpan.textContent = '✔️ Host';
    playerDiv.setAttribute('data-user-id', "host");
    playerDiv.setAttribute('data-is-guest', 'false');
    playerDiv.setAttribute('data-authenticated', 'true');
  }

}


// function updatePlayerStatus(playerDiv, userData) {
//   const statusSpan = document.createElement('span');
//   statusSpan.style.marginLeft = '10px';
//
//   if (userData.exists) {
//     statusSpan.textContent = userData.is_guest ? '❌ Guest' : '✔️  Existing player';
//     playerDiv.setAttribute('data-user-id', userData.is_guest ? '' : userData.user_id);
//
//     if (!userData.is_guest) {
//       // Créer le bouton "Send Tournament Request"
//       const sendTournamentButton = document.createElement('button');
//       sendTournamentButton.textContent = 'Send Tournament Request';
//       sendTournamentButton.style.marginLeft = '10px';
//       sendTournamentButton.addEventListener('click', sendTournamentRequest);
//
//       // Créer le bouton "Authenticate Now"
//       const authenticateButton = document.createElement('button');
//       authenticateButton.textContent = 'Authenticate Now';
//       authenticateButton.style.marginLeft = '10px';
//       authenticateButton.addEventListener('click', authenticateNow);
//
//       // Ajouter les boutons au playerDiv
//       playerDiv.appendChild(sendTournamentButton);
//       playerDiv.appendChild(authenticateButton);
//     }
//   } else {
//     statusSpan.textContent = '❌ Guest';
//     playerDiv.setAttribute('data-user-id', '');
//   }
//
//   playerDiv.appendChild(statusSpan);
// }



// function setupSubmitHandler() {
//   const submitButton = document.getElementById('submitButton');
//
//   submitButton.onclick = () => {
//     const tournamentName = document.getElementById('tournamentName').value.trim();
//     if (!tournamentName) {
//       alert("The tournament name cannot be empty");
//       return;
//     }
//     localStorage.setItem("tournamentName", tournamentName);
//
//     const players = Array.from(document.getElementById('playerContainer').querySelectorAll('input'))
//       .map(input => input.value.trim())
//       .filter(name => name !== '');
//
//     if (players.length < 2) {
//       alert("At least 2 players are required to create a tournament");
//       return;
//     }
//
//     const numberOfGames = document.getElementById('numberOfGames').value;
//     const pointsToWin = document.getElementById('pointsToWin').value;
//     sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin);
//   };
// }


function setupSubmitHandlers() {
  const validateButton = document.getElementById('validateTournamentName');
  const submitButton = document.getElementById('submitButton');
  const savePlayersButton = document.getElementById('savePlayers');

  validateButton.onclick = () => {
    const tournamentName = document.getElementById('tournamentName').value.trim();
    if (!tournamentName) {
      alert("The tournament name cannot be empty");
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
        alert('Error validating tournament name. Please try again.');
      }
    })
    .catch(error => {
      console.error("Error validating tournament name:", error);
      alert('There was an error validating the tournament name.');
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
      alert("At least 2 players are required to create a tournament");
      return;
    }

    localStorage.setItem("players", JSON.stringify(players));
    alert("Players saved successfully!");
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
  };

  submitButton.onclick = () => {
    const players = JSON.parse(localStorage.getItem("players") || "[]");
    if (players.length < 2) {
      alert("At least 2 players are required to create a tournament");
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
        // Here you might want to handle the UI transition after finalization, like moving to a new page or updating the current one
        alert("Tournament finalized successfully!");
        DisplayTournamentGame(); // Assuming this function shows the tournament game page
      } else {
        alert('Error finalizing tournament. Please try again.');
      }
    })
    .catch(error => {
      console.error("Error finalizing tournament:", error);
      alert('There was an error finalizing the tournament.');
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

// function sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin) {
//     fetch("/api/tournament/new/", {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ 
//             tournament_name: tournamentName,
//             players: players,  // Directly use players array without transforming to objects
//             number_of_games: numberOfGames,
//             points_to_win: pointsToWin
//         }),
//     })    .then((response) => {
//         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//         return response.json();
//     })
//     .then((data) => {
//         console.log("Tournament created:", data);
//         localStorage.setItem("tournamentId", data.tournament_id);
//
//         DisplayTournamentGame();
//     })
//     .catch((error) => {
//         console.error("Error creating tournament:", error);
//     });
// }

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
    alert("Please log in to view your tournaments.");
    return;
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <br>
    <br>
    <button id="toggleAllTournaments">Show all tournaments</button>
    <br>
    <br>
    <div id="userTournamentList"></div>
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
      userTournamentListDiv.innerHTML = "<h3>Your Tournaments:</h3>";
      
      // Ensure data is an array before manipulating it
      const tournaments = Array.isArray(data) ? data : [data]; // Convert single object to array or use as-is if already array

      if (tournaments.length > 0) {
        // Reverse tournaments if it's an array
        const reversedTournaments = Array.isArray(tournaments) ? [...tournaments].reverse() : tournaments;

        reversedTournaments.forEach((tournament) => {
          const tournamentDiv = document.createElement('div');
          const emoji = tournament.is_finished ? '✅' : '🏓';
          tournamentDiv.innerHTML = `
            <p class="${tournament.is_finished ? 'finished' : 'ongoing'}">
              Name: ${tournament.tournament_name} ${emoji}, ID: ${tournament.id}, Date: ${new Date(tournament.date).toLocaleDateString()}
              <button class="selectTournamentButton" data-id="${tournament.id}" data-name="${tournament.tournament_name}">Select</button>
            </p>`;
          userTournamentListDiv.appendChild(tournamentDiv);
        });

        // Filter for ongoing tournaments by default
        filterTournaments('ongoing');

        document.getElementById("toggleAllTournaments").addEventListener('click', () => {
          const button = document.getElementById("toggleAllTournaments");
          if (button.textContent === "Show all tournaments") {
            filterTournaments('all');
            button.textContent = "Show only ongoing tournaments";
          } else {
            filterTournaments('ongoing');
            button.textContent = "Show all tournaments";
          }
        });

        document.querySelectorAll('.selectTournamentButton').forEach(button => {
          button.addEventListener('click', event => {
            const tournamentId = event.target.getAttribute('data-id');
            const tournamentName = event.target.getAttribute('data-name');
            selectTournament(tournamentId, tournamentName);
          });
        });
      } else {
        userTournamentListDiv.innerHTML += "<p>You are not participating in any tournament.</p>";
      }
    })
    .catch((error) => {
      console.error("Error retrieving user's tournaments:", error);
    });

  function filterTournaments(filter) {
    const allTournaments = document.querySelectorAll('#userTournamentList p');
    allTournaments.forEach(tournament => {
      if (filter === 'ongoing') {
        tournament.style.display = tournament.classList.contains('ongoing') ? 'block' : 'none';
      } else if (filter === 'all') {
        tournament.style.display = 'block';
      }
    });
  }
}




