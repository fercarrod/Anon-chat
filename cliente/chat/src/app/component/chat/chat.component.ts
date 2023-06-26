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
  text = ''
  isLoggedIn: boolean = false// se pondra en true cuando el login sea okay
  clienteId= ''
  username=''
  password=''
  showLoginPopup: boolean = false;
  constructor(public chat:ChatService){

  }
  ngOnInit(): void {
    this.showLoginPopup = true
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
      if (this.username === 'usuario' && this.password === 'contraseña') {
        this.isLoggedIn = true
      }
    }
    onLoginSubmit() {//función para el evento login
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
  publicKey = new RsaPubKey(//llave publica del servidor
  65537n,
  140664883958549205430563974704354914598455261046516949397866979422431273428155985882252778506259162582183531527691467320746392842263233280790611661190112003621949382043748333564685519676247439224716916609224357730836368911854234644487830993498871160349665704101883268307331259343215341765205249423456401912379n
  );
  blindSign() {
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
  }
 async test() {
    try {
      const publicKeyJson = localStorage.getItem('publicKey');
      if (publicKeyJson === null) {
        console.error('No se encontró la llave pública en localStorage.');
        return;
      }

      const privateKeyJson = localStorage.getItem('privateKey');
      if (privateKeyJson === null) {
        console.error('No se encontró la llave privada en localStorage.');
        return;
      }

      const privateKey = JSON.parse(privateKeyJson);
      const publicKey = JSON.parse(publicKeyJson);

      const llavePUB = new RsaPubKey(BigInt(publicKey.e), BigInt(publicKey.n));
      const llavePRIV = new RsaPrivKey(BigInt(privateKey.d), BigInt(privateKey.n));

      console.log('---------------------------');
      console.log('@@@llavePUB:', llavePUB);
      console.log('@@@llavePRIV:', llavePRIV);
      console.log('---------------------------');

      const r = bcu.randBetween(llavePUB.n, llavePUB.n / 2n);
      //console.log('@@@r:', r)

      const data = objectSha.hashable(publicKey);
      const dgst = await objectSha.digest(data)
      const digstbig =bigintconversion.hexToBigint(dgst)


      const blindmessage = llavePUB.blindMessage(digstbig,r)
      const blindSign = llavePRIV.sign(blindmessage)
      const unblind = llavePUB.unblindSign(blindSign,r)

      console.log('---------------------------');
      //console.log('blindmessage:', blindmessage)
      //console.log('blindSign:', blindSign);
      //console.log('unblind:', unblind)
      console.log('data1:', data)
      console.log('dgst1:', dgst);
      console.log('digstbig1:', digstbig);
      console.log('---------------------------');


      const verificarunblind = llavePUB.verify(unblind)
      const unblindtoHex =bigintconversion.bigintToHex(verificarunblind)
      console.log('verificarunblind:', verificarunblind);
      console.log('unblindtoHex:', unblindtoHex);

      if(unblindtoHex===dgst){
        console.log('son iguales')
      }
      else{console.log('certificado no funciona')}

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



/*
  test() {
    const publicKeyJson = localStorage.getItem('publicKey');
    if (publicKeyJson === null) {
      console.error('No se encontró la llave pública en localStorage.');
      return;
    }
    const publicKey = JSON.parse(publicKeyJson);
    const e = publicKey.e;
    const n = publicKey.n;
    const llave = new RsaPubKey(e, n);

    const data = publicKeyJson; // Reemplaza con el string que deseas generar el digest

    sha256(data).then((digestValue) => {
      const numericDigest = parseInt(digestValue, 16);
      if (isNaN(numericDigest)) {
        console.error('Error al generar el digest. El valor no es un número entero válido.');
        return;
      }

      console.log('Digest:', numericDigest);

      // Generar un valor aleatorio seguro como BigInt para cegar el digest
      const r = randBetween(2n, llave.n ** 256n);
      // Cegar el digest utilizando la función blindMessage de RsaPubKey
      const blindedDigest = llave.blindMessage(BigInt(numericDigest), r);
      console.log('Digest cegado:', blindedDigest.toString());
      // Aquí puedes realizar cualquier otra acción con el digest cegado
    }).catch((error) => {
      console.error('Error al generar el digest:', error);
    });
  }

  async generateDigest(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    try {
      const digestBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const digestArray = Array.from(new Uint8Array(digestBuffer));
      const digestHex = digestArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
      return digestHex;
    } catch (error) {
      throw new Error('Error al calcular el digest');
    }
  }*/
