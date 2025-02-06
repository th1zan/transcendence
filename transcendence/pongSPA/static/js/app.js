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

  //displayConnectionFormular();
  displayWelcomePage();
});

export function displayConnectionFormular() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
  	<div class="min-vh-100 flex-column justify-content-center align-items-center" style="background-color: #f4f3f5;">
		<div class="container mt-5 custom-container">
	  		<h1 class="text-center custom-title">Bienvenue sur la page d'accueil !</h1>
		</div>
		<div class="d-flex justify-content-center align-items-center w-100" style="min-height: 75vh;">
      	<div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
        	<h2 class="text-center mb-5" style="font-size: 2.5rem; color: #51227f;">Connexion</h2>
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

// homepage
export function displayWelcomePage() {
  const username = localStorage.getItem("username");
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2 class="text-center">Bonjour ${username}</h2>
    <div style="background-color: black;" class="p-1 h-100  d-flex">
      <div  style="background-color: #222B2B; width: 200px" class="nav flex-column nav-pills p-1 h-100 d-flex " id="v-pills-tab" role="tablist" aria-orientation="vertical">
        <img src="/static/ilyanar.jpg" class="rounded-circle object-fit-cover d-flex align-self-center m-4" alt="Ilkay" width="90" height="100" />
          <a class="nav-link active" id="v-pills-home-tab" data-toggle="pill" href="#v-pills-home" role="button" aria-controls="v-pills-home" aria-selected="true">Play</a>
          <a class="nav-link active" id="v-pills-profile-tab" data-toggle="pill" href="#v-pills-profile" role="tab" aria-controls="v-pills-profile" aria-selected="false">New Tornament</a>
          <div class="flex-grow-1"></div>
          <a class="nav-link text-danger" id="v-pills-settings-tab" data-toggle="pill" href="#v-pills-settings" role="tab" aria-controls="v-pills-settings" aria-selected="false">Delete account</a>
          <a class="nav-link text-danger" id="v-pills-settings-tab" data-toggle="pill" href="#v-pills-settings" role="tab" aria-controls="v-pills-settings" aria-selected="false">Log out</a>
      </div>
      <div style="background-color: #212424;" class="p-1 h-100 flex-grow-1" >
      <div style="background-image: url(/static/pong.jpg); background-repeat: no-repeat; background-attachment: fixeqd; background-size: 100% 100%;" class="p-1 h-50 d-flex rounded " >
      <div style="background-color: rgba(255, 255, 255, 0.4);" class="p-1 h-50 w-100 d-flex rounded align-self-end justify-content-between" >
      <div class="rounded-circle d-flex align-self-center m-3 overflow-hidden" style="width:100px ; height:60%; background-color: red;">
      <img src="/static/ilyanar.jpg" class="object-fit-cover"  alt="Ilkay" width="100%" height="100%" />
      </div>
      <div class="container row" style="" >
      <div style="background-color: teal;" class="col-4"> blabla 1 </div>
      <div style="background-color: olive;" class="col-4"> blabla 2 </div>
      <div style="background-color: blue;" class="col-4"> blabla 3 </div>

      </div>
      </div>
      </div>
      </div>
      `;

      //<a class="nav-link" id="v-pills-messages-tab" data-toggle="pill" href="#v-pills-messages" role="tab" aria-controls="v-pills-messages" aria-selected="false">Messages</a>
      //<div class="tab-content" id="v-pills-tabContent">
      //  <div class="tab-pane fade show active" id="v-pills-home" role="tabpanel" aria-labelledby="v-pills-home-tab">abc</div>
      //  <div class="tab-pane fade" id="v-pills-profile" role="tabpanel" aria-labelledby="v-pills-profile-tab">...</div>
      //  <div class="tab-pane fade" id="v-pills-messages" role="tabpanel" aria-labelledby="v-pills-messages-tab">...</div>
      //  <div class="tab-pane fade" id="v-pills-settings" role="tabpanel" aria-labelledby="v-pills-settings-tab">...</div>
      //</div>

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



export function displayWelcomePage2() {
  const username = localStorage.getItem("username");
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2 class="text-center">Bonjour ${username}</h2>

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
