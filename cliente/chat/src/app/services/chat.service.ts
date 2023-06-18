import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { RsaPrivKey } from '../utils/rsa';

@Injectable({
  providedIn: 'root'
})
export class ChatService {


  chats: { mensajeEncriptado: string; clienteId: string }[] = [];//arreglo para guardar los chats
  constructor(public socket:SocketService) {
    this.getMessage()//cuando se inicia se queda esuchando para recibir msj
  }
  //evento para enviar los mensajes al server
  sendMessage(message: { mensajeEncriptado: string; clienteId: string }) {
    this.chats.push(message);
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
  getMessage(){
    this.socket.io.on("getMessage",(message)=>{
      console.log("el server a enviado el msg:",message)
      this.chats.push(message)
    })
  }
  getChats(): { mensajeEncriptado: string; clienteId: string }[] {
    return this.chats;
  }
}
