# screeps-all-api
## Http Api
### HttpScreepsApi.raw
#### Example
```javescript
const token = "Your Token Here"
const baseURL = "https://screeps.com"
async function getAccountId() {
  return (await new HttpScreepsApi(baseURL, token).raw("GET", "/api/auth/me"))._id
}
getAccountId().then(console.log)
// This code will print your account id on console
```
### HttpScreepsApi.authByPW
#### Example
```javescript
const baseURL = "https://screeps.com"
async function getAccountId() {
  const token = await HttpScreepsApi.authByPW("Your username/email","Your password", "https://screeps.com")
  return (await new HttpScreepsApi(baseURL, token).raw("GET", "/api/auth/me"))._id
}
getAccountId().then(console.log)
// This code will print your account id on console
```
## WebSocket Api
### WSScreepsApi.rawOnce
#### Example
```javescript
const baseURL = "wss://screeps.com"
const baseURL2 = "https://screeps.com"
const token = "Your Token Here"
async function getAccountId() {
  const id = (await new HttpScreepsApi(baseURL2, token).raw("GET", "/api/auth/me"))._id
  const wsApi = new WSScreepsApi(baseURL, token)
  await wsApi.waitTillReady
  return (await wsApi.rawOnce(`user:${id}/cpu`)).cpu
}
getAccountId().then(console.log)
// This code will print your cpu usage for last game tick
```
### WSScreepsApi.rawListen && WSScreepsApi.rawUnlisten
#### Example
```javescript
const baseURL = "wss://screeps.com"
const baseURL2 = "https://screeps.com"
const token = "Your Token Here"
async function getAccountId() {
  const id = (await new HttpScreepsApi(baseURL2, token).raw("GET", "/api/auth/me"))._id
  const wsApi = new WSScreepsApi(baseURL, token)
  await wsApi.waitTillReady
  let cnt = 0
  wsApi.rawListen(`user:${id}/cpu`, (curr) => {
    console.log(curr)
    cnt++
    if(cnt === 5) {
        wsApi.rawUnlisten(`user:${id}/cpu`)
    }
  })
}
getAccountId().then(console.log)
// This code will print your cpu usage for last game tick five times
```