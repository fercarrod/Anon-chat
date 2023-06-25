const cliente = require('./clientes');
const bcu = require('bigint-crypto-utils');
const bigintConversion = require('bigint-conversion');
const objectSha = require('object-sha');
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
const { generateKeys, RsaPrivKey, RsaPubKey  } = require('./rsa');
let serverChatKeyPair;// aqui se guardaran las llaves pública y privada del servidor. Si deseamos crear una enquesta anónima + generar un par de llaves para poder diferenciar si el cliente valida el chat o la enquesta

const publicKey = new RsaPubKey(
  65537n,
  140664883958549205430563974704354914598455261046516949397866979422431273428155985882252778506259162582183531527691467320746392842263233280790611661190112003621949382043748333564685519676247439224716916609224357730836368911854234644487830993498871160349665704101883268307331259343215341765205249423456401912379n
);

const privateKey = new RsaPrivKey(
  29926461037796230698969337920606994129213447438417776606412550072279159030910461436383271903089422828072462579773290337567587094308196311000862083891141360257908036521527875756952807497325707408343241229288558416553113873442952570858432411717101801859035660946153870633207225035418405953611831448891738010337n,
  140664883958549205430563974704354914598455261046516949397866979422431273428155985882252778506259162582183531527691467320746392842263233280790611661190112003621949382043748333564685519676247439224716916609224357730836368911854234644487830993498871160349665704101883268307331259343215341765205249423456401912379n
);

//console.log('Server Public Key:', publicKey);
//console.log('Server Private Key:', privateKey);

/* la función que genera las llaves funcióna y se activa correctamente
    para probar el funcionamiento del envio, uso unas llaves del servidor predefinidas
async function generateServerKeys() {
    try {
      const bitLength = 1024;
      serverChatKeyPair = await generateKeys(bitLength);
      console.log('Llaves del servidor generadas:', serverChatKeyPair);
      let serverChatpublicKey = serverChatKeyPair.publicKey;
      let serverChatprivateKey = serverChatKeyPair.privKey;
      //console.log('serverChatpublicKey:', serverChatpublicKey);
      console.log('serverChatprivateKey:', serverChatprivateKey);
    } catch (error) {
      console.error('Error al generar las llaves del servidor:', error);
    }
}
generateServerKeys()// aqui se activa la función cuando arranca el server */


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
  console.log('---------------------')
  console.log('connection')
    console.log('Nueva conexión');
    //evento login
    socket.on('login',(texto,stringllavepub)=>{
      console.log('---------------------')
      console.log('login')
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
        const llavePub = new RsaPubKey(e,n)// crear una llave publica del cliente con los valores recibidos
        //console.log('llavePub: ',llavePub)
        const encryptedNonce = llavePub.encrypt(BigInt(nonce))//encryptar el nonce con la llave publica del cliente
        const encryptedNoncetoString = encryptedNonce.toString()
        //console.log('encryptedNonce:',encryptedNonce)
        socket.emit('login1', encryptedNoncetoString)//evento que emite al cliente el nonce encriptado
        socket.on('desencryptedNonce', (desencryptedNonce) => {//evento que recibe el nonce desencriptado en el cliente, si es igual al enviado autentificación correcta
          console.log('---------------------')
          console.log('desencryptedNonce')
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
    socket.on('blindSign', (bmString) => {
      console.log('---------------------')
      console.log('blindSign')
      console.log('bm recibido: ',bmString)
      const blindedMessage = BigInt(bmString);
      const llave = new RsaPrivKey(privateKey.d,privateKey.n)
      const blindSignature = llave.blindSign(blindedMessage)
      console.log('blindSignature: ',blindSignature)
      socket.emit('Signature', blindSignature.toString());
    })
    socket.on('sendDigest',(digest)=>{
      console.log('---------------------')
      console.log('sendDigest')
      console.log('sendDigest recibido: ',digest)
      const bigintdgst = BigInt("0x" + digest)
      const llave = new RsaPrivKey(privateKey.d,privateKey.n)
      const dgst = BigInt(bigintdgst)
      const digstfirmado= llave.blindSign(dgst)
      console.log('digstfirmado:',digstfirmado)
      socket.emit('digstfirmado',digstfirmado.toString())
    })
    socket.on('certificate',async (certificate)=>{
      console.log('---------------------')
      console.log('certificate')
      //console.log('Certificate received:', certificate)
      //console.log('Client Public Key:', certificate.clientPublicKey);
      console.log('Signature:', certificate.serverSignature);
      const data = objectSha.hashable(certificate.clientPublicKey); // Preparar el objeto para ser hashable
      //console.log('@@@data:',data)
      //console.log('objectSha:', objectSha.hashable(data));
      try{
      const digest1 = await objectSha.digest(data, 'SHA-512');
      console.log('digest1:',digest1)
      const b = bigintConversion.textToBigint(digest1)
      const llaveS = new RsaPubKey(publicKey.e, publicKey.n);
      const signatureBigInt = BigInt(certificate.serverSignature);
      console.log('signatureBigInt:',signatureBigInt)
      const a = llaveS.verify(signatureBigInt)
      console.log('a:', a);
      console.log('b:', b);
      console.log('si salen a es diferente de b, hay algo que falla')
      }catch{console.log('error')}
      
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
        const llave = new RsaPubKey(e,n)
        console.log('llave recuperada: ',llave)
        const decryptMsg = llave.verify(mensajeEncriptadobigint)
        console.log('decryptMsg: ',decryptMsg)
        const messageVerifiedtoText = bigintConversion.bigintToText(decryptMsg)
        console.log('messageVerifiedtoText: ',messageVerifiedtoText)
        //firmamos el message verificado con la privada del servidor para mantener la comunicación encriptada de extremo a extremo
        //const ServerPrivKey = new RsaPrivKey(serverChatKeyPair.privKey.d, serverChatKeyPair.privKey.n);
        //console.log('ServerPrivKey:', ServerPrivKey);
        
        const firma = privateKey.sign(bigintConversion.textToBigint(messageVerifiedtoText));
        console.log('firma: ', firma);
        
        const firmaJson = { mensajeFirmado: firma.toString() };
        socket.broadcast.emit('getMessage', firmaJson);
        
      });
      
      
      
  });

  
