import { startGameSetup } from "./pong.js";
import { createTournamentForm, validateSearch, displayUserTournaments } from "./tournament.js";
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
  //when the DOM is loaded, this event is triggerd and it will:

  // 1. Clear all cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  // 2. Clear local storage
  localStorage.clear();

  //3. Display connection formular
  displayConnectionFormular();
  
  //4. Plan the refreshing interval for the authentification Token 
  setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes

  history.replaceState({ page: 'login' }, '', '/login'); // Initial state

  // Écouteur pour les changements d'état de l'historique
  window.addEventListener("popstate", function(event) {
    handleRouteChange(event.state ? event.state.page : 'welcome');
  });
});

function handleRouteChange(route) {
  switch(route) {
    case 'login':
      displayConnectionFormular();
      break;
    case 'register':
      displayRegistrationForm();
      break;
    case 'welcome':
      displayWelcomePage();
      break;
        case 'game':
      displayGameForm();
      break;
    case 'tournament':
      displayTournament();
      break;
    case 'statistics':
      displayStats();
      break;
    case 'userStats':
      displayUserResults();
      break;
    case 'ranking':
      displayRanking();
      break;
    case 'friends':
      displayFriends();
      break;
    case 'settings':
      displaySettings();
      break;
    default:
      displayWelcomePage(); // Par défaut, retour à la page d'accueil
  }
}

export function displayConnectionFormular() {
  const appDiv = document.getElementById("app");
  const header = document.getElementById("header");

  header.innerHTML = `
    <div class="container-fluidner mt-5 custom-container">
		  <h1 class="text-center custom-title">Welcome to the Home Page</h1>
	  </div>
  `;

  appDiv.innerHTML = `
  	  <div class="d-flex justify-content-center align-items-center" style="min-height: 75vh; background-color: #f8f9fa;">
      <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
        <h2 class="text-center mb-5" style="font-size: 2.5rem; color: #007bff;">Connexion</h2>
        <form id="loginForm">
          <div class="form-group mb-4">
            <label for="username" style="font-size: 1.3rem;"><i class="bi bi-person"></i> Username</label>
            <input 
              type="text" 
              id="username" 
              class="form-control form-control-lg" 
              placeholder="Enter your username" 
              required 
            />
          </div>
          <div class="form-group mb-5">
            <label for="password" style="font-size: 1.3rem;"><i class="bi bi-lock"></i> Mot de passe</label>
            <input 
              type="password" 
              id="password" 
              class="form-control form-control-lg" 
              placeholder="Enter your password" 
              required 
            />
          </div>
          <button 
            type="submit" 
            class="btn btn-success w-100 py-3" 
            style="font-size: 1.3rem;">
            Sign In
          </button>
        </form>
        <button 
          id="signupButton" 
          class="btn btn-primary w-100 mt-4 py-3" 
          style="font-size: 1.3rem;">
          Create Account
        </button>
      </div>
    </div>
    `;

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

  history.pushState({ page: 'login' }, '', '/login');
}

// account creation 
function displayRegistrationForm() {
  const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <div class="d-flex justify-content-center align-items-center" style="min-height: 75vh; background-color: #f8f9fa;">
      <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
        <h2 class="text-center mb-5" style="color: #007bff; font-size: 2.5rem;">Create Account</h2>
        <form id="signupForm">
          <div class="form-group mb-4">
            <label for="newUsername" style="font-size: 1.2rem;"><i class="bi bi-person"></i> Username</label>
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


  history.pushState({ page: 'register' }, '', '/register');
}

export function displayWelcomePage() {

   
  /*when this displayWelcomePage() function is called,
  we can use and fill these HTML containers from index.html,
  they are identified by their id:
  - "app" in the center of the page
  - "menu" on the left
  - "footer" on the bottom
  - "header" on the top
  */
  const username = localStorage.getItem("username");

  /*the div "app" is filled with 3 div we can use later to fill them with HTML:
  - "app_top"
  - "app_main"
  - "app_bottom"
  */
 
  const appDiv = document.getElementById("app");

  // Vérifiez si les conteneurs existent déjà
  const appTop = document.getElementById("app_top");
  const appMain = document.getElementById("app_main");
  const appBottom = document.getElementById("app_bottom");

  if (!appTop || !appMain || !appBottom) {
    // Initialisation si les éléments n'existent pas
    appDiv.innerHTML = `
      <div id="app_top"></div>
      <div id="app_main">
        <h2>Bonjour ${username}</h2>
      </div>
      <div id="app_bottom"></div>
      <br>
    `;
  } else {
    // Mise à jour si les éléments existent déjà
    appMain.innerHTML = `<h2>Bonjour ${username}</h2>`;
    // Réinitialisez app_top et app_bottom si nécessaire
    appTop.innerHTML = '';
    appBottom.innerHTML = '';
  }

  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML = `
    <button id="playButton">Play a Game</button>
    <br>
    <br>
    <button id="tournamentButton">Tournament</button>
    <br>
    <br>
    <button id="statsButton">Statistics</button>
    <br>
    <br>
    <button id="friendsButton">Friends</button>
    <br>
    <br>
    <button id="settingsButton">Settings</button>
    <br>
    <br>
    <br>
    <br>
    <button id="logoutButton">Logout</button>
      `;

  document.getElementById("playButton").addEventListener("click", displayGameForm);
  document.getElementById("tournamentButton").addEventListener("click", displayTournament);
  document.getElementById("statsButton").addEventListener("click", displayStats);
  document.getElementById("friendsButton").addEventListener("click", displayFriends);
  document.getElementById("settingsButton").addEventListener("click", displaySettings);
  document.getElementById("logoutButton").addEventListener("click", logout);

  
  history.pushState({ page: 'welcome' }, '', '/welcome');

}

