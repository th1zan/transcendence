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
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';


  const appDiv = document.getElementById('app');
  appDiv.className = 'p-1 h-100 d-flex nav flex-column nav-pills';

  //class and CSS definition for the div and navbar (menu) container
  const menuDiv = document.getElementById("menu");

  menuDiv.innerHTML = `
  <div class="d-flex flex-column h-100" style="background-color:rgb(172, 200, 195);">
      <img src="/static/mvillarr.jpg" class="rounded-circle object-fit-cover align-self-center my-4" alt="Mvillarr" width="90" height="100" />

       <button id="welcomeButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Welcome page</button>
       <button id="playButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2" role="button" aria-selected="true">Play a Game</button>
       <button id="tournamentButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Tournament</button>
       <button id="statsButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Statistics</button>
       <button id="friendsButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Friends</button>
       <div class="flex-grow-1"></div>
       <button id="settingsButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Settings</button>
       <button id="logoutButton" class="btn btn-danger nav-link mb-4 d-flex justify-content-start ps-2">Logout</button>

  </div>
      `;

  //section non intégré dans le code pour le moment
  //
  // const interactivediv = document.getelementbyid("interactivepart");
  // interactivediv.innerhtml = `
  //   <div style="background-image: url(/static/pong.jpg); background-repeat: no-repeat; background-attachment: fixeqd; background-size: 100% 100%;" class="p-1 h-50 d-flex rounded " >
  //     <div style="background-color: rgba(255, 255, 255, 0.4);" class="p-1 h-50 w-100 d-flex rounded align-self-end justify-content-between" >
  //       <div class="rounded-circle d-flex align-self-center m-3 overflow-hidden" style="width:100px ; height:60%; background-color: red;">
  //         <img src="/static/ilyanar.jpg" class="object-fit-cover"  alt="ilkay" width="100%" height="100%" />
  //       </div>
  //
  //       <div class="container row" style="" >
  //         <div class="col-4"> blabla 1 </div>
  //         <div class="col-4"> blabla 2 </div>
  //         <div class="col-4"> blabla 3 </div>
  //       </div>
  //
  //     </div>
  //   </div>
  //  `;

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
