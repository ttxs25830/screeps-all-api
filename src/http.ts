import URLApiBase from "./url";

export default class HttpApi extends URLApiBase {
  public constructor(baseURL: URL | string, token: string) {
    super(baseURL);
    this.token = token;
  }
  // Auth
  public readonly token: string;
  public static authByPW(
    username: string,
    password: string,
    base: URL | string
  ) {
    return new Promise<string>((res, rej) => {
      fetch(new URLApiBase(base).makeEndpoint("/api/auth/signin"), {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33",
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          email: username,
          password: password,
        }),
      }).then((response) => {
        if (response.ok) {
          response.json().then((v) => {
            res(v.token);
          });
        } else {
          rej(`Password auth failed with status ${response.status}`);
        }
      });
    });
  }
  // Raw Api
  private makeBody(method: "GET" | "POST", data: { [index: string]: string }) {
    if (method == "GET") {
      return new URLSearchParams(data);
    } else {
      return JSON.stringify(data);
    }
  }
  private makeHead(method: "GET" | "POST") {
    let head: any = {};
    head["X-Token"] = this.token;
    if (method === "POST") {
      head["Content-Type"] = "application/json;charset=UTF-8";
    }
    return head;
  }
  public raw(
    method: "GET" | "POST",
    path: string,
    payload?: Record<string, string>
  ): Promise<any> {
    return new Promise((res, rej) => {
      fetch(this.makeEndpoint(path), {
        method: method,
        headers: this.makeHead(method),
        body: payload ? this.makeBody(method, payload) : undefined,
      }).then((response) => {
        if (response.ok) {
          response.json().then((v) => {
            res(v);
          });
        } else {
          rej(
            `Request ${path}(${method}) failed with status ${response.status}`
          );
        }
      });
    });
  }
  // Apis
  public get me() {
    return this.raw("GET", "/api/auth/me") as Promise<{
      _id: string;
      email: string;
      username: string;
      cpu: number;
      badge: {
        type: number;
        color1: string;
        color2: string;
        color3: string;
        param: number;
        flip: boolean;
      };
    }>;
  }
}
