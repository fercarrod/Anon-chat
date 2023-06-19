export interface AnonymousCertificate {
  chatId: string;
  clientPublicKey: {e:string,n:string}
  serverSignature: string;
}
