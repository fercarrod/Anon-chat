const cliente = require('./clientes');
const certificado = require('./confirmarCertificado.js')
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
const clientes = require('./clientes');
let serverChatKeyPair;// aqui se guardaran las llaves pública y privada del servidor. Si deseamos crear una enquesta anónima + generar un par de llaves para poder diferenciar si el cliente valida el chat o la enquesta

const publicKey = new RsaPubKey(
  65537n,
  175386324588461643050168385259731104967526029782405045767748293418285628074628676682622046128593868892163374103098336006034516447379993980160718352557203607108599876654408716296392552079898399252848125479796687885372909069452604039695399417243339751888547531648338585597326693177892256645266422230991237372399n
);

const privateKey = new RsaPrivKey(
  75456502557277026526123377493375928645869721466418857599026975315043129364972918622201370411246055316591215591360005523996356649683786414767407947704394647567284725479192980459321523657123422907946853497023907676171905762287798267845031556025361484222596514903007650599789214986162426285218570158514041859233n,
  175386324588461643050168385259731104967526029782405045767748293418285628074628676682622046128593868892163374103098336006034516447379993980160718352557203607108599876654408716296392552079898399252848125479796687885372909069452604039695399417243339751888547531648338585597326693177892256645266422230991237372399n
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

    //evento para escuchar el emit del registro de un cliente
    socket.on('Registro',(user,password,telefono)=>{
      console.log('user: ',user)
      console.log('pw: ',password)
      console.log('tlf: ',telefono)
      const result = cliente.saveUserData(user,password,telefono,'false')// guardamos el cliente en el diccionario que funciona como base de datos 
      if (result.error) {
        console.log('Error:', result.error);
      } else if (result.success) {
        console.log('Éxito:', result.success);
      }
      socket.emit('RegistroResult',result)
      console.log('-------------------');
      
      //bucle para imprimir el diccionario de usuarios
      console.log('Datos de usuarios:');
      console.log('---------------------')
      Object.keys(cliente.users).forEach(username => {
        const user = cliente.users[username];
        console.log('Username:', username);
        console.log('pw:',user.password)
        console.log('Teléfono:', user.telefono);
        console.log('id anon?:',user.tieneIdAnonima)
        console.log('-------------------');
      
    });
    socket.on('test',(datos)=>{
      console.log('test')
    })
    socket.on('holalogin', (user, password, telefono) => {
      console.log('user:', user);
      console.log('pw:', password);
      console.log('tlf:', telefono);
      const existeUsuario = clientes.getUserByCredentials(user, password, telefono);
      if (existeUsuario.success) {
        console.log('usario existe login okay');
      } else {
        console.log('usario no existe login incorrecto');
      }
      socket.emit('LoginResult', existeUsuario);
    });
    
    //evento que recibe el mensaje blind(hash(pubCliente)) lo firma y se lo devuelve
    socket.on('blindmessage',(blindmessage)=>{
      console.log('---------------------')
      console.log('blindmessage')
      console.log('blindmessage recibido: ',blindmessage)
      const bigintdgst = BigInt(blindmessage)
      const llave = new RsaPrivKey(privateKey.d,privateKey.n)
      //console.log('firmado con llave: ',llave)
      const dgst = BigInt(bigintdgst)
      const SignedBlindMessage= llave.blindSign(dgst)
      console.log('SignedBlindMessage:',SignedBlindMessage)
      socket.emit('SignedBlindMessage',SignedBlindMessage.toString())
    })
    //evento para escuchar el emit del ConfirmaCerti de un cliente, comprobación de que se certificado es correcto
    socket.on('ConfirmaCerti',async (comprobar)=>{
      console.log('@')
      //console.log(comprobar)
      // Obtener los valores individuales
      const telefono = comprobar.telefono;
      const id = comprobar.id;
      const llave = comprobar.llave;
      const Signature = comprobar.Signature;
      console.log('-------------------');
      console.log('Telefono:', telefono);
      console.log('ID:', id);
      console.log('Llave:', llave);
      console.log('Signature:', Signature)
      console.log('-------------------');
      const valorllaveCliente = JSON.parse(llave)
      const e= valorllaveCliente.e
      const n = valorllaveCliente.n
      const llavePUBServer = new RsaPubKey(publicKey.e,publicKey.n)
      try {
        const resultado = await certificado.confirmarCertificado(llavePUBServer,valorllaveCliente, Signature);
        console.log('resultado:', resultado);
        if (resultado.success) {
          console.log('certi okay');
          // Acceder al objeto 'users' del módulo cliente
          const tieneIdAnonima = true
          const update = clientes.updateTieneIdAnonimaByTelefono(telefono,tieneIdAnonima)
          console.log(update);
          } else if (resultado.error) {
          console.log('certi invalido')
      
        socket.emit('ConfirmaCertiResult',resultado)
        // Realiza cualquier lógica adicional que necesites con los datos del mensaje
      }} catch (error) {
        console.error('Error al confirmar el certificado:', error);
        // Realiza acciones adicionales en caso de error
      }
    })
    /**
     *     socket.on('ConfirmaCerti',async (comprobar)=>{
      console.log('@')
      //console.log(comprobar)
      // Obtener los valores individuales
      const telefono = comprobar.telefono;
      const id = comprobar.id;
      const llave = comprobar.llave;
      const Signature = comprobar.Signature;
      console.log('-------------------');
      console.log('Telefono:', telefono);
      console.log('ID:', id);
      console.log('Llave:', llave);
      console.log('Signature:', Signature)
      console.log('-------------------');
      const valorllaveCliente = JSON.parse(llave)
      const e= valorllaveCliente.e
      const n = valorllaveCliente.n
      const llavePUBServer = new RsaPubKey(publicKey.e,publicKey.n)
      try {
        const resultado = await certificado.confirmarCertificado(llavePUBServer,valorllaveCliente, Signature);
        console.log('resultado:', resultado);
        if (resultado.success) {
          console.log('certi okay');
          // Acceder al objeto 'users' del módulo cliente
          const tieneIdAnonima = true
          const update = clientes.updateTieneIdAnonimaByTelefono(telefono,tieneIdAnonima)
          console.log(update);
          } else if (resultado.error) {
          console.log('certi invalido')
      
        socket.emit('ConfirmaCertiResult',resultado)
        // Realiza cualquier lógica adicional que necesites con los datos del mensaje
      }} catch (error) {
        console.error('Error al confirmar el certificado:', error);
        // Realiza acciones adicionales en caso de error
      }
    })
     */
    
    //evento recibir mensaje y hacer broadcast a todos los clientes
    socket.on('sendMessage', async (message) => {
      console.log('Mensaje enviado por el cliente:', message);
        
      // Aquí puedes acceder a los datos individuales del mensaje
      const mensajeEncriptado = message.mensajeEncriptado;
      const clienteId = message.clienteId;
      const llave = message.llave;
      const signature = message.Signature;
      //console.log('mensajeEncriptado:', mensajeEncriptado);
      //console.log('clienteId:', clienteId);
      //console.log('llave:', llave);
      const valorllaveCliente = JSON.parse(llave)
      const e= valorllaveCliente.e
      const n = valorllaveCliente.n
      const llavePUBCliente = new RsaPubKey(BigInt(e),BigInt(n))
      const llavePUBServer = new RsaPubKey(publicKey.e,publicKey.n)
      const llavePRIVServer = new RsaPrivKey(privateKey.d,privateKey.n)
      /*const e = valorllaveCliente.e;
      const n = valorllaveCliente.n;
      console.log('Valor de e:', e);
      console.log('Valor de n:', n);*/
      //console.log('signature:', signature);
    
      try {
        const resultado = await certificado.confirmarCertificado(llavePUBServer,valorllaveCliente, signature);
        console.log('resultado:', resultado);
        if (resultado.success) {
          console.log('certi okay')
          //1.Desencrypt mensajeEncriptado con llave publica server
          console.log('mensajeEncriptado:', mensajeEncriptado);
          console.log(BigInt(mensajeEncriptado))
          const desencriptado = llavePRIVServer.dencrypt(BigInt(mensajeEncriptado))
          console.log('desencriptado: ',desencriptado)
          const text = bigintConversion.bigintToText(desencriptado)
          console.log('msg del cliente:',text)
          //3.Firmar con la llave del servidor
          const SignMessage = llavePRIVServer.sign(desencriptado)
          socket.broadcast.emit('getMessage',SignMessage.toString())
          //4. hacer un broadcast emit
        } else if (resultado.error) {
          console.log('certi invalido')
          //emitir certificado invalido no puedes escribir
        }
        // Realiza cualquier lógica adicional que necesites con los datos del mensaje
      } catch (error) {
        console.error('Error al confirmar el certificado:', error);
        // Realiza acciones adicionales en caso de error
      }
      
      // Emitir un evento 'getMessage' a todos los clientes conectados (incluido el remitente)
      //io.emit('getMessage', message);
    });
    
  })
})
      




  //pruebas de código, funciones antiguas etc
    /* 
   socket.on('certificate', async (certificate) => {
      console.log('---------------------');
      console.log('certificate');
      console.log('Signature:', certificate.serverSignature);
      //console.log('Client Public Key:', certificate.clientPublicKey);
    
      try {
        const publicKey = certificate.clientPublicKey;
        const llaveS = new RsaPubKey(BigInt(publicKey.e), BigInt(publicKey.n));
    
        const data = objectSha.hashable(publicKey);
        const digest = await objectSha.digest(data, 'SHA-512');
    
        console.log('Digest:', digest);
        console.log('Signature:', BigInt(certificate.serverSignature));
    
        const dgst1 = llaveS.verify(BigInt(certificate.serverSignature));
        const dgst2 = bigintConversion.hexToBigint(await objectSha.digest(digest, 'SHA-512'));

        console.log('dgst1:', dgst1);
        console.log('dgst2:', dgst2);
        
        if (dgst1 === dgst2) {
          console.log('Signature is valid.');
        } else {
          console.log('Signature is not valid.');
        }
      } catch (error) {
        console.log('Error:', error);
      }
    });
    







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
    */
   /**
    *   socket.on('ConfirmaCerti',async (comprobar)=>{
      console.log('@')
      //console.log(comprobar)
      // Obtener los valores individuales
      const telefono = comprobar.telefono;
      const id = comprobar.id;
      const llave = comprobar.llave;
      const Signature = comprobar.Signature;
      console.log('-------------------');
      console.log('Telefono:', telefono);
      console.log('ID:', id);
      console.log('Llave:', llave);
      console.log('Signature:', Signature)
      console.log('-------------------');
     /*
      //para la comprobación usar la llave para obtener un digest usando la función hash
      //y verificar la Signature usando la llave publica del server y obtenemos otro digest
      //si los digest1 y dgst2 son iguales certificado correcto, dar id anonima al tlf
      const valorllave = JSON.parse(llave);
      const e = valorllave.e;
      const n = valorllave.n;
      //console.log('Valor de e:', e);
      //console.log('Valor de n:', n);
      const publicKeyCliente = new RsaPubKey(BigInt(e),BigInt(n))
      console.log(publicKeyCliente)
      console.log('-------------------');
      const data = objectSha.hashable(valorllave);//preparación de la llave publica para realizar el hash
      const dgst1 = await objectSha.digest(data)// generamos el digest de la llave publica cliente, este es el valor que se usara para la comprobación
      console.log('dgst:',dgst1)

      const llavePUBServer= new RsaPubKey(publicKey.e,publicKey.n)
      console.log('llavePUBServer:',llavePUBServer)
      const verificarSign = llavePUBServer.verify(BigInt(Signature))
      console.log('verificarSign:',verificarSign)
      const dgst2 =bigintConversion.bigintToHex(verificarSign)
      console.log('dgst:',dgst1)
      console.log('dgst2:',dgst2)
      if(dgst1===dgst2){
        console.log('okay')
        socket.emit('ConfirmaCertiResult', 'succes')
      }else{
        console.log('error en certi')
        socket.emit('ConfirmaCertiResult', 'error')
      }*/
    /**
     *     socket.on('blindSign', (bmString) => {
      console.log('---------------------')
      console.log('blindSign')
      console.log('bm recibido: ',bmString)
      const blindedMessage = BigInt(bmString);
      const llave = new RsaPrivKey(privateKey.d,privateKey.n)
      const blindSignature = llave.blindSign(blindedMessage)
      console.log('blindSignature: ',blindSignature)
      socket.emit('Signature', blindSignature.toString());
    })


    

    socket.on('blindmessage',(blindmessage)=>{
      console.log('---------------------')
      console.log('blindmessage')
      console.log('blindmessage recibido: ',blindmessage)
      const bigintdgst = BigInt(blindmessage)
      const llave = new RsaPrivKey(privateKey.d,privateKey.n)
      //console.log('firmado con llave: ',llave)
      const dgst = BigInt(bigintdgst)
      const SignedBlindMessage= llave.blindSign(dgst)
      console.log('SignedBlindMessage:',SignedBlindMessage)
      socket.emit('SignedBlindMessage',SignedBlindMessage.toString())
    })
    
    socket.on('sendDigest',(sendunblind)=>{

    })
     */
    /*socket.on('certificate',async (certificate)=>{
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
      const signatureBigInt = BigInt(certificate.serverSignature)
      console.log('digest1:', digest1);
      console.log('signatureBigInt:',signatureBigInt)
      const d2 = llaveS.verify(signatureBigInt)
      console.log('d2:', d2);
      const d1 = bigintConversion.hexToBigint(digest1)
      
      console.log('d1:',d1)
      console.log('si salen a es diferente de b, hay algo que falla')
      if(d1===d2){
        console.log('son iguales')
      }else{
        console.log('no lo son')
      }
      }catch{console.log('error')}
      
    })*/
  
