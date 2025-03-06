import { navigateTo, showModal, logger } from "./app.js";
import { DisplayTournamentGame } from "./tournament.js";
import { displayGameForm } from "./gameForm.js";

export let gameInterval;

let ws;
let user1 = "default_user1";
let user2 = "default_user2";
let player1 = "default_player1";
let player2 = "default_player2";
let numberOfGames = 1;
let pointsToWin = 3;
let currentGame = 0;
let player1Wins = 0;
let player2Wins = 0;
let shouldReconnect = true;
let control1 = "arrows";
let control2 = "wasd";
let design = "retro";
let difficulty = "easy";
let collisionActive = false;
let mode = "solo";
let isTournamentMatch = false;

let fps = 50;
let step = 20;

let exchangesPerSet = 0;
let setStartTime = null;

let setHistory = [];

let wsOpenCallback = null;

// Références globales pour les écouteurs
let handlePlayerKeyDown = null;
let handleOpponentKeyDown = null;
let handlePlayerMouseMove = null;
let handleOpponentMouseMove = null;

// Export d'une fonction pour supprimer les écouteurs
export function removeGameListeners() {
  logger.log("removeGameListeners appelé");
  if (handlePlayerKeyDown) {
    document.removeEventListener("keydown", handlePlayerKeyDown);
    handlePlayerKeyDown = null;
    logger.log("handlePlayerKeyDown listener removed");
  }
  if (handleOpponentKeyDown && mode === "multiplayer") {
    document.removeEventListener("keydown", handleOpponentKeyDown);
    handleOpponentKeyDown = null;
    logger.log("handleOpponentKeyDown listener removed");
  }
  if (canvas) {
    if (handlePlayerMouseMove) {
      canvas.removeEventListener("mousemove", handlePlayerMouseMove);
      handlePlayerMouseMove = null;
      logger.log("handlePlayerMouseMove listener removed");
    }
    if (handleOpponentMouseMove && mode === "multiplayer") {
      canvas.removeEventListener("mousemove", handleOpponentMouseMove);
      handleOpponentMouseMove = null;
      logger.log("handleOpponentMouseMove listener removed");
    }
  }
}

function connectWebSocket(onOpenCallback = null) {
  if (onOpenCallback) wsOpenCallback = onOpenCallback;

  let ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
  let ws_path = ws_scheme + "://" + window.location.host + "/ws/pong_ai/";
  ws = new WebSocket(ws_path);

  ws.onopen = () => {
    logger.log("WebSocket connected");
    if (wsOpenCallback && typeof wsOpenCallback === "function") wsOpenCallback();
  };

  ws.onmessage = (event) => {
    logger.log("Message received:", event.data);
    const data = JSON.parse(event.data);
    if (data.type === "update_paddle" && mode === "solo") { // Limiter l'IA au mode solo
      logger.log("Updating paddle position (IA in solo mode):", data.y);
      opponent.y = data.y;
    }
  };

  ws.onerror = (error) => logger.error("WebSocket error:", error);

  ws.onclose = (event) => {
    logger.log("WebSocket disconnected, code:", event.code, "reason:", event.reason);
    if (shouldReconnect) {
      logger.log("Reconnecting in 1 second...");
      setTimeout(connectWebSocket, 1000);
    }
  };
}

function sendGameConfiguration() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.log("Sending game data to server...");
    ws.send(
      JSON.stringify({
        type: "start",
        canvas_height: canvas.height,
        canvas_width: canvas.width,
        paddle_height: player.height,
        paddle_width: player.width, // Ajouté selon le commit
        fps: fps,
        step: step,
        control: control1,
        difficulty: difficulty
      })
    );
  } else {
    logger.error("WebSocket not connected, unable to send configuration");
  }
}

let retryCount = 0;
const MAX_RETRIES = 10;

