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
let shouldReconnect = true;

// Variable pour stocker l'historique des sets
let setHistory = [];

// Ouvrir une connexion websocket avec le serveur
function connectWebSocket()
{
  ws = new WebSocket("ws://localhost:8000/ws/pong_ai/");

  ws.onopen = () => console.log("WebSocket connecté");
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "update_paddle") {
      computer.y = data.y;
    }
  };
  ws.onerror = (error) => console.error("WebSocket erreur :", error);
  ws.onclose = () => {
    if (shouldReconnect) {
      console.log("WebSocket déconnecté. Reconnexion...");
      setTimeout(connectWebSocket, 1000);
    }
  };}

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
  connectWebSocket(); 

  const fps = 50;
  gameInterval = setInterval(() => {
    update();
    render(context);
  }, 1000 / fps);
}

function updateGamePanel() {
  const gamePanel = document.getElementById("app_bottom");
  if (gamePanel) {
    gamePanel.style.display = "block";
 
    gamePanel.innerHTML = `
      <div id="summary"></div>
   `;
   
    // Ajouter le bouton "Quit Game"
    if (!document.getElementById("quitGameButton")) { // Éviter de créer plusieurs boutons
      const quitButton = document.createElement("button");
      quitButton.id = "quitGameButton";
      quitButton.textContent = "Quit Game";
      quitButton.onclick = function() {
        stopGameProcess();
        
        // Déterminer la fonction à appeler ensuite en fonction du contexte
        if (context === "tournament") {
          DisplayTournamentGame();
        } else if (context === "solo") {
          const username = localStorage.getItem("username");
          displayWelcomePage(username);
        }
      };
      gamePanel.appendChild(quitButton);
    }
  }

  console.log("Call to updateGamePanel");
}

