import { displayGameForm, displayWelcomePage } from "./app.js";
import { DisplayTournamentGame } from "./tournament.js";
import { displayMenu } from "./menu.js";

let gameInterval; // Variable globale pour stocker l'intervalle de jeu
// Variables globales pour suivre les scores et le jeu
let ws; //websocket pour communiquer avec l'IA
let user1 = "default_user1";
let user2 = "default_user2";
let player1 = "default_player1";
let player2 = "default_player2";
let numberOfGames = 1;
let pointsToWin = 1;
let currentGame = 0;
let player1Wins = 0;
let player2Wins = 0;
let control1 = "arrows";
let control2 = "wasd";
let design = "oldschool";

// Variable pour stocker l'historique des sets
let setHistory = [];

// Ouvrir une connexion websocket avec le serveur
function connectWebSocket()
{
    //OLD line for history
   // ws = new WebSocket("ws://localhost:8000/ws/pong_ai/");

  let ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
  let ws_path = ws_scheme + "://" + window.location.host + "/ws/pong_ai/";
  ws = new WebSocket(ws_path); 

  //open socket
  ws.onopen = () => console.log("WebSocket connected");
  //message on a socket
  ws.onmessage = (event) => {
    console.log("Message received:", event.data);
    const data = JSON.parse(event.data);
    if (data.type === "update_paddle") {
      opponent.y = data.y;
    }
  };

  ws.onerror = (error) => console.error("WebSocket error:", error);

  ws.onclose = (event) => {
    console.log("WebSocket disconnected, code:", event.code, "reason :", event.reason);
    if (shouldReconnect) {
      console.log("Reconnecting in 1 second...");
      setTimeout(connectWebSocket, 1000);
    }
  };
}

// Démarrer le jeu Pong
function startPongGame() {


  const canvas = document.getElementById("pong");

  if (!canvas) {
    console.error("Canvas not found. Please try again in 100 ms.");
    setTimeout(startPongGame, 100);
    return;
  }

  const context = canvas.getContext("2d");

  initGameObjects(canvas);
  resetScores();
  if (context != "multiplayer" )
    connectWebSocket(); 

  const fps = 50;
  gameInterval = setInterval(() => {
    update();
    render(context);
  }, 1000 / fps);
}

export function startGameSetup(gameSettings) {
  // Mettre à jour les variables globales
  user1 = gameSettings.player1;
  user2 = gameSettings.player2;
  player1 = gameSettings.player1;
  player2 = gameSettings.player2;
  numberOfGames = gameSettings.numberOfGames;
  pointsToWin = gameSettings.setsPerGame;
  context = gameSettings.mode;
  control1 = gameSettings.control1;
  control2 = gameSettings.control2;
  design = gameSettings.design;

  console.log("Valeur de player1 dans startGameSetup:", player1);
  console.log("Valeur de player2 dans startGameSetup:", player2);

 //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  // Gérer l'affichage en fonction du contexte
  if (context === "tournament") {
    // Si le contexte est un tournoi, cacher seulement les éléments spécifiques
    document.getElementById("tournamentMatches").style.display = "none";
  } else if (context === "solo" || context === "multiplayer") {
    // Si le contexte est solo, cacher tout le formulaire de jeu
    let gameForm = document.getElementById("gameForm");
    if (gameForm) {
      gameForm.style.display = "none";
    }
  }

  // Initialiser les scores et l'historique des sets
  currentGame = 0;
  player1Wins = 0;
  player2Wins = 0;
  setHistory = [];

  updateGamePanel();
  // Démarrer le jeu Pong
  startPongGame();
}

function resetScores() {
  player.score = 0;
  opponent.score = 0;
}

function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;
  }

  let playerPaddle = ball.x < canvas.width / 2 ? player : opponent;

  if (collision(ball, playerPaddle)) {
    ball.velocityX = -ball.velocityX;
    ball.speed += 0.1;
  }

  if (ball.x - ball.radius < 0) {
    opponent.score++;
    if (opponent.score === pointsToWin) {
      player2Wins++;
      saveSetResult();
      handleGameEnd(player2);
    } else {
      resetBall();
    }
  } else if (ball.x + ball.radius > canvas.width) {
    player.score++;
    if (player.score === pointsToWin) {
      player1Wins++;
      saveSetResult();
      handleGameEnd(player1);
    } else {
      resetBall();
    }
  }

  //Envoyer la position de la balle au serveur
  if (context != "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ball_position", x: ball.x, y: ball.y }));
  }
}

function saveSetResult() {
  // Enregistrer le résultat actuel du set
  setHistory.push({
    set_number: currentGame + 1,
    player1_score: player.score,
    player2_score: opponent.score,
  });
}

