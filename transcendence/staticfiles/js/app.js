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
import { addFriend, fetchFriends, removeFriend } from "./friends.js"; 

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
    <h3>👥 Gestion des Amis</h3>
    <br>
    <div>
      <input type="text" id="friendUsername" placeholder="Nom d'utilisateur" class="form-control" />
      <button id="addFriendButton" class="btn btn-success mt-2">Ajouter</button>
    </div>
    <br>
    <h4>Mes Amis</h4>
    <ul id="friendList" class="list-group"></ul>
  `;

  document.getElementById("addFriendButton").addEventListener("click", () => {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (friendUsername) {
      addFriend(friendUsername);
    }
  });

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
  const formContainer = document.getElementById("app");
  const username = localStorage.getItem("username")

  let gameSettings = {
    mode: "solo",
    difficulty: "easy",
    design: "oldschool",
    numberOfGames: 1, //entre 1 et 5
    setsPerGame: 3, //entre 1 et 5
    player1: localStorage.getItem("username"),
    player2: "Bot-AI",
    control1: "arrows",
    control2: "wasd",
  };
  
  formContainer.innerHTML = `
  <form id="gameForm">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
        <div style="flex: 1;">
            <h3>Game Settings</h3>
            <label>Game Mode:</label>
            <button id="onePlayer" class="mode-button ${gameSettings.mode === "solo" ? "active" : ""}" type="button">1 Player</button>
            <button id="twoPlayers" class="mode-button ${gameSettings.mode === "multiplayer" ? "active" : ""}" type="button">2 Players</button>
            <br><br>
            <label>Difficulty:</label>
            <button class="difficulty-button ${gameSettings.difficulty === "easy" ? "active" : ""}" id="easy" type="button">Easy</button>
            <button class="difficulty-button ${gameSettings.difficulty === "medium" ? "active" : ""}" id="medium" type="button">Medium</button>
            <button class="difficulty-button ${gameSettings.difficulty === "hard" ? "active" : ""}" id="hard" type="button">Hard</button>
            <br><br>
            <label>Design:</label>
            <button class="design-button ${gameSettings.design === "oldschool" ? "active" : ""}" id="oldschool" type="button">Oldschool</button>
            <button class="design-button ${gameSettings.design === "modern" ? "active" : ""}" id="modern" type="button">Modern</button>
        </div>
        <div style="flex: 1;">
            <h3>Match Settings</h3>
            <label>Number of Games:</label>
            <input type="number" id="numberOfGames" value="${gameSettings.numberOfGames}" min="1" max="5" style="width: 60px;"><br><br>
            <label>Sets per Game:</label>
            <input type="number" id="setsPerGame" value="${gameSettings.setsPerGame}" min="1" max="5" style="width: 60px;"><br><br>
        </div>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; margin-top: 20px;">
        <div style="flex: 1;">
            <h3>Player 1</h3>
            <label>Name:</label>
            <input type="text" id="player1" value="${gameSettings.player1}" disabled>
            <br>
            <label>Control:</label>
            <select id="control1">
                <option value="arrows" ${gameSettings.control1 === "arrows" ? "selected" : ""}>Arrow Keys</option>
                <option value="wasd" ${gameSettings.control1 === "wasd" ? "selected" : ""}>WASD</option>
                <option value="mouse" ${gameSettings.control1 === "mouse" ? "selected" : ""}>Mouse</option>
            </select>
        </div>
        <div style="flex: 1;" id="player2Container">
            <h3>Player 2</h3>
            <label>Name:</label>
            <input type="text" id="player2" value="${gameSettings.player2}" ${gameSettings.mode === "solo" ? "disabled" : ""}>
            <br>
            <div id="control2Container" style="${gameSettings.mode === "solo" ? "display:none;" : "display:block;"}">
                <label>Control:</label>
                <select id="control2">
                    <option value="wasd" ${gameSettings.control2 === "wasd" ? "selected" : ""}>WASD</option>
                    <option value="arrows" ${gameSettings.control2 === "arrows" ? "selected" : ""}>Arrow Keys</option>
                    <option value="mouse" ${gameSettings.control2 === "mouse" ? "selected" : ""}>Mouse</option>
                </select>
            </div>
        </div>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <button id="startGameButton" type="button">Start Game</button>
    </div>
  </form>

  <div id="result" style="display: none;">
    <h2>Game Results</h2>
    <p id="summary"></p>
  </div>
  <canvas id="pong" width="800" height="400" style="display: block; margin-top: 20px;"></canvas>  
