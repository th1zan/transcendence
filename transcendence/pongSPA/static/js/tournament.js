
import { showModalConfirmation } from "./auth.js";
import { startGameSetup } from "./pong.js";
import {showModal, logger, navigateTo} from "./app.js";

//menu to display the tournament feature 
export function displayTournament() {

  document.getElementById('app_bottom').innerHTML = '';
  logger.log('Tournament');

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
    <div class="container py-4">
      <ul class="nav nav-pills mb-3 d-flex justify-content-center gap-3" role="tablist">
        <li class="nav-item" role="presentation">
          <button id="myTournamentButton" class="nav-link btn btn-primary px-4 py-2 bg-transparent" type="button" style="font-family: 'Press Start 2P', cursive; font-size: 15px; border-radius: 10px; transition: transform 0.3s ease;">
            My Tournaments
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button id="newTournamentButton" class="nav-link btn btn-primary px-4 py-2 bg-transparent" type="button" style="font-family: 'Press Start 2P', cursive; font-size: 15px; border-radius: 10px; transition: transform 0.3s ease;">
            New Tournament
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <div class="d-flex align-items-center gap-2" id="searchTournament">
            <input 
              type="text" 
              id="tournamentNameInput" 
              class="form-control rounded-pill bg-transparent" 
              placeholder="Tournament Name" 
              style="font-family: 'Press Start 2P', cursive; font-size: 15px; border: 2px solid #007bff;"
            >
            <button id="tournamentSearchButton" class="nav-link btn btn-outline-primary px-4 py-2 bg-transparent" type="button" style="font-family: 'Press Start 2P', cursive; font-size: 15px; border-radius: 10px; transition: transform 0.3s ease;">
              Search
            </button>
          </div>
        </li>
      </ul>
    </div>
  `;

  // Ajouter les événements une seule fois en remplaçant les éléments pour éviter les duplications
  const myTournamentButton = document.getElementById("myTournamentButton");
  const newTournamentButton = document.getElementById("newTournamentButton");
  const tournamentSearchButton = document.getElementById("tournamentSearchButton");

  // Supprimer les anciens écouteurs en clonant les éléments
  myTournamentButton.replaceWith(myTournamentButton.cloneNode(true));
  newTournamentButton.replaceWith(newTournamentButton.cloneNode(true));
  tournamentSearchButton.replaceWith(tournamentSearchButton.cloneNode(true));

  // Réassigner les nouveaux éléments
  document.getElementById("myTournamentButton").addEventListener("click", displayTournament);
  document.getElementById("newTournamentButton").addEventListener("click", createTournamentForm);
  document.getElementById("tournamentSearchButton").addEventListener("click", () => {
    const tournamentNameInput = document.getElementById("tournamentNameInput");
    if (!tournamentNameInput) {
      logger.error("The element 'tournamentNameInput' is not available.");
      return;
    }

    const tournamentName = tournamentNameInput.value;
    if (!tournamentName) {
      showModal('Warning', 'Please enter a tournament name.', 'OK', () => {});
      return;
    }
    localStorage.setItem("tournamentName", tournamentName);
    validateSearch();
  });

  displayUserTournaments();
}

//authenticate a registred user in a tournament
function authenticateNow(playerName, tournamentId) {
  // Bootstrap modal for login
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

  //append modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // show modal using Bootstrap
  const loginModal = document.getElementById('loginModal');
  const modalBootstrap = new bootstrap.Modal(loginModal);
  modalBootstrap.show();

  //formular for authentificaton
  document.getElementById('submitLogin').addEventListener('click', function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    authenticatePlayer(username, password, playerName, tournamentId)
      .then(() => {
        updatePlayerStatusUI(playerName);
        // Hide modal manually 
        modalBootstrap.hide();
        // Remove modal from DOM
        loginModal.remove();
      })
      .catch(error => logger.error("Error during authentication:", error));
  });
}

//ask the API
async function authenticatePlayer(username, password, playerName, tournamentId) {
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

//update the status of a player/user after authenticating for a tournament
function updatePlayerStatusUI(playerName) {
  const playerRows = document.querySelectorAll('#app_main table tbody tr');
  playerRows.forEach(row => {
    const nameCell = row.querySelector('td:first-child');
    const statusCell = row.querySelector('td:nth-child(2)');
    const actionCell = row.querySelector('td:nth-child(3)');

    if (nameCell && nameCell.textContent === playerName) {
      // update status
      statusCell.innerHTML = '<span class="badge bg-success">✔️ Authenticated</span>';
      // delete authentification button
      if (actionCell) {
        actionCell.innerHTML = '';
      }
    }
  });
}

//when a Tournament is selected, display the games linked to the tournament and other stuff
function displayTournamentGameList(data) {
  document.getElementById('app_bottom').innerHTML = '';

  const tournamentName = localStorage.getItem("tournamentName");
  const tournamentId = localStorage.getItem("tournamentId");
  localStorage.setItem("isTournamentMatch", true);


  const tournamentMatchesDiv = document.getElementById("tournamentMatches");

  fetch(`/api/tournament/players/${tournamentId}/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(response => response.json())
    .then(playersData => {
      let playersHTML = `
        <div class="card border-primary border-1 mb-4">
          <div class="card-body">
            <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Players</h3>
            <table class="table table-hover mb-0">
              <thead class="text-dark">
                <tr>
                  <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Name</th>
                  <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Status</th>
                  <th scope="col" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Action</th>
                </tr>
              </thead>
              <tbody>
      `;

      playersData.forEach((player, index) => {
        let statusText = player.guest ? '<span class="badge bg-secondary">🕵️ Guest</span>' : (player.authenticated ? '<span class="badge bg-success">✔️ Authenticated</span>' : '<span class="badge bg-warning text-dark">🔒 Needs authentication</span>');
        let authButton = !player.guest && !player.authenticated ? `<button class="btn btn-success btn-sm auth-button" data-player="${player.name}" data-tournament="${tournamentId}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Authenticate Now</button>` : '';
        let removeButton = index === 0 ? '' : `<button class="btn btn-danger btn-sm remove-button" data-player="${player.name}" data-tournament="${tournamentId}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Remove</button>`;

        playersHTML += `
          <tr>
            <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.name}</td>
            <td class="text-center">${statusText}</td>
            <td class="text-center">${authButton} ${removeButton}</td>
          </tr>
        `;
      });

      playersHTML += '</tbody></table></div></div>';

      let matchesHTML = `
        <div class="card border-primary border-1 mb-4">
          <div class="card-body">
            <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Match List</h3>
          <table class="table table-hover mb-0">
            <thead class="text-dark">
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

        tournamentMatchesDiv.innerHTML = `
          ${playersHTML}
          ${matchesHTML}
        `;
        // Passer le tableau des matchs à displayTournamentRanking
        displayTournamentRanking(data);
      } else {
        tournamentMatchesDiv.innerHTML = `
          ${playersHTML}
          <div class="alert alert-info text-center" role="alert">
            No match found for this tournament.
          </div>
        `;
        displayTournamentRanking(data); // Même ici, passer un tableau vide ou gérer différemment
      }

      document.querySelectorAll('.auth-button').forEach(button => {
        button.addEventListener('click', function() {
          const playerName = this.getAttribute('data-player');
          authenticateNow(playerName, tournamentId);
        });
      });

      document.querySelectorAll('.startGameButton').forEach(button => {
        button.addEventListener('click', async event => {
          const player1 = event.target.getAttribute('data-player1');
          const player2 = event.target.getAttribute('data-player2');
          const setsToWin = parseInt(event.target.getAttribute('data-sets-to-win'));
          const pointsPerSet = parseInt(event.target.getAttribute('data-points-per-set'));
          const matchID = parseInt(event.target.getAttribute('data-match-id'));

          logger.log("Attempting to start match with ID: ", matchID);

          try {
            const response = await fetch(`/api/tournament/start-match/${matchID}/`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              if (response.status === 403) {
                showModal(i18next.t('tournament.organizerRequiredTitle'), i18next.t('tournament.organizerRequiredMsg'), 'OK', () => {});
              } else if (response.status === 400) {
                showModal(i18next.t('tournament.authRequiredTitle'), errorData.error, 'OK', () => {});
              } else if (response.status === 404) {
                showModal(i18next.t('tournament.matchNotFoundTitle'), i18next.t('tournament.matchNotFoundMsg'), 'OK', () => {});
              } else {
                showModal(i18next.t('tournament.errorTitle'), i18next.t('tournament.errorMsg', { detail: errorData.error || 'Unknown error' }), 'OK', () => {});
              }
              return;
            }

            const data = await response.json();
            logger.log("Match validated by backend:", data);

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
            logger.error("Error during match validation or start:", error);
            showModal(i18next.t('tournament.networkErrorTitle'), i18next.t('tournament.networkErrorMsg'), 'OK', () => {});
          }
        });
      });

      document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', () => {
          const playerName = button.getAttribute('data-player');
          const tournamentId = button.getAttribute('data-tournament');
          removePlayerFromTournament(tournamentId, playerName);
        });
      });
    })
    .catch((error) => {
      logger.error("Error retrieving players:", error);
      tournamentMatchesDiv.innerHTML = `
        <div class="alert alert-danger text-center" role="alert">Error loading player information.</div>
      `;
    });
}

// Votre fonction removePlayerFromTournament reste inchangée ici, mais assurez-vous qu'elle appelle displayTournamentGameList correctement
function removePlayerFromTournament(tournamentId, playerName) {
  logger.log("in removePlayerFromTournament:: tournament id: ", tournamentId, " playerName: ", playerName);

  showModalConfirmation(
    i18next.t('tournament.removePlayerConfirmationMsg'),
    i18next.t('tournament.removePlayerConfirmationTitle')
  ).then((confirmed) => {
    if (confirmed) {
      showModal(
        i18next.t('tournament.processingTitle'),
        i18next.t('tournament.processingMsg'),
        "OK",
        () => {
          fetch(`/api/tournament/${tournamentId}/remove-player-matches/${encodeURIComponent(playerName)}/`, {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then(response => {
              if (!response.ok) throw new Error(i18next.t('tournament.removeFailed') + ": " + response.status);
              return response.json();
            })
            .then(data => {
              logger.log(`Player ${playerName} removed from tournament ${tournamentId}`);
              if (data.tournament_deleted) {
                showModal(
                  i18next.t('tournament.tournamentDeletedTitle'),
                  i18next.t('tournament.tournamentDeletedMsg'),
                  "OK",
                  () => {
                    logger.log(`tournament deleted -> redirection to Tournament page`);
                    navigateTo('tournament');
                  }
                );
              } else {
                fetch(`/api/tournament/matches/?tournament_id=${tournamentId}`, {
                  method: "GET",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
                  .then(response => {
                    if (!response.ok) throw new Error("Failed to fetch matches");
                    return response.json();
                  })
                  .then(matchesData => {
                    logger.log("Matches reloaded successfully:", matchesData);
                    displayTournamentGameList(matchesData.matches); // Passer uniquement le tableau matches
                    if (matchesData.is_finished) {
                      showModal(
                        i18next.t('tournament.tournamentFinishedTitle'),
                        i18next.t('tournament.tournamentFinishedMsg'),
                        "OK",
                        () => {}
                      );
                    }
                  })
                  .catch(error => {
                    logger.error("Error reloading matches:", error);
                    showModal(
                      i18next.t('tournament.errorTitle'),
                      i18next.t('tournament.reloadMatchesErrorMsg') || "Failed to reload matches",
                      "OK",
                      () => {}
                    );
                  });
              }
            })
            .catch(error => {
              logger.error("Error removing player:", error);
              showModal(i18next.t('tournament.errorTitle'), i18next.t('tournament.removeErrorMsg'), "OK", () => {});
            });
        },
        null
      );
    }
  });
}



function displayTournamentRanking(data) {
  const appBottom = document.getElementById("app_bottom");

  // Calculer les ranking à partir des données des matchs
  const ranking = calculateStandings(data);

  // Trier les ranking par points marqués en ordre décroissant
  const sortedStandings = ranking.sort((a, b) => b.points_scored - a.points_scored);

  let rankingHTML = `
    <div class="card border-primary border-1 mb-4">
      <div class="card-body">
        <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Standings</h3>
        <table class="table table-striped table-hover mb-0">
          <thead class="text-dark"">
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

    rankingHTML += `
      <tr class="${rowClass}">
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.name}</td>
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.wins}</td>
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.points_scored}</td>
        <td class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${player.points_conceded}</td>
      </tr>
    `;
  });

  rankingHTML += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  appBottom.innerHTML = rankingHTML;
}


