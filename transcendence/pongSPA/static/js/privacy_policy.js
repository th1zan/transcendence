export function loadPrivacyPolicyModal() {
	const modalHTML = `
	  <div class="modal fade" id="privacyPolicyModal" tabindex="-1" aria-labelledby="privacyPolicyLabel" aria-hidden="true">
		<div class="modal-dialog modal-lg">
		  <div class="modal-content">
			<div class="modal-header">
			  <h5 class="modal-title" id="privacyPolicyLabel">Privacy Policy</h5>
			  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body" style="max-height: 400px; overflow-y: auto;">
			  <p><strong>Effective Date:</strong> 14.02.2025</p>
			  <h2>1. Introduction</h2>
			  <p>We respect your privacy and are committed to protecting your personal data...</p>
  
			  <h2>2. Data We Collect</h2>
			  <ul>
				<li><strong>Account Information:</strong> Username, email, password, phone number, avatar.</li>
				<li><strong>Game & Profile Data:</strong> Match history, friend lists, and tournament participation.</li>
			  </ul>
  
			  <h2>3. How We Use Your Data</h2>
			  <ul>
				<li>To create and manage your account.</li>
				<li>To enable participation in games and tournaments.</li>
				<li>To allow you to connect with friends and manage your profile.</li>
			  </ul>
  
			  <h2>4. Your Rights Under GDPR</h2>
			  <ul>
				<li>Access: Request a copy of your personal data.</li>
				<li>Rectification: Correct inaccurate or incomplete data.</li>
				<li>Erasure: Request deletion of your account and associated data.</li>
			  </ul>
  
			  <p>If you have questions, contact us at: pong42@gmail.com</p>
			</div>
			<div class="modal-footer">
			  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
			</div>
		  </div>
		</div>
	  </div>
	`;
  
	document.body.insertAdjacentHTML("beforeend", modalHTML);
}