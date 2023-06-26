import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { RsaPrivKey, RsaPubKey } from '../utils/rsa';
import * as bigintconversion from 'bigint-conversion'
import { AnonymousCertificate } from './certificate.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  chatsLocal: string[] = [];//arreglo para guardar los chats
  chatsServer:string[]=[]
  constructor(public socket:SocketService) {
    this.getMessage()//cuando se inicia se queda esuchando para recibir msj
  }
  //evento para enviar los mensajes al server
  sendMessage(chatlocal:string, mensajeEncriptado: string, clienteId: string, llave: string, signature: string) {
    const message = {
      mensajeEncriptado,
      clienteId,
      llave,
      Signature: signature
    };
    this.chatsLocal.push(chatlocal);
    this.socket.io.emit("sendMessage", message);
  }

  SignUp(u:string,t:string){
    this.socket.io.emit('Registro',u,t)
  }
  ConfirmaCerti(comprobar: { telefono: string; id: string; llave: string; Signature: string }){
    this.socket.io.emit('ConfirmaCerti',comprobar)
  }
  login(u:string,p:string){
    this.socket.io.emit('login',u,p)
    this.socket.io.on('login1',(encryptedNoncetoString)=>{//la respuesa del servidor al intento del login es enviar un nonce encriptado con la publica que a recibido
      console.log('encryptedNonce: ',encryptedNoncetoString)
      const encryptedNoncetoBigint = BigInt(encryptedNoncetoString)//convertimos el string a bigint
      const privateKeyJson = localStorage.getItem('privateKey');// recuperamos la llave privda
      console.log('privateKeyJson:', privateKeyJson);
      if (typeof privateKeyJson === 'string') {//si no es string es que esta null y dara error
      console.log('if:', privateKeyJson);

      const privateKey = JSON.parse(privateKeyJson);// Obtener los valores de 'd' y 'n' del objeto privateKey
      const d = BigInt(privateKey.d);
      const n = BigInt(privateKey.n);
      const rsaPrivKey = new RsaPrivKey(d, n);// Crear una instancia de RsaPrivKey utilizando 'd' y 'n'

      const desencryptedNonce = rsaPrivKey.dencrypt(encryptedNoncetoBigint)// desencriptamos el nonce usando la llave privada
      console.log('desencryptedNonce: ',desencryptedNonce)
      const desencryptedNoncetoString = desencryptedNonce.toString()// convertir el bigin desencryptado a string para ser enviado al servidor
      console.log('desencryptedNoncetoString: ',desencryptedNoncetoString)
      this.socket.io.emit('desencryptedNonce',desencryptedNoncetoString)//evento para enviar el nonce desencriptado al servidor
      } else { console.log('La clave privada no se encontró en el Local Storage.');}
    })
  }
  //evento para recibir los mensajes del server
  getMessage(){
    this.socket.io.on("getMessage",(message)=>{
      console.log("el server a enviado el msg:",message)
      const msgVerificado = this.publicKeyServer.verify(BigInt(message))
      const msgVerificadotoString = bigintconversion.bigintToText(msgVerificado)
      console.log('msgVerificadotoString: ',msgVerificadotoString)
      this.chatsServer.push(msgVerificadotoString)
    })
  }
  getChats(): { }[] {
    return this.chatsLocal;
  }
  blindSign(bmString:string,r:bigint) {
    this.socket.io.emit('blindSign', bmString);
  }
  blindmessage(digest:string){
    this.socket.io.emit('blindmessage',digest)
  }
  sendunblind(unblind:string){
    this.socket.io.emit('sendunblind',unblind)
  }
  sendCertificate(certificate: AnonymousCertificate){
  this.socket.io.emit('certificate', certificate);
  }
  publicKeyServer = new RsaPubKey(
    65537n,
    175386324588461643050168385259731104967526029782405045767748293418285628074628676682622046128593868892163374103098336006034516447379993980160718352557203607108599876654408716296392552079898399252848125479796687885372909069452604039695399417243339751888547531648338585597326693177892256645266422230991237372399n
  );
}