export function displayTournament() {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
    <h3>Tournament</h3>
    <br>
    <div class="d-flex align-items-center">
      <button id="newTournamentButton" class="me-2">Nouveau tournoi</button>
      <div id="searchTournament" class="d-flex align-items-center">
        <button id="tournamentSearchButton" class="btn btn-primary mx-2">Rechercher un tournoi</button>
        <input type="text" id="tournamentNameInput" placeholder="Nom du tournoi" class="me-2">
      </div>
    </div>
  `;  

  displayUserTournaments();
  // let resultDiv = document.getElementById("app_main");
  //   resultDiv.style.display = "block";

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

  history.pushState({ page: 'tournament' }, '', '/tournament');
}


export function displayFriends() {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
    <h3>👥 Friends Management</h3>
    <br>
    <div>
      <input type="text" id="friendUsername" placeholder="Username" class="form-control" />
      <button id="sendFriendRequestButton" class="btn btn-success mt-2">Send Friend Request</button>
    </div>
    <h4>Pending Friend Requests</h4>
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
  history.pushState({ page: 'friends' }, '', '/friends');
}

function displayHTMLforSettings(user) {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';
  
  const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/default.png";
  const appTop = document.getElementById("app_top");
  
  appTop.innerHTML = `
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
}

export function displaySettings() {
  
// 1. fetch the user's settings
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
      //2. display the settings
      displayHTMLforSettings(user);
    })
    .catch(error => {
    const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/default.png";

    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <div class="container mt-4">
      <h3 class="text-center">Account Management</h3>

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
      <button id="deleteAccountButton" class="btn btn-danger px-4" style="margin-right: 38px;">Delete Account</button>
      <button id="anonymizeAccountButton" class="btn btn-warning">Anonymize Account</button>
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

  history.pushState({ page: 'settings' }, '', '/settings');
}


export function displayStats() {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
  <h3>Statistics</h3>
    <button id="viewResultsButton">Your Results</button>
    <br>
    <br>
    <button id="viewRankingButton">Overall Ranking</button> <!-- Nouveau bouton -->
    <div id="ranking"></div> <!-- Div pour afficher le classement -->
  `;

  document.getElementById("viewResultsButton").addEventListener("click", fetchResultats);
  document.getElementById("viewRankingButton").addEventListener("click", fetchRanking);


  history.pushState({ page: 'statistics' }, '', '/statistics');
}

function displayUserResults(data) {
  
  //empty all the containers
  // document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
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

  history.pushState({ page: 'userStats' }, '', '/userStats');
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
      console.log(data); // Pour le débogage
      displayUserResults(data); // Appelle la fonction pour afficher les résultats
      console.log(data); // Vérifiez ce que vous recevez
      const appDiv = document.getElementById("app");
      appDiv.innerHTML = `
        <button id="backButton" class="btn btn-secondary">Back</button>
        <h3>Your Results:</h3>
        <div id="resultats"></div>
      `;

      const resultatsDiv = document.getElementById("resultats");
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          const date = match.date_played ? new Date(match.date_played).toLocaleString() : "Unknown Date";
          const player1 = match.player1_name || "Unknown Player 1";
          const player2 = match.player2_name || "Unknown Player 2";
          const winner = match.winner || "In Progress";
          const score = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
          const tournamentInfo = match.tournament ? ` (Tournament: ${match.tournament_name || 'Unknown'})` : "";

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
        resultatsDiv.innerHTML += "<p>No results found.</p>";
      }

      document.getElementById("backButton").addEventListener("click", displayStats);
    });
}


function displayRanking(data) {
  
  //empty all the containers
  // document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
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
  document.getElementById("backButton").addEventListener("click", displayStats);

  history.pushState({ page: 'ranking' }, '', '/ranking');
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
      console.log(data);
      displayRanking(data);
      const appDiv = document.getElementById("app_top");
      appDiv.innerHTML = `
        <button id="backButton" class="btn btn-secondary">Back</button>
        <h3>Player Ranking:</h3>
        <div id="ranking"></div>
      `;

      const rankingDiv = document.getElementById("ranking");
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((player) => {
          const playerName = player.name || "Unknown Name";
          const totalWins = player.total_wins || 0;
          rankingDiv.innerHTML += `
              <p>
                  ${playerName} - Total Wins: ${totalWins}
              </p>`;
        });
      } else {
        rankingDiv.innerHTML += "<p>No ranking found.</p>";
      }

      // Ajoutez un écouteur d'événement pour le bouton de retour
      document.getElementById("backButton").addEventListener("click", displayStats);
    });
}

export function displayGameForm() { 

 //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const username = localStorage.getItem("username");
  localStorage.setItem("context", "solo");
  
  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
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
   
  `;
  console.log("Username value in displayGameForm:", username);
  
  document.getElementById("startGameButton").addEventListener("click", () => {
    const player1 = username;
    const player2 = document.getElementById("player2").value.trim();
    const numberOfGames = parseInt(document.getElementById("numberOfGames").value) || 1;
    const pointsToWin = parseInt(document.getElementById("pointsToWin").value) || 3;
    
    startGameSetup(player1, player2, numberOfGames, pointsToWin);
  });
}
