const cliente = require('./clientes');
const bcu = require('bigint-crypto-utils');
const bigintConversion = require('bigint-conversion');
const rsa = require('./rsa')
const crypto = require('crypto');
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http,{
    cors: {
        origin: true,
        credentials: true,
        methods: ["GET","POST"]
    }
})

const clientes = {};// Crear un diccionario para almacenar los datos del cliente

function guardarDatosCliente(idCliente, datosCliente) {// id numero aleatorio para identificar a los clientes, datos cliente su llave pub? + valido chat
    clientes[idCliente] = datosCliente;
}

//el servidor se queda escuchando en el puerto 300'
http.listen(3000,()=>{
    console.log('escuchando puerto 3000')
})
//prueba de que esta activo, muestra por terminal un hola
app.get('/',(req,res)=>{
    console.log('hola')
})
//evento de conexión, muestra con terminal nueva conexión y los mensajes que envian los clientes
io.on('connection', (socket) => {
    console.log('Nueva conexión');
    //evento login
    socket.on('login',(texto,stringllavepub)=>{
        //console.log('texto: ',texto)
        //console.log('stringllavepub: ',stringllavepub)
        // Generar un nonce aleatorio
        //const nonceBytes = crypto.randomBytes(16);
        //const nonce = nonceBytes.toString('hex');
        const nonce = '1234567890'
        //console.log('nonce: ', nonce)
        // recuperar los string de la llave publica recibida, y pasarlos a bigint
        const publicKey = JSON.parse(stringllavepub);
        const e = BigInt(publicKey.e);
        const n = BigInt(publicKey.n);
        //console.log('llave e: ',e )
        //console.log('n: ',n)
        const llavePub = new rsa.RsaPubKey(e,n)// crear una llave publica del cliente con los valores recibidos
        //console.log('llavePub: ',llavePub)
        const encryptedNonce = llavePub.encrypt(BigInt(nonce))//encryptar el nonce con la llave publica del cliente
        const encryptedNoncetoString = encryptedNonce.toString()
        //console.log('encryptedNonce:',encryptedNonce)
        socket.emit('login1', encryptedNoncetoString)//evento que emite al cliente el nonce encriptado
        socket.on('desencryptedNonce', (desencryptedNonce) => {//evento que recibe el nonce desencriptado en el cliente, si es igual al enviado autentificación correcta
            //console.log('Nonce desencriptado en el cliente:', desencryptedNonce);
            if(desencryptedNonce === nonce){//si son iguales login correcto, llave publica del cliente verificada
                //guardar en base datos
                //decirle al cliente que todo okay
                //console.log('nonce iguales, login okay')
                const idcliente = cliente.guardarCliente(llavePub)//guardamos la llave del cliente para poder verificar sus mensajes firmados
                //console.log('idcliente:',idcliente)
                const respuesta = {
                    mensaje: 'okay',
                    clienteId: idcliente
                  };
                socket.emit('validochat',respuesta)//evento que comunica al cliente que el login es correcto
            }
            else{
                console.log('nonce difrentes, mal login')
                socket.emit('validochat','no')//evento que comunica al cliente que el login es incorrecto, no a podido desencriptar el nonce no es propietario de la llave publica recibida
            }
          });
    })
    //evento recibir mensaje y hacer broadcast a todos los clientes
    socket.on('sendMessage', (message) => {
        console.log('Mensaje enviado por el cliente:', message);
        const clienteId = message.clienteId;
        const mensajeEncriptado = message.mensajeEncriptado;
        const mensajeEncriptadobigint =BigInt(mensajeEncriptado)
        
        console.log('Mensaje encriptado:', mensajeEncriptadobigint);
        //console.log('ID del cliente:', clienteId);
        
        const llavesPublicasClientes = cliente.obtenerClientes();// Obtener todas las llaves públicas de los clientes registrados
        //console.log('llavesPublicasClientes todas: ',llavesPublicasClientes)
        const llavePublicaCliente = llavesPublicasClientes.find(cliente => cliente.clienteId === clienteId);// Buscar la llave pública correspondiente al ID del cliente recibido
        //console.log('llavePublicaCliente: ',llavePublicaCliente)
        
        // Acceso utilizando la notación de punto
        const e = llavePublicaCliente.llavePublica.e;
        const n = llavePublicaCliente.llavePublica.n;
        //console.log('Valor de e:', e);
        //console.log('Valor de n:', n);
        const llave = new rsa.RsaPubKey(e,n)
        console.log('llave recuperada: ',llave)
        const decryptMsg = llave.verify(mensajeEncriptadobigint)
        console.log('decryptMsg: ',decryptMsg)
        const messageVerifiedtoText = bigintConversion.bigintToText(decryptMsg)
        console.log('messageVerifiedtoText: ',messageVerifiedtoText)
        socket.broadcast.emit('getMessage', messageVerifiedtoText);
      });
      
      
      
  });

  
