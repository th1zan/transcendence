let gameInterval; // Variable globale pour stocker l'intervalle de jeu

// Variables globales pour suivre les scores et le jeu
let user1 = "user1";
let user2 = "Bot_AI";
let numberOfGames = 1;
let pointsToWin = 2;
let currentGame = 0;
let player1Wins = 0;
let player2Wins = 0;

// Variable pour stocker l'historique des sets
let setHistory = [];

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

  const fps = 50;
  gameInterval = setInterval(() => {
    update();
    render(context);
  }, 1000 / fps);
}

export function startGameSetup() {
  console.log("Username from localStorage:", localStorage.getItem("username"));
  const storedUsername = localStorage.getItem("username");
  if (storedUsername) {
    user1 = storedUsername;
  } else {
    console.warn("Aucun nom d'utilisateur trouvé dans le localStorage.");
    user1 = "user1"; // valeur par défaut si le nom d'utilisateur n'est pas stocké
  }

  user2 = document.getElementById("user2").value || "Bot_AI"; // Valeur par défaut si non renseigné
  numberOfGames = parseInt(document.getElementById("numberOfGames").value) || 1;
  pointsToWin = parseInt(document.getElementById("pointsToWin").value) || 2;
  document.getElementById("gameForm").style.display = "none";
  document.getElementById("pong").style.display = "block";

  currentGame = 0; // Initialiser le compteur de parties
  player1Wins = 0;
  player2Wins = 0;
  setHistory = []; // Réinitialiser l'historique des sets

  startPongGame();
}

function resetScores() {
  player.score = 0;
  computer.score = 0;
}

function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;
  }

  let computerLevel = 0.1;
  computer.y += (ball.y - (computer.y + computer.height / 2)) * computerLevel;

  let playerPaddle = ball.x < canvas.width / 2 ? player : computer;

  if (collision(ball, playerPaddle)) {
    ball.velocityX = -ball.velocityX;
    ball.speed += 0.1;
  }

  if (ball.x - ball.radius < 0) {
    computer.score++;
    if (computer.score === pointsToWin) {
      player2Wins++;
      saveSetResult(); // Sauvegarder le résultat du set
      handleGameEnd(user2);
    } else {
      resetBall();
    }
  } else if (ball.x + ball.radius > canvas.width) {
    player.score++;
    if (player.score === pointsToWin) {
      player1Wins++;
      saveSetResult(); // Sauvegarder le résultat du set
      handleGameEnd(user1);
    } else {
      resetBall();
    }
  }
}

function saveSetResult() {
  // Enregistrer le résultat actuel du set
  setHistory.push({
    set_number: currentGame + 1,
    user1_score: player.score,
    user2_score: computer.score,
  });
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

  document.getElementById("pong").style.display = "none";
  document.getElementById("result").style.display = "block";

  let summary = `
    ${user1}: ${player1Wins} wins<br>
    ${user2}: ${player2Wins} wins<br>
    Winner: ${finalWinner}<br>
    Number of Games: ${numberOfGames}<br>
    Points to Win: ${pointsToWin}<br>
    <button id="backButton">Retour</button>
    <h3>Set History:</h3>
  `;

  setHistory.forEach((set, index) => {
    summary += `Set ${index + 1}: ${user1} ${set.user1_score} - ${user2} ${set.user2_score}<br>`;
  });

  document.getElementById("summary").innerHTML = summary;

  // Attacher un écouteur d'événement au bouton après l'insertion dans le DOM
  document.getElementById("backButton").addEventListener("click", () => {
    displayWelcomePage(username);
  });
}

// Dimensions et objets du jeu
const paddleWidth = 10,
  paddleHeight = 100;
let canvas, player, computer, ball;

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

  computer = {
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

  // Contrôle du paddle du joueur avec la souris
  canvas.addEventListener("mousemove", (event) => {
    let rect = canvas.getBoundingClientRect();
    player.y = event.clientY - rect.top - player.height / 2;
  });
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

// Rendu du jeu
function render(ctx) {
  drawRect(0, 0, canvas.width, canvas.height, "#000", ctx); // Fond noir
  drawText(player.score, canvas.width / 4, canvas.height / 5, "WHITE", ctx); // Score joueur
  drawText(
    computer.score,
    (3 * canvas.width) / 4,
    canvas.height / 5,
    "WHITE",
    ctx,
  ); // Score ordinateur
  drawRect(player.x, player.y, player.width, player.height, player.color, ctx); // Paddle joueur
  drawRect(
    computer.x,
    computer.y,
    computer.width,
    computer.height,
    computer.color,
    ctx,
  ); // Paddle ordinateur
  drawCircle(ball.x, ball.y, ball.radius, ball.color, ctx); // Balle
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
  // const token = localStorage.getItem("access_token");

  // if (!token) {
  //   console.error("Token non trouvé. Veuillez vous reconnecter.");
  //   return;
  // }

  // Vérifiez le contenu de setHistory avant l'envoi
  console.log("setHistory avant l'envoi:", setHistory);

  fetch("/api/scores/", {
    method: "POST",
    credentials: "include", // Include cookies in the request
    // credentials: "omit", // Omit all credentials from the request
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user1,
      user2,
      sets: setHistory, // Utilise l'historique des sets
      user1_sets_won: player1Wins,
      user2_sets_won: player2Wins,
      sets_to_win: numberOfGames,
      points_per_set: pointsToWin,
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
