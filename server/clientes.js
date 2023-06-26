// cliente.js

// Objeto para almacenar los usuarios
const users = {};

// Función para guardar datos del usuario
function saveUserData(username, telefono) {
  // Verificar si el teléfono ya existe
  const existingUser = Object.values(users).find(user => user.telefono === telefono);
  if (existingUser) {
    return { error: 'El teléfono ya está registrado.' };
  }

  users[username] = { telefono };
  return { success: 'Usuario registrado.' };
}

// Exportar el diccionario y la función
module.exports = {
  users,
  saveUserData
};
