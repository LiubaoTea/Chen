日志1：
{
  "source": {
    "level": "error",
    "message": "POST https://workers.liubaotea.online/api/register",
    "$cloudflare": {
      "$metadata": {
        "id": "01JSEG8FKDWC0Q1H99A32HRTH2",
        "type": "cf-worker-event",
        "error": "POST https://workers.liubaotea.online/api/register",
        "errorPattern": "POST <URL>",
        "messagePattern": "POST <URL>"
      }
    }
  },
  "dataset": "",
  "timestamp": "2025-04-22T10:21:21.389Z",
  "$workers": {
    "event": {
      "request": {
        "url": "https://workers.liubaotea.online/api/register",
        "method": "POST",
        "headers": {
          "accept": "*/*",
          "accept-encoding": "gzip, br",
          "accept-language": "zh-CN,zh;q=0.9",
          "cf-connecting-ip": "212.18.104.164",
          "cf-ipcountry": "US",
          "cf-ray": "934464cfdc38f00f",
          "cf-visitor": "{\"scheme\":\"https\"}",
          "connection": "Keep-Alive",
          "content-length": "63",
          "content-type": "application/json",
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
          "x-real-ip": "212.18.104.164"
        },
        "cf": {
          "clientTcpRtt": 2,
          "requestHeaderNames": {},
          "httpProtocol": "HTTP/2",
          "tlsCipher": "AEAD-AES128-GCM-SHA256",
          "continent": "NA",
          "asn": 215540,
          "clientAcceptEncoding": "gzip, deflate, br",
          "verifiedBotCategory": "",
          "country": "US",
          "region": "Arizona",
          "tlsClientCiphersSha1": "sQ7eseNxgre8sddpKo+nF01osZc=",
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
          "tlsClientRandom": "HqfvAQPn7bPq9oiuAsUA7VRFmIBWuVgV5MfyRsbwiH8=",
          "tlsExportedAuthenticator": {
            "clientFinished": "e9915314b998def5e547a8acaa502e455adf5aa007c32f27f55d63dcd7e5fb2c",
            "clientHandshake": "8b0f4a44a54e2649cfb21165b59380283af59597db9121c2aec3aa7fec740a36",
            "serverHandshake": "d0aa2b70572adf6d272a961cd1df0fa91e81baf5fbeb6bfad9b49f10b5b946b2",
            "serverFinished": "4d1f35e29c05feddd7d8ae41bad7ce4ed8f9066c86e187d4f46476d98e02f009"
          },
          "tlsClientHelloLength": "842",
          "colo": "PHX",
          "timezone": "America/Phoenix",
          "longitude": "-112.07480",
          "latitude": "33.45320",
          "edgeRequestKeepAliveStatus": 1,
          "requestPriority": "weight=220;exclusive=1",
          "postalCode": "85036",
          "city": "Phoenix",
          "tlsVersion": "TLSv1.3",
          "regionCode": "AZ",
          "asOrganization": "Global Connectivity Solutions Llp",
          "metroCode": "753",
          "tlsClientExtensionsSha1Le": "flfef0Y/csL/WozO8G4oCreC8f4=",
          "tlsClientExtensionsSha1": "zf8mQud/fE1rNVJErozzAso7aXY="
        },
        "path": "/api/register"
      },
      "response": {
        "status": 500
      },
      "rayId": "934464cfdc38f00f",
      "executionModel": "stateless"
    },
    "scriptName": "liubaotea",
    "outcome": "ok",
    "eventType": "fetch",
    "diagnosticsChannelEvents": [],
    "scriptVersion": {
      "id": "36799f10-70f2-4513-a049-756e662cd564"
    },
    "truncated": false,
    "requestId": "934464cfdc38f00f",
    "cpuTimeMs": 0,
    "wallTimeMs": 659
  },
  "$metadata": {
    "id": "01JSEG8FKDWC0Q1H99A32HRTH2",
    "requestId": "934464cfdc38f00f",
    "trigger": "POST /api/register",
    "service": "liubaotea",
    "level": "error",
    "statusCode": 500,
    "error": "POST https://workers.liubaotea.online/api/register",
    "message": "POST https://workers.liubaotea.online/api/register",
    "url": "https://workers.liubaotea.online/api/register",
    "account": "a57fe1f5969031591b3c22307b96bf03",
    "provider": "cloudflare",
    "type": "cf-worker-event",
    "fingerprint": "c6548e7eafdcf817276e82211c3d514d",
    "origin": "fetch",
    "messageTemplate": "POST <URL>",
    "errorTemplate": "POST <URL>",
    "now": null
  },
  "links": []
}