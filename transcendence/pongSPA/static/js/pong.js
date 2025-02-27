import { displayWelcomePage } from "./app.js";
import { DisplayTournamentGame } from "./tournament.js";

let gameInterval; // Variable globale pour stocker l'intervalle de jeu
// Variables globales pour suivre les scores et le jeu
let ws; //websocket pour communiquer avec l'IA
let user1 = "default_user1";
let user2 = "default_user2";
let player1 = "default_player1";
let player2 = "default_player2";
let context = "solo"
let numberOfGames = 1;
let pointsToWin = 1;
let currentGame = 0;
let player1Wins = 0;
let player2Wins = 0;
let control1 = "arrows";
let control2 = "wasd";
let design = "retro";
let difficulty = "easy";
let collisionActive = false;
let fps = 50;
let step = 20;

// Variable pour stocker l'historique des sets
let setHistory = [];

let wsOpenCallback = null;

// Ouvrir une connexion websocket avec le serveur
function connectWebSocket(onOpenCallback = null)
{
  if (onOpenCallback) {
    wsOpenCallback = onOpenCallback;
  }

  ws = new WebSocket("ws://localhost:8000/ws/pong_ai/");

  ws.onopen = () => {
    console.log("WebSocket connecté");
    if (onOpenCallback && typeof onOpenCallback === 'function') {
      onOpenCallback();
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "update_paddle") {
      opponent.y = data.y;
    }
  };
  ws.onerror = (error) => console.error("WebSocket erreur :", error);
  ws.onclose = () => 
  {
    console.log("WebSocket déconnecté. Reconnexion...");
    setTimeout(connectWebSocket, 1000);
  };
}

function sendGameConfiguration() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("Envoi des données de jeu au serveur...");
    ws.send(JSON.stringify({ 
      type: "start", 
      canvas_height: canvas.height, 
      canvas_width: canvas.width, 
      paddle_height: player.height, 
      fps: fps, 
      step: step, 
      control: control1 
    }));
  } else {
    console.error("WebSocket non connecté, impossible d'envoyer la configuration");
  }
}

// Démarrer le jeu Pong
function startPongGame() {
  const canvas = document.getElementById("pong");

  if (!canvas) {
    console.error("Canvas introuvable. Réessayez dans 100 ms.");
    setTimeout(startPongGame, 100);
    return;
  }

  const context = canvas.getContext("2d");

  initGameObjects(canvas);
  resetScores();
  if (context != "multiplayer" )
  {
    connectWebSocket(sendGameConfiguration);
  }

  clearInterval(gameInterval) ;

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("Envoi des données de jeu au serveur...");
    //ws.send(JSON.stringify({ type: "start", canvas_height: canvas.height, canvas_width: canvas.width, paddle_height: player.height, fps: fps, step: step, control: control1 }));
  }

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
  difficulty = gameSettings.difficulty;

  console.log("Valeur de player1 dans startGameSetup:", player1);
  console.log("Valeur de player2 dans startGameSetup:", player2);

  // Vérifier et créer pong si nécessaire
  let pongCanvas = document.getElementById("pong");
  // if (!pongCanvas) {
  //   pongCanvas = document.createElement('canvas');
  //   pongCanvas.id = "pong";
  //   pongCanvas.width = 800; // Définir la largeur du canvas
  //   pongCanvas.height = 400; // Définir la hauteur du canvas
  //   document.body.appendChild(pongCanvas);
  // }
  pongCanvas.style.display = "block";

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

  // Démarrer le jeu Pong
  startPongGame();
}

function resetScores() {
  player.score = 0;
  opponent.score = 0;
}

let obstacleVelocityY = 5;
let obstacleDirection = 1;

