import { startGameSetup } from "./pong.js";
import { createTournamentForm, validateSearch } from "./tournament.js";
import {
  anonymizeAccount,
  createAccount,
  deleteAccount,
  getToken,
  logout,
  refreshToken,
  updateProfile,
  uploadAvatar,
} from "./auth.js";
import { sendFriendRequest, respondToFriendRequest, fetchFriends, fetchFriendRequests, removeFriend } from "./friends.js"; 

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
  setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes
});

export function displayConnectionFormular() {
  const appDiv = document.getElementById("app");
  const header = document.getElementById("header");

  header.innerHTML = `
    <div class="container-fluidner mt-5 custom-container">
		  <h1 class="text-center custom-title">Bienvenue sur la page d'accueil</h1>
	  </div>
  `;


  appDiv.innerHTML = `
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
  // setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes

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
              placeholder="Enter your username" 
              required 
            />
          </div>
          <div class="form-group mb-5">
            <label for="newPassword" style="font-size: 1.2rem;"><i class="bi bi-lock"></i> Mot de passe</label>
            <input 
              type="password" 
              id="newPassword" 
              class="form-control form-control-lg" 
              placeholder="Enter your password" 
              required 
            />
          </div>
          <div class="form-check mb-4">
            <input type="checkbox" id="privacyPolicyAccepted" required />
            <label for="privacyPolicyAccepted">
              I accept the <a href="#" id="privacyPolicyLink">Privacy Policy</a>
            </label>
          </div>
          <button 
            type="submit" 
            class="btn btn-success w-100 py-3" 
            style="font-size: 1.3rem;">
            Create Account
          </button>
        </form>
        <button 
          id="backToLoginButton" 
          class="btn btn-primary w-100 mt-4 py-3" 
          style="font-size: 1.3rem;">
          Back to Login
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
      const privacyPolicyAccepted = document.getElementById("privacyPolicyAccepted").checked;

      if (!privacyPolicyAccepted) {
        alert("You must accept the Privacy Policy to register.");
        return;
      }
      createAccount(newUsername, newPassword, privacyPolicyAccepted);
    });

  document
    .getElementById("backToLoginButton")
    .addEventListener("click", displayConnectionFormular);
  document
    .getElementById("privacyPolicyLink")
    .addEventListener("click", function (event) {
    event.preventDefault(); // Prevent full-page reload
    displayPrivacyPolicy(); // Load Privacy Policy inside #app
  });
}

export function displayPrivacyPolicy() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <div class="container">
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> 06.02.2025</p>

      <h2>1. Introduction</h2>
      <p>
        We respect your privacy and are committed to protecting your personal data. 
        This Privacy Policy explains how we collect, use, and protect your information in compliance with GDPR.
      </p>

      <h2>2. Data We Collect</h2>
      <p>When you register and use our services, we collect:</p>
      <ul>
        <li><strong>Account Information:</strong> Username, password, email address, phone number, and avatar (if provided).</li>
        <li><strong>Game & Profile Data:</strong> Match history, friend lists, and tournament participation.</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>Your data is used only for the following purposes:</p>
      <ul>
        <li>To create and manage your account.</li>
        <li>To enable participation in games and tournaments.</li>
        <li>To allow you to connect with friends and manage your profile.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>4. Legal Basis for Processing</h2>
      <p>We process your data based on the following legal grounds:</p>
      <ul>
        <li><strong>Consent:</strong> You provide explicit consent when registering.</li>
        <li><strong>Contractual Obligation:</strong> Processing is necessary to provide our services.</li>
        <li><strong>Legal Compliance:</strong> We process your data to comply with laws.</li>
      </ul>

      <h2>5. Data Sharing</h2>
      <p>We do not sell or share your data with third parties except:</p>
      <ul>
        <li>When required by law.</li>
        <li>To provide essential services (e.g., hosting, security).</li>
      </ul>

      <h2>6. Your Rights Under GDPR</h2>
      <p>As a user, you have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data.</li>
        <li><strong>Rectification:</strong> Correct inaccurate or incomplete data.</li>
        <li><strong>Erasure:</strong> Request deletion of your account and associated data.</li>
        <li><strong>Restriction:</strong> Limit processing of your data in certain cases.</li>
        <li><strong>Portability:</strong> Request a copy of your data in a structured format.</li>
        <li><strong>Withdraw Consent:</strong> Stop processing based on consent at any time.</li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>Your data is stored only as long as necessary to provide our services or comply with legal obligations.</p>

      <h2>8. Security Measures</h2>
      <p>We take appropriate security measures to protect your data. However, we advise keeping your credentials safe.</p>

      <h2>9. Contact Information</h2>
      <p>If you have questions or requests regarding your data, please contact us at: pong42@gmail.com</p>

      <h2>10. Updates to This Policy</h2>
      <p>We may update this Privacy Policy. Changes will be posted on this page.</p>

      <button id="backToRegisterButton" class="btn btn-primary">Back to Registration</button>
    </div>
  `;

  // Handle back navigation to registration form
  document.getElementById("backToRegisterButton").addEventListener("click", displayRegistrationForm);
}

