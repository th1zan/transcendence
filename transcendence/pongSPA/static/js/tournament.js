
import { startGameSetup } from "./pong.js";
import { displayTournament, displayWelcomePage } from "./app.js";


function displayTournamentGameList(data){

  const appBottom = document.getElementById("app_bottom");
  appBottom .innerHTML = ``;

  const tournamentMatchesDiv = document.getElementById("app_main");
  tournamentMatchesDiv.innerHTML = "<h3>Liste des matchs :</h3>";

  let playButtonDisplayed = false; // Variable pour contrôler l'affichage du bouton

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((match) => {
      const date = new Date(match.date_played).toLocaleString();
      const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;
      
      // Détermine le texte du gagnant ou "match à jouer"
      const winner = (match.player1_sets_won === 0 && match.player2_sets_won === 0) ? "Match à jouer" : match.winner || "En cours";

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
                  data-match-id="${match.id}">Commencer le jeu</button>
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

        startGameSetup(player1, player2, setsToWin, pointsPerSet, "tournament");
      });
    });
  }
  else {
    tournamentMatchesDiv.innerHTML += "<p>Aucun match trouvé pour ce tournoi.</p>";
  }
}

export function DisplayTournamentGame() {
  const tournamentName = localStorage.getItem("tournamentName");
  const tournamentId = localStorage.getItem("tournamentId");

  console.log("Nom du tournois: ", tournamentName);
  if (!tournamentId) {
    console.error("Aucun ID de tournoi trouvé. Veuillez créer un tournoi d'abord.");
    return;
  } else {
    console.error("L'ID du tournois est: ", tournamentId);
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <h2>Tournois : ${tournamentName}</h2>
    <div id="tournamentMatches"></div>    
    <div id="game_panel" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>    
    <!-- <button id="backToSearchButton" class="btn btn-secondary">Retour à la recherche</button> -->
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
      console.error("Erreur lors de la récupération des matchs du tournoi:", error);
    })
}

export function createTournamentForm() {
  const appMain = document.getElementById("app_main");
  if (!appMain) return;

  appMain.innerHTML = getTournamentFormHTML();

  initializePlayerManagement();
  setupSubmitHandler();
}

function getTournamentFormHTML() {
  return `
    <form id="tournamentForm">
      <input type="text" id="tournamentName" placeholder="Nom du tournoi" required>
      <div id="playerContainer"></div>
      <button type="button" id="addPlayerButton">Ajouter un joueur</button>
      <br><br>
      <label for="numberOfGames">Nombre de jeux :</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points à gagner :</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <button type="button" id="submitButton">Soumettre</button>
    </form>
  `;
}

