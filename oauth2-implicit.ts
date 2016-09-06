interface InitOptions {
  paramName?: string;
}

class Oauth2 {
  private cachedToken: string;
  private token: Promise<string>;
  constructor(opts: InitOptions) {
    opts = defaults(opts)
    let token = getTokenFromHash(window.location, opts.paramName);
    if (token !== '') {
      this.cachedToken = token;
      this.token = new Promise((resolve, reject) => resolve(this.cachedToken));
      return;
    }
    this.token = new Promise((resolve, reject) => reject('token not found'));
  };
}

function defaults(opts: InitOptions): InitOptions {
  if (!opts.paramName) {
    opts.paramName = 'access_token';
  }
  return opts;
}

// getTokenFromHash searches for the given param inside the location hash
// the location hash is usually in the form #access_token=XYXYXY&expire=blabla
function getTokenFromHash(location: Location, param: string): string {
  let hash = location.hash.substring(1);
  let vars = hash.split('&');

  for (let i = 0; i < vars.length; i++) {
    let [name, value] = vars[i].split('=');
    if (name === param) {
      return value;
    }
  }

  return '';
}