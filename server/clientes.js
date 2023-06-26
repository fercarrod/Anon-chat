// cliente.js

// Objeto para almacenar los usuarios
const users = {};

// Función para guardar datos del usuario
function saveUserData(username, password, telefono, tieneIdAnonima) {
  // Verificar si el teléfono ya existe
  const existingUser = Object.values(users).find(user => user.telefono === telefono);
  if (existingUser) {
    return { error: 'El teléfono ya está registrado.' };
  }

  users[username] = {
    telefono,
    password,
    tieneIdAnonima
  };

  return { success: 'Usuario registrado.' };
}

// Función para obtener un usuario por sus credenciales
function getUserByCredentials(username, password, telefono) {
  const user = Object.values(users).find(user => user.username === username && user.password === password && user.telefono === telefono);
  if (user) {
    return { success: 'Hay usuario con estos datos' };
  } else {
    return { error: 'No se encontró un usuario con estos datos.' };
  }
}

// Función para actualizar el valor 'tieneIdAnonima' de un usuario conocido su teléfono
function updateTieneIdAnonimaByTelefono(telefono, tieneIdAnonima) {
  const user = Object.values(users).find(user => user.telefono === telefono);
  if (user) {
    user.tieneIdAnonima = tieneIdAnonima;
    return { success: 'Valor de tieneIdAnonima actualizado.' };
  } else {
    return { error: 'No se encontró un usuario con el teléfono proporcionado.' };
  }
}

// Exportar el diccionario y las funciones
module.exports = {
  users: users,
  saveUserData: saveUserData,
  updateTieneIdAnonimaByTelefono: updateTieneIdAnonimaByTelefono,
  getUserByCredentials: getUserByCredentials
};