function initializePlayerManagement() {
  const playerContainer = document.getElementById('playerContainer');
  const addButton = document.getElementById('addPlayerButton');
  let playerCount = 1;

  // Ajout automatique du premier joueur
  addPlayer(playerContainer, playerCount++, localStorage.getItem('username') || '');
  
  addButton.onclick = async () => {
    const inputs = playerContainer.querySelectorAll('input');
    const lastInput = inputs[inputs.length - 1];
    const playerName = lastInput.value.trim();

    if (!playerName) {
      alert("Veuillez remplir le pseudo du joueur actuel avant d'ajouter un nouveau");
      return;
    }

    try {
      const userData = await checkUserExists(playerName);
      updatePlayerStatus(lastInput.parentElement, userData);
      addPlayer(playerContainer, playerCount++);
    } catch (error) {
      handleError(error, "Erreur lors de la vérification de l'utilisateur");
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
  playerDiv.innerHTML = `Joueur n° : ${count} <input type="text" placeholder="Pseudo" value="${initialValue}" ${initialValue ? 'readonly' : ''}>`;
  container.appendChild(playerDiv);
}

function updatePlayerStatus(playerDiv, userData) {
  const statusSpan = document.createElement('span');
  statusSpan.style.marginLeft = '10px';

  if (userData.exists) {
    statusSpan.textContent = userData.is_guest ? '❌ Invité' : '✔️ Authentifié';
    playerDiv.setAttribute('data-user-id', userData.is_guest ? '' : userData.user_id);
  } else {
    statusSpan.textContent = '❌ Invité';
    playerDiv.setAttribute('data-user-id', '');
  }

  playerDiv.appendChild(statusSpan);
}

function setupSubmitHandler() {
  const submitButton = document.getElementById('submitButton');
  
  submitButton.onclick = () => {
    const tournamentName = document.getElementById('tournamentName').value.trim();
    if (!tournamentName) {
      alert("Le nom du tournoi ne peut pas être vide");
      return;
    }

    localStorage.setItem("tournamentName", tournamentName);

    const players = Array.from(document.getElementById('playerContainer').querySelectorAll('input'))
      .map(input => input.value.trim())
      .filter(name => name !== '');

    if (players.length < 2) {
      alert("Au moins 2 joueurs sont nécessaires pour créer un tournoi");
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

// export function createTournamentForm() {
//     const appMain = document.getElementById("app_main");
//     appMain.innerHTML = `
//      <form id="tournamentForm">
//         <input type="text" id="tournamentName" placeholder="Nom du tournoi" required>
//         <div id="playerContainer"></div>
//         <button type="button" id="addPlayerButton">Ajouter un joueur</button>
//         <br><br>
//         <label for="numberOfGames">Nombre de jeux :</label>
//         <input type="number" id="numberOfGames" value="1" min="1"><br><br>
//         <label for="pointsToWin">Points à gagner :</label>
//         <input type="number" id="pointsToWin" value="3" min="1"><br><br>
//         <button type="button" id="submitButton">Soumettre</button>
//       </form>
//     `;
//
//     const playerContainer = document.getElementById('playerContainer');
//     const addButton = document.getElementById('addPlayerButton');
//     const submitButton = document.getElementById('submitButton');
//     let playerCount = 1;
//     let players = [];
//
//     // Ajout automatique du premier joueur
//     const username = localStorage.getItem('username');
//     const initialPlayerDiv = document.createElement('div');
//     initialPlayerDiv.innerHTML = `
//         Joueur n° : ${playerCount} 
//         <input type="text" 
//                placeholder="Pseudo" 
//                value="${username || ''}" 
//                ${username ? 'readonly' : ''}>
//     `;
//     playerContainer.appendChild(initialPlayerDiv);
//     playerCount++;
//
//     addButton.onclick = async () => {
//         const inputs = playerContainer.querySelectorAll('input');
//         const lastInput = inputs[inputs.length - 1];
//         const playerName = lastInput.value.trim();
//
//         if (!playerName) {
//             alert("Veuillez remplir le pseudo du joueur actuel avant d'ajouter un nouveau");
//             return;
//         }
//
//         try {
//             const response = await fetch(`/api/user/exists/?username=${encodeURIComponent(playerName)}`, {
//                 method: 'GET',
//                 credentials: 'include'
//             });
//             const data = await response.json();
//
//             const playerDiv = lastInput.parentElement;
//             const statusSpan = document.createElement('span');
//             statusSpan.style.marginLeft = '10px';
//
//             if (data.exists) {
//                 if (data.is_guest) {
//                     statusSpan.textContent = '❌ Invité';
//                     playerDiv.setAttribute('data-user-id', '');
//                 } else {
//                     statusSpan.textContent = '✔️ Authentifié';
//                     playerDiv.setAttribute('data-user-id', data.user_id);
//                 }
//             } else {
//                 statusSpan.textContent = '❌ Invité';
//                 playerDiv.setAttribute('data-user-id', '');
//             }
//
//             playerDiv.appendChild(statusSpan);
//
//             // Ajouter un nouveau champ seulement après validation
//             const newPlayerDiv = document.createElement('div');
//             newPlayerDiv.innerHTML = `Joueur n° : ${playerCount} <input type="text" placeholder="Pseudo">`;
//             playerContainer.appendChild(newPlayerDiv);
//             playerCount++;
//
//         } catch (error) {
//             console.error("Erreur lors de la vérification de l'utilisateur :", error);
//             alert("Erreur lors de la vérification de l'utilisateur");
//         }
//     };
//
//      submitButton.onclick = () => {
//     const tournamentName = document.getElementById('tournamentName').value.trim();
//
//     // Vérification du nom du tournoi
//     if (!tournamentName) {
//         alert("Le nom du tournoi ne peut pas être vide");
//         return;
//     }
//
//     localStorage.setItem("tournamentName", tournamentName);
//
//     players = Array.from(playerContainer.querySelectorAll('input'))
//         .map(input => input.value.trim())
//         .filter(name => name !== '');
//
//     if (players.length < 2) {
//         alert("Au moins 2 joueurs sont nécessaires pour créer un tournoi");
//         return;
//     }
//     // Affichage du contenu de players dans la console
//     // console.log("Players array:", players);
//
//     const numberOfGames = document.getElementById('numberOfGames').value;
//     const pointsToWin = document.getElementById('pointsToWin').value;
//     sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin);
// };
// }

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
        console.log("Tournoi créé :", data);
        localStorage.setItem("tournamentId", data.tournament_id);
      
        DisplayTournamentGame();
    })
    .catch((error) => {
        console.error("Erreur lors de la création du tournoi :", error);
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
      alert("Veuillez entrer un nom de tournoi.");
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
      tournamentListDiv.innerHTML = "<h3>Tournois trouvés :</h3>";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((tournament) => {
          const tournamentDiv = document.createElement('div');
          tournamentDiv.innerHTML = `
            <p>
              Nom: ${tournament.tournament_name}, ID: ${tournament.id}, Date: ${new Date(tournament.date).toLocaleDateString()}
              <button class="selectTournamentButton" data-id="${tournament.id}" data-name="${tournament.tournament_name}">Sélectionner</button>
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
        tournamentListDiv.innerHTML += "<p>Aucun tournoi trouvé avec ce nom.</p>";
      }
    })
    .catch((error) => {
      console.error("Erreur lors de la recherche des tournois:", error);
    });
}