function calculateStandings(matches) {
  let ranking = {};
  matches.forEach(match => {
    const players = [match.player1_name, match.player2_name];
    players.forEach(player => {
      if (!ranking[player]) {
        ranking[player] = { name: player, wins: 0, points_scored: 0, points_conceded: 0 };
      }
    });

    if (match.sets && match.sets.length > 0) {
      match.sets.forEach(set => {
        ranking[match.player1_name].points_scored += set.player1_score;
        ranking[match.player1_name].points_conceded += set.player2_score;
        ranking[match.player2_name].points_scored += set.player2_score;
        ranking[match.player2_name].points_conceded += set.player1_score;
      });

      if (match.winner) {
        ranking[match.winner].wins += 1;
      }
    }
  });
  return Object.values(ranking);
}


//display a list of Tournament's Games for a Tournament research based on Tournament ID
export function DisplayTournamentGame() {
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const tournamentName = localStorage.getItem("tournamentName");
  const tournamentId = localStorage.getItem("tournamentId");

  logger.log("Tournament name: ", tournamentName);

  if (!tournamentId) {
    logger.error("No tournament ID found. Please create a tournament first.");
    return;
  } else {
    logger.log("Tournament ID is: ", tournamentId);
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Tournament: ${tournamentName}</h2>
    <div id="tournamentStatus" class="text-center mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 18px;"></div>
    <div id="tournamentMatches"></div>
    <div id="game_panel" style="display: none;">
      <h2 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Game Results</h2>
      <p id="summary" style="font-family: 'Press Start 2P', cursive; font-size: 15px;"></p>
    </div>
  `;

  const statusElement = document.getElementById("tournamentStatus");
  fetch(`/api/tournament/matches/?tournament_id=${tournamentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      displayTournamentGameList(data.matches);
      if (data.is_finished) {
        statusElement.textContent = i18next.t('tournament.tournamentFinishedTitle');
        statusElement.classList.add("text-success");
      } else {
        statusElement.textContent = i18next.t('tournament.tournamentInProgress');
        statusElement.classList.add("text-warning");
      }
    })
    .catch((error) => {
      logger.error("Error retrieving tournament matches:", error);
      statusElement.textContent = "Error loading tournament";
    });
}

