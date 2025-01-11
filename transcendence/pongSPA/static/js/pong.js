document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  // Create canvas dynamically
  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  canvas.width = 800;
  canvas.height = 400;
  app.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const paddleWidth = 10;
  const paddleHeight = 100;
  const ballSize = 10;

  // Positions
  let playerY = (canvas.height - paddleHeight) / 2;
  let aiY = (canvas.height - paddleHeight) / 2;
  let ballX = canvas.width / 2;
  let ballY = canvas.height / 2;

  // Speeds
  let ballSpeedX = 3;
  let ballSpeedY = 3;

  // Player controls
  let playerSpeed = 0;

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") playerSpeed = -5;
    if (event.key === "ArrowDown") playerSpeed = 5;
  });

  document.addEventListener("keyup", () => {
    playerSpeed = 0;
  });

  function draw() {
    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    ctx.fillStyle = "white";
    ctx.fillRect(0, playerY, paddleWidth, paddleHeight); // Player paddle
    ctx.fillRect(canvas.width - paddleWidth, aiY, paddleWidth, paddleHeight); // AI paddle

    // Draw ball
    ctx.fillRect(ballX, ballY, ballSize, ballSize);
  }

  function update() {
    // Ball movement
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Ball collision with top and bottom
    if (ballY <= 0 || ballY + ballSize >= canvas.height) {
      ballSpeedY = -ballSpeedY;
    }

    // Ball collision with paddles
    if (
      (ballX <= paddleWidth &&
        ballY + ballSize >= playerY &&
        ballY <= playerY + paddleHeight) ||
      (ballX + ballSize >= canvas.width - paddleWidth &&
        ballY + ballSize >= aiY &&
        ballY <= aiY + paddleHeight)
    ) {
      ballSpeedX = -ballSpeedX;
    }

    // Paddle movement
    playerY += playerSpeed;
    if (playerY < 0) playerY = 0;
    if (playerY + paddleHeight > canvas.height) playerY = canvas.height - paddleHeight;

    // Simple AI for opponent paddle
    if (aiY + paddleHeight / 2 < ballY) aiY += 3;
    if (aiY + paddleHeight / 2 > ballY) aiY -= 3;

    // Reset ball if out of bounds
    if (ballX < 0 || ballX > canvas.width) {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      ballSpeedX = -ballSpeedX;
    }
  }

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
});
