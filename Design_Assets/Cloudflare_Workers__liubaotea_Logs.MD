日志1：
{
  "source": {
    "level": "error",
    "message": "POST https://workers.liubaotea.online/api/orders",
    "$cloudflare": {
      "$metadata": {
        "id": "01JSRM5XSMP9AR1ENV931VYBH1",
        "type": "cf-worker-event",
        "error": "POST https://workers.liubaotea.online/api/orders",
        "errorPattern": "POST <URL>",
        "messagePattern": "POST <URL>"
      }
    }
  },
  "dataset": "cloudflare-workers",
  "timestamp": "2025-04-26T08:42:16.244Z",
  "$workers": {
    "event": {
      "request": {
        "cf": {
          "requestHeaderNames": {},
          "httpProtocol": "HTTP/3",
          "tlsCipher": "AEAD-AES128-GCM-SHA256",
          "continent": "AS",
          "clientAcceptEncoding": "gzip, deflate, br, zstd",
          "verifiedBotCategory": "",
          "country": "CN",
          "region": "Guangxi",
          "tlsClientCiphersSha1": "",
          "tlsClientAuth": {
            "certIssuerDNLegacy": "",
            "certIssuerSKI": "",
            "certSubjectDNRFC2253": "",
            "certSubjectDNLegacy": "",
            "certFingerprintSHA256": "",
            "certNotBefore": "",
            "certSKI": "",
            "certSerial": "",
            "certIssuerDN": "",
            "certVerified": "NONE",
            "certNotAfter": "",
            "certSubjectDN": "",
            "certPresented": "0",
            "certRevoked": "0",
            "certIssuerSerial": "",
            "certIssuerDNRFC2253": "",
            "certFingerprintSHA1": ""
          },
          "tlsClientRandom": "jHcSIg/K9Yzh1U8ZVuTLeiaLP/muuLY/GImRH5PTMLw=",
          "tlsClientHelloLength": "1755",
          "colo": "SJC",
          "timezone": "Asia/Shanghai",
          "longitude": "111.28920",
          "latitude": "23.46790",
          "requestPriority": "",
          "city": "Wuzhou",
          "tlsVersion": "TLSv1.3",
          "regionCode": "GX",
          "asOrganization": "China Mobile",
          "tlsClientExtensionsSha1Le": "",
          "tlsClientExtensionsSha1": "1qhtxvEhTIr1949uVHW3w2a2Sa4=",
          "asn": 9808,
          "edgeRequestKeepAliveStatus": 1
        },
        "url": "https://workers.liubaotea.online/api/orders",
        "method": "POST",
        "headers": {
          "accept": "*/*",
          "accept-encoding": "gzip, br",
          "accept-language": "zh-CN,zh;q=0.9",
          "authorization": "********",
          "cf-connecting-ip": "117.140.112.203",
          "cf-ipcountry": "CN",
          "cf-ray": "9364c92b7b17fab6",
          "cf-visitor": "{\"scheme\":\"https\"}",
          "connection": "Keep-Alive",
          "content-length": "121",
          "content-type": "application/json",
          "host": "workers.liubaotea.online",
          "origin": "https://www.liubaotea.online",
          "priority": "u=1, i",
          "referer": "https://www.liubaotea.online/",
          "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
          "x-forwarded-proto": "https",
          "x-real-ip": "117.140.112.203"
        },
        "path": "/api/orders"
      },
      "rayId": "9364c92b7b17fab6",
      "executionModel": "stateless",
      "response": {
        "status": 500
      }
    },
    "diagnosticsChannelEvents": [],
    "truncated": false,
    "scriptName": "liubaotea",
    "outcome": "ok",
    "eventType": "fetch",
    "scriptVersion": {
      "id": "c0ee4688-bf12-4e39-a48a-e43d390d6f46"
    },
    "requestId": "9364c92b7b17fab6",
    "cpuTimeMs": 0,
    "wallTimeMs": 0
  },
  "$metadata": {
    "id": "01JSRM5XSMP9AR1ENV931VYBH1",
    "requestId": "9364c92b7b17fab6",
    "trigger": "POST /api/orders",
    "service": "liubaotea",
    "level": "error",
    "error": "POST https://workers.liubaotea.online/api/orders",
    "message": "POST https://workers.liubaotea.online/api/orders",
    "account": "a57fe1f5969031591b3c22307b96bf03",
    "type": "cf-worker-event",
    "fingerprint": "aec15b9bbfd74598bfe4635a74c0670c",
    "origin": "fetch",
    "messageTemplate": "POST <URL>",
    "errorTemplate": "POST <URL>"
  },
  "links": []
}