`;

  function toggleActiveButton(group, selectedId) {
      document.querySelectorAll(group).forEach(button => {
          button.classList.remove("active");
      });
      document.getElementById(selectedId).classList.add("active");
  }

  document.querySelectorAll(".mode-button, .difficulty-button, .design-button").forEach(button => {
      button.addEventListener("click", function() {
          toggleActiveButton(`.${this.classList[0]}`, this.id);
      });
  });

  document.getElementById("onePlayer").addEventListener("click", function() {
    document.getElementById("player2Container").style.display = "block";
    document.getElementById("player2").value = "Bot-AI";
    document.getElementById("player2").disabled = true;
    document.getElementById("control2Container").style.display = "none";

    document.getElementById("control1").value = "arrows";
    document.getElementById("control2").value = "wasd";

    document.getElementById("control1").querySelectorAll("option").forEach(opt => opt.disabled = false);
    document.getElementById("control2").querySelectorAll("option").forEach(opt => opt.disabled = false);

    gameSettings.mode = "solo"; 
  });

  document.getElementById("twoPlayers").addEventListener("click", function() {
    document.getElementById("player2Container").style.display = "block";
    document.getElementById("player2").value = "player2";
    document.getElementById("player2").disabled = false;
    document.getElementById("control2Container").style.display = "block";

    document.getElementById("control1").value = "arrows";
    document.getElementById("control2").value = "wasd";

    document.getElementById("control1").querySelectorAll("option").forEach(opt => opt.disabled = false);
    document.getElementById("control2").querySelectorAll("option").forEach(opt => opt.disabled = false);

    document.getElementById("control1").querySelector("option[value='wasd']").disabled = true;
    document.getElementById("control2").querySelector("option[value='arrows']").disabled = true;

    gameSettings.mode = "multiplayer";
  });

  document.getElementById("numberOfGames").addEventListener("input", function() {
    gameSettings.numberOfGames = parseInt(this.value);
  });

  document.getElementById("setsPerGame").addEventListener("input", function() {
    gameSettings.setsPerGame = parseInt(this.value);
  });

  document.getElementById("player2").addEventListener("input", function() {
    gameSettings.player2 = this.value;
  });

  document.getElementById("control1").addEventListener("change", function () {
    const selected = this.value;
    gameSettings.control1 = this.value;
    const control2 = document.getElementById("control2");

    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.getElementById("control2").addEventListener("change", function () {
    const selected = this.value;
    gameSettings.control2 = this.value;
    const control1 = document.getElementById("control1");

    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control1.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.querySelectorAll(".difficulty-button").forEach(button => {
    button.addEventListener("click", function() {
      gameSettings.difficulty = this.id;
    });
  });

  document.querySelectorAll(".design-button").forEach(button => {
    button.addEventListener("click", function() {
      gameSettings.design = this.id;
    });
  });

  document.getElementById("startGameButton").addEventListener("click", () => {
      const player1 = username;
      const player2 = document.getElementById("player2").value.trim();
      const numberOfGames = parseInt(document.getElementById("numberOfGames").value);
      const setsPerGame = parseInt(document.getElementById("setsPerGame").value);

      console.log("Start button clicked");

      console.log("Starting game with settings:", gameSettings);

      //startGameSetup(player1, player2, numberOfGames, setsPerGame, "solo");
      startGameSetup(gameSettings);
  });
}
