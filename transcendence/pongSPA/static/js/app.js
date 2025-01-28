import { startGameSetup } from "./pong.js";
import { createTournamentForm, validateSearch } from "./tournament.js";
import {
  getToken,
  refreshToken,
  deleteAccount,
  logout,
  createAccount,
} from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // Clear all cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  // Clear local storage
  localStorage.clear();

  displayConnectionFormular();
});

export function displayConnectionFormular() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
      <h1>Connexion</h1>
      <form id="loginForm">
        <input type="text" id="username" placeholder="Nom d'utilisateur" required />
        <br>
        <input type="password" id="password" placeholder="Mot de passe" required />
        <br>
        <button type="submit" class="btn btn-success" >Se connecter</button>
      </form>
      <br>
      <button id="signupButton" class="btn btn-primary">Créer un compte</button>
    `;
  setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes

  document
    .getElementById("loginForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      getToken(username, password);
    });

  document
    .getElementById("signupButton")
    .addEventListener("click", displayRegistrationForm);
}

function displayRegistrationForm() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
      <h2>Créer un compte</h2>
      <form id="signupForm">
        <input type="text" id="newUsername" placeholder="Nom d'utilisateur" required />
        <br>
        <input type="password" id="newPassword" placeholder="Mot de passe" required />
        <br>
        <button type="submit">Créer un compte</button>
      </form>
      <br>
      <br>
      <button id="backToLoginButton">Retour à la connexion</button>
    `;

  document
    .getElementById("signupForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const newUsername = document.getElementById("newUsername").value;
      const newPassword = document.getElementById("newPassword").value;
      createAccount(newUsername, newPassword);
    });

  document
    .getElementById("backToLoginButton")
    .addEventListener("click", displayConnectionFormular);
}

export function displayWelcomePage() {
  const username = localStorage.getItem("username");
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2>Bonjour ${username}</h2>
    <br>
    <br>
    <h3>Jouer une partie</h2>
    <button id="playButton">Jouer</button>
    <br>
    <br>
    <h3>Tournoi</h3>
    <b>Créer un nouveau tournoi</b>
    <br>
    <button id="newTournamentButton">Créer un nouveau tournoi</button> 
    <br>
    <br>
    <b>Rechercher un tournoi</b>
    <div id="searchTournament">
      <input type="text" id="tournamentNameInput" placeholder="Nom du tournoi" />
      <button id="tournamentSearchButton" class="btn btn-primary">Rechercher</button>
    </div>
    <br>
    <br>
    <div id="tournamentList"></div>
    <br>
    <h3>Gestion du compte</h3>
    <button id="logoutButton">Déconnexion</button>
    <br>
    <button id="deleteAccountButton" class="btn btn-danger">Supprimer le compte</button>
    <br>
    <br>
    <h3>Statistiques</h3>
    <div id="resultats"></div>
    <button id="viewResultsButton">Vos résultats</button>
    <br>
    <button id="viewRankingButton">Classement général</button> <!-- Nouveau bouton -->
    <div id="ranking"></div> <!-- Div pour afficher le classement -->
  `;

  // Attacher les écouteurs d'événements aux boutons
  document.getElementById("playButton").addEventListener("click", displayGameForm);
  document.getElementById("newTournamentButton").addEventListener("click", createTournamentForm);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
  
  document.getElementById("tournamentSearchButton").addEventListener("click", () => {
    const tournamentNameInput = document.getElementById("tournamentNameInput");
    if (!tournamentNameInput) {
      console.error("L'élément 'tournamentNameInput' n'est pas disponible.");
      return;
    }

    const tournamentName = tournamentNameInput.value;
    if (!tournamentName) {
      alert("Veuillez entrer un nom de tournoi.");
      return;
    }

    localStorage.setItem("tournamentName", tournamentName);
    validateSearch();
  });

  // Ajouter un écouteur d'événement pour le bouton "Classement général"

  document.getElementById("viewResultsButton").addEventListener("click", fetchResultats);
  document.getElementById("viewRankingButton").addEventListener("click", fetchRanking);
}

function fetchResultats() {
  const username = localStorage.getItem("username");
  fetch(`/api/results/?user1=${username}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // Vérifiez ce que vous recevez
      const appDiv = document.getElementById("app");
      appDiv.innerHTML = `
        <button id="backButton" class="btn btn-secondary">Retour</button>
        <h3>Vos résultats :</h3>
        <div id="resultats"></div>
      `;

      const resultatsDiv = document.getElementById("resultats");
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          const date = match.date_played ? new Date(match.date_played).toLocaleString() : "Date inconnue";
          const player1 = match.player1_name || "Joueur 1 inconnu";
          const player2 = match.player2_name || "Joueur 2 inconnu";
          const winner = match.winner || "En cours";
          const score = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
          const tournamentInfo = match.tournament ? ` (Tournoi: ${match.tournament_name || 'Inconnu'})` : "";

          resultatsDiv.innerHTML += `
              <p>
                  ${date} - ${player1} vs ${player2}
                  <br>
                  Score: ${score}
                  <br>
                  Winner: ${winner}${tournamentInfo}
                  <br>
              </p>`;
        });
      } else {
        resultatsDiv.innerHTML += "<p>Aucun résultat trouvé.</p>";
      }

      // Ajoutez un écouteur d'événement pour le bouton de retour
      document.getElementById("backButton").addEventListener("click", () => {
        const username = localStorage.getItem("username");
        if (username) {
          displayWelcomePage(username);
        } else {
          console.error("Nom d'utilisateur non trouvé dans le stockage local.");
        }
      });
    })
    .catch((error) => {
      console.error("Erreur lors de la récupération des résultats:", error);
    });
}