export function startGameSetup(p1, p2, numGames, ptsToWin, ctxt = "solo") {
  // Mettre à jour les variables globales
  user1 = p1;
  user2 = p2;
  player1 = p1;
  player2 = p2;
  numberOfGames = numGames;
  pointsToWin = ptsToWin;
  context = ctxt;
  shouldReconnect = true;
  
  console.log("Valeur de player1 dans startGameSetup:", player1);
  console.log("Valeur de player2 dans startGameSetup:", player2);

  const appTop = document.getElementById("app_top");
  if (appTop) {
    appTop.style.display = "none";
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <canvas id="pong" width="800" height="400"></canvas>
  `;



  let pongCanvas = document.getElementById("pong");
  // if (!pongCanvas) {
  //   pongCanvas = document.createElement('canvas');
  //   pongCanvas.id = "pong";
  //   pongCanvas.width = 800; // Définir la largeur du canvas
  //   pongCanvas.height = 400; // Définir la hauteur du canvas
  //   document.body.appendChild(pongCanvas);
  // }
  //
  //
  pongCanvas.style.display = "block";

  // Gérer l'affichage en fonction du contexte
  // if (context === "tournament") {
  //   // Si le contexte est un tournoi, cacher seulement les éléments spécifiques
  //   document.getElementById("tournamentMatches").style.display = "none";
  // } else if (context === "solo") {
  //   // Si le contexte est solo, cacher tout le formulaire de jeu
  //   let gameForm = document.getElementById("gameForm");
  //   if (gameForm) {
  //     gameForm.style.display = "none";
  //   }
  // }

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
  computer.score = 0;
}

function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;
  }

  let playerPaddle = ball.x < canvas.width / 2 ? player : computer;

  if (collision(ball, playerPaddle)) {
    ball.velocityX = -ball.velocityX;
    ball.speed += 0.1;
  }

  if (ball.x - ball.radius < 0) {
    computer.score++;
    if (computer.score === pointsToWin) {
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
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ball_position", x: ball.x, y: ball.y }));
  }
}

function saveSetResult() {
  // Enregistrer le résultat actuel du set
  setHistory.push({
    set_number: currentGame + 1,
    player1_score: player.score,
    player2_score: computer.score,
  });
}

function handleGameEnd(winner) {
  clearInterval(gameInterval); // Arrêter la boucle de jeu
  currentGame++;

  function updateResults() {
    const resultDiv = document.getElementById("app_bottom");
    if (resultDiv) {
      resultDiv.style.display = "block";
      let summary = `
        <h3>Set History:</h3>
      `;

      setHistory.forEach((set, index) => {
        summary += `Set ${index + 1}: ${player1} ${set.player1_score} - ${player2} ${set.player2_score}<br>`;
      });

      document.getElementById("summary").innerHTML = summary;
    }
  }

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
  // const matchID = localStorage.getItem("matchID");
  const username = localStorage.getItem("username");
  const appTop = document.getElementById("app_top");
  
  // if (appTop) {
  //   appTop.style.display = "none";  
  // }

  // Masquer le canvas pong
  const pongCanvas = document.getElementById("pong");
  if (pongCanvas) {
    pongCanvas.style.display = "none";
  }
  
  // const appBottom = document.getElementById("app_bottom");
  // if (appBottom) {
  //   appBottom.innerHTML = ``;  
  // }

  let resultDiv = document.getElementById("app_main");
  resultDiv.style.display = "block";

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
    let summary = `
      <button id="backButton">Retour au tournoi</button>
      <br>
      <br>
      ${data.player1_name}: ${data.player1_sets_won} wins<br>
      ${data.player2_name}: ${data.player2_sets_won} wins<br>
      Winner: ${data.winner_name}<br>
      Number of Games: ${data.sets_to_win}<br>
      Points to Win: ${data.points_per_set}<br>
      <h3>Set History:</h3>
    `;

    if (data.sets && Array.isArray(data.sets)) {
      data.sets.forEach((set, index) => {
        summary += `Set ${index + 1}: ${data.player1_name} ${set.player1_score} - ${data.player2_name} ${set.player2_score}<br>`;
      });
    } else {
      summary += "No sets recorded.";
    }

    let summaryDiv = document.getElementById("summary");
    if (!summaryDiv) {
      summaryDiv = document.createElement('div');
      summaryDiv.id = "summary";
      resultDiv.appendChild(summaryDiv);
    }
    summaryDiv.innerHTML = summary;

    const backButton = document.getElementById("backButton");
    if (backButton) {
      backButton.addEventListener("click", () => {
        summaryDiv.innerHTML = ""; 

        if (typeof context !== 'undefined' && context !== "solo") {
          const tournamentName = localStorage.getItem("tournamentName");
          DisplayTournamentGame();
        } else {
          displayWelcomePage(username);
        }
      });
    }
  })
  .catch(error => {
    console.error("Erreur lors de la récupération des résultats du match :", error);
    // Gérer l'erreur ici, par exemple en affichant un message à l'utilisateur
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
  console.log("matchID avant l'envoi:", matchID);

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
      // Si c'est un POST (nouvelle création), mettre à jour matchID dans localStorage
      if (method === "POST") {
        localStorage.setItem("matchID", data.id);  // Supposant que 'id' est le champ de l'ID du match dans la réponse
        console.log("matchID après création:", data.id);
        return data.id; // Retourner le nouvel ID du match
      } else {
        console.log("matchID après mise à jour:", matchID);
        return matchID; // Retourner l'ID du match existant
      }
    })
    .catch((error) => {
      console.error("Erreur lors de l'envoi du score :", error);
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
    console.log("WebSocket déconnecté");
  }

  // Masquer le canvas
  const pongCanvas = document.getElementById("pong");
  if (pongCanvas) {
    pongCanvas.style.display = "none";
  }

  // Masquer le game_panel
  const gamePanel = document.getElementById("game_panel");
  if (gamePanel) {
    gamePanel.style.display = "none";
  }

  // Désactiver d'autres écouteurs si nécessaire
  // canvas.removeEventListener('mousemove', handleMouseMove);

  // Réinitialiser les variables de jeu
  player1Wins = 0;
  player2Wins = 0;
  currentGame = 0;
  setHistory = [];
}
