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
  	<div class="container mt-5 custom-container">
		  <h1 class="text-center custom-title">Bienvenue sur la page d'accueil</h1>
	  </div>
    <div class="d-flex justify-content-center align-items-center" style="min-height: 75vh; background-color: #f8f9fa;">
      <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
        <h2 class="text-center mb-5" style="font-size: 2.5rem; color: #007bff;">Connexion</h2>
        <form id="loginForm">
          <div class="form-group mb-4">
            <label for="username" style="font-size: 1.3rem;"><i class="bi bi-person"></i> Nom d'utilisateur</label>
            <input 
              type="text" 
              id="username" 
              class="form-control form-control-lg" 
              placeholder="Entrez votre nom" 
              required 
            />
          </div>
          <div class="form-group mb-5">
            <label for="password" style="font-size: 1.3rem;"><i class="bi bi-lock"></i> Mot de passe</label>
            <input 
              type="password" 
              id="password" 
              class="form-control form-control-lg" 
              placeholder="Entrez votre mot de passe" 
              required 
            />
          </div>
          <button 
            type="submit" 
            class="btn btn-success w-100 py-3" 
            style="font-size: 1.3rem;">
            Se connecter
          </button>
        </form>
        <button 
          id="signupButton" 
          class="btn btn-primary w-100 mt-4 py-3" 
          style="font-size: 1.3rem;">
          Créer un compte
        </button>
      </div>
    </div>
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

// creation du compte 
function displayRegistrationForm() {
  const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <div class="d-flex justify-content-center align-items-center" style="min-height: 75vh; background-color: #f8f9fa;">
      <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
        <h2 class="text-center mb-5" style="color: #007bff; font-size: 2.5rem;">Créer un compte</h2>
        <form id="signupForm">
          <div class="form-group mb-4">
            <label for="newUsername" style="font-size: 1.2rem;"><i class="bi bi-person"></i> Nom d'utilisateur</label>
            <input 
              type="text" 
              id="newUsername" 
              class="form-control form-control-lg" 
              placeholder="Entrez votre nom d'utilisateur" 
              required 
            />
          </div>
          <div class="form-group mb-5">
            <label for="newPassword" style="font-size: 1.2rem;"><i class="bi bi-lock"></i> Mot de passe</label>
            <input 
              type="password" 
              id="newPassword" 
              class="form-control form-control-lg" 
              placeholder="Entrez votre mot de passe" 
              required 
            />
          </div>
          <button 
            type="submit" 
            class="btn btn-success w-100 py-3" 
            style="font-size: 1.3rem;">
            Créer le compte
          </button>
        </form>
        <button 
          id="backToLoginButton" 
          class="btn btn-primary w-100 mt-4 py-3" 
          style="font-size: 1.3rem;">
          Retour à la connexion
        </button>
      </div>
    </div>
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

export function displayWelcomePage(username) {
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
  `;

  // Afficher les résultats
  fetchResultats(username);

  // Attacher les écouteurs d'événements aux boutons
  document.getElementById("playButton").addEventListener("click", () => {
    displayGameForm(username); // Affiche le formulaire de jeu
  });
  
  document.getElementById("newTournamentButton").addEventListener("click", createTournamentForm);
  document.getElementById("tournamentSearchButton").addEventListener("click", validateSearch);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
}

function fetchResultats(username) {
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
      const resultatsDiv = document.getElementById("resultats");
      resultatsDiv.innerHTML = "<h3>Vos résultats :</h3>";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          // Vérifiez et utilisez les bonnes propriétés
          const date = match.date_played ? new Date(match.date_played).toLocaleString() : "Date inconnue";
          const user1 = match.user1 || "Joueur 1 inconnu";
          const user2 = match.user2 || "Joueur 2 inconnu";
          const winner = match.winner || "En cours";
          const score = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
          const tournamentInfo = match.tournament ? ` (Tournoi: ${match.tournament_name || 'Inconnu'})` : "";

          resultatsDiv.innerHTML += `
              <p>
                  ${date} - ${user1} vs ${user2} - 
                  Score: ${score} - 
                  Winner: ${winner}${tournamentInfo}
                  <br>
                  <small>Nombre de sets à gagner: ${match.sets_to_win}, Points par set: ${match.points_per_set}</small>
              </p>`;
        });
      } else {
        resultatsDiv.innerHTML += "<p>Aucun résultat trouvé.</p>";
      }
    })
    .catch((error) => {
      console.error("Erreur lors de la récupération des résultats:", error);
    });
}


function displayGameForm(username) {
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
