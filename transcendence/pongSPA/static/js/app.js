import { displayWelcomePage } from "./welcome.js";
import { gameInterval, stopGameProcess, removeGameListeners } from "./pong.js";
import { displayStats } from "./stats.js";
import { displayTournament } from "./tournament.js";
import { validateToken } from "./auth.js";
import { displayFriends } from "./friends.js";
import { displaySettings } from "./settings.js";
import { displayGameForm } from "./gameForm.js";
import { refreshToken } from "./auth.js";
import { displayConnectionFormular, displayRegistrationForm } from "./login.js";
import { displayMenu } from "./menu.js";
import { loadPrivacyPolicyModal } from "./privacy_policy.js";

//'true' to display logs, 'false' for production
const DEBUG = true;

document.getElementById("lang-en").addEventListener("click", () => changeLanguage("en"));
document.getElementById("lang-fr").addEventListener("click", () => changeLanguage("fr"));

i18next.use(i18nextHttpBackend).init({
  lng: "en",
  fallbackLng: "en",
  backend: {
    loadPath: "/static/locales/{{lng}}/translation.json"
  }
})
.then(() => {
  console.log("i18next ready!");
    const currentRoute = window.location.hash.replace('#', '') || 'welcome';
    handleRouteChange(currentRoute);
});

export function changeLanguage(lang) {
  i18next.changeLanguage(lang, (err) => {
     if (err) {
      console.error("Error changing language :", err);
      } else {
        logger.log('Language changed to', lang);
        loadPrivacyPolicyModal();
        const currentRoute = window.location.hash.replace('#', '') || 'welcome';
        handleRouteChange(currentRoute);
      }
  });
}

export const logger = {
  log: (...args) => {
    if (DEBUG) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (DEBUG) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    console.error(...args);
  }
};


let isUserLoggedIn = false;

