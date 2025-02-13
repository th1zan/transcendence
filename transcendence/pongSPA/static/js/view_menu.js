import { displayGameForm } from './app.js';
import { displayTournament } from './app.js';
import { displayStats } from './app.js';
import { displayFriends } from './app.js';
import { displaySettings } from './app.js';
import { logout } from './auth.js';


export function displayWelcomePage() {

  history.pushState({ page: 'welcome' }, 'Welcome', '#welcome');
  const username = localStorage.getItem("username");

  /*when this displayWelcomePage() function is called,
  we can use and fill these HTML containers from index.html,
  they are identified by their id:
  - "app" in the center of the page
  - "menu" on the left
  - "footer" on the bottom
  - "header" on the top
  */

  //class and CSS definition for the div and navbar (menu) container
 const appDiv = document.getElementById('app');
  appDiv.className = 'p-1 h-100 d-flex nav flex-column nav-pills';
  // Object.assign(appDiv, {
    // style: {
      // width: '200px'
        // backgroundColor: '#343a40'
    // },
    // role: 'tablist',
    // 'aria-orientation': 'vertical',
    // id: 'v-pills-tab'
  // });
  // Set the background image for 'app'
  // appDiv.style.backgroundImage = "url('/static/pong.jpg')";
  // appDiv.style.backgroundRepeat = "no-repeat";
  // appDiv.style.backgroundAttachment = "fixed";
  // appDiv.style.backgroundSize = "100% 100%";

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById('app_top');
  // appTop.className = "p-1 d-flex rounded";
  appTop.style.backgroundColor = 'rgba(114,125, 123)'; // Bleu semi-transparent (anciennement bg-primary)
  appTop.innerHTML = `
    <div class="d-flex justify-content-between align-items-center w-100">
      <div>
        <h2>Bonjour ${username}</h2>
      </div>
      <div class="align-self-end">
        <div class="rounded-circle d-flex align-self-center m-3 overflow-hidden" style="width:100px; height:60%; background-color: red;">
          <img src="/static/mvillarr.jpg" class="object-fit-cover" alt="mvillarr" width="100%" height="100%" />
        </div>
      </div>
    </div>
  `;

  const appMain = document.getElementById("app_main");
  // appMain.className = "p-3 flex-grow-1";
  appMain.style.backgroundColor = 'rgba(40, 167, 69, 0.5)'; // Vert semi-transparent (anciennement bg-success)
  appMain.innerHTML = `
    Contenu de la Welcome page
  `;

  const appBottom = document.getElementById("app_bottom");
  // appBottom.className = "p-3";
  appBottom.style.backgroundColor = 'rgba(255, 193, 7, 0.5)'; // Jaune semi-transparent (anciennement bg-warning)
  appBottom.innerHTML = `
    Footer de la page
  `;

  const menuDiv = document.getElementById("menu");

  menuDiv.innerHTML = `
  <div class="d-flex flex-column h-100" style="background-color:rgb(172, 200, 195);">
      <img src="/static/mvillarr.jpg" class="rounded-circle object-fit-cover align-self-center my-4" alt="Mvillarr" width="90" height="100" />
      
       <button id="playButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2" role="button" aria-selected="true">Play a Game</button> 
       <button id="tournamentButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Tournament</button> 
       <button id="statsButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Statistics</button> 
       <button id="friendsButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Friends</button> 
       <button id="welcomeButton" class="btn btn-primary nav-link mb-3 d-flex justify-content-start ps-2">Home page</button> 
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

  document.getElementById("playButton").addEventListener("click", displayGameForm);
  document.getElementById("tournamentButton").addEventListener("click", displayTournament);
  document.getElementById("statsButton").addEventListener("click", displayStats);
  document.getElementById("friendsButton").addEventListener("click", displayFriends);
  document.getElementById("settingsButton").addEventListener("click", displaySettings);
  document.getElementById("welcomeButton").addEventListener("click", displayWelcomePage);
  document.getElementById("logoutButton").addEventListener("click", logout);
}