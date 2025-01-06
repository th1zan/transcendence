export function renderLogin(container) {
	container.innerHTML = `
	  <div class="sidebar">
		<h2>Login</h2>
		<form id="login-form">
		  <input type="text" id="username" placeholder="Username" required>
		  <input type="password" id="password" placeholder="Password" required>
		  <button type="submit">Login</button>
		</form>
	  </div>
	`;
	document.getElementById('login-form').addEventListener('submit', (e) => {
	  e.preventDefault();
	  console.log('Logged in!');
	  const navigateEvent = new CustomEvent('navigate', { detail: { section: 'pong' } });
	  document.dispatchEvent(navigateEvent);
	});
  }