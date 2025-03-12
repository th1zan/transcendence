export function loadPrivacyPolicyModal() {
  // destroy any existing Bootstrap modal instance
  const existingModal = document.getElementById("privacyPolicyModal");
  if (existingModal) {
    const bsModal = bootstrap.Modal.getInstance(existingModal);
    if (bsModal) {
      bsModal.dispose();
    }
    existingModal.remove();
  }

	const modalHTMLTemplates = {
		en: `
		<div class="modal fade" id="privacyPolicyModal" tabindex="-1" aria-labelledby="privacyPolicyLabel" aria-hidden="true">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="privacyPolicyLabel">Privacy Policy</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body" style="max-height: 400px; overflow-y: auto;">
					<p><strong>Effective Date:</strong> 14.02.2025</p>
					<p><strong>Last Updated:</strong> 05.03.2025</p>

					<h2>1. Introduction</h2>
					<p>At Pong42, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your data in compliance with the General Data Protection Regulation (GDPR). By using our gaming platform and services, you acknowledge and agree to the terms of this Privacy Policy.</p>

					<h2>2. What Data We Collect & Why</h2>
					<p>We only collect the minimally necessary data to provide our services, enhance user experience, and comply with legal obligations.</p>

					<h3>2.1 Account Information</h3>
					<ul>
					<li><strong>Username</strong> – Required to create and identify your account.</li>
					<li><strong>Email Address</strong> – Used for two-factor authentication (2FA) and to securely communicate one-time passwords (OTP) during login.</li>
					<li><strong>Password</strong> – Stored using secure hashing algorithms, ensuring it is never accessible in its raw form.</li>
					<li><strong>Avatar/Profile Picture</strong> – Optional; stored for user personalization.</li>
					<li><strong>Date of Registration</strong> – The date your account was created.</li>
					<li><strong>Last Seen Online Status</strong> – Displays your last recorded activity and is visible to other users. This feature cannot be disabled.</li>
					</ul>

					<h3>2.2 Game & Profile Data</h3>
					<ul>
					<li><strong>Match History</strong> – Records of your past games, including wins and losses.</li>
					<li><strong>Friend List</strong> – Players you have added as friends.</li>
					<li><strong>Tournament Participation</strong> – History of tournaments you have joined.</li>
					</ul>

					<h3>2.3 Security & Authentication Data</h3>
					<ul>
					<li><strong>Two-Factor Authentication (2FA) Status</strong> – Indicates whether 2FA is enabled or disabled for your account.</li>
					<li><strong>OTP Codes</strong> – Temporarily stored for authentication and never retained after verification.</li>
					<li><strong>Access and Refresh Tokens (JWT)</strong> – Used to securely authenticate user sessions. These tokens are JSON Web Tokens (JWTs) and are only stored in HTTP-only cookies. They are not stored in our database, ensuring that we cannot access or view them.</li>
					<ul>
						<li><strong>Access Tokens</strong> – Short-lived tokens used for session authentication.</li>
						<li><strong>Refresh Tokens</strong> – Long-lived tokens used to obtain new access tokens without requiring reauthentication.</li>
					</ul>
					</ul>

					<h3>2.4 Local Storage & Cookies</h3>
					<p>We do not use third-party tracking technologies or cookies. We only store minimal data for session management:</p>
					<ul>
					<li><strong>Username</strong> – Remembered for seamless login sessions.</li>
					<li><strong>Selected Language</strong> – Maintains your language preference across sessions.</li>
					<li><strong>Access and Refresh Tokens (JWT)</strong> – As described in Section 2.3, these tokens are only stored in HTTP-only cookies and are not accessible to us or any third parties.</li>
					</ul>

					<h2>3. How We Use Your Data</h2>
					<p>We process your personal data for the following purposes:</p>
					<ul>
					<li>To create and manage your account.</li>
					<li>To facilitate participation in games and tournaments.</li>
					<li>To provide multiplayer features, including friend lists and matchmaking.</li>
					<li>To ensure platform security, including authentication and fraud prevention.</li>
					<li>To display your last seen status to other users.</li>
					<li>To comply with legal and regulatory obligations.</li>
					</ul>
					<p>We do not sell, trade, or share your personal data with third parties for advertising purposes.</p>

					<h2>4. Managing & Deleting Your Data</h2>
					<p>You have full control over your personal data and can manage it within the platform.</p>
					<ul>
					<li><strong>Update Information</strong> – You can update your username, email, and password via your account settings.</li>
					<li><strong>Delete or Anonymize Account</strong> – You can immediately and irreversibly delete or anonymize your account from the settings page.</li>
					<ul>
						<li><strong>Account Deletion</strong> – Removes all associated personal data permanently.</li>
						<li><strong>Anonymization</strong> – Removes personally identifiable data but retains game-related history (e.g., match statistics) for analytics.</li>
					</ul>
					<li><strong>Local Data Management</strong> – You can clear browser-stored data at any time via your device settings.</li>
					</ul>
					<p>For assistance, contact us at <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a>.</p>

					<h2>5. Security Measures</h2>
					<p>We implement strict security protocols to protect your data:</p>
					<ul>
					<li>Passwords are securely hashed before storage.</li>
					<li>Two-factor authentication (2FA) is available for enhanced security.</li>
					<li>All sensitive data (including access and refresh tokens) is stored securely and never exposed to JavaScript.</li>
					<li>Data transmissions are encrypted using HTTPS.</li>
					<li>You can update or change your password at any time via your account settings.</li>
					</ul>
					<p>While we take all necessary precautions, no system is 100% secure. We recommend using strong passwords and enabling 2FA. If you identify any security vulnerabilities, please report them to us immediately at <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a>.</p>

					<h2>6. Third-Party Services</h2>
					<p>We do not sell or share your personal data for marketing purposes. However, certain platform features rely on GDPR-compliant third-party services:</p>
					<ul>
					<li><strong>Authentication Services</strong> – Used for secure logins and 2FA.</li>
					<li><strong>Avatar Storage</strong> – If you upload a custom profile picture, it is securely stored in our media directory.</li>
					</ul>

					<h2>7. Your Rights Under GDPR</h2>
					<p>Under GDPR, you have the following rights regarding your personal data:</p>
					<ul>
					<li><strong>Right to Access</strong> – You can request a copy of the personal data we hold about you.</li>
					<li><strong>Right to Rectification</strong> – You can update or correct any inaccurate or incomplete information.</li>
					<li><strong>Right to Erasure (“Right to be Forgotten”)</strong> – You may request the deletion of your account and associated data.</li>
					<li><strong>Right to Object</strong> – You may object to certain types of data processing.</li>
					</ul>
					<p>To exercise any of these rights, contact us at <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a>. We will respond within 30 days and may require additional information to verify your identity.</p>

					<h2>8. Changes to This Privacy Policy</h2>
					<p>We may update this Privacy Policy periodically to reflect changes in legal requirements or service updates. If significant changes occur, such as changes to the types of data we collect, how we use it, or with whom we share it, we will notify users via email or platform announcements. We encourage you to review this policy regularly to stay informed.</p>

					<h2>9. Contact Information</h2>
					<p>For any privacy concerns, GDPR-related requests, or inquiries, please reach out to us at:</p>
					<p>📧 <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a></p>
					<p>📍 Pong42 Team, Lausanne, Switzerland</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
				</div>
				</div>
			</div>
			</div>
	  	`,
  
		fr: `
		<div class="modal fade" id="privacyPolicyModal" tabindex="-1" aria-labelledby="privacyPolicyLabel" aria-hidden="true">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="privacyPolicyLabel">Politique de Confidentialité</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
				</div>
				<div class="modal-body" style="max-height: 400px; overflow-y: auto;">
					<p><strong>Date d'effet :</strong> 14.02.2025</p>
					<p><strong>Dernière mise à jour :</strong> 05.03.2025</p>

					<h2>1. Introduction</h2>
					<p>Chez Pong42, nous respectons votre vie privée et nous engageons à protéger vos données personnelles. Cette Politique de Confidentialité explique comment nous collectons, utilisons et protégeons vos données conformément au Règlement Général sur la Protection des Données (RGPD). En utilisant notre plateforme de jeu et nos services, vous reconnaissez et acceptez les termes de cette Politique de Confidentialité.</p>

					<h2>2. Quelles Données Nous Collectons et Pourquoi</h2>
					<p>Nous ne collectons que les données minimalement nécessaires pour fournir nos services, améliorer l'expérience utilisateur et nous conformer aux obligations légales.</p>

					<h3>2.1 Informations sur le Compte</h3>
					<ul>
					<li><strong>Nom d'utilisateur</strong> – Requis pour créer et identifier votre compte.</li>
					<li><strong>Adresse e-mail</strong> – Utilisée pour l'authentification à deux facteurs (2FA) et pour communiquer de manière sécurisée les mots de passe à usage unique (OTP) lors de la connexion.</li>
					<li><strong>Mot de passe</strong> – Stocké à l'aide d'algorithmes de hachage sécurisés, garantissant qu'il n'est jamais accessible en clair.</li>
					<li><strong>Avatar/Photo de Profil</strong> – Optionnel ; stocké pour la personnalisation de l'utilisateur.</li>
					<li><strong>Date d'Inscription</strong> – La date de création de votre compte.</li>
					<li><strong>Statut "Vu en Dernier"</strong> – Affiche votre dernière activité enregistrée et est visible par les autres utilisateurs. Cette fonctionnalité ne peut pas être désactivée.</li>
					</ul>

					<h3>2.2 Données de Jeu et de Profil</h3>
					<ul>
					<li><strong>Historique des Matchs</strong> – Enregistrements de vos parties précédentes, y compris les victoires et les défaites.</li>
					<li><strong>Liste d'Amis</strong> – Joueurs que vous avez ajoutés comme amis.</li>
					<li><strong>Participation aux Tournois</strong> – Historique des tournois auxquels vous avez participé.</li>
					</ul>

					<h3>2.3 Données de Sécurité et d'Authentification</h3>
					<ul>
					<li><strong>Statut de l'Authentification à Deux Facteurs (2FA)</strong> – Indique si la 2FA est activée ou désactivée pour votre compte.</li>
					<li><strong>Codes OTP</strong> – Stockés temporairement pour l'authentification et jamais conservés après vérification.</li>
					<li><strong>Jetons d'Accès et de Rafraîchissement (JWT)</strong> – Utilisés pour authentifier de manière sécurisée les sessions utilisateur. Ces jetons sont des JSON Web Tokens (JWT) et sont uniquement stockés dans des cookies HTTP-only. Ils ne sont pas stockés dans notre base de données, ce qui garantit que nous ne pouvons pas y accéder ou les visualiser.</li>
					<ul>
						<li><strong>Jetons d'Accès</strong> – Jetons à courte durée de vie utilisés pour l'authentification de session.</li>
						<li><strong>Jetons de Rafraîchissement</strong> – Jetons à longue durée de vie utilisés pour obtenir de nouveaux jetons d'accès sans nécessiter une réauthentification.</li>
					</ul>
					</ul>

					<h3>2.4 Stockage Local et Cookies</h3>
					<p>Nous n'utilisons pas de technologies de suivi ou de cookies tiers. Nous ne stockons que des données minimales pour la gestion des sessions :</p>
					<ul>
					<li><strong>Nom d'utilisateur</strong> – Mémorisé pour des sessions de connexion fluides.</li>
					<li><strong>Langue Sélectionnée</strong> – Maintient votre préférence linguistique entre les sessions.</li>
					<li><strong>Jetons d'Accès et de Rafraîchissement (JWT)</strong> – Comme décrit dans la section 2.3, ces jetons sont uniquement stockés dans des cookies HTTP-only et ne sont pas accessibles par nous ou des tiers.</li>
					</ul>

					<h2>3. Comment Nous Utilisons Vos Données</h2>
					<p>Nous traitons vos données personnelles aux fins suivantes :</p>
					<ul>
					<li>Pour créer et gérer votre compte.</li>
					<li>Pour faciliter la participation aux jeux et tournois.</li>
					<li>Pour fournir des fonctionnalités multijoueurs, y compris les listes d'amis et l'appariement.</li>
					<li>Pour assurer la sécurité de la plateforme, y compris l'authentification et la prévention de la fraude.</li>
					<li>Pour afficher votre statut "Vu en Dernier" aux autres utilisateurs.</li>
					<li>Pour nous conformer aux obligations légales et réglementaires.</li>
					</ul>
					<p>Nous ne vendons, n'échangeons ni ne partageons vos données personnelles avec des tiers à des fins publicitaires.</p>

					<h2>4. Gestion et Suppression de Vos Données</h2>
					<p>Vous avez un contrôle total sur vos données personnelles et pouvez les gérer directement sur la plateforme.</p>
					<ul>
					<li><strong>Mettre à Jour les Informations</strong> – Vous pouvez mettre à jour votre nom d'utilisateur, votre adresse e-mail et votre mot de passe via les paramètres de votre compte.</li>
					<li><strong>Supprimer ou Anonymiser le Compte</strong> – Vous pouvez immédiatement et irréversiblement supprimer ou anonymiser votre compte depuis la page des paramètres.</li>
					<ul>
						<li><strong>Suppression du Compte</strong> – Supprime toutes les données personnelles associées de manière permanente.</li>
						<li><strong>Anonymisation</strong> – Supprime les données personnellement identifiables mais conserve l'historique lié au jeu (par exemple, les statistiques de match) à des fins d'analyse.</li>
					</ul>
					<li><strong>Gestion des Données Locales</strong> – Vous pouvez effacer les données stockées dans le navigateur à tout moment via les paramètres de votre appareil.</li>
					</ul>
					<p>Pour toute assistance, contactez-nous à <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a>.</p>

					<h2>5. Mesures de Sécurité</h2>
					<p>Nous mettons en œuvre des protocoles de sécurité stricts pour protéger vos données :</p>
					<ul>
					<li>Les mots de passe sont hachés de manière sécurisée avant stockage.</li>
					<li>L'authentification à deux facteurs (2FA) est disponible pour une sécurité renforcée.</li>
					<li>Toutes les données sensibles (y compris les jetons d'accès et de rafraîchissement) sont stockées de manière sécurisée et ne sont jamais exposées à JavaScript.</li>
					<li>Les transmissions de données sont chiffrées via HTTPS.</li>
					<li>Vous pouvez mettre à jour ou changer votre mot de passe à tout moment via les paramètres de votre compte.</li>
					</ul>
					<p>Bien que nous prenions toutes les précautions nécessaires, aucun système n'est sûr à 100 %. Nous vous recommandons d'utiliser des mots de passe forts et d'activer la 2FA. Si vous identifiez des vulnérabilités de sécurité, veuillez nous les signaler immédiatement à <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a>.</p>

					<h2>6. Services Tiers</h2>
					<p>Nous ne vendons ni ne partageons vos données personnelles à des fins marketing. Cependant, certaines fonctionnalités de la plateforme reposent sur des services tiers conformes au RGPD :</p>
					<ul>
					<li><strong>Services d'Authentification</strong> – Utilisés pour les connexions sécurisées et la 2FA.</li>
					<li><strong>Stockage d'Avatars</strong> – Si vous téléversez une photo de profil personnalisée, elle est stockée de manière sécurisée dans notre répertoire média.</li>
					</ul>

					<h2>7. Vos Droits en Vertu du RGPD</h2>
					<p>En vertu du RGPD, vous disposez des droits suivants concernant vos données personnelles :</p>
					<ul>
					<li><strong>Droit d'Accès</strong> – Vous pouvez demander une copie des données personnelles que nous détenons à votre sujet.</li>
					<li><strong>Droit de Rectification</strong> – Vous pouvez mettre à jour ou corriger toute information inexacte ou incomplète.</li>
					<li><strong>Droit à l'Effacement ("Droit à l'Oubli")</strong> – Vous pouvez demander la suppression de votre compte et des données associées.</li>
					<li><strong>Droit d'Opposition</strong> – Vous pouvez vous opposer à certains types de traitement de données.</li>
					</ul>
					<p>Pour exercer l'un de ces droits, contactez-nous à <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a>. Nous répondrons dans un délai de 30 jours et pourrons demander des informations supplémentaires pour vérifier votre identité.</p>

					<h2>8. Modifications de Cette Politique de Confidentialité</h2>
					<p>Nous pouvons mettre à jour cette Politique de Confidentialité périodiquement pour refléter les changements dans les exigences légales ou les mises à jour du service. Si des modifications importantes surviennent, telles que des changements dans les types de données que nous collectons, la manière dont nous les utilisons ou avec qui nous les partageons, nous en informerons les utilisateurs par e-mail ou via des annonces sur la plateforme. Nous vous encourageons à consulter régulièrement cette politique pour rester informé.</p>

					<h2>9. Informations de Contact</h2>
					<p>Pour toute question relative à la confidentialité, aux demandes liées au RGPD ou pour toute autre demande, veuillez nous contacter à :</p>
					<p>📧 <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a></p>
					<p>📍 Équipe Pong42, Lausanne, Suisse</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
				</div>
				</div>
			</div>
			</div>
	  	`,
		es: `
		<div class="modal fade" id="privacyPolicyModal" tabindex="-1" aria-labelledby="privacyPolicyLabel" aria-hidden="true">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="privacyPolicyLabel">Política de Privacidad</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
				</div>
				<div class="modal-body" style="max-height: 400px; overflow-y: auto;">
					<p><strong>Fecha de vigencia:</strong> 14.02.2025</p>
					<p><strong>Última actualización:</strong> 05.03.2025</p>

					<h2>1. Introducción</h2>
					<p>En Pong42, respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos tu información de acuerdo con el Reglamento General de Protección de Datos (GDPR). Al utilizar nuestra plataforma de juegos y servicios, aceptas los términos de esta Política de Privacidad.</p>

					<h2>2. Qué datos recopilamos y por qué</h2>
					<p>Recopilamos solo los datos necesarios para proporcionar nuestros servicios, mejorar la experiencia del usuario y cumplir con obligaciones legales.</p>

					<h3>2.1 Información de la cuenta</h3>
					<ul>
					<li><strong>Nombre de usuario</strong> – Necesario para crear e identificar tu cuenta.</li>
					<li><strong>Correo electrónico</strong> – Se usa para la autenticación de dos factores (2FA) y para enviar códigos OTP de inicio de sesión de forma segura.</li>
					<li><strong>Contraseña</strong> – Almacenada de forma segura mediante algoritmos de hash, garantizando que nunca se almacene en texto plano.</li>
					<li><strong>Avatar/Imagen de perfil</strong> – Opcional; almacenado para personalización del usuario.</li>
					<li><strong>Fecha de registro</strong> – Fecha en la que se creó tu cuenta.</li>
					<li><strong>Última conexión</strong> – Muestra la última actividad registrada y es visible para otros usuarios. Esta función no se puede desactivar.</li>
					</ul>

					<h3>2.2 Datos de juego y perfil</h3>
					<ul>
					<li><strong>Historial de partidas</strong> – Registro de tus partidas pasadas, incluyendo victorias y derrotas.</li>
					<li><strong>Lista de amigos</strong> – Lista de jugadores que has agregado como amigos.</li>
					<li><strong>Participación en torneos</strong> – Historial de torneos en los que has participado.</li>
					</ul>

					<h3>2.3 Seguridad y autenticación</h3>
					<ul>
					<li><strong>Estado de la autenticación en dos pasos (2FA)</strong> – Indica si la 2FA está habilitada o deshabilitada en tu cuenta.</li>
					<li><strong>Códigos OTP</strong> – Almacenados temporalmente para autenticación y nunca retenidos después de su verificación.</li>
					<li><strong>Tokens de acceso y actualización (JWT)</strong> – Utilizados para sesiones seguras y almacenados exclusivamente en cookies HTTP-only.</li>
					</ul>

					<h3>2.4 Almacenamiento local y cookies</h3>
					<p>No utilizamos cookies de seguimiento de terceros. Solo almacenamos datos mínimos para la gestión de sesiones:</p>
					<ul>
					<li><strong>Nombre de usuario</strong> – Recordado para facilitar el inicio de sesión.</li>
					<li><strong>Idioma seleccionado</strong> – Almacena la preferencia de idioma.</li>
					<li><strong>Tokens de acceso y actualización</strong> – Solo almacenados en cookies HTTP-only.</li>
					</ul>

					<h2>3. Cómo usamos tus datos</h2>
					<p>Procesamos tus datos personales para:</p>
					<ul>
					<li>Crear y administrar tu cuenta.</li>
					<li>Facilitar la participación en partidas y torneos.</li>
					<li>Proporcionar funciones multijugador, como listas de amigos y emparejamiento.</li>
					<li>Garantizar la seguridad de la plataforma.</li>
					<li>Cumplir con requisitos legales.</li>
					</ul>

					<h2>4. Gestión y eliminación de datos</h2>
					<p>Puedes gestionar tus datos dentro de la plataforma:</p>
					<ul>
					<li><strong>Actualizar información</strong> – Puedes cambiar tu nombre de usuario, correo electrónico y contraseña.</li>
					<li><strong>Eliminar o anonimizar cuenta</strong> – Puedes borrar tu cuenta permanentemente o anonimizar tus datos.</li>
					</ul>

					<h2>5. Medidas de seguridad</h2>
					<p>Implementamos protocolos de seguridad para proteger tu información:</p>
					<ul>
					<li>Las contraseñas están encriptadas antes de ser almacenadas.</li>
					<li>La autenticación en dos pasos (2FA) está disponible.</li>
					<li>Los tokens de acceso y actualización se almacenan de forma segura.</li>
					<li>El tráfico de datos está cifrado mediante HTTPS.</li>
					</ul>

					<h2>6. Servicios de terceros</h2>
					<p>No compartimos tus datos con terceros para publicidad. Sin embargo, utilizamos servicios externos para:</p>
					<ul>
					<li><strong>Autenticación</strong> – Para proporcionar inicios de sesión seguros.</li>
					<li><strong>Almacenamiento de avatares</strong> – Si subes una imagen de perfil, esta se almacena en nuestro directorio seguro.</li>
					</ul>

					<h2>7. Tus derechos según el GDPR</h2>
					<p>De acuerdo con el GDPR, tienes los siguientes derechos:</p>
					<ul>
					<li><strong>Derecho de acceso</strong> – Puedes solicitar una copia de tus datos personales.</li>
					<li><strong>Derecho de rectificación</strong> – Puedes actualizar tu información personal.</li>
					<li><strong>Derecho al olvido</strong> – Puedes solicitar la eliminación de tu cuenta.</li>
					</ul>

					<h2>8. Cambios en esta política</h2>
					<p>Podemos actualizar esta política en el futuro. Te notificaremos si realizamos cambios importantes.</p>

					<h2>9. Información de contacto</h2>
					<p>Si tienes preguntas sobre esta política o quieres ejercer tus derechos, contáctanos en:</p>
					<p>📧 <a href="mailto:pong42lausanne@gmail.com">pong42lausanne@gmail.com</a></p>
					<p>📍 Equipo Pong42, Lausana, Suiza</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
				</div>
				</div>
			</div>
			</div>
		`
	};
  
	// get current language and select template
	const userLang = i18next.language || "en";
	const selectedModalHTML = modalHTMLTemplates[userLang] || modalHTMLTemplates.en;
	
	// insert modal into DOM
	document.body.insertAdjacentHTML("beforeend", selectedModalHTML);
	
	// return modal
	return document.getElementById("privacyPolicyModal");
  }
  

// Function to show the modal in footer in settings
  export function showPrivacyPolicyModal() {
	let modalElement = document.getElementById("privacyPolicyModal");
	
	if (!modalElement) {
	  modalElement = loadPrivacyPolicyModal();
	}
	
	const modal = new bootstrap.Modal(modalElement);
	modal.show();
  }

// can be used in a footer or button click event with this code
// import { showPrivacyPolicyModal } from "./privacy_policy.js";

// document.getElementById("privacyPolicyLink").addEventListener("click", (e) => {
// 	e.preventDefault();
// 	showPrivacyPolicyModal();
//   });