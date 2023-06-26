
const objectSha = require('object-sha');
const bigintConversion = require('bigint-conversion');
const { RsaPubKey } = require('./rsa')

// confirmarCertificado.js

async function confirmarCertificado(llavePUBServer,llavePUBCliente, signature) {
  console.log('---------------------Confirmar Certificado');
  console.log('@@@@@@@@@@@')
  console.log('llavePUBServer:', llavePUBServer);
  console.log('llavePublicCliente:', llavePUBCliente);
  const e = llavePUBServer.e
  const n = llavePUBServer.n
  const llavePUBSer = new RsaPubKey(e,n)
  console.log('-------------------');
  const data = objectSha.hashable(llavePUBCliente);//preparación de la llave publica para realizar el hash
  const dgst1 = await objectSha.digest(data)// generamos el digest de la llave publica cliente, este es el valor que se usara para la comprobación
  console.log('dgst:',dgst1)

  const verificarSign = llavePUBSer.verify(BigInt(signature))
  console.log('verificarSign:',verificarSign)
  const dgst2 =bigintConversion.bigintToHex(verificarSign)
  console.log('dgst:',dgst1)
  console.log('dgst2:',dgst2)   
  if (dgst1 === dgst2) {
     return { success: 'Certificado válido.' };
  } else {
    return { error: 'Certificado inválido.' };
  }

}
 

  
module.exports = {
  confirmarCertificado
};