document.addEventListener("DOMContentLoaded", () => {

  logger.log('Cookies at DOM load:', document.cookie);

  //when the DOM is loaded, this event is triggered and it will:

  //  0. Clear all cookies
  //
  //  COMMENTED FOR DEBUGIN
  document.cookie.split(";").forEach((c) => {
    logger.log('clear the cookies');
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  loadPrivacyPolicyModal();

  // 1. Determine the initial route based on the URL hash
  let initialRoute = window.location.hash.replace('#', '') || 'login';
  logger.log('Initial route determined:', initialRoute);

  //Global variable for the "logged" status
  let isUserLoggedIn = false;

  // 2. Check if the user is logged in
  validateToken().then((isTokenValid) => {
    logger.log('validateToken resolved with:', isTokenValid);
    isUserLoggedIn = isTokenValid;
    if (isUserLoggedIn) {
      logger.log('User is logged in based on cookies');
    } else {
      logger.log('User is not logged in');
    }

    // 3. Set initial state based on login status and initial route
    if (isUserLoggedIn && initialRoute === 'login') {
      logger.log('User logged in but on login page, redirecting to welcome');
      initialRoute = 'welcome';
      history.replaceState({ page: 'welcome' }, ' ', '#welcome');
    } else if (!isUserLoggedIn && initialRoute !== 'login') {
      logger.log('User not logged in but not on login page, redirecting to login');
      initialRoute = 'login';
      history.replaceState({ page: 'login' }, 'Login', '#login');
    }

    // 4. Handle the initial route
    logger.log('Calling handleRouteChange with route:', initialRoute);
    handleRouteChange(initialRoute);
  }).catch((error) => {
    logger.error('Error checking user login status:', error);
    logger.log('User is not logged in due to an error');
    handleRouteChange('login');
  });

  // 5. Plan the refreshing interval for the authentication Token
  logger.log('Setting up token refresh interval');
  setInterval(async () => {
  logger.log('Refreshing token via interval...');
  const refreshed = await refreshToken();
  if (!refreshed) {
      logger.warn('Interval refresh failed, consider re-authenticating.');
      showModal(
        i18next.t('app.warning'),
        i18next.t('app.sessionExpired'),
        'OK',
        () => navigateTo('login')
      );
    }
  }, 4 * 60 * 1000); // token is refreshed every 4 minutes

  // 5. Listener for history changes
  window.addEventListener("popstate", function (event) {
    logger.log('Popstate event triggered. Current state:', event.state);
    let route;
    if (event.state) {
      route = event.state.page;
    } else {
      route = window.location.hash.replace('#', '') || 'welcome';
    }
    logger.log('Navigating to route:', route);
    logger.log('Custom History:', customHistory);
    handleRouteChange(route);
  });
});

// variable to store history
let customHistory = [];

function addToCustomHistory(route) {
  if (customHistory[customHistory.length - 1] !== route) {
    customHistory.push(route);
  }
  logger.log('Custom History updated:', customHistory);
}

// !!!! Function to navigate. Use this to go on a page
export function navigateTo(route) {
  logger.log('Navigating to:', route);

  // if pong is running -> stop it
  if (gameInterval) {
    logger.log("Game is running. Stopping game before navigation...");
    stopGameProcess(false); // Ne pas marquer comme terminé, juste arrêter
  }

  // delete the lister used to play (mouse, AWSD, arrows)
  removeGameListeners();

  history.pushState({ page: route }, '', `#${route}`);
  logger.log('pushstate: ', history.state);
  addToCustomHistory(route);
  handleRouteChange(route);

  // Delete (blur) the focus (it can be lost sometimes)
  setTimeout(() => {
    document.activeElement.blur();
    logger.log("Focus removed after navigation to:", route);
  }, 50);
}

//avoid infinit redirection loop
let redirectAttempts = 0;
const MAX_REDIRECT_ATTEMPTS = 3;

function handleRouteChange(route) {
  logger.log('handleRouteChange called with route:', route);
  addToCustomHistory(route);

  if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
    logger.error('Maximum redirect attempts reached, stopping to prevent infinite loop');
    showModal(
      i18next.t('app.error'),
      i18next.t('app.authError'),
      'OK',
      () => navigateTo('login')
    );
    return;
  }

  validateToken().then((isTokenValid) => {
    logger.log('Token validation in handleRouteChange:', isTokenValid);
    isUserLoggedIn = isTokenValid;

    const publicRoutes = ['login', 'register'];

    if (publicRoutes.includes(route) || isUserLoggedIn) {
      logger.log('Route is public or user is logged in');
      redirectAttempts = 0; // Réinitialiser le compteur si la validation réussit
      switch (route) {
        case 'login':
          if (!isUserLoggedIn) {
            displayConnectionFormular();
          } else {
            navigateTo('welcome');
          }
          break;
        case 'register':
          displayRegistrationForm();
          break;
        case 'welcome':
          updateUI(displayWelcomePage);
          break;
        case 'game':
          updateUI(displayGameForm);
          break;
        case 'tournament':
          updateUI(displayTournament);
          break;
        case 'stats':
          updateUI(displayStats);
          break;
        // case 'userStats':
        //   updateUI(fetchResultats);
        //   break;
        // case 'ranking':
        //   updateUI(fetchRanking);
        //   break;
        case 'friends':
          updateUI(displayFriends);
          break;
        case 'settings':
          updateUI(displaySettings);
          break;
        default:
          logger.log('Unknown route:', route);
          if (!isUserLoggedIn) {
            navigateTo('login');
          } else {
            navigateTo('welcome');
          }
      }
    } else {
      logger.log('User not logged in, attempting to refresh token before redirect');
      refreshToken().then(refreshed => {
        if (refreshed) {
          logger.log('Token refreshed successfully, retrying route change');
          redirectAttempts = 0;
          handleRouteChange(route);
        } else {
          logger.log('Refresh failed, redirecting to login');
          redirectAttempts++;
          navigateTo('login');
        }
      }).catch(error => {
        logger.error('Error refreshing token during redirect:', error);
        redirectAttempts++;
        navigateTo('login');
      });
    }
  }).catch((error) => {
    logger.error('Error validating token during route change:', error);
    refreshToken().then(refreshed => {
      if (refreshed) {
        logger.log('Token refreshed successfully after validation error, retrying route change');
        redirectAttempts = 0;
        handleRouteChange(route);
      } else {
        logger.log('Refresh failed after validation error, redirecting to login');
        redirectAttempts++;
        navigateTo('login');
      }
    }).catch(error => {
      logger.error('Error refreshing token after validation failure:', error);
      redirectAttempts++;
      navigateTo('login');
    });
  });
}

function updateUI(routeFunction) {
  // 1. Afficher le menu uniquement si l'utilisateur est connecté
  if (isUserLoggedIn) {
    displayMenu();
  }
  // 2. Afficher le contenu si routeFunction est une fonction
  if (typeof routeFunction === 'function') {
    routeFunction();
  } else {
    logger.warn('routeFunction is not a function:', routeFunction);
  }
}

//function to display a modal with a custom message instead an alert() popup
export function showModal(title, message, actionText, actionCallback, focusElementId = null) {
  const modalId = 'oneButtonModal';
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    logger.error(`Modal element with ID ${modalId} not found`);
    return;
  }

  const modal = new bootstrap.Modal(modalElement, {
    backdrop: 'static', // stop closing if clicking outside the modal
    keyboard: false     // stop closing with escape
  });

  // Modal title
  const titleElement = document.getElementById(`${modalId}Label`);
  if (titleElement) {
    titleElement.textContent = title;
  } else {
    logger.error(`Title element for ${modalId}Label not found`);
  }

  // Message
  const bodyElement = document.getElementById(`${modalId}Body`);
  if (bodyElement) {
    bodyElement.textContent = message;
  } else {
    logger.error(`Modal body element not found for ${modalId}`);
  }

  // Action button
  const actionButton = document.getElementById(`${modalId}Action`);
  if (actionButton) {
    actionButton.textContent = actionText || i18next.t('app.close');

    // Supprimer l’ancien listener s’il existe
    if (actionButton._handler) {
      actionButton.removeEventListener('click', actionButton._handler);
    }

    // Définir le nouveau handler
    const handler = function () {
      if (actionCallback) {
        actionCallback();
      }
      modal.hide();

      // Gestion du focus après fermeture
      setTimeout(() => {
        let focusTarget = null;

        if (focusElementId) {
          focusTarget = document.getElementById(focusElementId);
          if (focusTarget) {
            focusTarget.focus();
            logger.log(`Focus restored on ${focusElementId}`);
            return;
          } else {
            logger.warn(`Specified element ${focusElementId} not found for focus`);
          }
        }

        document.activeElement.blur();
        logger.log("Focus removed after modal closed");
      }, 50);
    };

    // Ajouter le listener et stocker sa référence
    actionButton.addEventListener('click', handler);
    actionButton._handler = handler; // Stocker le handler pour suppression future
  } else {
    logger.error(`Action button for ${modalId}Action not found`);
  }

  // Afficher la modale et focaliser le bouton
  modal.show();
  if (actionButton) {
    actionButton.focus();
  }
}
