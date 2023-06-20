const bcu = require('bigint-crypto-utils');
const objectSha = require('object-sha');
// info de que contienen las llaves BlindSignature.pdf transparencia 10
// Kpub=(e,n)  e=exponente público n=módulo público
// Kpriv=(d,n) d=exponente privado n=módulo público
class RsaPubKey {
  // la clave publica puede encryptar o verificar
  // encrypt recibe mensaje m
  // verifica una firma(sign) s
  constructor(e, n) {
    this.e = e;
    this.n = n;
  }

  encrypt(m) {
    return bcu.modPow(m, this.e, this.n);
  }

  verify(s) {
    return bcu.modPow(s, this.e, this.n);
  }

  async verifySignature (payload, signature) {
    const dgst1 = this.verify(BigInt(signature))
    const dgst2 = hexToBigint(await objectSha.digest(payload))

    return dgst1 === dgst2
  }

  blindMessage(m, r) {
    const bm = bcu.modPow(r, this.e, this.n);
    
    return (m * bm) % this.n;
  }

  unblindSign(r, bs) {
    const bsInv = bcu.modInv(r, this.n);
    return (bs * bsInv) % this.n;
  }
}

class RsaPrivKey {
  // la clave privada puede desencryptar y firmar
  // frima el mensaje m
  constructor(d, n) {
    this.d = d;
    this.n = n;
  }

  dencrypt(c) {
    return bcu.modPow(c, this.d, this.n);
  }

  sign(m) {
    return bcu.modPow(m, this.d, this.n);
  }

  blindSign(bm) {
    return bcu.modPow(bm, this.d, this.n);
  }

  async signature (m) {
    const dgst = await objectSha.digest(m)
    return this.sign(hexToBigint(dgst)).toString()
  }
}

class RsaKeyPair {
  constructor(publicKey, privKey) {
    this.publicKey = publicKey;
    this.privKey = privKey;
  }
}

const generateKeys = async function (bitLength) {
  // para generar llaves, se tienen que generar 2 primos muy grandes
// info BlindSignature.pdf transparencia 10,11,12,13
  const e = 65537n;
  let p, q, n, phi;
  do {
    p = await bcu.prime(bitLength / 2 + 1);
    q = await bcu.prime(bitLength / 2);
    n = p * q;
    phi = (p - 1n) * (q - 1n);
  } while (bcu.bitLength(n) !== bitLength || (phi % e === 0n));

  const publicKey = new RsaPubKey(e, n);
  const d = bcu.modInv(e, phi);
  const privKey = new RsaPrivKey(d, n);

  return new RsaKeyPair(publicKey, privKey);
};

module.exports = {
  RsaPubKey,
  RsaPrivKey,
  RsaKeyPair,
  generateKeys
};