function startPongGame() {
  logger.log("Starting game, initGameObjects called");
  const canvas = document.getElementById("pong");

  if (!canvas) {
    if (retryCount < MAX_RETRIES) {
      logger.warn(`Canvas not found. Retry ${retryCount + 1}/${MAX_RETRIES} in 100 ms.`);
      retryCount++;
      setTimeout(startPongGame, 100);
      return;
    } else {
      logger.error("Failed to find canvas after maximum retries. Please check the DOM.");
      showModal(
        i18next.t("pong.error.title"),
        i18next.t("pong.error.canvasNotFound"),
        "OK",
        () => {
          stopGameProcess();
          navigateTo("welcome");
        }
      );
      return;
    }
  }

  retryCount = 0;

  const cnv_context = canvas.getContext("2d");
  logger.log("Canvas context obtained:", cnv_context !== null);

  initGameObjects(canvas);
  logger.log("Game objects initialized");
  resetScores();
  logger.log("Scores reset");

  logger.log("Mode multiplayer or solo:", mode);
  if (mode !== "multiplayer") {
    logger.log("Mode:", mode, ", let's connect to WebSocket.");
    connectWebSocket(sendGameConfiguration);
  }
  logger.log("WebSocket connection attempted");

  clearInterval(gameInterval);

  initSetStats();

  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.log("Sending game data to server...");
    // Ancienne ligne : //ws.send(JSON.stringify({ type: "start", canvas_height: canvas.height, canvas_width: canvas.width, paddle_height: player.height, fps: fps, step: step, control: control1 }));
    ws.send(JSON.stringify({ type: "start", canvas_height: canvas.height, canvas_width: canvas.width, paddle_height: player.height, fps: fps, step: step, control: control1 }));
  }

  gameInterval = setInterval(() => {
    update();
    render(cnv_context);
  }, 1000 / fps);
}

function updateGamePanel() {
  const gamePanel = document.getElementById("app_bottom");
  if (gamePanel) {
    gamePanel.style.display = "block";

    gamePanel.innerHTML = `<div id="summary"></div>`;

    if (!document.getElementById("quitGameButton")) {
      const quitButton = document.createElement("button");
      quitButton.id = "quitGameButton";
      quitButton.textContent = i18next.t("pong.quitGame");
      quitButton.classList = "btn btn-danger";
      quitButton.onclick = () => {
        stopGameProcess(true);
        logger.log("Back to updateGamePanel: AFTER stopGameProcess");
        if (isTournamentMatch) navigateTo("tournament");
        else navigateTo("welcome");
      };
      gamePanel.appendChild(quitButton);
    }
  }

  logger.log("Call to updateGamePanel");
}

function startCountdown(canvas, callback) {
  const ctx = canvas.getContext("2d");
  let countdown = 3;

  function drawCountdown() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "60px 'Press Start 2P'"; // Police pixelisée
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
  }

  drawCountdown(); // Affiche "3" immédiatement
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      drawCountdown(); // Met à jour "2", "1"
    } else {
      clearInterval(countdownInterval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      callback();
    }
  }, 1000);
}

