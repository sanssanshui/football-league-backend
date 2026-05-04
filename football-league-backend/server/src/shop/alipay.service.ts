import { Injectable, Logger } from '@nestjs/common';
import { AlipaySdk } from 'alipay-sdk';

const ALIPAY_CONFIG = {
  appId: process.env.ALIPAY_APP_ID || '9021000163610560',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || `MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCAOFb5nZrVJdocStlO18kkFNZK1OUVg4PDcUv6j39DQGbET5E7Xg1ycbuDT6Uj38Qn8ItISkpMtIa8XhkSitYls3g5QeAnVDUlCiZWVDEuvpcp2GxS7fLALNzaa8Khi7E9SyP+/zBoEBVXFPcF1LzOuIG1HdHOAGVtTa0gE3f+kwxGGjMAulWTwTA3sB7H0UcZugIHrLrRAMn/GImn17/MNEQ4MRiPYB5l8NU0L+/Wgqi16RR6J32RDXbYIeJq6u1bDVTTMccHUUrjigUlsNM4tAEcwjqBIrFEuAjZi/M2GXgr2xiWqICZu2YCQDzj5W5FsePMQyhjBCgTFvHbZUL7AgMBAAECggEAb2kE4dX5ADXoo+bBlYlYI7rbTKBaAWyJ5BugyjE/gj8GTJNafTxG8Ocz6HAe7OH0/kM7su+iSa4e2LPmkz8BvjaIQzAjRekcWHfOQfrb1WMT0+9SiGhrImKY8EzsDBRmR/zvZRV1iSZYdJcp4O4ttG2LfsVPVPDxMJ1qzdE81XzS1KGqyapPAEmI3BpYZqsv3qPEA3ILHYlpjYz6gEkLyrzU2t0wFNQikhUS7OZqW1Gdrxa7xkGAR4FkbUjK+iH3TUygQ6q7dTURDy5rLd2OsDajbRt1gfh5VjZH7qHZbqJkKVQlnff1ibU77pHzyeI41gOHi11zcUhdgH9KYke7EQKBgQC+VvsVABmwkVQ5O9N236u+iMPoh3pLg/Ax9uJGfRXf+W1OeoHP+p5mOu7iVEla6HEfukW4gPE/s+JuVdQClgJ9v3XYqlGxo/MaQORtiGU03L3sdJlQTn0ZXNc7l7+49B7HKq1312WwuDncfd+AhpODGL15kKMd1WB5tSYTToqWYwKBgQCsc4geRUv+m6CsD/cWaYozQ3/3eQ7Lv+7ivnpQ5liIqzV7EmKt6BTALr/gmtDZWomiVbR03ra6HeoqwfcE0k9NMpEQE3HqJmtPs/0ULkh29zI4MONzehzpzrIYwYWzamG3nB77SrKGSjsyWVVWgl0Ib6mtnOjDKjY5W2NquVCYiQKBgEjqZVFMMoszgUJTqtS1JsPc/L/NdooLRy681z4NmR2uHbOctrIH3jpnhS/q/hb3SK7Q2vitXL38mVePRaKf+OBXQjv4M0eL+QsrpNZZE/xGO/OjT0A2cTIQINvRbD7cNhYyQTXRrEEgsfnHtqEz7Lqh9aPmRradEVJOlQF8axblAoGAEqSmyYb6UTsn4pITR0P/oc0hT3Kx68sDG1Y2SPquBZBkxrpVGrHlVGV5buGtxGGqUXdse9n77SEAyMCRYN8PnavizNcdUI/4t/QgXwcl5F6S+komvLwt1gT3cf+x4ZSVndDt9IK9zBDIV4ga1rBfOGNB97fn3fl5RTghBk+ka+kCgYAylDSVHr9zjS0oMDtOeiua5tat5lL1mo4YhYbVUk45UJ9+OUQfW8lqb0R95Zi+2cgxKvGpAKwv7FPzkTqSSbaH6TamoaV8t8vVPFok8+6pCZbDpAue0+FQdyluKW6aftblkVil8AMVnuYAkkWiKiZAbVi4VcrqNkdJhCkAgVV3Ww==`,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  // 沙箱网关（两个地址均可，推荐新版）
  gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  signType: 'RSA2' as const,
};

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private sdk: AlipaySdk;

  constructor() {
    this.sdk = new AlipaySdk(ALIPAY_CONFIG);
  }

  createPagePayment(params: {
    outTradeNo: string;
    totalAmount: string;
    subject: string;
    returnUrl: string;
    notifyUrl: string;
  }): string {
    // pageExec('method', 'GET', bizParams) returns a URL string directly
    const result = this.sdk.pageExec('alipay.trade.page.pay', 'GET', {
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
      bizContent: {
        out_trade_no: params.outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: params.totalAmount,
        subject: params.subject,
      },
    });
    return result as string;
  }

  verifyNotifySign(params: Record<string, string>): boolean {
    try {
      return this.sdk.checkNotifySign(params);
    } catch (e) {
      this.logger.error('支付宝通知验签失败', e);
      return false;
    }
  }

  async queryTrade(outTradeNo: string): Promise<{ tradeStatus: string; tradeNo: string } | null> {
    try {
      const result = await this.sdk.exec('alipay.trade.query', {
        bizContent: { out_trade_no: outTradeNo },
      }) as any;
      if (result?.code === '10000') {
        // SDK returns camelCase keys by default
        return {
          tradeStatus: result.tradeStatus ?? result.trade_status,
          tradeNo: result.tradeNo ?? result.trade_no,
        };
      }
      return null;
    } catch (e) {
      this.logger.error('查询支付宝交易失败', e);
      return null;
    }
  }
}
