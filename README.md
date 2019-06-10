# StellarAuth API

## Access Urls
- **Pubnet:** https://api.stellarauth.com/auth
- **Testnet:** https://api-testnet.stellarauth.com/auth

## Get Auth Transaction XDR
**GET** https://api-testnet.stellarauth.com/auth
- `ttl=3600`
- `account=GC44PZG3GOPLEJK2XD4CD5EMPBDGGD4PEYDRDJYTJO7X2KBJRXGTYLER`
```json
RESPONSE = {
    "account": "GC44PZG3GOPLEJK2XD4CD5EMPBDGGD4PEYDRDJYTJO7X2KBJRXGTYLER",
    "transaction": "AAAAALnH5NsznrIlWrj4IfSMeEZjD48mBxGnE0u/fSgpjc08AAAAZAADvRIAAABOAAAAAQAAAABc/ozsAAAAAFz+mvwAAAADImGQosv7ohIEynqOZ33gBZpSWhRprvLVvVG3QeqyEooAAAABAAAAAQAAAADc4DaSVJ2Uqh+ZsvHMl3xWWV+lkfWk41JRJDfaJjR88AAAAAEAAAAAucfk2zOesiVauPgh9Ix4RmMPjyYHEacTS799KCmNzTwAAAAAAAAAAAAAAGQAAAAAAAAAASY0fPAAAABAEMmxuvp3z8q0H3Fsiz1do+bjNzOzKVdCX9jHG8sdh55SWACaDkQ1PHEapbqhWQyyG32YnjULKEirHRRmgGe0Ag==",
    "auth": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1NjAxOTMyOTIsImhhc2giOiIyNDQ1NzgzZWM4YTdlMmMzMjJkMzczMmQ5OWUzYjMwNGVmYmUyZjRlMDFkYWE1MmQzNzQ0N2FiZjc3NzhlNmVmIiwidG9rZW4iOiI3MWUxZDNhNDlhYWIzMDg5Y2Q3Mzk4MWExNzMyYzY3ODJhZGFiZWVmMDgxY2JkZGNjZjcyMWVhZTk4ZTY0OGE1MDQzNTA4ZGI4NzUyNGRhMmUyNjdkM2MwOTQzYWRiODU4OWY0MGE3MTUwMzE5ZmE5OTlhMDYxMDhlYTgwZjQzNCIsImlhdCI6MTU2MDE4NjA5N30.XcaGPX9rgS-LNLbNqP_qHDwZFqUolBl0bQuAHcNt9og"
}
```

## Verify Auth Transaction Hash
**GET** https://api-testnet.stellarauth.com/auth  
**HEADER** ``Authorization: `Bearer ${RESPONSE.auth}``

```json
// 404 Not yet verifed
{
  "type": "https://stellar.org/horizon-errors/not_found",
  "title": "Resource Missing",
  "status": 404,
  "detail": "The resource at the url requested was not found.  This is usually occurs for one of two reasons:  The url requested is not valid, or no data in our database could be found with the parameters provided.",
  "resource": "transaction"
}
```

```json
// 401 Token or transaction expired
{
  "message": "Login transaction has expired"
}
```

```json
// 200 Transaction valid and verified
{
  "memo": "ImGQosv7ohIEynqOZ33gBZpSWhRprvLVvVG3QeqyEoo=",
  "successful": true,
  "hash": "2445783ec8a7e2c322d3732d99e3b304efbe2f4e01daa52d37447abf7778e6ef",
  "ledger": 763970,
  "created_at": "2019-06-10T17:02:07Z",
  "source_account": "GC44PZG3GOPLEJK2XD4CD5EMPBDGGD4PEYDRDJYTJO7X2KBJRXGTYLER",
  "signatures": [
      "EMmxuvp3z8q0H3Fsiz1do+bjNzOzKVdCX9jHG8sdh55SWACaDkQ1PHEapbqhWQyyG32YnjULKEirHRRmgGe0Ag==",
      "2M0j7v3QBGcGpIVDX6BMkzGovBxmJVJeo2XbC75N9boR181G/FiFNUeOXFpxBE30XhYMRc05AGLb7g/VFqgaAw=="
  ],
  "valid_after": "2019-06-10T17:01:32Z",
  "valid_before": "2019-06-10T18:01:32Z"
}
```