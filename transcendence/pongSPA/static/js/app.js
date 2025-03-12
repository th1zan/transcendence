import { displayWelcomePage } from "./welcome.js";
import { gameInterval, stopGameProcess, removeGameListeners } from "./pong.js";
import { displayStats } from "./stats.js";
import { displayTournament, resetAppMainLock } from "./tournament.js";
import { validateToken, refreshToken } from "./auth.js";
import { displayFriends } from "./friends.js";
import { displaySettings } from "./settings.js";
import { displayGameForm } from "./gameForm.js";
import { displayConnectionFormular, displayRegistrationForm } from "./login.js";
import { displayMenu } from "./menu.js";
import { loadPrivacyPolicyModal } from "./privacy_policy.js";


//'true' to display logs, 'false' for production
const DEBUG = true;
window.refreshToken = refreshToken; //for debuging, to delete

document.getElementById("lang-en").addEventListener("click", () => changeLanguage("en"));
document.getElementById("lang-fr").addEventListener("click", () => changeLanguage("fr"));
document.getElementById("lang-es").addEventListener("click", () => changeLanguage("es"));

i18next.use(i18nextHttpBackend).init({
  lng: localStorage.getItem('language') || "en",
  fallbackLng: "en",
  backend: {
    loadPath: "/static/locales/{{lng}}/translation.json"
  }
})
.then(() => {
  console.log("i18next ready!");
  logger.log('Language loaded from localStorage:', i18next.language);
  
  try {
    updateLanguageButtons();
  } catch (e) {
    console.error("Error updating language buttons:", e);
  }

  const currentRoute = window.location.hash.replace('#', '') || 'welcome';
  handleRouteChange(currentRoute);
});

export function changeLanguage(lang) {
  i18next.changeLanguage(lang, (err) => {
    if (err) {
      console.error("Error changing language:", err);
    } else {
      localStorage.setItem('language', lang);
      logger.log('Language changed to', lang, 'and saved to localStorage');
      
      try {
        updateLanguageButtons();
      } catch (e) {
        console.error("Error updating language buttons:", e);
      }
      
      loadPrivacyPolicyModal();
      const currentRoute = window.location.hash.replace('#', '') || 'welcome';
      handleRouteChange(currentRoute);
    }
  });
}