function fetchRanking() {
  fetch("/api/ranking/", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // Vérifiez ce que vous recevez
      const appDiv = document.getElementById("app");
      appDiv.innerHTML = `
        <button id="backButton" class="btn btn-secondary">Retour</button>
        <h3>Classement des joueurs :</h3>
        <div id="ranking"></div>
      `;

      const rankingDiv = document.getElementById("ranking");
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((player) => {
          const playerName = player.name || "Nom inconnu";
          const totalWins = player.total_wins || 0;
          rankingDiv.innerHTML += `
              <p>
                  ${playerName} - Total Wins: ${totalWins}
              </p>`;
        });
      } else {
        rankingDiv.innerHTML += "<p>Aucun classement trouvé.</p>";
      }

      // Ajoutez un écouteur d'événement pour le bouton de retour
      document.getElementById("backButton").addEventListener("click", () => {
        const username = localStorage.getItem("username");
        if (username) {
          displayWelcomePage(username);
        } else {
          console.error("Nom d'utilisateur non trouvé dans le stockage local.");
        }
      });
    })
    .catch((error) => {
      console.error("Erreur lors de la récupération du classement:", error);
    });
}

function displayGameForm() { 

  const username = localStorage.getItem("username");
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h1>Pong Game</h1>
    <form id="gameForm">
      <label for="player1">Player 1 Name:</label>
      <input type="text" id="player1" value="${username} (by default)" readonly><br><br>
      <label for="player2">Player 2 Name:</label>
      <input type="text" id="player2" value="Bot_AI (by default)"><br><br>
      <label for="numberOfGames">Number of Games:</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points to Win:</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <button type="button" id="startGameButton">Start Game</button>
    </form>
    <canvas id="pong" width="800" height="400" style="display: none;"></canvas>
    <div id="result" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>
  `;
  console.log("Valeur de username dans displayGameForm :", username);
  
  document.getElementById("startGameButton").addEventListener("click", () => {
    const player1 = username;
    const player2 = document.getElementById("player2").value.trim();
    const numberOfGames = parseInt(document.getElementById("numberOfGames").value) || 1;
    const pointsToWin = parseInt(document.getElementById("pointsToWin").value) || 3;
    startGameSetup(player1, player2, numberOfGames, pointsToWin, "solo");
  });
}
