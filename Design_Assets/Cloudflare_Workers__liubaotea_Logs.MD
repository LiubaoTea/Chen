日志1：
{
  "source": {
    "level": "error",
    "message": "R2存储服务不可用",
    "$cloudflare": {
      "$metadata": {
        "id": "01JW40TZD1FX0RNV0CEG969RD9",
        "type": "cf-worker",
        "error": "R2存储服务不可用"
      }
    }
  },
  "dataset": "",
  "timestamp": "2025-05-25T15:26:31.329Z",
  "$workers": {
    "event": {
      "request": {
        "url": "https://workers.liubaotea.online/api/upload-image",
        "method": "POST",
        "path": "/api/upload-image"
      }
    },
    "outcome": "ok",
    "scriptName": "liubaotea",
    "eventType": "fetch",
    "executionModel": "stateless",
    "scriptVersion": {
      "id": "e4bddf64-eabe-4b88-8e8a-9597c18ec119"
    },
    "truncated": false,
    "requestId": "94560d2c0b29703b"
  },
  "$metadata": {
    "id": "01JW40TZD1FX0RNV0CEG969RD9",
    "requestId": "94560d2c0b29703b",
    "trigger": "POST /api/upload-image",
    "service": "liubaotea",
    "level": "error",
    "statusCode": 500,
    "error": "R2存储服务不可用",
    "message": "R2存储服务不可用",
    "url": "https://workers.liubaotea.online/api/upload-image",
    "account": "a57fe1f5969031591b3c22307b96bf03",
    "provider": "cloudflare",
    "type": "cf-worker",
    "fingerprint": "57e0e51d5c75eca6ec32e3e9179450d2",
    "origin": "fetch",
    "now": null
  },
  "links": []
}
日志2：
{
  "source": {
    "level": "error",
    "message": "POST https://workers.liubaotea.online/api/upload-image",
    "$cloudflare": {
      "$metadata": {
        "id": "01JW40TZCYH68JTN0PDRJ7NXNM",
        "type": "cf-worker-event",
        "error": "POST https://workers.liubaotea.online/api/upload-image",
        "errorPattern": "POST <URL>",
        "messagePattern": "POST <URL>"
      }
    }
  },
  "dataset": "",
  "timestamp": "2025-05-25T15:26:31.326Z",
  "$workers": {
    "event": {
      "request": {
        "url": "https://workers.liubaotea.online/api/upload-image",
        "method": "POST",
        "headers": {
          "accept": "*/*",
          "accept-encoding": "gzip, br",
          "accept-language": "zh-CN,zh;q=0.9",
          "authorization": "********",
          "cf-connecting-ip": "2409:8a5c:5060:d20:c42c:7ff1:cb88:eddb",
          "cf-ipcountry": "CN",
          "cf-ray": "94560d2c0b29703b",
          "cf-visitor": "{\"scheme\":\"https\"}",
          "connection": "Keep-Alive",
          "content-length": "320322",
          "content-type": "multipart/form-data; boundary=----WebKitFormBoundaryMPhghHa896itXiv7",
          "host": "workers.liubaotea.online",
          "origin": "https://www.liubaotea.online",
          "referer": "https://www.liubaotea.online/",
          "sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36",
          "x-forwarded-proto": "https",
          "x-real-ip": "2409:8a5c:5060:d20:c42c:7ff1:cb88:eddb"
        },
        "cf": {
          "requestHeaderNames": {},
          "httpProtocol": "HTTP/3",
          "tlsCipher": "AEAD-AES128-GCM-SHA256",
          "continent": "AS",
          "asn": 9808,
          "clientAcceptEncoding": "gzip, deflate, br",
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
          "tlsClientRandom": "e3xvoCbyeGrq0cIv0hd04Zf7E5iQFholQHckFOW22Hk=",
          "tlsClientHelloLength": "531",
          "colo": "SEA",
          "timezone": "Asia/Shanghai",
          "longitude": "108.31680",
          "latitude": "22.81110",
          "edgeRequestKeepAliveStatus": 1,
          "requestPriority": "",
          "city": "Nanning",
          "tlsVersion": "TLSv1.3",
          "regionCode": "GX",
          "asOrganization": "China Mobile",
          "tlsClientExtensionsSha1Le": "",
          "tlsClientExtensionsSha1": "RU3I/XtGppUX063xa5NW/VAjHzk="
        },
        "path": "/api/upload-image"
      },
      "response": {
        "status": 500
      },
      "rayId": "94560d2c0b29703b",
      "executionModel": "stateless"
    },
    "scriptName": "liubaotea",
    "outcome": "ok",
    "eventType": "fetch",
    "diagnosticsChannelEvents": [],
    "scriptVersion": {
      "id": "e4bddf64-eabe-4b88-8e8a-9597c18ec119"
    },
    "truncated": false,
    "requestId": "94560d2c0b29703b",
    "cpuTimeMs": 1,
    "wallTimeMs": 3
  },
  "$metadata": {
    "id": "01JW40TZCYH68JTN0PDRJ7NXNM",
    "requestId": "94560d2c0b29703b",
    "trigger": "POST /api/upload-image",
    "service": "liubaotea",
    "level": "error",
    "statusCode": 500,
    "error": "POST https://workers.liubaotea.online/api/upload-image",
    "message": "POST https://workers.liubaotea.online/api/upload-image",
    "url": "https://workers.liubaotea.online/api/upload-image",
    "account": "a57fe1f5969031591b3c22307b96bf03",
    "provider": "cloudflare",
    "type": "cf-worker-event",
    "fingerprint": "97f3cfd6f316459de244559c6e962e7c",
    "origin": "fetch",
    "messageTemplate": "POST <URL>",
    "errorTemplate": "POST <URL>",
    "now": null
  },
  "links": []
}