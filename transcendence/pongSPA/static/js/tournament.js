
import { startGameSetup } from "./pong.js";


function displayTournamentGameList(data){
  
  //empty all the containers
  // document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const tournamentName = localStorage.getItem("tournamentName");
  localStorage.setItem("context", "tournament");
  
  const tournamentMatchesDiv = document.getElementById("app_main");
  tournamentMatchesDiv.innerHTML = `
    <h2>Selected Tournament: ${tournamentName}</h2>
    <h3>Match List:</h3>
  `;

  let playButtonDisplayed = false; // Variable pour contrôler l'affichage du bouton

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((match) => {
      const date = new Date(match.date_played).toLocaleString();
      const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;
      
      // Détermine le texte du gagnant ou "match à jouer"
      const winner = (match.player1_sets_won === 0 && match.player2_sets_won === 0) ? "Match to be played" : match.winner || "In progress";

      let matchHTML = `
        <p>
          ${match.player1_name} vs ${match.player2_name}
          <br>
          Score: ${score}
          <br>
          Winner: ${winner}
      `;

      // Afficher le bouton "Commencer le jeu" uniquement pour le premier match à jouer
      if (!playButtonDisplayed && match.player1_sets_won === 0 && match.player2_sets_won === 0) {
        matchHTML += `
          <button class="startGameButton" 
                  data-player1="${match.player1_name}" 
                  data-player2="${match.player2_name}" 
                  data-sets-to-win="${match.sets_to_win}" 
                  data-points-per-set="${match.points_per_set}"
                  data-match-id="${match.id}">Start Game</button>
        `;
        playButtonDisplayed = true; // Mettre à jour la variable pour indiquer que le bouton a été affiché
      }

      matchHTML += `</p>`;
      tournamentMatchesDiv.innerHTML += matchHTML;
    });

    document.querySelectorAll('.startGameButton').forEach(button => {
      button.addEventListener('click', event => {
        const player1 = event.target.getAttribute('data-player1');
        const player2 = event.target.getAttribute('data-player2');
        const setsToWin = parseInt(event.target.getAttribute('data-sets-to-win'));
        const pointsPerSet = parseInt(event.target.getAttribute('data-points-per-set'));
        const matchID = parseInt(event.target.getAttribute('data-match-id'));
        localStorage.setItem("matchID", matchID);

        startGameSetup(player1, player2, setsToWin, pointsPerSet);
      });
    });

    // Ajouter le classement dans app_bottom
    displayTournamentStandings(data);
  }
  else {
    tournamentMatchesDiv.innerHTML += "<p>No match found for this tournament.</p>";
  }
}

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
    console.error("Tournament ID is: ", tournamentId);
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

export function createTournamentForm() {
    
 //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appMain = document.getElementById("app_main");
  if (!appMain) return;

  appMain.innerHTML = getTournamentFormHTML();

  initializePlayerManagement();
  setupSubmitHandler();
}

function getTournamentFormHTML() {
  return `
    <form id="tournamentForm">
      <input type="text" id="tournamentName" placeholder="Tournament Name" required>
      <div id="playerContainer"></div>
      <button type="button" id="addPlayerButton">Add a Player</button>
      <br><br>
      <label for="numberOfGames">Number of Games:</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points to Win:</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <button type="button" id="submitButton">Submit</button>
    </form>
  `;
}

function initializePlayerManagement() {
  const playerContainer = document.getElementById('playerContainer');
  const addButton = document.getElementById('addPlayerButton');
  let playerCount = 1;
  const players = new Set(); // Utiliser un Set pour une vérification rapide de l'unicité

  // Ajout automatique du premier joueur
  addPlayer(playerContainer, playerCount++, localStorage.getItem('username') || '');
  
  addButton.onclick = async () => {
    const inputs = playerContainer.querySelectorAll('input');
    const lastInput = inputs[inputs.length - 1];
    const playerName = lastInput.value.trim();

    if (!playerName) {
      alert("Please fill in the current player's username before adding a new one.");
      return;
    }

    if (players.has(playerName.toLowerCase())) {
      alert("This player is already added.");
      return;
    }

    try {
      const userData = await checkUserExists(playerName);
      updatePlayerStatus(lastInput.parentElement, userData);
      addPlayer(playerContainer, playerCount++);
      players.add(playerName.toLowerCase()); // Ajouter le nom en minuscule pour vérifier l'unicité
    } catch (error) {
      handleError(error, "Error checking user existence");
    }
  };
}

async function checkUserExists(username) {
  const response = await fetch(`/api/user/exists/?username=${encodeURIComponent(username)}`, {
    method: 'GET',
    credentials: 'include'
  });
  return await response.json();
}

function addPlayer(container, count, initialValue = '') {
  const playerDiv = document.createElement('div');
  playerDiv.innerHTML = `Player No.: ${count} <input type="text" placeholder="Pseudo" value="${initialValue}" ${initialValue ? 'readonly' : ''}>`;
  container.appendChild(playerDiv);
}

function updatePlayerStatus(playerDiv, userData) {
  const statusSpan = document.createElement('span');
  statusSpan.style.marginLeft = '10px';

  if (userData.exists) {
    statusSpan.textContent = userData.is_guest ? '❌ Guest' : '✔️  Authenticated';
    playerDiv.setAttribute('data-user-id', userData.is_guest ? '' : userData.user_id);
  } else {
    statusSpan.textContent = '❌ Guest';
    playerDiv.setAttribute('data-user-id', '');
  }

  playerDiv.appendChild(statusSpan);
}

function setupSubmitHandler() {
  const submitButton = document.getElementById('submitButton');
  
  submitButton.onclick = () => {
    const tournamentName = document.getElementById('tournamentName').value.trim();
    if (!tournamentName) {
      alert("The tournament name cannot be empty");
      return;
    }

    localStorage.setItem("tournamentName", tournamentName);

    const players = Array.from(document.getElementById('playerContainer').querySelectorAll('input'))
      .map(input => input.value.trim())
      .filter(name => name !== '');

    if (players.length < 2) {
      alert("At least 2 players are required to create a tournament");
      return;
    }

    const numberOfGames = document.getElementById('numberOfGames').value;
    const pointsToWin = document.getElementById('pointsToWin').value;
    sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin);
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
            players: players,  // Directly use players array without transforming to objects
            number_of_games: numberOfGames,
            points_to_win: pointsToWin
        }),
    })    .then((response) => {
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

  // Supposons que votre API a un endpoint pour obtenir les tournois d'un utilisateur spécifique
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
      
      // Inverser l'ordre des tournois
      const reversedData = data.slice().reverse();

      if (Array.isArray(reversedData) && reversedData.length > 0) {
        reversedData.forEach((tournament) => {
          const tournamentDiv = document.createElement('div');
          const emoji = tournament.is_finished ? '✅' : '🏓';
          tournamentDiv.innerHTML = `
            <p class="${tournament.is_finished ? 'finished' : 'ongoing'}">
              Name: ${tournament.tournament_name} ${emoji}, ID: ${tournament.id}, Date: ${new Date(tournament.date).toLocaleDateString()}
              <button class="selectTournamentButton" data-id="${tournament.id}" data-name="${tournament.tournament_name}">Select</button>
            </p>`;
          userTournamentListDiv.appendChild(tournamentDiv);
        });

        // Filtrer pour n'afficher que les tournois en cours par défaut
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
