const bcu = require('bigint-crypto-utils');

class RsaPubKey {
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
}

class RsaKeyPair {
  constructor(publicKey, privKey) {
    this.publicKey = publicKey;
    this.privKey = privKey;
  }
}

const generateKeys = async function (bitLength) {
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
