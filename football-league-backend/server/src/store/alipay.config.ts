import { AlipaySdk } from 'alipay-sdk';

let _client: AlipaySdk | null = null;

export function getAlipayClient(): AlipaySdk {
  if (!_client) {
    _client = new AlipaySdk({
      appId: process.env.ALIPAY_APPID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      signType: 'RSA2',
    });
  }
  return _client;
}
