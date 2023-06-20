import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { RsaPrivKey, RsaPubKey } from '../utils/rsa';
import * as bigintconversion from 'bigint-conversion'

@Injectable({
  providedIn: 'root'
})
export class ChatService {


  chatsLocal: { messagesinEncriptar:string; mensajeEncriptado: string; clienteId: string }[] = [];//arreglo para guardar los chats
  chatsServer:string[]=[]
  constructor(public socket:SocketService) {
    this.getMessage()//cuando se inicia se queda esuchando para recibir msj
  }
  //evento para enviar los mensajes al server
  sendMessage(message: { messagesinEncriptar:string; mensajeEncriptado: string; clienteId: string }) {
    this.chatsLocal.push(message);
    this.socket.io.emit("sendMessage", message);
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
  publicKey = new RsaPubKey(//llave publica del servidor
    65537n,
    140664883958549205430563974704354914598455261046516949397866979422431273428155985882252778506259162582183531527691467320746392842263233280790611661190112003621949382043748333564685519676247439224716916609224357730836368911854234644487830993498871160349665704101883268307331259343215341765205249423456401912379n
  );
  getMessage(){
    this.socket.io.on("getMessage",(message)=>{
      console.log("el server a enviado el msg:",message)
      const ServerSignature = message.mensajeFirmado;
      console.log('ServerSignature: ', ServerSignature);
      const msgVerificado = this.publicKey.verify(BigInt(ServerSignature))
      const msgVerificadotoString = bigintconversion.bigintToText(msgVerificado)
      console.log('msgVerificadotoString: ',msgVerificadotoString)
      this.chatsServer.push(msgVerificadotoString)
    })
  }
  getChats(): { messagesinEncriptar:string; mensajeEncriptado: string; clienteId: string }[] {
    return this.chatsLocal;
  }
   blindSign(bmString:string,r:bigint) {
    this.socket.io.emit('blindSign', bmString);
  }
}
