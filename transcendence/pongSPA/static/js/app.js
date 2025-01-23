import { startGameSetup } from "./pong.js";
import { createTournamentForm } from "./tournament.js";
import { getToken, refreshToken, deleteAccount, logout, createAccount } from "./auth.js";

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

function displayConnectionFormular() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
      <h2>Connexion !!!</h2>
      <form id="loginForm">
        <input type="text" id="username" class="form-control" placeholder="Nom d'utilisateur" required />
        <input type="password" id="password" placeholder="Mot de passe" required />
        <button type="submit" class="btn btn-success" >Se connecter</button>
      </form>
      <button id="newTournamentButton">Créer un nouveau tournoi</button> 
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
  document
    .getElementById("newTournamentButton")
    .addEventListener("click", createTournamentForm);
}



function displayRegistrationForm() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
      <h2>Créer un compte</h2>
      <form id="signupForm">
        <input type="text" id="newUsername" placeholder="Nom d'utilisateur" required />
        <input type="password" id="newPassword" placeholder="Mot de passe" required />
        <button type="submit">Créer un compte</button>
      </form>
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


export function displayWelcomePage(username) {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2>Bonjour ${username}</h2>
    <div id="resultats"></div>
    <button id="playButton">Jouer</button>
    <button id="logoutButton">Déconnexion</button>
    <button id="deleteAccountButton" class="btn btn-danger">Supprimer le compte</button>
  `;

  fetchResultats(username);
  // Attach event listeners to buttons
  document
    .getElementById("deleteAccountButton")
    .addEventListener("click", deleteAccount);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("playButton").addEventListener("click", () => {
    displayGameForm(username); // Affiche le formulaire de jeu
  });
}

function fetchResultats(username) {
  // const token = localStorage.getItem("access_token");
  // if (!token) {
  //   console.error("Token non trouvé. Veuillez vous reconnecter.");
  //   return;
  // }

  fetch(`/api/results/?user1=${username}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const resultatsDiv = document.getElementById("resultats");
      resultatsDiv.innerHTML = "<h3>Vos résultats :</h3>";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          // Ajustez selon la structure de votre PongMatch
          const date = new Date(match.date_played).toLocaleString();
          const tournamentInfo = match.tournament
            ? ` (Tournoi: ${match.tournament_name})`
            : "";
          const winner = match.winner || "En cours";
          const score = `${match.user1_sets_won} - ${match.user2_sets_won}`;

          resultatsDiv.innerHTML += `
              <p>
                  ${date} - ${match.user1} vs ${match.user2} - 
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
      <label for="user1">Player 1 Name:</label>
      <!-- <input type="text" id="user1" value="user1"><br><br> -->
     <input type="text" id="user1" value="${username}" readonly><br><br>
      <label for="user2">Player 2 Name:</label>
      <input type="text" id="user2" value="Bot_AI"><br><br>
      <label for="numberOfGames">Number of Games:</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points to Win:</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <!-- tsanglar: fixed, this line didnt work anymore. OK now <button type="button" onclick="startGameSetup()">Start Game</button> -->
      <button type="button" id="startGameButton">Start Game</button>
    </form>
    <canvas id="pong" width="800" height="400" style="display: none;"></canvas>
    <div id="result" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>
  `;
  // tsanglar: add this line for the fix
  document
    .getElementById("startGameButton")
    .addEventListener("click", startGameSetup);
}


