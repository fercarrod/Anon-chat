let contador = 0;
const clientes = {};

function incrementarContador() {
  contador++;
}

function obtenerContador() {
  return contador;
}

function guardarCliente(llavePublica) {
  const clienteId = ++contador;
  clientes[clienteId] = { clienteId, llavePublica };
  //console.log('function id: ', clienteId);
  //console.log('function llave: ', clientes[clienteId]);
  return clienteId;
}

function obtenerClientes() {
  return Object.values(clientes);
}

module.exports = {
  incrementarContador,
  obtenerContador,
  guardarCliente,
  obtenerClientes
};