// Fonction startGameSetup allégée
export function startGameSetup(gameSettings) {
  shouldReconnect = true;

  user1 = gameSettings.player1;
  user2 = gameSettings.player2;
  player1 = gameSettings.player1;
  player2 = gameSettings.player2;
  numberOfGames = gameSettings.numberOfGames;
  pointsToWin = gameSettings.setsPerGame;
  mode = gameSettings.mode;
  control1 = gameSettings.control1;
  control2 = gameSettings.control2;
  design = gameSettings.design;
  difficulty = gameSettings.difficulty;
  isTournamentMatch = gameSettings.isTournamentMatch;

  logger.log("StartGameSetup: Game settings isTournamentMatch:", gameSettings.isTournamentMatch);
  logger.log("StartGameSetup: isTournamentMatch:", isTournamentMatch);

  document.getElementById("app_top").innerHTML = "";
  document.getElementById("app_main").innerHTML = "";
  document.getElementById("app_bottom").innerHTML = "";

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <div class="card text-center" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #ffffff; border-radius: 10px; padding: 10px; margin: 0 auto; width: fit-content;">
      <canvas id="pong" width="800" height="400"></canvas>
    </div>
  `;

  const canvas = document.getElementById("pong");
  if (!canvas) {
    logger.error("Canvas creation failed. Cannot start the game.");
    showModal(
      i18next.t("pong.error"),
      i18next.t("pong.canvasCreation"),
      "OK",
      () => {
        navigateTo("welcome");
      }
    );
    return;
  }

  if (isTournamentMatch) {
    logger.log("StartGameSetup: Tournament mode");
  } else {
    logger.log("StartGameSetup: NOT tournament mode");
    const gameForm = document.getElementById("gameForm");
    if (gameForm) gameForm.style.display = "none";
  }

  currentGame = 0;
  player1Wins = 0;
  player2Wins = 0;
  setHistory = [];

  updateGamePanel();
  startCountdown(canvas, () => requestAnimationFrame(() => startPongGame()));
}

function resetScores() {
  player.score = 0;
  opponent.score = 0;
  if (mode !== "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "score", player_score: player.score, ai_score: opponent.score }));
  }
}

let obstacleVelocityY = 5;
let obstacleDirection = 1;

function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y + ball.radius > canvas.height) {
    ball.velocityY = -Math.abs(ball.velocityY);
  }
  else if (ball.y - ball.radius < 0) {
    ball.velocityY = Math.abs(ball.velocityY);
  }

  if (difficulty === "hard" && obstacle) {
    obstacle.y += obstacleVelocityY * obstacleDirection;
    if (obstacle.y <= 0 || obstacle.y + obstacle.height >= canvas.height) obstacleDirection *= -1;
  }

  if (difficulty === "hard" && obstacle && collisionActive) {
    if (
      ball.x + ball.radius > obstacle.x &&
      ball.x - ball.radius < obstacle.x + obstacle.width &&
      ball.y + ball.radius > obstacle.y &&
      ball.y - ball.radius < obstacle.y + obstacle.height
    ) {
      if (ball.x > canvas.width / 2) {
        ball.velocityX = Math.abs(ball.velocityX);
      }
      else{
        ball.velocityX = -Math.abs(ball.velocityX);
      }
      exchangesPerSet++;
    }
  }

  const playerPaddle = ball.x < canvas.width / 2 ? player : opponent;
  if (collision(ball, playerPaddle)) {
    const angle = -(playerPaddle.y + player.height / 2 - ball.y) / (player.height / 2) * Math.PI / 4;
    ball.velocityY = ball.speed * Math.sin(angle);
    ball.velocityX = ball.x < canvas.width / 2 ? ball.speed * Math.cos(angle) : -ball.speed * Math.cos(angle);
    if (mode !== "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "hit" }));
    }
    if (ball.speed <= 10) {
      const factor = difficulty === "easy" ? 1.012 : difficulty === "medium" ? 1.022 : 1.032;
      ball.speed *= factor;
      ball.velocityX *= factor;
      ball.velocityY *= factor;
    }
    exchangesPerSet++;
  }

  if (ball.x - ball.radius < 0) {
    opponent.score++;
    if (opponent.score === pointsToWin) {
      player2Wins++;
      saveSetResult();
      handleGameEnd(player2);
    } else resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    player.score++;
    if (player.score === pointsToWin) {
      player1Wins++;
      saveSetResult();
      handleGameEnd(player1);
    } else resetBall();
  }

  if (mode !== "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ball", x: ball.x, y: ball.y, speedx: ball.velocityX, speedy: ball.velocityY }));
  }
}

function updateResults() {
  const resultDiv = document.getElementById("app_bottom");
  if (resultDiv) {
    resultDiv.style.display = "block";
    let summaryElement = document.getElementById("summary");
    if (!summaryElement) {
      summaryElement = document.createElement("div");
      summaryElement.id = "summary";
      resultDiv.appendChild(summaryElement);
    }
    let summary = `<h3 class="mb-3">${i18next.t("pong.setHistory")}:</h3><table class="table table-striped"><thead class="thead-dark"><tr><th scope="col">${i18next.t("pong.setNumber")}</th><th scope="col">${player1}</th><th scope="col">${player2}</th></tr></thead><tbody>`;
    setHistory.forEach((set, index) => {
      summary += `<tr><td>${index + 1}</td><td>${set.player1_score}</td><td>${set.player2_score}</td></tr>`;
    });
    summary += "</tbody></table>";
    summaryElement.innerHTML = summary;
  }
}

function handleGameEnd(winner) {
  clearInterval(gameInterval);
  currentGame++;
  updateResults();
  
  if (currentGame < numberOfGames) {
    let countdownValue = 3;
    
    // Message initial pour le modal
    const initialMessage = i18next.t("pong.setWinner", { winner, countdown: countdownValue });
    
    // Fonction pour démarrer le prochain set
    const startNextSet = () => {
      clearInterval(countdownInterval);
      resetScores();
      initSetStats();
      updateResults();
      let canvas = document.getElementById("pong");
      if (!canvas) {
        logger.warn("Canvas not found after modal closure. Recreating canvas.");
        const appMain = document.getElementById("app_main");
        if (!appMain.querySelector("#pong")) appMain.innerHTML = `
            <div class="card text-center" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #ffffff; border-radius: 10px; padding: 10px; margin: 0 auto; width: fit-content;">
              <canvas id="pong" width="800" height="400"></canvas>
            </div>
        `;
        canvas = document.getElementById("pong");
      }
      if (canvas) requestAnimationFrame(() => startPongGame());
      else {
        logger.error("Failed to initialize canvas for next set.");
        showModal(
          i18next.t("pong.error"),
          i18next.t("pong.nextSetCanvas"),
          "OK",
          () => {
            stopGameProcess();
            navigateTo("game");
          }
        );
      }
    };
    
    // Afficher le modal
    showModal(
      i18next.t("pong.setEnd"),
      initialMessage,
      i18next.t("pong.startNow"),
      startNextSet
    );
    
    // Actualiser le message avec le compte à rebours
    const updateCountdown = () => {
      const bodyElement = document.getElementById('oneButtonModalBody');
      if (bodyElement) {
        bodyElement.textContent = i18next.t("pong.setWinner", { winner, countdown: countdownValue });
      }
    };
    
    // Démarrer le compte à rebours
    const countdownInterval = setInterval(() => {
      countdownValue--;
      updateCountdown();
      
      if (countdownValue <= 0) {
        clearInterval(countdownInterval);
        // Déclencher le bouton d'action
        const actionButton = document.getElementById('oneButtonModalAction');
        if (actionButton && actionButton._handler) {
          actionButton._handler();
        }
      }
    }, 1000);
  } else {
    sendScore()
      .then((matchID) => {
        stopGameProcess(true); // Toujours appelé
        displayResults(matchID);
      })
      .catch((error) => {
        logger.error("Error in game end processing:", error);
        stopGameProcess(true); // Appelé même en cas d'erreur
        showModal(
          i18next.t("pong.error"),
          i18next.t("pong.gameEndProcessing", { error: error.message }),
          "OK",
          () => {
            stopGameProcess();
            navigateTo("game")
          }
        );
      });
  }
}

/*
function handleGameEnd(winner) {
  clearInterval(gameInterval);
  currentGame++;
  updateResults();
  if (currentGame < numberOfGames) {
    showModal(
      "Set's End",
      `${winner} wins this set! Starting the next set...`,
      "Next Set",
      () => {
        resetScores();
        initSetStats();
        updateResults();
        let canvas = document.getElementById("pong");
        if (!canvas) {
          logger.warn("Canvas not found after modal closure. Recreating canvas.");
          const appMain = document.getElementById("app_main");
          if (!appMain.querySelector("#pong")) appMain.innerHTML = `
              <div class="card text-center" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #ffffff; border-radius: 10px; padding: 10px; margin: 0 auto; width: fit-content;">
                <canvas id="pong" width="800" height="400"></canvas>
              </div>
          `;
          canvas = document.getElementById("pong");
        }
        if (canvas) requestAnimationFrame(() => startPongGame());
        else {
          logger.error("Failed to initialize canvas for next set.");
          showModal(
            "Error",
            "Failed to start the next set. The game canvas could not be initialized.",
            "OK",
            () => {
              stopGameProcess();
              navigateTo("game");
            }
          );
        }
      }
    );
  } else {
    sendScore()
      .then((matchID) => {
        stopGameProcess(true); // Toujours appelé
        displayResults(matchID);
      })
      .catch((error) => {
        logger.error("Error in game end processing:", error);
        stopGameProcess(true); // Appelé même en cas d’erreur
        showModal(
          "Error",
          "An error occurred while processing the game end: " + error.message,
          "OK",
          () => {
            stopGameProcess();
            navigateTo("game")
          }
        );
      });
  }
}
*/

function displayResults(matchID) {
  logger.log("displayResults:: isTournamentMatch:", isTournamentMatch);
  document.getElementById("app_top").innerHTML = "";
  document.getElementById("app_main").innerHTML = "";
  document.getElementById("app_bottom").innerHTML = "";

  const username = localStorage.getItem("username");

  fetch(`/api/scores/${matchID}/`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      logger.log("displayResults .then:: isTournamentMatch:", isTournamentMatch);
      const buttonText = isTournamentMatch ? i18next.t("pong.backToTournament") : i18next.t("pong.newGame");
      logger.log("displayResults::.then buttonText:", buttonText);

      let summary = `
        <button id="backButton" class="btn btn-primary mb-3">${buttonText}</button>
        <h3 class="mt-3">${i18next.t("pong.gameSummary")}:</h3>
        <table class="table table-sm"><tbody>
          <tr><td><strong>${i18next.t("pong.players")}: </strong></td><td>${data.player1_name} vs ${data.player2_name}</td></tr>
          <tr><td><strong>${i18next.t("pong.finalScore")}</strong></td><td>${data.player1_sets_won} : ${data.player2_sets_won}</td></tr>
          <tr><td><strong>${i18next.t("pong.gameWinner")}</strong></td><td>${data.winner_name}</td></tr>
        </tbody></table>
        <h3 class="mt-3">${i18next.t("pong.setResults")}:</h3>
        <table class="table table-striped"><thead class="thead-dark">
          <tr><th scope="col">${i18next.t("pong.setNumber")}</th><th scope="col">${i18next.t("pong.setScore")}</th><th scope="col">${i18next.t("pong.exchanges")}</th><th scope="col">${i18next.t("pong.duration")}</th></tr>
        </thead><tbody>
      `;
      if (data.sets && Array.isArray(data.sets)) {
        data.sets.forEach((set, index) => {
          summary += `
            <tr><td>${index + 1}</td><td>${set.player1_score} - ${set.player2_score}</td><td>${set.exchanges || 0}</td><td>${set.duration ? set.duration.toFixed(1) : 0}</td></tr>
          `;
        });
      } else {
        summary += `<tr><td colspan="2">${i18next.t("pong.noSets")}</td></tr>`;
      }
      summary += "</tbody></table>";

      const summaryDiv = document.getElementById("app_main");
      summaryDiv.innerHTML = summary;

      const backButton = document.getElementById("backButton");
      if (backButton) {
        backButton.addEventListener("click", () => {
          summaryDiv.innerHTML = "";
          if (isTournamentMatch) DisplayTournamentGame();
          else displayGameForm();
        });
      }
    })
    .catch((error) => logger.error("Error retrieving match results:", error));
}

let canvas, player, opponent, ball, obstacle;

function initGameObjects(gameCanvas) {
  canvas = gameCanvas;
  // Suppression des écouteurs existants avant d’en ajouter de nouveaux
  removeGameListeners();

  const paddleWidth = 10;
  let paddleHeight = 100;
  let ballSpeed = 5;
  let ballAngle = Math.random() * Math.PI / 2 - Math.PI / 4 + Math.round(Math.random()) * Math.PI;

  if (difficulty === "medium" || difficulty === "hard") {
    paddleHeight = 80;
    ballSpeed = 8;
  }

  if (difficulty === "hard") {
    // Ancienne ligne : // obstacle = { x: canvas.width / 2 - 5, y: canvas.height / 3, width: 20, height: paddleHeight, color: "GRAY" };
    obstacle = { x: canvas.width / 2 - 5, y: canvas.height / 3, width: 20, height: paddleHeight, color: "GRAY" };
  } else obstacle = null;

  player = { x: 0, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, color: "WHITE", score: 0 };
  opponent = { x: canvas.width - paddleWidth, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, color: "WHITE", score: 0 };
  ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 10, speed: ballSpeed, velocityX: ballSpeed * Math.cos(ballAngle), velocityY: ballSpeed * Math.sin(ballAngle), color: "WHITE" };

  // Définir les écouteurs avec des fonctions nommées
  handlePlayerKeyDown = (event) => {
    event.preventDefault();
    logger.log("step: ", step, " player.y: ", player.y);
    if (control1 === "arrows") {
      if (event.key === "ArrowUp" && player.y > 0) player.y -= step;
      else if (event.key === "ArrowDown" && player.y < canvas.height - player.height) player.y += step;
    } else if (control1 === "wasd") {
      if (event.key === "w" && player.y > 0) player.y -= step;
      else if (event.key === "s" && player.y < canvas.height - player.height) player.y += step;
    }
  };

  if (control1 === "mouse") {
    handlePlayerMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      let newY = event.clientY - rect.top - player.height / 2;
      player.y = Math.max(0, Math.min(newY, canvas.height - player.height));
    };
    canvas.addEventListener("mousemove", handlePlayerMouseMove);
  } else {
    document.addEventListener("keydown", handlePlayerKeyDown);
  }

  if (mode === "multiplayer") {
    handleOpponentKeyDown = (event) => {
      event.preventDefault();
      logger.log("step: ", step, " opponent.y: ", opponent.y);
      if (control2 === "arrows") {
        if (event.key === "ArrowUp" && opponent.y > 0) opponent.y -= step;
        else if (event.key === "ArrowDown" && opponent.y < canvas.height - opponent.height) opponent.y += step;
      } else if (control2 === "wasd") {
        if (event.key === "w" && opponent.y > 0) opponent.y -= step;
        else if (event.key === "s" && opponent.y < canvas.height - opponent.height) opponent.y += step;
      }
    };

    if (control2 === "mouse") {
      handleOpponentMouseMove = (event) => {
        const rect = canvas.getBoundingClientRect();
        opponent.y = event.clientY - rect.top - opponent.height / 2;
      };
      canvas.addEventListener("mousemove", handleOpponentMouseMove);
    } else {
      document.addEventListener("keydown", handleOpponentKeyDown);
    }
  }
}

// Mettre à jour stopGameProcess pour utiliser removeGameListeners
export function stopGameProcess(isGameFinished = false) {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  shouldReconnect = false;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
    logger.log("WebSocket disconnected.");
  }
  if (isGameFinished || !isTournamentMatch) {
    document.getElementById("app_top").innerHTML = "";
    document.getElementById("app_main").innerHTML = "";
    document.getElementById("app_bottom").innerHTML = "";
  } else {
    logger.log("Preserving DOM in tournament mode during set transition.");
    const appMain = document.getElementById("app_main");
    if (!appMain.querySelector("#pong")) appMain.innerHTML = `
      <div class="card text-center" style="background-color: rgba(0, 0, 0, 0.5); border: 2px solid #ffffff; border-radius: 10px; padding: 10px; margin: 0 auto; width: fit-content;">
        <canvas id="pong" width="800" height="400"></canvas>
      </div>
    `;
  }
  // Utiliser la fonction centralisée pour supprimer les écouteurs
  removeGameListeners();
  player1Wins = 0;
  player2Wins = 0;
  currentGame = 0;
  setHistory = [];
}

function drawRect(x, y, w, h, color, ctx) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color, ctx) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();
}

function drawText(text, x, y, color, ctx) {
  ctx.fillStyle = color;
  ctx.font = "45px 'Press Start 2P'"; // Police pixelisée pour les scores
  ctx.fillText(text, x, y);
}

function drawGlowingRect(x, y, w, h, color, ctx) {
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

function drawGlowingCircle(x, y, r, color, ctx) {
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function render(ctx) {
  if (design === "retro") {
    drawRect(0, 0, canvas.width, canvas.height, "#000", ctx);
    drawText(player.score, canvas.width / 4, canvas.height / 5, "WHITE", ctx);
    drawText(opponent.score, (3 * canvas.width) / 4, canvas.height / 5, "WHITE", ctx);
    drawRect(player.x, player.y, player.width, player.height, player.color, ctx);
    drawRect(opponent.x, opponent.y, opponent.width, opponent.height, opponent.color, ctx);
    drawCircle(ball.x, ball.y, ball.radius, ball.color, ctx);
    if (difficulty === "hard" && obstacle) drawRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, "#FFFFFF", ctx);
  } else if (design === "neon") {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f0c29");
    gradient.addColorStop(0.5, "#302b63");
    gradient.addColorStop(1, "#24243e");
    drawRect(0, 0, canvas.width, canvas.height, gradient, ctx);
    drawGlowingRect(player.x, player.y, player.width, player.height, "#0ff", ctx);
    drawGlowingRect(opponent.x, opponent.y, opponent.width, opponent.height, "#f0f", ctx);
    drawGlowingCircle(ball.x, ball.y, ball.radius, "#ff0", ctx);
    drawText(player.score, canvas.width / 4, canvas.height / 5, "#0ff", ctx);
    drawText(opponent.score, (3 * canvas.width) / 4, canvas.height / 5, "#f0f", ctx);
    if (difficulty === "hard" && obstacle) drawGlowingRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, "#FF5733", ctx);
  }
}

function collision(b, p) {
  return b.x - b.radius < p.x + p.width && b.x + b.radius > p.x && b.y - b.radius < p.y + p.height && b.y + b.radius > p.y;
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = difficulty === "easy" ? 5 : 8;
  let ballAngle = Math.random() * Math.PI / 2 - Math.PI / 4 + Math.round(Math.random()) * Math.PI;
  ball.velocityX = ball.speed * Math.cos(ballAngle);
  ball.velocityY = ball.speed * Math.sin(ballAngle);
  if (mode !== "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "reset", x: ball.x, y: ball.y, speedx: ball.velocityX, speedy: ball.velocityY }));
    ws.send(JSON.stringify({ type: "score", player_score: player.score, ai_score: opponent.score }));
  }
  collisionActive = false;
  setTimeout(() => (collisionActive = true), 20);
}

async function sendScore() {
  let tournament = null;
  let matchID = localStorage.getItem("matchID");
  logger.log("sendScore: isTournamentMatch:", isTournamentMatch);
  if (isTournamentMatch) {
    const tournamentID = localStorage.getItem("tournamentId");
    if (tournamentID) tournament = tournamentID;
  } else matchID = "";

  logger.log("Value of player1 before sending:", player1);
  logger.log("setHistory before sending:", setHistory);
  logger.log("isTournamentMatch:", isTournamentMatch);
  logger.log("matchID before sending:", matchID);

  let winner = player1Wins > player2Wins ? player1 : player2Wins > player1Wins ? player2 : null;

  const method = matchID ? "PUT" : "POST";
  const url = matchID ? `/api/scores/${matchID}/` : "/api/scores/";

  logger.log("methode:", method, "et match ID:", matchID);

  return fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user1,
      player1,
      user2: user2,
      player2,
      sets: setHistory,
      player1_sets_won: player1Wins,
      player2_sets_won: player2Wins,
      sets_to_win: numberOfGames,
      points_per_set: pointsToWin,
      tournament,
      is_tournament_match: isTournamentMatch,
      winner,
      mode,
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      logger.log("Score submitted:", data);
      if (method === "POST") {
        localStorage.setItem("matchID", data.id);
        logger.log("matchID after creation:", data.id);
        return data.id;
      }
      logger.log("matchID after update:", matchID);
      return matchID;
    })
    .catch((error) => {
      logger.error("Error sending score:", error);
      throw error;
    });
}

function initSetStats() {
  exchangesPerSet = 0;
  setStartTime = Date.now();
}

function recordSetStats() {
  const setDuration = setStartTime ? (Date.now() - setStartTime) / 1000 : 0;
  logger.log(`Set ${currentGame + 1} duration: ${setDuration.toFixed(1)}s`);
  return { set_number: currentGame + 1, player1_score: player.score, player2_score: opponent.score, exchanges: exchangesPerSet, duration: setDuration };
}

function saveSetResult() {
  setHistory.push(recordSetStats());
}

function initFirstSetStats() {
  if (currentGame === 0 && player.score === 0 && opponent.score === 0) {
    exchangesPerSet = 0;
    setStartTime = Date.now();
    logger.log("First set timer started");
  }
}