//create a Tournament form
export function createTournamentForm() {
  //empty all the containers
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appMain = document.getElementById("app_main");
  if (!appMain) return;

  appMain.innerHTML = getTournamentFormHTML();

  // Wait for the complete update of the DOM before calling initializePlayerManagement et setupSubmitHandlers
  requestAnimationFrame(() => {
    initializePlayerManagement();
    setupSubmitHandlers();
  });
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
                <label for="numberOfGames" class="form-label text-dark" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Sets per Game:</label>
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
                <label for="pointsToWin" class="form-label text-dark" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Points to Win a Set:</label>
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


//Handling the adding of player (check if existing playerName, or existing re)
async function initializePlayerManagement() {
  const playerContainer = document.getElementById('playerContainer');
  const addButton = document.getElementById('addPlayerButton');
  let playerCount = 1;
  const players = new Map();

  if (!playerContainer || !addButton) return;

  // Add host player automatically
  const hostPlayerName = localStorage.getItem('username') || '';
  const hostPlayerDiv = addPlayer(playerContainer, playerCount++, hostPlayerName, true);
  updatePlayerStatus(hostPlayerDiv, { exists: true, is_guest: false, user_id: "host" });
  players.set(hostPlayerName.toLowerCase(), { validated: true, div: hostPlayerDiv });

  // Add an empty field for Player 2
  const player2Div = addPlayer(playerContainer, playerCount++, '', false);
  players.set('', { validated: false, div: player2Div });

  // Event listener for checking player on blur (sans vérification des doublons)
  playerContainer.addEventListener('blur', async (event) => {
    if (event.target.tagName === 'INPUT') {
      const playerDiv = event.target.closest('div');
      const playerName = playerDiv.querySelector('input').value.trim().toLowerCase();

      if (!playerName) return; // Ignorer si vide, pas de modale ici

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
      logger.log(`Removed player: ${playerName}`);
      cleanupPlayersMap(players);
    }
  });

  // Event listener for adding new player line
  addButton.addEventListener('click', () => {
    const newPlayerDiv = addPlayer(playerContainer, playerCount++, '', false);
    players.set('', { validated: false, div: newPlayerDiv });
    logger.log("New player line added");
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
      ${!isHost ? '<button class="btn btn-sm remove-player">❌ remove</button>' : ''}
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


//check if registred user exist (and will need authentification)
export async function checkUserExists(username) {
const response = await fetch(`/api/user/exists/?username=${encodeURIComponent(username)}`, {
  method: 'GET',
  credentials: 'include'
});
return await response.json();
}

//check if the player (pseudo) exists. Not a problem, but needs a confimation
export async function checkPlayerExists(playerName) {
const response = await fetch(`/api/player/exists/?player_name=${encodeURIComponent(playerName)}`, {
  method: 'GET',
  credentials: 'include'
});
return await response.json();
}

export function updatePlayerStatus(playerDiv, userData) {
// Check if there's already a status for this player
let statusSpan = playerDiv.querySelector('.status-text'); 
if (!statusSpan) {
  // if not, create a status
  statusSpan = document.createElement('span');
  statusSpan.className = 'status-text me-2';
  playerDiv.insertBefore(statusSpan, playerDiv.querySelector('.remove-player') || null);
} else {
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
  statusSpan.textContent = '✔️ ';
  playerDiv.setAttribute('data-user-id', "host");
  playerDiv.setAttribute('data-is-guest', 'false');
  playerDiv.setAttribute('data-authenticated', 'true');
}
}


function resetTournamentData() {
  localStorage.removeItem("tournamentName");
  localStorage.removeItem("tournamentId");
  localStorage.removeItem("players");
}

//big function to handle the creation of a Tournament with the tournament form
function setupSubmitHandlers() {
  const validateButton = document.getElementById('validateTournamentName');
  const submitButton = document.getElementById('submitButton');
  const savePlayersButton = document.getElementById('savePlayers');

  if (!validateButton || !submitButton || !savePlayersButton) {
    logger.error('One or more buttons not found in DOM');
    return;
  }

  function resetTournamentData() {
    localStorage.removeItem("tournamentName");
    localStorage.removeItem("tournamentId");
    localStorage.removeItem("players");
  }

  validateButton.onclick = null;
  submitButton.onclick = null;
  savePlayersButton.onclick = null;

  validateButton.onclick = () => {
    resetTournamentData();
    const tournamentName = document.getElementById('tournamentName')?.value.trim();
    if (!tournamentName) {
      showModal('Error', 'The tournament name cannot be empty', 'OK', () => {});
      return;
    }
    fetch("/api/tournament/new/", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament_name: tournamentName }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.tournament_id && data.message.includes("Tournament created successfully")) {
        localStorage.setItem("tournamentName", data.tournament_name);
        localStorage.setItem("tournamentId", data.tournament_id);
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
      } else {
        showModal('Error', `Error validating tournament name: ${data.error || 'Unknown error'}`, 'OK', () => {});
      }
    })
    .catch(error => {
      logger.error("Error validating tournament name:", error);
      showModal('Error', 'There was an error validating the tournament name.', 'OK', () => {});
    });
  };

  savePlayersButton.onclick = () => {
    const playerDivs = document.getElementById('playerContainer')?.querySelectorAll('div') || [];
    const players = Array.from(playerDivs).map(div => ({
      name: div.querySelector('input').value.trim().toLowerCase(),
      div: div,
      authenticated: div.getAttribute('data-authenticated') === 'true',
      guest: div.getAttribute('data-is-guest') === 'true'
    })).filter(player => player.name !== '');

    if (players.length < 2) {
      showModal('Error', 'At least 2 players are required to create a tournament', 'OK', () => {});
      return;
    }

    // Vérification des doublons
    const playerNames = players.map(player => player.name);
    const uniqueNames = new Set(playerNames);
    if (uniqueNames.size !== playerNames.length) {
      const duplicateName = playerNames.find((name, index) => playerNames.indexOf(name) !== index);
      const duplicateDiv = players.find(player => player.name === duplicateName).div;
      showModal(
        i18next.t('tournament.duplicatePlayerTitle') || 'Duplicate Player Detected',
        i18next.t('tournament.duplicatePlayerMsg') || 'Duplicate player(s) detected. Please choose a different name.',
        'OK',
        () => {
          duplicateDiv.querySelector('input').focus();
        }
      );
      return;
    }

    // Si pas de doublons, enregistrer les joueurs et passer à l’étape 3
    const playerData = players.map(player => ({
      name: player.name,
      authenticated: player.authenticated,
      guest: player.guest
    }));
    localStorage.setItem("players", JSON.stringify(playerData));
    showModal('Success', 'Players saved successfully!', 'OK', () => {
      logger.log("Players saved, moving to step 3");
      const step2 = document.getElementById('step2');
      const step3 = document.getElementById('step3');
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'block';
    });
  };

  submitButton.onclick = () => {
    const players = JSON.parse(localStorage.getItem("players") || "[]");
    if (players.length < 2) {
      showModal('Error', 'At least 2 players are required to create a tournament', 'OK', () => {});
      return;
    }

    const numberOfGames = document.getElementById('numberOfGames')?.value;
    const pointsToWin = document.getElementById('pointsToWin')?.value;
    const tournamentId = localStorage.getItem("tournamentId");

    if (!numberOfGames || !pointsToWin) {
      showModal('Error', 'Please specify the number of games and points to win', 'OK', () => {});
      return;
    }

    fetch(`/api/tournament/finalize/${tournamentId}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: players,
        number_of_games: numberOfGames,
        points_to_win: pointsToWin
      }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.message) {
        logger.log("Tournament finalized:", data);
        showModal('Success', 'Tournament finalized successfully!', 'OK', () => {
          logger.log("Finalizing tournament, launching game");
          DisplayTournamentGame();
        });
      } else {
        showModal('Error', 'Error finalizing tournament. Please try again.', 'OK', () => {});
      }
    })
    .catch(error => {
      logger.error("Error finalizing tournament:", error);
      showModal('Error', 'There was an error finalizing the tournament.', 'OK', () => {});
    });
  };
}

export function handleError(error, message) {
  logger.error(message, error);
  showModal(
    'Error',
    message,
    'OK',
    () => {}
  );
}


export function selectTournament(tournamentId, tournamentName) {
localStorage.setItem("tournamentId", tournamentId);
localStorage.setItem("tournamentName", tournamentName);
DisplayTournamentGame();
}

export function validateSearch() {
  
  document.getElementById('app_bottom').innerHTML = '';

  let tournamentName;

  //check the local storage first 
  tournamentName = localStorage.getItem("tournamentName");

  if (!tournamentName) {
    showModal(
      'Warning',
      'Please enter a tournament name.',
      'OK',
      () => {}
    );
    return;
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <div class="container mt-4">
      <div class="card mb-4 shadow-sm border-primary border-1 bg-transparent">
        <div class="card-body p-3">
          <div class="card shadow-sm border-primary border-1">
            <div class="card-header text-center">
              <h2 class="display-6 mb-0 text-primary">Tournaments Found</h2>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive bg-transparent" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-hover bg-transparent">
                  <thead class="bg-transparent text-white">
                    <tr>
                      <th scope="col" class="text-center bg-transparent" data-priority="1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Tournament Name</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="2" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Status</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="3" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">ID</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="4" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Date</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="2" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Action</th>
                    </tr>
                  </thead>
                  <tbody id="tournamentBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  fetch(`/api/tournaments/?name=${tournamentName}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const tournamentBody = document.getElementById("tournamentBody");
      // Ensure data is an array before manipulating it
      const tournaments = Array.isArray(data) ? data : [data]; // Convert single object to array or use as-is if already array

      if (tournaments.length > 0) {
        tournaments.forEach((tournament) => {
          const emoji = tournament.is_finished ? '✅' : '🏓';
          const statusBadge = tournament.is_finished ? 
            '<span class="badge bg-success">Finished</span>' : 
            '<span class="badge bg-info text-dark">Ongoing</span>';

          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${tournament.tournament_name} ${emoji}</td>
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${statusBadge}</td>
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${tournament.id}</td>
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${new Date(tournament.date).toLocaleDateString()}</td>
            <td class="text-center align-middle">
              <button class="btn btn-primary btn-sm selectTournamentButton shadow rounded" data-id="${tournament.id}" data-name="${tournament.tournament_name}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
                <i class="bi bi-play-fill"></i> Select
              </button>
            </td>
          `;
          tournamentBody.appendChild(row);
        });

        // Select button
        document.querySelectorAll('.selectTournamentButton').forEach(button => {
          button.addEventListener('click', event => {
            const tournamentId = event.target.getAttribute('data-id');
            const tournamentName = event.target.getAttribute('data-name');
            selectTournament(tournamentId, tournamentName);
          });
        });
      } else {
        tournamentBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">No tournament found with that name.</td>
          </tr>
        `;
      }
    })
    .catch((error) => {
      logger.error("Error while searching for tournaments:", error);
      const tournamentBody = document.getElementById("tournamentBody");
      tournamentBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
            Error loading tournament information: ${error.message}
          </td>
        </tr>
      `;
    });
}

export function displayUserTournaments() {
  const username = localStorage.getItem("username");

  if (!username) {
    showModal('Login Required', 'Please log in to view your tournaments.', 'OK', function() {});
    return;
  }

  const appMain = document.getElementById("app_main");
  appMain.className = "semi-transparent-bg flex-grow-1 p-3 text-dark";
  appMain.innerHTML = `
    <div class="card mb-4 shadow-sm border-primary border-1 bg-transparent">
      <div class="card-body p-3">
        <div class="mb-4">
          <button id="toggleAllTournaments" class="btn btn-secondary btn-sm shadow-sm rounded-pill">Show all tournaments</button>
        </div>
        <div id="userTournamentList">
          <div class="card shadow-sm border-primary border-1 bg-transparent">
            <div class="card-header text-center bg-transparent" style="background: white;">
              <h2 class="display-6 mb-0 text-primary">Your Tournaments</h2>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-hover">
                  <thead class="bg-transparent text-white">
                    <tr>
                      <th scope="col" class="text-center bg-transparent" data-priority="1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Tournament Name</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="2" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Status</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="3" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">ID</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="4" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Date</th>
                      <th scope="col" class="text-center bg-transparent" data-priority="2" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Action</th>
                    </tr>
                  </thead>
                  <tbody id="tournamentsBody"></tbody>
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
      const tournamentsBody = document.getElementById("tournamentsBody");
      tournamentsBody.innerHTML = ''; // Réinitialiser le contenu pour éviter les duplications

      const tournaments = Array.isArray(data) ? data : [data];

      if (tournaments.length > 0) {
        const reversedTournaments = Array.isArray(tournaments) ? [...tournaments].reverse() : tournaments;

        reversedTournaments.forEach((tournament) => {
          const emoji = tournament.is_finished ? '✅' : '🏓';
          const statusBadge = tournament.is_finished ? 
            '<span class="badge bg-success">Finished</span>' : 
            '<span class="badge bg-info text-dark">Ongoing</span>';

          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${tournament.tournament_name} ${emoji}</td>
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${statusBadge}</td>
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${tournament.id}</td>
            <td class="text-center align-middle" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">${new Date(tournament.date).toLocaleDateString()}</td>
            <td class="text-center align-middle">
              <button class="btn btn-primary btn-sm selectTournamentButton shadow rounded" data-id="${tournament.id}" data-name="${tournament.tournament_name}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
                <i class="bi bi-play-fill"></i> Select
              </button>
            </td>
          `;
          tournamentsBody.appendChild(row);
        });

        filterTournaments('ongoing');

        const toggleButton = document.getElementById("toggleAllTournaments");
        toggleButton.replaceWith(toggleButton.cloneNode(true)); // Réinitialiser le bouton pour éviter les anciens écouteurs
        const newToggleButton = document.getElementById("toggleAllTournaments");
        newToggleButton.addEventListener('click', () => {
          if (newToggleButton.textContent.includes("Show all tournaments")) {
            filterTournaments('all');
            newToggleButton.textContent = "Show only ongoing tournaments";
            newToggleButton.classList.remove('btn-secondary');
            newToggleButton.classList.add('btn-info');
          } else {
            filterTournaments('ongoing');
            newToggleButton.textContent = "Show all tournaments";
            newToggleButton.classList.remove('btn-info');
            newToggleButton.classList.add('btn-secondary');
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
        tournamentsBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
              You are not participating in any tournament.
            </td>
          </tr>
        `;
      }
    })
    .catch((error) => {
      logger.error("Error retrieving user's tournaments:", error);
      const tournamentsBody = document.getElementById("tournamentsBody");
      tournamentsBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
            Error loading tournament information.
          </td>
        </tr>
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
