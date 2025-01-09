import { renderLogin } from './login.js';
import { renderPongGame } from './pong.js';
import { renderLeaderboard } from './leaderboard.js';
import { renderTournamentDashboard } from './tournament.js';

const app = document.getElementById('app');

function renderSection(section) {
  app.innerHTML = ''; // Clear current content
  switch (section) {
    case 'login':
      renderLogin(app);
      break;
    case 'pong':
      renderPongGame(app);
      break;
    case 'leaderboard':
      renderLeaderboard(app);
      break;
    case 'tournament':
      renderTournamentDashboard(app);
      break;
    default:
      renderLogin(app);
  }
}

// Initial render
renderSection('login');

// Example navigation (could be enhanced with URL routing)
document.addEventListener('navigate', (e) => {
  renderSection(e.detail.section);
});