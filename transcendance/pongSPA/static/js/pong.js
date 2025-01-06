const canvas = document.getElementById("pong");
const context = canvas.getContext("2d");

// Create the paddle
const paddleWidth = 10,
  paddleHeight = 100;
const player = {
  x: 0,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: "WHITE",
  score: 0,
};
const computer = {
  x: canvas.width - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: "WHITE",
  score: 0,
};

// Create the ball
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 10,
  speed: 5,
  velocityX: 5,
  velocityY: 5,
  color: "WHITE",
};

// Draw rectangle
function drawRect(x, y, w, h, color) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}

// Draw circle
function drawCircle(x, y, r, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2, false);
  context.closePath();
  context.fill();
}

// Draw text
function drawText(text, x, y, color) {
  context.fillStyle = color;
  context.font = "45px fantasy";
  context.fillText(text, x, y);
}

// Render the game
function render() {
  drawRect(0, 0, canvas.width, canvas.height, "#000");
  drawText(player.score, canvas.width / 4, canvas.height / 5, "WHITE");
  drawText(computer.score, (3 * canvas.width) / 4, canvas.height / 5, "WHITE");
  drawRect(player.x, player.y, player.width, player.height, player.color);
  drawRect(
    computer.x,
    computer.y,
    computer.width,
    computer.height,
    computer.color,
  );
  drawCircle(ball.x, ball.y, ball.radius, ball.color);
}

// Control the player's paddle
canvas.addEventListener("mousemove", (event) => {
  let rect = canvas.getBoundingClientRect();
  player.y = event.clientY - rect.top - player.height / 2;
});

// Collision detection
function collision(b, p) {
  p.top = p.y;
  p.bottom = p.y + p.height;
  p.left = p.x;
  p.right = p.x + p.width;

  b.top = b.y - b.radius;
  b.bottom = b.y + b.radius;
  b.left = b.x - b.radius;
  b.right = b.x + b.radius;

  return (
    p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top
  );
}

// Reset the ball
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = 5;
  ball.velocityX = -ball.velocityX;
}

// Update: position, movement, score
function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  // Simple AI to control the computer paddle
  let computerLevel = 0.1;
  computer.y += (ball.y - (computer.y + computer.height / 2)) * computerLevel;

  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;
  }

  let playerOrComputer = ball.x < canvas.width / 2 ? player : computer;

  if (collision(ball, playerOrComputer)) {
    let collidePoint =
      ball.y - (playerOrComputer.y + playerOrComputer.height / 2);
    collidePoint = collidePoint / (playerOrComputer.height / 2);

    let angleRad = (Math.PI / 4) * collidePoint;

    let direction = ball.x < canvas.width / 2 ? 1 : -1;
    ball.velocityX = direction * ball.speed * Math.cos(angleRad);
    ball.velocityY = ball.speed * Math.sin(angleRad);

    ball.speed += 0.1;
  }

  if (ball.x - ball.radius < 0) {
    computer.score++;
    sendScore(); // Appel après que l'ordinateur marque un point
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    player.score++;
    sendScore(); // Appel après que le joueur marque un point
    resetBall();
  }
}

// Game loop
function game() {
  update();
  render();
}

// Number of frames per second
let framePerSecond = 50;
setInterval(game, 1000 / framePerSecond);

// Send score to the server
function sendScore() {
  const token = localStorage.getItem("access_token");

  fetch("/api/scores/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ player_name: "Player", score: player.score }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Score submitted:", data);
    })
    .catch((error) => {
      console.error("Error submitting score:", error);
    });
}
