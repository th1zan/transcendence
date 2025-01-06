document.addEventListener("DOMContentLoaded", () => {
  afficherFormulaireConnexion();

  function afficherFormulaireConnexion() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Connexion</h2>
      <form id="loginForm">
        <input type="text" id="username" placeholder="Nom d'utilisateur" required />
        <input type="password" id="password" placeholder="Mot de passe" required />
        <button type="submit">Se connecter</button>
      </form>
      <button id="signupButton">Créer un compte</button>
    `;

    document
      .getElementById("loginForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        obtenirToken(username, password);
      });

    document
      .getElementById("signupButton")
      .addEventListener("click", afficherFormulaireInscription);
  }

  function obtenirToken(username, password) {
    fetch("/api/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.access) {
          localStorage.setItem("access_token", data.access);
          afficherPageBienvenue(username);
        } else {
          alert("Erreur de connexion. Veuillez réessayer.");
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la connexion:", error);
      });
  }

  function afficherFormulaireInscription() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Créer un compte</h2>
      <form id="signupForm">
        <input type="text" id="newUsername" placeholder="Nom d'utilisateur" required />
        <input type="password" id="newPassword" placeholder="Mot de passe" required />
        <button type="submit">S'inscrire</button>
      </form>
      <button id="backToLoginButton">Retour à la connexion</button>
    `;

    document
      .getElementById("signupForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const newUsername = document.getElementById("newUsername").value;
        const newPassword = document.getElementById("newPassword").value;
        creerCompte(newUsername, newPassword);
      });

    document
      .getElementById("backToLoginButton")
      .addEventListener("click", afficherFormulaireConnexion);
  }

  function creerCompte(username, password) {
    fetch("/api/signup/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert(
            "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
          );
          afficherFormulaireConnexion();
        } else {
          alert("Erreur lors de la création du compte. Veuillez réessayer.");
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la création du compte:", error);
      });
  }

  function afficherPageBienvenue(username) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Bonjour M. ${username}</h2>
      <div id="resultats"></div>
      <button id="playButton">Jouer</button>
    `;

    fetchResultats(username);
    document
      .getElementById("playButton")
      .addEventListener("click", demarrerJeu);
  }

  function fetchResultats(username) {
    const token = localStorage.getItem("access_token");
    fetch(`/api/results/?username=${username}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const resultatsDiv = document.getElementById("resultats");
        resultatsDiv.innerHTML = "<h3>Vos résultats :</h3>";
        data.results.forEach((result) => {
          resultatsDiv.innerHTML += `<p>${result.date} - Score: ${result.score}</p>`;
        });
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des résultats:", error);
      });
  }

  function demarrerJeu() {
    // Remplacez ceci par la logique pour démarrer le jeu Pong
    alert("Le jeu commence !");
    // Par exemple, vous pouvez afficher le jeu Pong ici
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <canvas id="pong" width="800" height="400" style="border: 1px solid #000000"></canvas>
      <button id="backToWelcomeButton">Retour</button>
    `;

    // Initialiser le jeu Pong ici
    initPongGame();

    document
      .getElementById("backToWelcomeButton")
      .addEventListener("click", () => {
        afficherPageBienvenue(localStorage.getItem("username"));
      });
  }

  function initPongGame() {
    // Logique pour initialiser votre jeu Pong
    console.log("Initialiser le jeu Pong ici");
    // Vous pouvez placer ici le code JavaScript spécifique pour le jeu Pong
  }
});
