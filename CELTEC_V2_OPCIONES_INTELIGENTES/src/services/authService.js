// Servicio de autenticación — localStorage
// Maneja registro, login, logout y sesión de usuarios

const USERS_KEY = 'propuestas_app_users';
const SESSION_KEY = 'propuestas_app_session';

function getUsers() {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Simple hash (SHA-256 no disponible sincrónicamente, usamos btoa como demo)
function hashPassword(password) {
  // Simple encoding for demo — NOT production-grade
  return btoa(encodeURIComponent(password));
}

export function register(username, password, fullName) {
  const users = getUsers();

  // Verificar si el usuario ya existe
  const exists = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return { success: false, error: 'El nombre de usuario ya está registrado.' };
  }

  // Validaciones
  if (!username || username.length < 3) {
    return { success: false, error: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  }
  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: 'El nombre completo es requerido.' };
  }

  const newUser = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    username: username.toLowerCase(),
    password: hashPassword(password),
    fullName: fullName.trim(),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true, user: { id: newUser.id, username: newUser.username, fullName: newUser.fullName } };
}

export function login(username, password) {
  const users = getUsers();
  const hashedPass = hashPassword(password);

  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === hashedPass
  );

  if (!user) {
    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  }

  const sessionData = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    loginAt: new Date().toISOString(),
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  return { success: true, user: sessionData };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
