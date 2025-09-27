const AUTH_FLAG = 'isAuthenticated';
const PASSWORD_HASH_KEY = 'adminPasswordHash';
const DEFAULT_PASSWORD_PLAINTEXT = '00000';

async function sha256Hex(input) {
	const enc = new TextEncoder();
	const data = enc.encode(input);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const byteArray = Array.from(new Uint8Array(hashBuffer));
	return byteArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredPasswordHash() {
	return localStorage.getItem(PASSWORD_HASH_KEY) || null;
}

async function loginWithPassword(password) {
	if (!password) return false;
	const stored = getStoredPasswordHash();
	if (stored) {
		const enteredHash = await sha256Hex(password);
		const ok = enteredHash === stored;
		if (ok) localStorage.setItem(AUTH_FLAG, 'true');
		return ok;
	}
	const ok = password === DEFAULT_PASSWORD_PLAINTEXT;
	if (ok) localStorage.setItem(AUTH_FLAG, 'true');
	return ok;
}

function isAuthenticated() {
	return localStorage.getItem(AUTH_FLAG) === 'true';
}

function requireAuthOrRedirect() {
	if (!isAuthenticated()) {
		window.location.href = 'admin-login.html';
	}
}

function logout() {
	localStorage.removeItem(AUTH_FLAG);
	window.location.href = 'admin-login.html';
}

async function setAdminPassword(newPassword) {
	const hash = await sha256Hex(newPassword);
	localStorage.setItem(PASSWORD_HASH_KEY, hash);
}

// Expose helpers globally
window.loginWithPassword = loginWithPassword;
window.isAuthenticated = isAuthenticated;
window.requireAuthOrRedirect = requireAuthOrRedirect;
window.logout = logout;
window.setAdminPassword = setAdminPassword;