function handleGameEnd(winner) {
  clearInterval(gameInterval); // Arrêter la boucle de jeu
  currentGame++;

  updateResults();

  if (currentGame < numberOfGames) {
    alert(`${winner} wins this game! Starting the next game...`);
    resetScores();
    updateResults(); // Mettre à jour les résultats avant de démarrer le prochain jeu
    startPongGame(); // Démarrer la prochaine partie
  } else {
    sendScore().then((matchID) => {
      stopGameProcess();
      displayResults(matchID); // Passer matchID comme argument
    }).catch((error) => {
      console.error("Error in game end processing:", error);
    });
  }

}

function displayResults(matchID) {
  let gameType = localStorage.getItem("context"); // Si non défini, on suppose que c'est une partie solo

  // Empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const username = localStorage.getItem("username");

  fetch(`/api/scores/${matchID}/`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    let buttonText = gameType === 'tournament' ? 'Back to Tournament' : 'New Game';

    let summary = `
      <button id="backButton">${buttonText}</button>
      <br><br>
      <strong>${data.player1_name} vs ${data.player2_name}</strong><br>
      <strong>${data.player1_sets_won} : ${data.player2_sets_won}</strong> (Number of sets)<br>
      <strong>Winner: ${data.winner_name}</strong><br>
      <h3>Set Details:</h3>
    `;

    if (data.sets && Array.isArray(data.sets)) {
      data.sets.forEach((set, index) => {
        summary += `
          <strong>Set n°${index + 1}:</strong><br>
          ${set.player1_score} - ${set.player2_score}<br>
        `;
      });
    } else {
      summary += "No sets recorded.";
    }

    let summaryDiv = document.getElementById("app_main");
    summaryDiv.innerHTML = summary;

    const backButton = document.getElementById("backButton");
    if (backButton) {
      backButton.addEventListener("click", () => {
        summaryDiv.innerHTML = ""; 

        if (gameType === 'tournament') {
          DisplayTournamentGame();
        } else {
          displayGameForm();
        }
      });
    }
  })
  .catch(error => {
    console.error("Error retrieving match results:", error);
    // Vous pourriez aussi vouloir afficher un message d'erreur à l'utilisateur ici
  });
}


// Dimensions et objets du jeu
const paddleWidth = 10,
  paddleHeight = 100;
let canvas, player, opponent, ball;

// Initialisation des objets de jeu
function initGameObjects(gameCanvas) {
  canvas = gameCanvas;

  player = {
    x: 0,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "WHITE",
    score: 0,
  };

  opponent = {
    x: canvas.width - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: "WHITE",
    score: 0,
  };

  ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 5,
    velocityX: 5,
    velocityY: 5,
    color: "WHITE",
  };

  if (control1 === "mouse") {
    canvas.addEventListener("mousemove", (event) => {
      let rect = canvas.getBoundingClientRect();
      let newY = event.clientY - rect.top - player.height / 2;
      player.y = Math.max(0, Math.min(newY, canvas.height - paddleHeight));
    });
  } else if (control1 === "arrows" || control1 === "wasd") {
    document.addEventListener("keydown", (event) => {
      if (control1 === "arrows") {
        if (event.key === "ArrowUp" && player.y > 0) {
          player.y -= 20;
          event.preventDefault();
        } else if (event.key === "ArrowDown" && player.y < canvas.height - paddleHeight) {
          player.y += 20;
          event.preventDefault();
        }
      } else if (control1 === "wasd") {
        if (event.key === "w" && player.y > 0) {
          player.y -= 20;
        } else if (event.key === "s" && player.y < canvas.height - paddleHeight) {
          player.y += 20;
        }
      }
    });
  }

  if (context === "multiplayer") {
    if (control2 === "mouse") {
      canvas.addEventListener("mousemove", (event) => {
        let rect = canvas.getBoundingClientRect();
        let newY = event.clientY - rect.top - opponent.height / 2;
        opponent.y = event.clientY - rect.top - opponent.height / 2;
      });
    } else if (control2 === "arrows" || control2 === "wasd") {
      document.addEventListener("keydown", (event) => {
        if (control2 === "arrows") {
          if (event.key === "ArrowUp" && opponent.y > 0) {
            opponent.y -= 20;
            event.preventDefault();
          } else if (event.key === "ArrowDown" && opponent.y < canvas.height - paddleHeight) {
            opponent.y += 20;
            event.preventDefault();
          }
        } else if (control2 === "wasd") {
          if (event.key === "w" && opponent.y > 0) {
            opponent.y -= 20;
          } else if (event.key === "s" && opponent.y < canvas.height - paddleHeight) {
            opponent.y += 20;
          }
        }
      });
    }
  }
}

// Dessiner un rectangle
function drawRect(x, y, w, h, color, ctx) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Dessiner un cercle
function drawCircle(x, y, r, color, ctx) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();
}

