import WebSocket from "ws";
import URLApiBase from "./url";
export default class WebsocketApi extends URLApiBase {
  public constructor(baseURL: URL | string, token: string) {
    super(baseURL);
    this.token = token;
    this.conn = new WebSocket(this.makeEndpoint("socket/websocket"));
    this.connInit();
  }
  // Base
  private conn: WebSocket;
  public get status() {
    if (this.conn.readyState > 1) {
      return "error";
    }
    if (this.conn.readyState === 1) {
      return this.authStat ? "ready" : "prepare";
    }
    return "prepare";
  }
  public get waitTillReady() {
    return new Promise<void>((s, j) => {
      const tmp = setInterval(() => {
        if (this.status === "error") {
          clearInterval(tmp);
          j();
        }
        if (this.status === "ready") {
          clearInterval(tmp);
          s();
        }
      });
    });
  }
  private connInit() {
    this.conn.onopen = () => {
      this.startAuth();
    };
    this.conn.onerror = (ev) => {
      throw new Error(`Connect closed on error ${ev.message}`);
    };
    this.conn.onmessage = (ev) => {
      this.handleData(ev.data.toString());
    };
  }
  public close() {
    this.conn.close();
  }
  // Auth
  public readonly token: string;
  private authStat: boolean = false;
  private startAuth() {
    this.conn.send(`auth ${this.token}`);
  }
  private onAuthFinnsh(sucess: boolean) {
    if (!sucess) {
      this.close();
      throw new Error("Auth failed");
    } else {
      this.authStat = true;
    }
  }
  // Data Manage
  // A queue of once requests waiting for data
  private onceQueue: {
    name: string;
    handler: { (data: any): void };
  }[] = [];
  // A map of endpoints are listened
  private listenMap: Map<
    string,
    {
      current: any;
      callback: { (next: any, change: any, last: any): void };
    }
  > = new Map();
  private handleData(data: string) {
    if (data.startsWith("[") && data.endsWith("]")) {
      // Object data(data for subscribed endpoints)
      const tmp = JSON.parse(data);
      if (tmp.length == 2) {
        let used = false;
        const matchI = this.onceQueue.findIndex((v) => v.name == tmp[0]);
        if (matchI != -1) {
          // Match one time asks
          const match = this.onceQueue[matchI];
          match.handler(tmp[1]);
          this.onceQueue.splice(matchI, 1);
          used = true;
        }
        if (this.listenMap.has(tmp[0])) {
          // Match listeners
          const curr = this.listenMap.get(tmp[0]) as {
            current: any;
            callback: (next: any, change: any, last: any) => boolean;
          };
          const last = curr.current;
          const next = this.mergeData(JSON.parse(JSON.stringify(last)), tmp[1]);
          curr.callback(next, tmp[1], last);
          this.listenMap.set(tmp[0], {
            current: next,
            callback: curr.callback,
          });
          used = true;
        }
        if (!used) {
          // If data from unsubscribed endpoints
          this.unsubscribe(tmp[0]);
          throw new Error(`Recive unexpacted data from endpoint ${tmp[0]}`);
        }
      } else {
        // Unknow format
        throw new Error(`Recive unformat data ${data}`);
      }
    } else {
      // Auth messages
      if (data.startsWith("auth ok")) {
        this.onAuthFinnsh(true);
      }
      if (data.startsWith("auth failed")) {
        this.onAuthFinnsh(false);
      }
    }
  }
  private mergeData(last: any, change: any) {
    // Merge stored data with recived changes for listeners
    for (const i in change) {
      if (typeof change[i] !== "object") {
        // If is normal value, replace the old one
        last[i] = change[i];
      } else if (change[i] === null) {
        // If recived null, delete this node
        delete last[i];
      } else {
        // If is object, recursion on child's
        if (!(i in last)) {
          last[i] = {};
        }
        this.mergeData(last[i], change[i]);
      }
    }
    return last;
  }
  private subscribe(name: string) {
    this.conn.send(`subscribe ${name}`);
  }
  private unsubscribe(name: string) {
    this.conn.send(`unsubscribe ${name}`);
  }
  public rawOnce(name: string, timeout?: number) {
    return new Promise<any>((res, rej) => {
      const toutRun =
        timeout !== undefined
          ? () => {
              this.unsubscribe(name);
              rej("Timeout!");
            }
          : () => null;
      let tout = setTimeout(toutRun, timeout);
      this.onceQueue.push({
        name: name,
        handler: (data) => {
          this.unsubscribe(name);
          clearTimeout(tout);
          res(data);
        },
      });
      this.subscribe(name);
    });
  }
  public rawListen(
    name: string,
    cb: { (next: any, change: any, last: any, error: boolean): void },
    timeout?: number
  ) {
    const sc = this.listenMap.get(name)?.current;
    const toutRun =
      timeout !== undefined
        ? () => {
            cb(undefined, undefined, undefined, true);
            this.rawUnlisten(name);
          }
        : () => null;
    const getTout = () => setTimeout(toutRun, timeout);
    let tout = getTout();
    this.listenMap.set(name, {
      current: sc === undefined ? {} : sc,
      callback: (n, c, l) => {
        cb(n, c, l, false);
        clearTimeout(tout);
        tout = getTout();
      },
    });
    this.subscribe(name);
  }
  public rawUnlisten(name: string) {
    if (this.listenMap.delete(name)) {
      this.unsubscribe(name);
    }
  }
}