export function displayWelcomePage() {
  const username = localStorage.getItem("username");

  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2>Bonjour ${username}</h2>
    <br>
    <div id="tournamentList"></div>
  `;

  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML = `
    <button id="playButton">🎮 Jouer une partie</button>
    <br>
    <br>
    <button id="tournamentButton">🏆 Tournament</button>
    <br>
    <br>
    <button id="statsButton">📊 Statistiques</button>
    <br>
    <br>
    <button id="friendsButton">👥 Amis</button>
    <br>
    <br>
    <button id="settingsButton">⚙️ Paramètres</button>
    <br>
    <br>
    <br>
    <br>
    <button id="logoutButton">🚪 Déconnexion</button>
      `;

  // Attacher les écouteurs d'événements aux boutons
  document.getElementById("playButton").addEventListener("click", displayGameForm);
  document.getElementById("tournamentButton").addEventListener("click", displayTournament);
  document.getElementById("statsButton").addEventListener("click", displayStats);
  document.getElementById("friendsButton").addEventListener("click", displayFriends);
  document.getElementById("settingsButton").addEventListener("click", displaySettings);
  document.getElementById("logoutButton").addEventListener("click", logout);

}

export function displayTournament() {

  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
   <h3>Tournament</h3>
    <br>
    <button id="newTournamentButton">Nouveau tournoi</button> 
    <br>
    <br>
    <div id="searchTournament">
      <input type="text" id="tournamentNameInput" placeholder="Nom du tournoi" />
      <br>
      <button id="tournamentSearchButton" class="btn btn-primary">Rechercher un tournoi</button>
    </div>
  `;

  document.getElementById("newTournamentButton").addEventListener("click", createTournamentForm);
  
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


}


export function displayFriends() {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h3>👥 Friends Management</h3>
    <br>
    <div>
      <input type="text" id="friendUsername" placeholder="Nom d'utilisateur" class="form-control" />
      <button id="sendFriendRequestButton" class="btn btn-success mt-2">Send Friend Request</button>
    </div>
    <h4>Demandes d'amis en attente</h4>
    <ul id="friendRequests" class="list-group"></ul>
    <br>
    <h4>My Friends</h4>
    <ul id="friendList" class="list-group"></ul>
  `;

  document.getElementById("sendFriendRequestButton").addEventListener("click", () => {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (friendUsername) {
      sendFriendRequest(friendUsername);
    }
  });
  fetchFriendRequests();
  fetchFriends();
}


export function displaySettings() {
  fetch("/api/auth/user/", {
    method: "GET",
    credentials: "include", // Ensures authentication cookies are sent
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch user data.");
      }
      return response.json();
    })
    .then(user => {
      const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/default.png";

    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <div class="container mt-4">
      <h3 class="text-center">Gestion du compte</h3>

      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Update Profile Picture</h4>
        <div class="d-flex flex-column align-items-center">
          <img id="profilePic" src="${avatarUrl}" alt="Profile Picture" class="rounded-circle border" width="150" height="150">
          
          <div class="mt-3 w-75">
            <label class="form-label">Choose a new profile picture:</label>
            <div class="input-group">
              <input type="file" id="avatarInput" accept="image/*" class="form-control">
              <button id="uploadAvatarButton" class="btn btn-primary">Upload</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Profile Information Update -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Edit Profile Information</h4>
        <div class="form-group mt-2">
          <label>Username:</label>
          <input type="text" id="usernameInput" class="form-control" value="${user.username}">
        </div>
        <div class="form-group mt-2">
          <label>Email:</label>
          <input type="email" id="emailInput" class="form-control" value="${user.email}">
        </div>
        <div class="form-group mt-2">
          <label>Phone Number:</label>
          <input type="text" id="phoneInput" class="form-control" value="${user.phone_number || ''}">
        </div>
        <div class="d-flex justify-content-center mt-3">
          <button id="saveProfileButton" class="btn btn-success px-4">Save Changes</button>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="d-flex justify-content-center mt-4">
      <button id="deleteAccountButton" class="btn btn-danger px-4" style="margin-right: 38px;">Supprimer le compte</button>
      <button id="anonymizeAccountButton" class="btn btn-warning">Anonymiser le compte</button>
       </div>
    `;

    document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
    document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
    document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
    document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
  })
  .catch(error => {
    console.error("Error loading user data:", error);
  });
}


export function displayStats() {

  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
  <h3>Statistiques</h3>
    <div id="resultats"></div>
    <button id="viewResultsButton">Vos résultats</button>
    <br>
    <br>
    <button id="viewRankingButton">Classement général</button> <!-- Nouveau bouton -->
    <div id="ranking"></div> <!-- Div pour afficher le classement -->
  `;

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

      document.getElementById("backButton").addEventListener("click", displayStats);
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
      document.getElementById("backButton").addEventListener("click", displayStats);
    });
}

function displayGameForm() { 

  const username = localStorage.getItem("username");
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h3>Pong Game</h3>
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
    <div id="game_panel" style="display: none;">
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
