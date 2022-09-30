export default class URLApiBase {
  constructor(base: URL | string) {
    if (typeof base === "string") {
      this.baseURL = new URL(base);
    } else {
      this.baseURL = base;
    }
  }
  // URL
  private baseURL: URL;
  public makeEndpoint(path: string) {
    return new URL(path, this.baseURL);
  }
}
