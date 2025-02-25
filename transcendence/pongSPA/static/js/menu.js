import { logout } from './auth.js';
import { navigateTo } from "./app.js";


export function displayMenu() {

  /*when this displayMenu() function is called,
  we can use and fill these HTML containers from index.html,
  they are identified by their id:
  - "app" in the center of the page
  - "menu" on the left
  - "footer" on the bottom
  - "header" on the top
  */

  //empty all the containers
  document.getElementById('app_top').className = 'semi-transparent-bg p-3 text-dark';
  document.getElementById('app_main').className = 'semi-transparent-bg flex-grow-1 p-3 text-dark';
  document.getElementById('app_bottom').className = 'semi-transparent-bg p-3 text-dark';



  //class and CSS definition for the div and navbar (menu) container
  const menuDiv = document.getElementById("menu");

  menuDiv.innerHTML = `
  <div class="menu-container d-flex flex-column h-100">
    <img src="/static/mvillarr.jpg" class="rounded-circle object-fit-cover align-self-center my-4" alt="Mvillarr" />

    <button id="welcomeButton" class="btn btn-primary nav-link menu-button">Welcome page</button>
    <button id="playButton" class="btn btn-primary nav-link menu-button" role="button" aria-selected="true">Play a game</button>
    <button id="tournamentButton" class="btn btn-primary nav-link menu-button">Tournament</button>
    <button id="statsButton" class="btn btn-primary nav-link menu-button">Statistics</button>
    <button id="friendsButton" class="btn btn-primary nav-link menu-button">Friends</button>
    <div class="flex-grow-1"></div>
    <button id="settingsButton" class="btn btn-primary nav-link menu-button">Settings</button>
    <button id="logoutButton" class="btn btn-danger nav-link menu-button">Logout</button>
    </div>
      `;


document.getElementById("welcomeButton").addEventListener("click", function() {
  navigateTo('welcome');
});

document.getElementById("playButton").addEventListener("click", function() {
  navigateTo('game');
});

document.getElementById("tournamentButton").addEventListener("click", function() {
  navigateTo('tournament');
});

document.getElementById("statsButton").addEventListener("click", function() {
  navigateTo('stats');
});

document.getElementById("friendsButton").addEventListener("click", function() {
  navigateTo('friends');
});

document.getElementById("settingsButton").addEventListener("click", function() {
  navigateTo('settings');
});



  document.getElementById("logoutButton").addEventListener("click", function() {
    logout();
  });

}
