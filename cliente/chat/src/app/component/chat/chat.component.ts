import { Component, OnInit } from '@angular/core';
import { ChatService } from 'src/app/services/chat.service';
import { RsaKeyPair, generatekeys, RsaPubKey, RsaPrivKey  } from 'src/app/utils/rsa';
import * as bigintconversion from 'bigint-conversion'

import * as bcu from 'bigint-crypto-utils';
import { AnonymousCertificate } from 'src/app/services/certificate.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit{
  text = ''
  isLoggedIn: boolean = false// se pondra en true cuando el login sea okay
  clienteId= ''
  constructor(public chat:ChatService){

  }
  ngOnInit(): void {
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
  login() {//función para el evento login
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

  /*const certificate: AnonymousCertificate = {
    chatId: "ID_DEL_CHAT",
    clientPublicKey: "LLAVE_PUBLICA_DEL_CLIENTE",
    serverSignature: "FIRMA_DEL_SERVIDOR",
  };*/



}

