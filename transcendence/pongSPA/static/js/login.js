import { getToken, createAccount } from './auth.js';

export function displayConnectionFormular() {
    document.getElementById('app_top').innerHTML = '';
    document.getElementById('app_main').innerHTML = '';
    document.getElementById('app_bottom').innerHTML = '';
  
    const appDiv = document.getElementById("app_main");  appDiv.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="min-height: 75vh; background-color: #f8f9fa;">
        <div class="card p-5 shadow-lg" style="width: 30rem; border-radius: 20px;">
          <h2 class="text-center mb-5" style="font-size: 2.5rem; color: #007bff;">Welcome Back</h2>
          <form id="loginForm">
            <div class="form-group mb-4">
              <label for="username" style="font-size: 1.3rem;"><i class="bi bi-person"></i> Username</label>
              <input 
                type="text" 
                id="username" 
                class="form-control form-control-lg" 
                placeholder="Enter your username" 
                required 
              />
            </div>
            <div class="form-group mb-5">
              <label for="password" style="font-size: 1.3rem;"><i class="bi bi-lock"></i> Password</label>
              <input 
                type="password" 
                id="password" 
                class="form-control form-control-lg" 
                placeholder="Enter your password" 
                required 
              />
            </div>
            <button 
              type="submit" 
              class="btn btn-success w-100 py-3" 
              style="font-size: 1.3rem;">
              Sign In
            </button>
          </form>
          <button 
            id="signupButton" 
            class="btn btn-primary w-100 mt-4 py-3" 
            style="font-size: 1.3rem;">
            Create Account
          </button>
        </div>
      </div>
      `;
  
    document
      .getElementById("loginForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        getToken(username, password);
      });
  
    document
      .getElementById("signupButton")
      .addEventListener("click", displayRegistrationForm);
  
  }

// account creation 
export function displayRegistrationForm() {
  history.pushState({ page: 'register' }, 'Register', '#register');
    //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';


const appDiv = document.getElementById("app_main");
appDiv.innerHTML = `
<div class="d-flex justify-content-center align-items-center" style="min-height: 75vh; background-color: #f8f9fa;">
  <div class="card p-5 shadow-lg" style="width: 30rem;">
    <h2 class="text-center mb-5 text-primary" style="font-size: 2.5rem;">Create Account</h2>
    <form id="signupForm">
      <div class="form-group mb-4">
        <label for="newUsername" class="h5"><i class="bi bi-person"></i> Username</label>
        <input 
          type="text" 
          id="newUsername" 
          class="form-control form-control-lg" 
          placeholder="Enter your username" 
          required 
        />
      </div>
      <div class="form-group mb-5">
        <label for="newPassword" class="h5"><i class="bi bi-lock"></i> Mot de passe</label>
        <input 
          type="password" 
          id="newPassword" 
          class="form-control form-control-lg" 
          placeholder="Enter your password" 
          required 
        />
      </div>
      <div class="form-check mb-4">
        <input type="checkbox" id="privacyPolicyAccepted" required />
        <label for="privacyPolicyAccepted">
          I accept the <a href="#" id="privacyPolicyLink">Privacy Policy</a>
        </label>
      </div>
      <button 
        type="submit" 
        class="btn btn-success w-100 py-3 h5">
        Create Account
      </button>
    </form>
    <button 
      id="backToLoginButton" 
      class="btn btn-primary w-100 mt-4 py-3 h5">
      Back to Login
    </button>
  </div>
</div>
`;

  document
    .getElementById("signupForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const newUsername = document.getElementById("newUsername").value;
      const newPassword = document.getElementById("newPassword").value;
      const privacyPolicyAccepted = document.getElementById("privacyPolicyAccepted").checked;

      if (!privacyPolicyAccepted) {
        alert("You must accept the Privacy Policy to register.");
        return;
      }
      createAccount(newUsername, newPassword, privacyPolicyAccepted);
    });

  document
    .getElementById("backToLoginButton")
    .addEventListener("click", displayConnectionFormular);

}