function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;
  }

  if (difficulty === "hard" && obstacle) {
    obstacle.y += obstacleVelocityY * obstacleDirection;

    if (obstacle.y <= 0 || obstacle.y + obstacle.height >= canvas.height) {
        obstacleDirection *= -1;
    }
  }

  if (difficulty === "hard" && obstacle && collisionActive) {
    if 
    (
      ball.x + ball.radius > obstacle.x &&
      ball.x - ball.radius < obstacle.x + obstacle.width &&
      ball.y + ball.radius > obstacle.y &&
      ball.y - ball.radius < obstacle.y + obstacle.height
    ) 
    {
      ball.velocityX = -ball.velocityX; // comme un mur 
    }
  }

  let playerPaddle = ball.x < canvas.width / 2 ? player : opponent;

  if (collision(ball, playerPaddle))
  {      
    let angle = -(playerPaddle.y + player.height/2 - ball.y) / (player.height / 2) * Math.PI / 4;
    ball.velocityY = ball.speed * Math.sin(angle);

    if (ball.x < canvas.width / 2)
    {
      ball.velocityX = ball.speed * Math.cos(angle);
    }
    else
    {
      ball.velocityX = -ball.speed * Math.cos(angle);
    }
    if (ball.speed <= 10)
    {
      if (difficulty === "easy")
      {
        ball.speed *= 1.01;
        ball.velocityX *= 1.01;
        ball.velocityY *= 1.01;
      }
      else if (difficulty === "medium")
      {
        ball.speed *= 1.02;
        ball.velocityX *= 1.02;
        ball.velocityY *= 1.02;
        console.log("vitesse de la balle: ", ball.speed);
      }
      else if (difficulty === "hard")
      {
        ball.speed *= 1.03;
        ball.velocityX *= 1.03;
        ball.velocityY *= 1.03;
      }
    }
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
    //if (context != "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
    //  ws.send(JSON.stringify({ type: "game_state", score_ai: opponent.score, score_opponent: player.score }));
    //}
  }

  if (context != "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
   ws.send(JSON.stringify({ type: "ball", x: ball.x, y: ball.y, speedx: ball.velocityX, speedy: ball.velocityY }));
  }  
}


function saveSetResult() {
  // Enregistrer le résultat actuel du set
  setHistory.push({
    set_number: currentGame + 1,
    player1_score: player.score,
    player2_score: opponent.score,
  });

  //if (context != "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
   // ws.send(JSON.stringify({ type: "score", player_score: player.score, ai_score: opponent.score }));
  //}
}

function handleGameEnd(winner) {
  clearInterval(gameInterval); // Arrêter la boucle de jeu
  currentGame++;

  if (currentGame < numberOfGames) {
    alert(`${winner} wins this game! Starting the next game...`);
    resetScores();
    startPongGame(); // Démarrer la prochaine partie
  } else {
    sendScore(); // Envoyer les scores au serveur
    displayResults(winner);
  }
}

function displayResults(finalWinner) {
  const username = localStorage.getItem("username");

  // Vérifiez et créez l'élément result si nécessaire
  let resultDiv = document.getElementById("result");
  if (!resultDiv) {
    resultDiv = document.createElement('div');
    resultDiv.id = "result";
    document.body.appendChild(resultDiv);
  }

  // Masquer le canvas pong
  const pongCanvas = document.getElementById("pong");
  if (pongCanvas) {
    pongCanvas.style.display = "none";
  }

  // Afficher le résultat
  resultDiv.style.display = "block";

  let summary = `
    ${player1}: ${player1Wins} wins<br>
    ${player2}: ${player2Wins} wins<br>
    Winner: ${finalWinner}<br>
    Number of Games: ${numberOfGames}<br>
    Points to Win: ${pointsToWin}<br>
    <button id="backButton">Retour</button>
    <h3>Set History:</h3>
  `;

  console.log("setHistory lors de l'affichage des résultats :", setHistory);

  setHistory.forEach((set, index) => {
    summary += `Set ${index + 1}: ${player1} ${set.player1_score} - ${player2} ${set.player2_score}<br>`;
  });

  // Assurez-vous que l'élément summary existe
  let summaryDiv = document.getElementById("summary");
  if (!summaryDiv) {
    summaryDiv = document.createElement('div');
    summaryDiv.id = "summary";
    resultDiv.appendChild(summaryDiv);
  }
  summaryDiv.innerHTML = summary;

  // Attacher un écouteur d'événement au bouton après l'insertion dans le DOM
  const backButton = document.getElementById("backButton");
  if (backButton) {
    backButton.addEventListener("click", () => {
      summaryDiv.innerHTML = ""; // Effacer le summary

      if (typeof context !== 'undefined' && context !== "solo") {
        const tournamentName = localStorage.getItem("tournamentName")
        DisplayTournamentGame();
      } else {
        // Retourner à la page d'accueil si context est "solo"
        displayWelcomePage(username);
      }
    });
  }
}

