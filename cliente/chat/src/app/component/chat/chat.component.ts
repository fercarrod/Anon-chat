import { Component, OnInit } from '@angular/core';
import { ChatService } from 'src/app/services/chat.service';
import { RsaKeyPair, generatekeys, RsaPubKey, RsaPrivKey  } from 'src/app/utils/rsa';
import * as bigintconversion from 'bigint-conversion'
import * as bcu from 'bigint-crypto-utils';
import { AnonymousCertificate } from 'src/app/services/certificate.service';
import * as objectSha from 'object-sha';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit{
  text = '' //variable donde se guardan los mensajes escritos para el chat en el navegador
  isLoggedIn: boolean = false// se pondra en true cuando el login sea okay
  //datos del cliente para registar con el servidor
  username=''
  telefono=''//uso el telefono como valor único, como si fuera una votación y necesita pedir el permiso para votar usando el dni
  //variables para mostrar respuesta signup
  successMessage: string | null = null;
  errorMessage: string | null = null;


  certificadoCreado: boolean = false;
  clienteId= ''
  constructor(public chat:ChatService){

  }
  ngOnInit(): void {
   // this.isLoggedIn = true//quitar para que fufe el login
    this.generateKeys()// para que la función que genera las llaves del cliente, se active nada mas activar el cliente
  }
    // Función que genera las llaves privada y pública del Cliente
  generateKeys() {
    generatekeys(1024).then((keys: RsaKeyPair) => {
        console.log('Claves generadas:', keys);

        const publicKey = {//transformar las llaves a string
          e: keys.publicKey.e.toString(),
          n: keys.publicKey.n.toString()
        };
        const publicKeyJson = JSON.stringify(publicKey);//crear un json con la llave publica
        localStorage.setItem('publicKey', publicKeyJson);//guardar los valores en el local storage del navegador
        console.log('La clave pública se ha guardado en el Local Storage con clave "publicKey"');

        const privateKey = {//transformar las llaves a string
          d: keys.privKey.d.toString(),
          n: keys.privKey.n.toString()
        };
        const privateKeyJson = JSON.stringify(privateKey);//crear un json con la llave privada
        localStorage.setItem('privateKey', privateKeyJson);//guardar los valores en el local storage del navegador
        console.log('La clave privada se ha guardado en el Local Storage con clave "privateKey"');
      }).catch((error: any) => {
        console.error('Error al generar las claves:', error);
      });
    }
    generateRandomBigInt(): bigint {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      const hexString = Array.from(array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
      return BigInt('0x' + hexString);
    }


    sendMessage() {
      const message = this.text; // Guardar el texto introducido en el navegador en la variable "message"
      console.log('El mensaje a firmar es:', message);

      const privateKeyJson = localStorage.getItem('privateKey');
      if (privateKeyJson === null) {
        console.error('No se encontró la llave privada en localStorage.');
        return;
      }

      const privateKey = JSON.parse(privateKeyJson);
      const d = BigInt(privateKey.d);
      const n = BigInt(privateKey.n);

      const rsaPrivKey = new RsaPrivKey(d, n);
      console.log('rsaPrivKey con la que se firma:', rsaPrivKey);

      const mensajeFirmado = rsaPrivKey.sign(bigintconversion.textToBigint(message));
      console.log('Este es el mensaje firmado:', mensajeFirmado);

      const mensajeFirmadoJson = {
        mensajeFirmado: mensajeFirmado.toString(),
        clienteId: this.clienteId
      };

      const mensajeEncriptadoJsonString = JSON.stringify(mensajeFirmadoJson);
      console.log('Mensaje encriptado en formato JSON:', mensajeEncriptadoJsonString);

      if (mensajeEncriptadoJsonString === null) {
        console.error('No se encontró el mensaje encriptado en localStorage.');
        return;
      }

      const mensajeEncriptadoConId = {
        messagesinEncriptar: message,
        mensajeEncriptado: mensajeFirmado.toString(),
        clienteId: this.clienteId
      };

      this.chat.sendMessage(mensajeEncriptadoConId);
    }

    onSignUp(){
      //obtenemos los valores escritos en el navegador
      const username =this.username
      const tlf = this.telefono

      this.chat.SignUp(username,tlf)//usamos el service del chat para mandar lo datos al servidor
      this.chat.socket.io.on('RegistroResult',(respuesta)=>{
        console.log('res:',respuesta)
        if(respuesta.success){
          console.log('Registro Completo')
          this.successMessage = 'Registro completo.';
          this.isLoggedIn= true;
        }
        if(respuesta.error){
          console.log('error')
          this.errorMessage = respuesta.error;
          //el isloggedin se mantiene en false
        }
      })
    }



  publicKeyServer = new RsaPubKey(
    65537n,
    175386324588461643050168385259731104967526029782405045767748293418285628074628676682622046128593868892163374103098336006034516447379993980160718352557203607108599876654408716296392552079898399252848125479796687885372909069452604039695399417243339751888547531648338585597326693177892256645266422230991237372399n
  );

  privateKeyServer = new RsaPrivKey(
    75456502557277026526123377493375928645869721466418857599026975315043129364972918622201370411246055316591215591360005523996356649683786414767407947704394647567284725479192980459321523657123422907946853497023907676171905762287798267845031556025361484222596514903007650599789214986162426285218570158514041859233n,
    175386324588461643050168385259731104967526029782405045767748293418285628074628676682622046128593868892163374103098336006034516447379993980160718352557203607108599876654408716296392552079898399252848125479796687885372909069452604039695399417243339751888547531648338585597326693177892256645266422230991237372399n
  );
  async CrearCertificado() {
    try {
      //recuperamos llave publica del cliente del localstorage del navegador
      const publicKeyJson = localStorage.getItem('publicKey');
      if (publicKeyJson === null) {
        console.error('No se encontró la llave pública en localStorage.');
        return;
      }

      const publicKey = JSON.parse(publicKeyJson);//guardamos la llave publica del cliente
      const llavePUBServer = new RsaPubKey(this.publicKeyServer.e,this.publicKeyServer.n) //llave publica servidor
      const llavePRIVServer = new RsaPrivKey(this.privateKeyServer.d,this.privateKeyServer.n);//llave privada servidor

      console.log('---------------------------');
      console.log('##Hash a esta llaveCliente:', publicKey);
      console.log('@@@llavePUBServer:', llavePUBServer);
      console.log('@@@llavePRIVServer:', llavePRIVServer);
      console.log('---------------------------');

      //generamos un numero de cegado r
      const r = bcu.randBetween(llavePUBServer.n, llavePUBServer.n / 2n);
      //console.log('@@@r:', r)


      const data = objectSha.hashable(publicKey);//preparación de la llave publica para realizar el hash
      const dgst = await objectSha.digest(data)// generamos el digest de la llave publica cliente, este es el valor que se usara para la comprobación
      const digstbig =bigintconversion.hexToBigint(dgst)// transformamos el valor en bigint
      //console.log('data1:', data)
      console.log('##dgst1:', dgst);
      //console.log('digstbig1:', digstbig);
      console.log('---------------------------');

      const blindmessage = llavePUBServer.blindMessage(digstbig,r)//cegamos el digest usando la llave publica del server y el valor de cegado r
      console.log('##blindmessage que se envia:', blindmessage)
      console.log('---------------------------');
      this.chat.blindmessage(blindmessage.toString());

      this.chat.socket.io.on('SignedBlindMessage', (digstfirmado) => {// aqui recibimos la firma que hace el servidor al blindmessage que le hemos enviado
        console.log('digstfirmado reciibido: ',digstfirmado)
        const unblind = llavePUBServer.unblindSign(BigInt(digstfirmado),r)//descegamos el mensaje recibido del servidor para obtener su firma
        console.log('unblind:', unblind)// en unblind, tenemos la firma del servidor para generar el certificado

        const certificate: AnonymousCertificate = {//generamos el certificado usando el servicio certificate.service.ts
          chatId: "id_que_envia_elserver",//validación para el chat
          clientPublicKey: publicKey,//llave publica del cliente
          serverSignature: unblind.toString(), // Utiliza el valor desblindado como la firma del servidor
        };
        console.log('certificate:',certificate)
        localStorage.setItem('certificate', JSON.stringify(certificate))//guardamos el certificado en el localstorage del navegador
        this.certificadoCreado = true;//ponemos el boolean en true
    })

  }catch{console.log('error')}
}}

  /*async test() {
    // Recuperamos el string de la llave del local storage
    const publicKeyJson = localStorage.getItem('publicKey');
    if (publicKeyJson === null) {
      console.error('No se encontró la llave pública en localStorage.');
      return;
    }

    // Generamos la llave pública recuperada
    const publicKey = JSON.parse(publicKeyJson);
    const e = publicKey.e;
    const n = publicKey.n;
    const llave = new RsaPubKey(BigInt(e), BigInt(n));
    console.log('---------------------------')
    //console.log('@@@@ publicKey,:',publicKey)
    // Comprobamos que la llave tiene un valor correcto para hacer el hash
    const data = objectSha.hashable(publicKey); // Preparar el objeto para ser hashable
    //console.log('@@@data:',data)
    //console.log('objectSha:', objectSha.hashable(data));

    try {
      // Generamos el digest utilizando SHA-512
      const r = bcu.randBetween(llave.n, llave.n/ bigintconversion.textToBigint("2") )
      const digest = await objectSha.digest(data, 'SHA-512');
      console.log('@@@digest:', digest);
      console.log('---------------------------')
      //console.log('r:', r);
      //const digestbigint = bigintconversion.hexToBigint(digest)
      //console.log('digestbigint:',digestbigint)
      // Cegamos el digest utilizando la función blindMessage de RsaPubKey
      const blindedDigest = llave.blindMessage(bigintconversion.hexToBigint(digest), r);
      console.log('Digest cegado:', blindedDigest.toString());

      // Enviamos el digest cegado al servidor para que lo firme
      this.chat.sendDigest(blindedDigest.toString());

      this.chat.socket.io.on('digstfirmado', (digstfirmado) => {
        //console.log('digstfirmado', digstfirmado);

        // Descegamos el digest firmado utilizando la función unblindMessage de RsaPubKey
        const unblindedDigest = llave.unblindSign(BigInt(digstfirmado), r);
        //console.log('Digest descegado:', unblindedDigest.toString());


        const certificate: AnonymousCertificate = {//generamos el certificado usando el servicio certificate.service.ts
          chatId: "id_que_envia_elserver",//validación para el chat
          clientPublicKey: {e,n},//llave publica del cliente
          serverSignature: unblindedDigest.toString(), // Utiliza el valor desblindado como la firma del servidor
        };
        console.log('certificate:',certificate)
        this.chat.sendCertificate(certificate)
      });
    } catch (error) {
      console.error('Error al generar el digest:', error);
    }
  }*/

/** test() prueba en el cliente para comprobar funcionamiento conseguir funcionamiento firma ciega.
 *          Todo se hace en el cliente , no hay comunicación con el servidor
 *   async test() {
    try {
      //recuperamos llave publica del cliente del localstorage del navegador
      const publicKeyJson = localStorage.getItem('publicKey');
      if (publicKeyJson === null) {
        console.error('No se encontró la llave pública en localStorage.');
        return;
      }

      const publicKey = JSON.parse(publicKeyJson);//guardamos la llave publica del cliente
      const llavePUBServer = new RsaPubKey(this.publicKeyServer.e,this.publicKeyServer.n) //llave publica servidor
      const llavePRIVServer = new RsaPrivKey(this.privateKeyServer.d,this.privateKeyServer.n);//llave privada servidor

      console.log('---------------------------');
      console.log('##Hash a esta llaveCliente:', publicKey);
      console.log('@@@llavePUBServer:', llavePUBServer);
      console.log('@@@llavePRIVServer:', llavePRIVServer);
      console.log('---------------------------');

      //generamos un numero de cegado r
      const r = bcu.randBetween(llavePUBServer.n, llavePUBServer.n / 2n);
      console.log('@@@r:', r)


      const data = objectSha.hashable(publicKey);//preparación de la llave publica para realizar el hash
      const dgst = await objectSha.digest(data)// generamos el digest de la llave publica cliente, este es el valor que se usara para la comprobación
      const digstbig =bigintconversion.hexToBigint(dgst)// transformamos el valor en bigint
      console.log('data1:', data)
      console.log('dgst1:', dgst);
      console.log('digstbig1:', digstbig);
      console.log('---------------------------');

      const blindmessage = llavePUBServer.blindMessage(digstbig,r)//cegamos el digest usando la llave publica del server y el valor de cegado r
      const blindSign = llavePRIVServer.sign(blindmessage)
      const unblind = llavePUBServer.unblindSign(blindSign,r)//descegamos el mensaje recibido del servidor para obtener su firma
      console.log('@@@r:', r)
      console.log('blindmessage:', blindmessage)
      console.log('blindSign:', blindSign);
      console.log('unblind:', unblind)
      console.log('---------------------------');


      const verificarunblind = llavePUBServer.verify(unblind)
      const unblindtoHex =bigintconversion.bigintToHex(verificarunblind)
      console.log('verificarunblind:', verificarunblind);
      console.log('unblindtoHex:', unblindtoHex);

      if(unblindtoHex===dgst){
        console.log('son iguales')
      }
      else{console.log('certificado no funciona')}

  }catch{console.log('error')}
}}
*/

/**
 * onLoginSubmit() {//función para el evento login
    const username = 'validochat'; // Obtén el nombre de usuario del formulario
    const password = ''; // Obtén la contraseña del formulario

    const publicKeyJson = localStorage.getItem('publicKey')//recupero el string de la llave pública
    console.log('publicKeyJson:',publicKeyJson)
    if (typeof publicKeyJson === 'string') {
      console.log('if:', publicKeyJson);
      this.chat.login(username, publicKeyJson);// suscrito al evento login de chat.service
      this.chat.socket.io.on('validochat', (respuesta) => {//suscrito al evento validochat, para saber si el login a salido bien o no
        if (respuesta.mensaje === 'okay') {
          this.clienteId = respuesta.clienteId; // Obtener la ID del cliente desde la respuesta
          console.log('Login exitoso. ID del cliente:', this.clienteId);
          this.isLoggedIn = true;// actualizar el estado del boolean a true, el login es correcto, ahora el cliente podra enviar mensajes ademas de observar el chat
        } else {
          console.log('Error de login');
        }
    })}
  }
 */
  /*blindSign() {
    const message = 12345n; // Reemplaza con el mensaje que deseas cegar (en forma de BigInt)
    const r = 123n; // Reemplaza con el valor de r
    const llave = new RsaPubKey(this.publicKey.e,this.publicKey.n)//generamos una llave publica del servidor
    const blindmessage = llave.blindMessage(message,r)// cegamos el mensaje con la llave anterior
    console.log('blindmessage:', blindmessage);
    const bmString = blindmessage.toString()//pasamos el bigint a string para enviarlo al server
    console.log('bmString: ',bmString)
    this.chat.blindSign(bmString,r)//activamos el evento blindsign del servicio chat
    this.chat.socket.io.on('Signature', (Signature)=>{// escuchamos la respuesta del evento anterior
      console.log('Signature: ',Signature)
      const SignatureBigint = BigInt(Signature)//convertimos la firma de string a biging
      const llave = new RsaPubKey(this.publicKey.e,this.publicKey.n)//generamos una llave publica del servidor
      const unblind = llave.unblindSign(r,SignatureBigint)//hacemos el unblind de la firma del servidor, con el valor de cegado r y la Signature del server del mensaje cegado que hemos enviado
      console.log('unblind:',unblind)
      const publicKeyJson = localStorage.getItem('publicKey');//recuperamos la llave publica del cliente
      if (publicKeyJson === null) {
        console.error('No se encontró la llave privada en localStorage.');
        return;
      }
      const publicKey = JSON.parse(publicKeyJson);//obtenemos los valores en string de la llave e y n
      const e = publicKey.e
      const n = publicKey.n
      const certificate: AnonymousCertificate = {//generamos el certificado usando el servicio certificate.service.ts
        chatId: "ID_DEL_CHAT",//validación para el chat
        clientPublicKey: {e,n},//llave publica del cliente
        serverSignature: unblind.toString(), // Utiliza el valor desblindado como la firma del servidor
      };
      console.log('certificate: ',certificate)
    })
  }*/