function updateLanguageButtons() {
  const enButton = document.getElementById("lang-en");
  const frButton = document.getElementById("lang-fr");
  const esButton = document.getElementById("lang-es");
  
  if (!enButton || !frButton || !esButton) {
    logger.warn("Language buttons not found in the DOM");
    return;
  }
  
  if (i18next.language === "fr") {
    enButton.classList.remove("btn-primary");
    enButton.classList.add("btn-outline-primary");

    esButton.classList.remove("btn-primary");
    esButton.classList.add("btn-outline-primary");
    
    frButton.classList.remove("btn-outline-primary");
    frButton.classList.add("btn-primary");
    
  } else if (i18next.language === "es") {
    enButton.classList.remove("btn-primary");
    enButton.classList.add("btn-outline-primary");

    frButton.classList.remove("btn-primary");
    frButton.classList.add("btn-outline-primary");

    esButton.classList.remove("btn-outline-primary");
    esButton.classList.add("btn-primary");

  } else {
    enButton.classList.remove("btn-outline-primary");
    enButton.classList.add("btn-primary");
    
    frButton.classList.remove("btn-primary");
    frButton.classList.add("btn-outline-primary");

    esButton.classList.remove("btn-primary");
    esButton.classList.add("btn-outline-primary");
  }
  
  logger.log('Language buttons updated, active language:', i18next.language);
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

    document.cookie.split(";").forEach((c) => {
        logger.log('clear the cookies');
        document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    loadPrivacyPolicyModal();

    let initialRoute = window.location.hash.replace('#', '') || 'login';
    logger.log('Initial route determined:', initialRoute);

    let isUserLoggedIn = false;

    validateToken().then((isTokenValid) => {
        logger.log('validateToken resolved with:', isTokenValid);
        isUserLoggedIn = isTokenValid;
        if (isUserLoggedIn) {
            logger.log('User is logged in based on cookies');
        } else {
            logger.log('User is not logged in');
        }

        if (isUserLoggedIn && initialRoute === 'login') {
            logger.log('User logged in but on login page, redirecting to welcome');
            initialRoute = 'welcome';
            history.replaceState({ page: 'welcome' }, ' ', '#welcome');
        } else if (!isUserLoggedIn && initialRoute !== 'login') {
            logger.log('User not logged in but not on login page, redirecting to login');
            initialRoute = 'login';
            history.replaceState({ page: 'login' }, 'Login', '#login');
        }

        logger.log('Calling handleRouteChange with route:', initialRoute);
        handleRouteChange(initialRoute);
    }).catch((error) => {
        logger.error('Error checking user login status:', error);
        handleRouteChange('login');
    });

    // setInterval(async () => {
    //     logger.log('Refreshing token via interval...');
    //     const refreshed = await refreshToken();
    //     if (!refreshed) {
    //         logger.warn('Interval refresh failed, consider re-authenticating.');
    //         showModal(
    //             i18next.t('app.warning'),
    //             i18next.t('app.sessionExpired'),
    //             'OK',
    //             () => navigateTo('login')
    //         );
    //     }
    // }, 4 * 60 * 1000);

    window.addEventListener("popstate", function (event) {
        let route = event.state ? event.state.page : window.location.hash.replace('#', '') || 'welcome';
        logger.log('Navigating to route:', route);
        handleRouteChange(route);
    });

    // Ajout pour gérer la déconnexion à la fermeture de la page
    window.addEventListener('beforeunload', () => {
        if (isUserLoggedIn) {
            navigator.sendBeacon('/api/auth/logout/', JSON.stringify({}));
            logger.log('Sent logout beacon on page close');
        }
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
  // be sur app_main is unlocked
  resetAppMainLock();
  
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
let isHandlingRouteChange = false; // Protection contre les appels concurrents
let redirectAttempts = 0;
const MAX_REDIRECT_ATTEMPTS = 3;

function handleRouteChange(route) {
    logger.log('handleRouteChange called with route:', route);
    addToCustomHistory(route);

    if (isHandlingRouteChange) {
        logger.log('Route change already in progress, skipping:', route);
        return;
    }

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

    isHandlingRouteChange = true; // Verrouillage

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
                    handleRouteChange(route); // Récursion contrôlée
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
                handleRouteChange(route); // Récursion contrôlée
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
    }).finally(() => {
        isHandlingRouteChange = false; // Libération du verrou
    });
}
// function handleRouteChange(route) {
//   logger.log('handleRouteChange called with route:', route);
//   addToCustomHistory(route);
//
//   if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
//     logger.error('Maximum redirect attempts reached, stopping to prevent infinite loop');
//     showModal(
//       i18next.t('app.error'),
//       i18next.t('app.authError'),
//       'OK',
//       () => navigateTo('login')
//     );
//     return;
//   }
//
//   validateToken().then((isTokenValid) => {
//     logger.log('Token validation in handleRouteChange:', isTokenValid);
//     isUserLoggedIn = isTokenValid;
//
//     const publicRoutes = ['login', 'register'];
//
//     if (publicRoutes.includes(route) || isUserLoggedIn) {
//       logger.log('Route is public or user is logged in');
//       redirectAttempts = 0; // Réinitialiser le compteur si la validation réussit
//       switch (route) {
//         case 'login':
//           if (!isUserLoggedIn) {
//             displayConnectionFormular();
//           } else {
//             navigateTo('welcome');
//           }
//           break;
//         case 'register':
//           displayRegistrationForm();
//           break;
//         case 'welcome':
//           updateUI(displayWelcomePage);
//           break;
//         case 'game':
//           updateUI(displayGameForm);
//           break;
//         case 'tournament':
//           updateUI(displayTournament);
//           break;
//         case 'stats':
//           updateUI(displayStats);
//           break;
//         // case 'userStats':
//         //   updateUI(fetchResultats);
//         //   break;
//         // case 'ranking':
//         //   updateUI(fetchRanking);
//         //   break;
//         case 'friends':
//           updateUI(displayFriends);
//           break;
//         case 'settings':
//           updateUI(displaySettings);
//           break;
//         default:
//           logger.log('Unknown route:', route);
//           if (!isUserLoggedIn) {
//             navigateTo('login');
//           } else {
//             navigateTo('welcome');
//           }
//       }
//     } else {
//       logger.log('User not logged in, attempting to refresh token before redirect');
//       refreshToken().then(refreshed => {
//         if (refreshed) {
//           logger.log('Token refreshed successfully, retrying route change');
//           redirectAttempts = 0;
//           handleRouteChange(route);
//         } else {
//           logger.log('Refresh failed, redirecting to login');
//           redirectAttempts++;
//           navigateTo('login');
//         }
//       }).catch(error => {
//         logger.error('Error refreshing token during redirect:', error);
//         redirectAttempts++;
//         navigateTo('login');
//       });
//     }
//   }).catch((error) => {
//     logger.error('Error validating token during route change:', error);
//     refreshToken().then(refreshed => {
//       if (refreshed) {
//         logger.log('Token refreshed successfully after validation error, retrying route change');
//         redirectAttempts = 0;
//         handleRouteChange(route);
//       } else {
//         logger.log('Refresh failed after validation error, redirecting to login');
//         redirectAttempts++;
//         navigateTo('login');
//       }
//     }).catch(error => {
//       logger.error('Error refreshing token after validation failure:', error);
//       redirectAttempts++;
//       navigateTo('login');
//     });
//   });
// }

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
    logger.error(`Modal element with ID ${modalId} not found. Ensure it exists in index.html.`);
    return;
  }

  // Nettoyer tout backdrop existant avant d’ouvrir
  const existingBackdrop = document.querySelector('.modal-backdrop');
  if (existingBackdrop) {
    existingBackdrop.remove();
    logger.log("Pre-existing backdrop removed before showing modal");
  }

  const modal = new bootstrap.Modal(modalElement, {
    backdrop: 'static',
    keyboard: false
  });

  const titleElement = document.getElementById(`${modalId}Label`);
  if (titleElement) titleElement.textContent = title;
  else logger.error(`Title element ${modalId}Label not found`);

  const bodyElement = document.getElementById(`${modalId}Body`);
  if (bodyElement) bodyElement.textContent = message;
  else logger.error(`Body element ${modalId}Body not found`);

  const actionButton = document.getElementById(`${modalId}Action`);
  if (actionButton) {
    actionButton.textContent = actionText || i18next.t('app.close');
    if (actionButton._handler) {
      actionButton.removeEventListener('click', actionButton._handler);
    }
    const handler = function () {
      if (actionCallback) actionCallback();
      modal.hide();

      // Nettoyer le backdrop après fermeture
      setTimeout(() => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
          logger.log("Backdrop manually removed after hide");
        } else {
          logger.log("No backdrop found after hide");
        }

        let focusTarget = focusElementId ? document.getElementById(focusElementId) : null;
        if (focusTarget) {
          focusTarget.focus();
          logger.log(`Focus restored on ${focusElementId}`);
        } else {
          document.activeElement.blur();
          logger.log("Focus removed after modal closed");
        }
      }, 300);
    };
    actionButton.addEventListener('click', handler);
    actionButton._handler = handler;
    actionButton.focus();
  } else {
    logger.error(`Action button ${modalId}Action not found`);
  }

  modal.show();
}