// Dimensions et objets du jeu
let canvas, player, opponent, ball, obstacle;

// Initialisation des objets de jeu
function initGameObjects(gameCanvas) {
  canvas = gameCanvas;

  const paddleWidth = 10;
  let paddleHeight = 100;
  let ballSpeed = 5;
  let ballAngle = Math.random() * Math.PI/2 - Math.PI/4 + Math.round(Math.random())*Math.PI;


  if (difficulty === "medium" || difficulty === "hard") {
    paddleHeight = 80;
    ballSpeed = 8;
  }

  if (difficulty === "hard") {
    obstacle = {
      x: canvas.width / 2 - 5,
      y: canvas.height / 3,
      width: 20,
      height: paddleHeight,
      color: "GRAY"
    };
  }
  else
  {obstacle = null;}

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
    speed: ballSpeed,
    velocityX: ballSpeed*Math.cos(ballAngle),
    velocityY: ballSpeed*Math.sin(ballAngle),
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
      event.preventDefault();
      if (control1 === "arrows") {
        if (event.key === "ArrowUp" && player.y > 0) {
          player.y -= step;
        } else if (event.key === "ArrowDown" && player.y < canvas.height - paddleHeight) {
          player.y += step;
        }
      } else if (control1 === "wasd") {
        if (event.key === "w" && player.y > 0) {
          player.y -= step;
        } else if (event.key === "s" && player.y < canvas.height - paddleHeight) {
          player.y += step;
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
        event.preventDefault();
        if (control2 === "arrows") {
          if (event.key === "ArrowUp" && opponent.y > 0) {
            opponent.y -= step;
          } else if (event.key === "ArrowDown" && opponent.y < canvas.height - paddleHeight) {
            opponent.y += step;
          }
        } else if (control2 === "wasd") {
          if (event.key === "w" && opponent.y > 0) {
            opponent.y -= step;
          } else if (event.key === "s" && opponent.y < canvas.height - paddleHeight) {
            opponent.y += step;
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
  if (design === "retro"){
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

    if (difficulty === "hard" && obstacle) {
      drawRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, "#FFFFFF", ctx);
    }
  }
  if (design === "neon"){
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

    if (difficulty === "hard" && obstacle) {
      drawGlowingRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, "#FF5733", ctx);
    }
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
function resetBall() 
{
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  if (difficulty === "easy")
  {
    ball.speed = 5;
  }
  else
  {
    ball.speed = 8;
  }

  // Définir la direction alternée de la balle à chaque reset
  //let directionX = Math.random() > 0.5 ? 1 : -1;
  //let directionY = Math.random() > 0.5 ? 1 : -1;
  let ballAngle =  Math.random() * Math.PI/2 - Math.PI/4 + Math.round(Math.random())*Math.PI;
  // Appliquer la vitesse initiale correcte en fonction de la direction choisie
  ball.velocityX = ball.speed * Math.cos(ballAngle); //* directionX;
  ball.velocityY = ball.speed * Math.sin(ballAngle); //* directionY;
  
  if (context != "multiplayer" && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "reset", x: ball.x, y: ball.y, speedx: ball.velocityX, speedy: ball.velocityY }));
  }
 

  collisionActive = false;

  setTimeout(() => {
    collisionActive = true;
  }, 2000);
}

// Envoyer le score au serveur
function sendScore() {
  // Initialiser les variables
  let tournament = null;
  let isTournamentMatch = false;
  const matchID = localStorage.getItem("matchID");

  // Vérifier le contexte
  if (typeof context !== 'undefined' && context !== "solo") {
    const tournamentID = localStorage.getItem("tournamentId");
    if (tournamentID) {
      tournament = tournamentID;
      isTournamentMatch = true;
    }
  }

  console.log("Valeur de player1 avant l'envoi :", player1); 
  console.log("setHistory avant l'envoi:", setHistory);

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

  fetch(url, {
    method: method,
    credentials: "include", // Inclure les cookies dans la requête
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
      winner: winner, // Ajouter le gagnant
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Score soumis :", data);
    })
    .catch((error) => {
      console.error("Erreur lors de l'envoi du score :", error);
    });
}