// Dessiner du texte
function drawText(text, x, y, color, ctx) {
  ctx.fillStyle = color;
  ctx.font = "45px fantasy";
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

// Rendu du jeu
function render(ctx) {
  if (design === "oldschool"){
    drawRect(0, 0, canvas.width, canvas.height, "#000", ctx); // Fond noir
    drawText(player.score, canvas.width / 4, canvas.height / 5, "WHITE", ctx); // Score joueur
    drawText(
      opponent.score,
      (3 * canvas.width) / 4,
      canvas.height / 5,
      "WHITE",
      ctx,
    ); // Score ordinateur
    drawRect(player.x, player.y, player.width, player.height, player.color, ctx); // Paddle joueur
    drawRect(
      opponent.x,
      opponent.y,
      opponent.width,
      opponent.height,
      opponent.color,
      ctx,
    ); // Paddle ordinateur
    drawCircle(ball.x, ball.y, ball.radius, ball.color, ctx); // Balle
  }
  if (design === "modern"){
    let gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f0c29");
    gradient.addColorStop(0.5, "#302b63");
    gradient.addColorStop(1, "#24243e");
    drawRect(0, 0, canvas.width, canvas.height, gradient, ctx);

    drawGlowingRect(player.x, player.y, player.width, player.height, "#0ff", ctx);
    drawGlowingRect(opponent.x, opponent.y, opponent.width, opponent.height, "#f0f", ctx);
    drawGlowingCircle(ball.x, ball.y, ball.radius, "#ff0", ctx);

    drawText(player.score, canvas.width / 4, canvas.height / 5, "#0ff", ctx);
    drawText(opponent.score, (3 * canvas.width) / 4, canvas.height / 5, "#f0f", ctx);
  }
}

// Vérifier les collisions
function collision(b, p) {
  return (
    b.x - b.radius < p.x + p.width &&
    b.x + b.radius > p.x &&
    b.y - b.radius < p.y + p.height &&
    b.y + b.radius > p.y
  );
}

// Réinitialiser la balle
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = 5;
  ball.velocityX = -ball.velocityX;
}

// Envoyer le score au serveur
function sendScore() {
  // Initialiser les variables
  let tournament = null;
  let isTournamentMatch = false;
  const matchID = localStorage.getItem("matchID");
  const context = localStorage.getItem("context");
  // Vérifier le contexte
  if (context !== "solo") {
    const tournamentID = localStorage.getItem("tournamentId");
    if (tournamentID) {
      tournament = tournamentID;
      isTournamentMatch = true;
    }
  }

  console.log("Value of player1 before sending:", player1); 
  console.log("setHistory before sending:", setHistory);
  console.log("matchID before sending:", matchID);

  // Déterminer le gagnant
  let winner = null;
  if (player1Wins > player2Wins) {
    winner = player1; // ID du joueur 1
  } else if (player2Wins > player1Wins) {
    winner = player2; // ID du joueur 2
  }

  // Déterminer la méthode HTTP à utiliser
  const method = matchID ? "PUT" : "POST";
  const url = matchID ? `/api/scores/${matchID}/` : "/api/scores/";

  console.log("methode :", method, " et match ID: ", matchID);

  return fetch(url, {
    method: method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user1: user1,
      player1: player1,
      user2: user2,
      player2: player2,
      sets: setHistory,
      player1_sets_won: player1Wins,
      player2_sets_won: player2Wins,
      sets_to_win: numberOfGames,
      points_per_set: pointsToWin,
      tournament: tournament,
      is_tournament_match: isTournamentMatch,
      winner: winner,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Score submitted:", data);
      // Si c'est un POST (nouvelle création), mettre à jour matchID dans localStorage
      if (method === "POST") {
        localStorage.setItem("matchID", data.id);  // Supposant que 'id' est le champ de l'ID du match dans la réponse
        console.log("matchID after creation:", data.id);
        return data.id; // Retourner le nouvel ID du match
      } else {
        console.log("matchID after update:", matchID);
        return matchID; // Retourner l'ID du match existant
      }
    })
    .catch((error) => {
      console.error("Error sending score:", error);
      throw error; // Propager l'erreur pour que l'appelant puisse la gérer si nécessaire
    });
}

function stopGameProcess() {
  // Arrêter l'intervalle de jeu
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }

  // Fermer la connexion WebSocket
  shouldReconnect = false;  // Désactiver la reconnexion automatique
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
    console.log("WebSocket disconnected.");
  }

 //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  // Désactiver d'autres écouteurs si nécessaire
  // canvas.removeEventListener('mousemove', handleMouseMove);

  // Réinitialiser les variables de jeu
  player1Wins = 0;
  player2Wins = 0;
  currentGame = 0;
  setHistory = [];
}
