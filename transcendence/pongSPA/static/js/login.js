import {showModal, logger } from './app.js';
import { getToken, createAccount, verify2FALogin } from './auth.js';
import { sanitizeAdvanced } from './utils.js';

// login
export function displayConnectionFormular() {
    document.getElementById('menu').innerHTML = '';
    document.getElementById('app_top').innerHTML = '';
    document.getElementById('app_main').innerHTML = '';
    document.getElementById('app_bottom').innerHTML = '';

    const appDiv = document.getElementById("app_main");  appDiv.innerHTML = `
      <div class="d-flex justify-content-center align-items-center mx-auto" style="min-height: 75vh;">
        <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
            <h2 class="text-center mb-5 text-primary fs-3 fs-sm-2 fs-md-1 fw-bold text-break">${i18next.t('login.welcomeBack')}</h2>          <form id="loginForm">
            <div class="form-group mb-4">
              <label for="username" style="font-size: 1.3rem; font-family: 'Press Start 2P', cursive; font-size: 15px;"><i class="bi bi-person"></i> ${i18next.t('login.username')}</label>
              <input
                type="text"
                id="username"
                class="form-control form-control-lg"
                placeholder="${i18next.t('login.enterUsername')}"
                required
              />
            </div>
            <div class="form-group mb-5">
              <label for="password" style="font-size: 1.3rem; font-family: 'Press Start 2P', cursive; font-size: 15px;"><i class="bi bi-lock"></i> ${i18next.t('login.password')}</label>
              <input
                type="password"
                id="password"
                class="form-control form-control-lg"
                placeholder="${i18next.t('login.enterPassword')}"
                required
              />
            </div>
            <button
              type="submit"
              class="btn btn-success w-100 py-3"
              style="font-size: 1.3rem;">
              ${i18next.t('login.signIn')}
            </button>
          </form>

          <!-- OTP Verification Section (Hidden by Default) -->
          <div id="otpSection" style="display: none;">
            <p class="text-center" style="font-size: 1.3rem;">Enter the 6-digit code sent to your email:</p>
            <input type="text" id="otpInput" class="form-control form-control-lg" placeholder="${i18next.t('login.enterOTP')}">
            <button id="otpVerifyButton" class="btn btn-primary w-100 mt-3 py-3" style="font-size: 1.3rem;">${i18next.t('login.verifyOTP')}</button>
            <button id="backToLoginButton" class="btn btn-secondary w-100 mt-2 py-3" style="font-size: 1.3rem;">${i18next.t('login.backToLogin')}</button>
          </div>


          <button
            id="signupButton"
            class="btn btn-primary w-100 mt-4 py-3"
            style="font-size: 1.3rem;">
            ${i18next.t('login.createAccount')}
          </button>
        </div>
      </div>
      `;

    // Handle login form submission
    document
      .getElementById("loginForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const usernameRaw = document.getElementById("username").value;
        const passwordRaw = document.getElementById("password").value;
        
        // Sanitize inputs
        const username = sanitizeAdvanced(usernameRaw);
        const password = passwordRaw; // Don't sanitize passwords as they might contain special chars
        
        getToken(username, password);
      });

    // Handle OTP verification
    document.getElementById("otpVerifyButton").addEventListener("click", function () {
        verify2FALogin();
    });

    // Handle Back to Login button
    document.getElementById("backToLoginButton").addEventListener("click", function () {
        document.getElementById("otpSection").style.display = "none";
        document.getElementById("loginForm").style.display = "block";
    });

    // Handle sign-up button
    document
      .getElementById("signupButton")
      .addEventListener("click", displayRegistrationForm);

  }

// account creation
export function displayRegistrationForm() {
  history.pushState({ page: 'register' }, 'Register', '#register');
  // Vider tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appDiv = document.getElementById("app_main");
  appDiv.innerHTML = `
    <div class="d-flex justify-content-center align-items-center bg-transparent" style="min-height: 75vh;">
      <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
        <h2 class="text-center mb-5 text-primary" style="font-size: 2.5rem;">${i18next.t('register.createAccount')}</h2>
        <form id="signupForm">
          <div class="form-group mb-4">
            <label for="newUsername" style="font-size: 1.3rem; font-family: 'Press Start 2P', cursive; font-size: 15px;"><i class="bi bi-person"></i> ${i18next.t('register.username')}</label>
            <input
              type="text"
              id="newUsername"
              class="form-control form-control-lg"
              placeholder="${i18next.t('register.enterUsername')}"
              required
            />
          </div>
          <div class="form-group mb-5">
            <label for="newPassword" style="font-size: 1.3rem; font-family: 'Press Start 2P', cursive; font-size: 15px;"><i class="bi bi-lock"></i> ${i18next.t('register.password')}</label>
            <input
              type="password"
              id="newPassword"
              class="form-control form-control-lg"
              placeholder="${i18next.t('register.enterPassword')}"
              required
            />
          </div>
          <div class="form-check mb-4">
            <!-- <input type="checkbox" id="privacyPolicyAccepted" required /> -->
            <input type="checkbox" id="privacyPolicyAccepted"  />
            <label for="privacyPolicyAccepted">
              ${i18next.t('register.acceptPolicy')} <a href="#" data-bs-toggle="modal" data-bs-target="#privacyPolicyModal">${i18next.t('register.privacyPolicy')}</a>
            </label>
          </div>
          <button
            type="submit"
            class="btn btn-success w-100 py-3 h5"
            style="font-size: 1.3rem;">
            ${i18next.t('register.createAccount')}
          </button>
        </form>
        <button
          id="backToLoginButton"
          class="btn btn-primary w-100 mt-4 py-3 h5"
          style="font-size: 1.3rem;">
          ${i18next.t('register.backToLogin')}
        </button>
      </div>
    </div>
  `;

  document
    .getElementById("signupForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      logger.log('Form submitted, checking privacyPolicyAccepted...');
      const newUsernameRaw = document.getElementById("newUsername").value;
      const newPasswordRaw = document.getElementById("newPassword").value;
      const privacyPolicyAccepted = document.getElementById("privacyPolicyAccepted").checked;
      
      // Sanitize inputs
      const newUsername = sanitizeAdvanced(newUsernameRaw);
      const newPassword = newPasswordRaw; // we don't sanitize passwords as they might contain special chars
      
      if (!privacyPolicyAccepted) {
        logger.log('Attempting to display modal...');
        showModal(
        i18next.t('register.privacyRequired'),
        i18next.t('register.mustAcceptPolicy'),
        'OK',
        () => {}
      );
      return;
      }
      createAccount(newUsername, newPassword, privacyPolicyAccepted);
    });

    document
    .getElementById("backToLoginButton")
    .addEventListener("click", function() {
      history.pushState({ page: 'login' }, 'Login', '#login');
      displayConnectionFormular();
    });
}
