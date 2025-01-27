
import { startGameSetup } from "./pong.js";
import { displayWelcomePage } from "./app.js";

export function DisplayTournamentGame(tournamentName) {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2>Tournois : ${tournamentName}</h2>
    <div id="tournamentMatches"></div>
  `;

  const tournamentId = localStorage.getItem("tournamentId");

  if (!tournamentId) {
    console.error("Aucun ID de tournoi trouvé. Veuillez créer un tournoi d'abord.");
    return;
  } else {
    console.error("L'ID du tournois est: ", tournamentId);
  }

  fetch(`/api/tournament/matches/?tournament_id=${tournamentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const tournamentMatchesDiv = document.getElementById("tournamentMatches");
      tournamentMatchesDiv.innerHTML = "<h3>Liste des matchs :</h3>";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          const date = new Date(match.date_played).toLocaleString();
          const winner = match.winner || "En cours";
          const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;

          let matchHTML = `
            <p>
              ${date} - ${match.player1_name} vs ${match.player2_name} - 
              Score: ${score} - 
              Winner: ${winner}
              <br>
              <small>Nombre de sets à gagner: ${match.sets_to_win}, Points par set: ${match.points_per_set}</small>
          `;

          // Ajoutez un bouton si le score est 0-0
          if (match.player1_sets_won === 0 && match.player2_sets_won === 0) {
            matchHTML += `
              <button class="startGameButton" data-player1="${match.player1_name}" data-player2="${match.player2_name}" data-sets-to-win="${match.sets_to_win}" data-points-per-set="${match.points_per_set}">Commencer le jeu</button>
            `;
          }

          matchHTML += `</p>`;
          tournamentMatchesDiv.innerHTML += matchHTML;
        });

        // Attachez les écouteurs d'événements aux boutons
        document.querySelectorAll('.startGameButton').forEach(button => {
          button.addEventListener('click', event => {
            const player1 = event.target.getAttribute('data-player1');
            const player2 = event.target.getAttribute('data-player2');
            const setsToWin = parseInt(event.target.getAttribute('data-sets-to-win'));
            const pointsPerSet = parseInt(event.target.getAttribute('data-points-per-set'));
            startGameSetup(player1, player2, setsToWin, pointsPerSet, "tournament");
          });
        });
      } else {
        tournamentMatchesDiv.innerHTML += "<p>Aucun match trouvé pour ce tournoi.</p>";
      }
    })
    .catch((error) => {
      console.error("Erreur lors de la récupération des matchs du tournoi:", error);
    });
}

export function createTournamentForm() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    
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
        <button type="button" id="displayTournamentButton">Afficher les matchs du tournoi</button>
      </form>
    `;
    
    const playerContainer = document.getElementById('playerContainer');
    const addButton = document.getElementById('addPlayerButton');
    const submitButton = document.getElementById('submitButton');
    let playerCount = 1;
    let players = [];
    
    addButton.onclick = () => {
        const playerDiv = document.createElement('div');
        playerDiv.innerHTML = `Joueur n° : ${playerCount} <input type="text" placeholder="Pseudo">`;
        playerContainer.appendChild(playerDiv);
        playerCount++;
    };

    submitButton.onclick = () => {
        const tournamentName = document.getElementById('tournamentName').value;
        players = Array.from(playerContainer.children).map(div => div.querySelector('input').value);
        const numberOfGames = document.getElementById('numberOfGames').value;
        const pointsToWin = document.getElementById('pointsToWin').value;
        sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin);
    };

    document.getElementById('displayTournamentButton').addEventListener('click', () => {
        const tournamentName = document.getElementById('tournamentName').value;
        DisplayTournamentGame(tournamentName);
    });

    function sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin) {
        fetch("/api/tournament/new/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                tournament_name: tournamentName, 
                players, 
                number_of_games: numberOfGames, 
                points_to_win: pointsToWin 
            }),
        })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Tournoi créé :", data);
          const tournamentId = data.tournament_id; // Assurez-vous que l'API renvoie l'ID
          // Stockez l'ID du tournoi pour une utilisation future
          localStorage.setItem("tournamentId", tournamentId);
          console.error("Tournament ID :", tournamentId);
        })
        .catch((error) => {
          console.error("Erreur lors de la création du tournoi :", error);
        });
    }
}

export function selectTournament(tournamentId, tournamentName) {
  localStorage.setItem("tournamentId", tournamentId);
  localStorage.setItem("tournamentName", tournamentName);
  DisplayTournamentGame(tournamentName);
}

export function validateSearch() {
  const tournamentName = document.getElementById("tournamentNameInput").value;
  
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <div>
      <input type="text" id="tournamentNameInput" placeholder="Nom du tournoi" />
      <button id="changeTournamentButton" class="btn btn-primary">Changer de tournoi</button>
      <button id="backToWelcomeButton" class="btn btn-secondary">Retour à l'accueil</button>
    </div>
    <div id="tournamentList"></div>
  `;

  document.getElementById("changeTournamentButton").addEventListener("click", () => {
    const tournamentName = document.getElementById("tournamentNameInput").value;
    if (tournamentName) {
      validateSearch(); // Réappeler la fonction pour rechercher le nouveau tournoi
    } else {
      alert("Veuillez entrer un nom de tournoi.");
    }
  });


 document.getElementById("backToWelcomeButton").addEventListener("click", () => {
    const username = localStorage.getItem("username"); // Assurez-vous que le nom d'utilisateur est stocké
    if (username) {
      displayWelcomePage(username);
    } else {
      console.error("Nom d'utilisateur non trouvé dans le stockage local.");
    }
  });


  if (!tournamentName) {
    alert("Veuillez entrer un nom de tournoi.");
    return;
  }

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
