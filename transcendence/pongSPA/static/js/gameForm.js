import {logger, showModal} from "./app.js";
import { startGameSetup } from "./pong.js";
import { checkPlayerExists } from "./tournament.js";

export function displayGameForm() {
  // Vide tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  localStorage.setItem("isTournamentMatch", false);
  const formContainer = document.getElementById("app_main");
  const username = localStorage.getItem("username");

  let gameSettings = {
    mode: "solo", // Mode par défaut
    difficulty: "easy",
    design: "retro",
    numberOfGames: 1, // entre 1 et 5
    setsPerGame: 3, // entre 1 et 5
    player1: username || "Player1", // Sécurité si username est null
    player2: "Bot-AI", // Valeur initiale pour mode solo
    control1: "arrows",
    control2: "wasd",
    isTournamentMatch: false,
    isAIActive: true // Ajouté pour clarifier la logique IA
  };

  // Insertion du formulaire HTML
  formContainer.innerHTML = `
    <form id="gameForm" class="container w-100">
      <ul class="nav nav-pills nav-justified mb-3 d-flex justify-content-between" id="pills-tab" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active border border-primary rounded-0 bg-transparent" id="pills-game-settings-tab"
            data-bs-toggle="pill" data-bs-target="#pills-game-settings" type="button" role="tab"
            aria-controls="pills-game-settings" aria-selected="true">Game Settings</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link border border-primary rounded-0 bg-transparent" id="pills-player-settings-tab"
            data-bs-toggle="pill" data-bs-target="#pills-player-settings" type="button" role="tab"
            aria-controls="pills-player-settings" aria-selected="false">Player Settings</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link border border-primary rounded-0 bg-transparent" id="pills-match-settings-tab"
            data-bs-toggle="pill" data-bs-target="#pills-match-settings" type="button" role="tab"
            aria-controls="pills-match-settings" aria-selected="false">Match Settings</button>
        </li>
      </ul>

      <div class="tab-content" id="pills-tabContent">
        <div class="tab-pane fade show active" id="pills-game-settings" role="tabpanel" aria-labelledby="pills-game-settings-tab">
          <div class="d-flex justify-content-center mt-3">
            <div class="col p-3 d-flex flex-column">
              <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Game Settings</h3>
              <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
                <div class="mb-3">
                  <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Game Mode:</label>
                  <div class="btn-group d-flex pag-2" role="group" aria-label="Game Mode">
                    <button id="onePlayer" class="mode-button btn ${gameSettings.mode === "solo" ? "btn-primary" : "btn-outline-primary"}" type="button">1 Player</button>
                    <button id="twoPlayers" class="mode-button btn ${gameSettings.mode === "multiplayer" ? "btn-primary" : "btn-outline-primary"}" type="button">2 Players</button>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Difficulty:</label>
                  <div class="btn-group d-flex pag-2" role="group" aria-label="Difficulty">
                    <button class="difficulty-button btn ${gameSettings.difficulty === "easy" ? "btn-primary" : "btn-outline-primary"}" id="easy" type="button">Easy</button>
                    <button class="difficulty-button btn ${gameSettings.difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}" id="medium" type="button">Medium</button>
                    <button class="difficulty-button btn ${gameSettings.difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}" id="hard" type="button">Hard</button>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Design:</label>
                  <div class="btn-group d-flex pag-2" role="group" aria-label="Design">
                    <button class="design-button btn ${gameSettings.design === "retro" ? "btn-primary" : "btn-outline-primary"}" id="retro" type="button">Retro</button>
                    <button class="design-button btn ${gameSettings.design === "neon" ? "btn-primary" : "btn-outline-primary"}" id="neon" type="button">Neon</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane fade" id="pills-player-settings" role="tabpanel" aria-labelledby="pills-player-settings-tab">
          <div class="d-flex justify-content-between align-items-stretch mt-3">
            <div class="col p-3 d-flex flex-column">
              <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Player 1</h3>
              <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
                <div class="mb-3">
                  <label for="player1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-label">Name:</label>
                  <input type="text" id="player1" value="${gameSettings.player1}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-control bg-transparent" disabled>
                </div>
                <div class="mb-3">
                  <label for="control1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-label">Control:</label>
                  <select id="control1" class="form-select bg-transparent">
                    <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="arrows" ${gameSettings.control1 === "arrows" ? "selected" : ""}>Arrow Keys</option>
                    <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="wasd" ${gameSettings.control1 === "wasd" ? "selected" : ""}>WASD</option>
                    <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="mouse" ${gameSettings.control1 === "mouse" ? "selected" : ""}>Mouse</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="col p-3 d-flex flex-column">
              <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Player 2</h3>
              <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
                <div class="mb-3">
                  <label for="player2" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Name:</label>
                  <input type="text" id="player2" value="${gameSettings.player2}" class="form-control bg-transparent" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" ${gameSettings.mode === "solo" ? "disabled" : ""}>
                </div>
                <div id="control2Container" class="mb-3" style="${gameSettings.mode === "solo" ? "display:none;" : "display:block;"}">
                  <label for="control2" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-label">Control:</label>
                  <select id="control2" class="form-select bg-transparent">
                    <option value="wasd" ${gameSettings.control2 === "wasd" ? "selected" : ""}>WASD</option>
                    <option value="arrows" ${gameSettings.control2 === "arrows" ? "selected" : ""}>Arrow Keys</option>
                    <option value="mouse" ${gameSettings.control2 === "mouse" ? "selected" : ""}>Mouse</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane fade" id="pills-match-settings" role="tabpanel" aria-labelledby="pills-match-settings-tab">
          <div class="d-flex justify-content-center mt-3">
            <div class="col p-3 d-flex flex-column">
              <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Match Settings</h3>
              <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
                <div class="mb-3">
                  <label for="numberOfGames" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Sets per Game:</label>
                  <input type="number" id="numberOfGames" value="${gameSettings.numberOfGames}" min="1" max="5" class="form-control p-2 bg-transparent" style="width: 60px;">
                </div>
                <div class="mb-3">
                  <label for="setsPerGame" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Points to Win a Set:</label>
                  <input type="number" id="setsPerGame" value="${gameSettings.setsPerGame}" min="1" max="5" class="form-control bg-transparent" style="width: 60px;">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>

    <div class="text-center mt-4">
      <button id="startGameButton" class="btn btn-success" type="button">Start Game</button>
    </div>

    <div id="result" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>
  `;

  // Fonction pour basculer les boutons actifs
  function toggleActiveButton(group, selectedId) {
    document.querySelectorAll(group).forEach(button => {
      button.classList.remove('btn-primary');
      button.classList.add('btn-outline-primary');
    });
    document.getElementById(selectedId).classList.remove('btn-outline-primary');
    document.getElementById(selectedId).classList.add('btn-primary');
  }

  // Ajout des écouteurs pour les boutons de mode, difficulté et design
  document.querySelectorAll(".mode-button, .difficulty-button, .design-button").forEach(button => {
    button.addEventListener("click", function() {
      toggleActiveButton(`.${this.classList[0]}`, this.id);
    });
  });

  let isTwoPlayerMode = gameSettings.mode === "multiplayer";

  // Gestion du mode "One Player"
  document.getElementById("onePlayer").addEventListener("click", function() {
    const player2Input = document.getElementById("player2");
    const control2Container = document.getElementById("control2Container");

    player2Input.value = "Bot-AI";
    gameSettings.player2 = "Bot-AI";
    gameSettings.isAIActive = true;
    player2Input.disabled = true;
    player2Input.placeholder = "AI Controlled"; // Indice visuel
    control2Container.style.display = "none";

    const control1 = document.getElementById("control1");
    const control2 = document.getElementById("control2");
    control1.value = "arrows";
    control2.value = "wasd";
    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);

    isTwoPlayerMode = false;
    gameSettings.mode = "solo";
    toggleActiveButton(".mode-button", "onePlayer");
  });

  // Gestion du mode "Two Players"
  document.getElementById("twoPlayers").addEventListener("click", function() {
    const player2Input = document.getElementById("player2");
    const control2Container = document.getElementById("control2Container");

    player2Input.value = "";
    gameSettings.player2 = "";
    gameSettings.isAIActive = false;
    player2Input.disabled = false;
    player2Input.placeholder = "Enter Player 2 Name"; // Indice visuel
    control2Container.style.display = "block";

    const control1 = document.getElementById("control1");
    const control2 = document.getElementById("control2");
    control1.value = "arrows";
    control2.value = "wasd";
    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control1.querySelector("option[value='wasd']").disabled = true;
    control2.querySelector("option[value='arrows']").disabled = true;

    isTwoPlayerMode = true;
    gameSettings.mode = "multiplayer";
    toggleActiveButton(".mode-button", "twoPlayers");
  });

  // Mise à jour des paramètres via les inputs
  document.getElementById("numberOfGames").addEventListener("input", function() {
    gameSettings.numberOfGames = parseInt(this.value);
  });

  document.getElementById("setsPerGame").addEventListener("input", function() {
    gameSettings.setsPerGame = parseInt(this.value);
  });

  document.getElementById("player2").addEventListener("input", function() {
    gameSettings.player2 = this.value;
  });

  document.getElementById("control1").addEventListener("change", function() {
    const selected = this.value;
    gameSettings.control1 = this.value;
    const control2 = document.getElementById("control2");
    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.getElementById("control2").addEventListener("change", function() {
    const selected = this.value;
    gameSettings.control2 = this.value;
    const control1 = document.getElementById("control1");
    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control1.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.querySelectorAll(".difficulty-button").forEach(button => {
    button.addEventListener("click", function() {
      gameSettings.difficulty = this.id;
      toggleActiveButton(".difficulty-button", this.id);
    });
  });

  document.querySelectorAll(".design-button").forEach(button => {
    button.addEventListener("click", function() {
      gameSettings.design = this.id;
      toggleActiveButton(".design-button", this.id);
    });
  });

  let alertShown = false;
  let lastCheckedPlayer2 = "";
  let needAuth = false;

  // Gestion du bouton "Start Game"
  document.getElementById("startGameButton").addEventListener("click", async () => {
    const player1 = username;
    let player2 = document.getElementById("player2").value.trim();
    const numberOfGames = parseInt(document.getElementById("numberOfGames").value);
    const setsPerGame = parseInt(document.getElementById("setsPerGame").value);

    logger.log("Start button clicked");
    logger.log("Game settings at start:", gameSettings);

    if (!alertShown || player2 !== lastCheckedPlayer2) {
      alertShown = false;
      needAuth = false;
      if (isTwoPlayerMode) {
        try {
          const playerData = await checkPlayerExists(player2);

          if (playerData.exists && !playerData.is_guest) {
            showModal(
              'Registred user',
              'This user is registered. Authentication is required.',
              'OK',
              () => {
                alertShown = true;
                lastCheckedPlayer2 = player2;
                needAuth = true;
              },
              "player2" // Focus préféré retourne à #player2, sinon #welcomeButton
            );
            return;
          } else if (playerData.exists) {
            showModal(
              'Guest player',
              'This player already exists as a guest. Press -Start Game- again to play with this player, or enter a new player name.',
              'OK',
              () => {
                alertShown = true;
                lastCheckedPlayer2 = player2;
              },
              "player2"
            );
            return;
          } else {
            startGameSetup(gameSettings);
            return;
          }
        } catch (error) {
          logger.error("Error checking player existence:", error);
          showModal(
            'Utilisateur introuvable',
            'There was an error checking player existence. Please try again.',
            'OK',
            () => {},
            "player2"
          );
          return;
        }
      } else {
        startGameSetup(gameSettings);
        return;
      }
    }


    if (needAuth) {
      const authResult = await authenticateNow(player2, player1, numberOfGames, setsPerGame);
      if (authResult) {
        startGameSetup(gameSettings);
      }
    } else if (player2 !== lastCheckedPlayer2) {
      startGameSetup(gameSettings);
    } else {
      startGameSetup(gameSettings);
    }

    logger.log("Starting game with settings:", gameSettings);
  });
}


async function authenticateNow(playerName, player1, numberOfGames, setsPerGame) {
  return new Promise((resolve, reject) => {
    const modalHTML = `
      <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="loginModalLabel">Login to Authenticate</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="loginForm">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" class="form-control" id="username" placeholder="Enter your username" required>
                </div>
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" class="form-control" id="password" placeholder="Enter your password" required>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="submitLogin">Login</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const loginModal = document.getElementById('loginModal');
    const modalBootstrap = new bootstrap.Modal(loginModal);
    modalBootstrap.show();

    document.getElementById('submitLogin').addEventListener('click', async function () {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      const authResult = await authenticatePlayer(username, password, playerName);
      if (authResult.success) {
        modalBootstrap.hide();
        loginModal.remove();
        resolve(true); // Résout la promesse en cas de succès
      } else {
        showModal(
          'Error',
          'Authentication failed. Please try again.',
          'OK',
          () => {}
        );
        modalBootstrap.hide();
        loginModal.remove();
        resolve(false); // Résout la promesse en cas d'échec
      }
    });
  });
}

async function authenticatePlayer(username, password, playerName) {
  const response = await fetch('/api/auth/match-player/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
      password: password,
      player_name: playerName
    }),
  });

  return await response.json();
}



