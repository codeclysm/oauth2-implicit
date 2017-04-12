interface Params {
  scope?: string;
  type?: string;
  expires?: string;
  token?: string;
};

interface Options {
  authURI: string;
  logoutURI: string;
  clientID: string;
  redirectURI: string;
  scopes: Array<string>;
  params?: Params;
  cookieName?: string;
}

interface Token {
  scope: string;
  type: string;
  expires: Date;
  token: string;
}

class Oauth2 {
  private opts: Options;
  private _error: string;
  private _promise: Promise<Token>;
  private cbs: ((token: Token, error: string) => void)[] = []; // It's an array of callbacks

  constructor(opts: Options) {
    this.opts = this.defaults(opts);

    // Check cookie for authentication
    if (opts.cookieName && opts.cookieName !== '') {
      let value = this.getCookie(opts.cookieName);
      if (!value || value === 'false') {
        sessionStorage.removeItem('oauth_token');
      }
    }

    // Attempt to get the token from the url
    let token = this.getTokenFromHash(window.location, this.opts.params);
    if (token.token !== '') {
      this.putInSession(token);
      this.redirect();
      return;
    }

    // Save the current url in session (useful for redirecting back if there's an authentication)
    sessionStorage.setItem('oauth_redirect', window.location.href);

  };

  // Login initiates a redirect toward the authentication system
  login(): void {
    window.location.href = this.redirectURI();
  }

  logout(): void {
    sessionStorage.removeItem('oauth_token');
    window.location.href = this.logoutURI();
  }

  // redirectURI builds a redirect uri to get an implicit flow token
  redirectURI(): string {
    let redirectUri = encodeURIComponent(this.opts.redirectURI);
    let state = Math.random().toString(36).substr(2, 8);
    let scope = this.opts.scopes.join('%20');
    let uri = this.opts.authURI + '?client_id=' + this.opts.clientID + '&state=' + state + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirectUri;
    return uri;
  }

  // logoutURI builds a redirect uri to logout
  logoutURI(): string {
    let redirectUri = encodeURIComponent(this.opts.redirectURI);
    let uri = this.opts.logoutURI + '?redirect_uri=' + redirectUri;
    return uri;
  }

  token(): Promise<Token> {
    let token: Token;
    token = this.getFromSession();

    let now = new Date(Date.now() - 10 * 1000); // We consider stale token that expires in 10 seconds

    if (token && token.expires && token.expires > now) {
      return new Promise((resolve, reject) => resolve(token));
    }

    // If the token is expired refresh the promise
    if (token && token.expires && token.expires < now) {
      this._promise = null;
    }

    // if we're here it means that the token is stale or missing, we retrieve a new one
    if (!this._promise) {
      this.refresh();
    }

    return this._promise;
  }

  private redirect() {
    let redirectFrom = sessionStorage.getItem('oauth_redirect');
    if (redirectFrom) {
        sessionStorage.removeItem('oauth_redirect');
        window.location.href = redirectFrom;
    }
  }

  private refresh() {
    // Attempt to get the token from an iframe redirect
    this._promise = this.iframe(this.opts);

    // Refresh the token
    this._promise.then(token => {
      this.putInSession(token);
      for (let i in this.cbs) {
        this.cbs[i](token, '');
      }
    }).catch(error => {
      for (let i in this.cbs) {
        this.cbs[i](null, error);
      }
    });
  }

  // subscribe adds your callback to the list of callbacks called whenever there's a change in authentication
  private subscribe(cb: (token: Token, error: string) => void) {
    this.cbs.push(cb);
    this.token().then(token => {
      cb(token, '');
    }).catch(error => {
      cb(null, error);
    });
  }

  private defaults(opts: Options): Options {
    if (!opts.params) {
      opts.params = {};
    }
    if (!opts.params.token) {
      opts.params.token = 'access_token';
    }
    if (!opts.params.expires) {
      opts.params.expires = 'expires_in';
    }
    if (!opts.params.type) {
      opts.params.type = 'token_type';
    }
    if (!opts.params.scope) {
      opts.params.scope = 'scope';
    }
    if (!opts.authURI) {
      console.error('Oauth2: the property authURI is missing');
    }
    if (!opts.authURI) {
      console.error('Oauth2: the property authURI is missing');
    }
    return opts;
  }

  // iframe creates an iframe and redirects the iframe content to the oauth2 endpoint
  private iframe(opts): Promise<Token> {
    return new Promise((resolve, reject) => {
      let iframe = document.createElement('iframe');
      iframe.setAttribute('src', this.redirectURI());
      iframe.setAttribute('height', '0');
      iframe.setAttribute('width', '0');
      let getTokenFromHash = this.getTokenFromHash;
      iframe.onload = function () { // this is not an arrow function because we are accessing the frame window with this
        let token = getTokenFromHash(this.contentWindow.location, opts.params);
        document.body.removeChild(iframe);
        if (token.token === '') {
          reject('token not found');
        } else {
          resolve(token);
        }
      };
      iframe.onerror = function (error) {
        reject(error);
      };
      document.body.appendChild(iframe);
    });
  }

  // getTokenFromHash searches for the given param inside the location hash
  // the location hash is usually in the form #access_token=XYXYXY&expire=blabla
  private getTokenFromHash(location: Location, params: Params): Token {
    // getvalue extract a value from an array of "key=value" strings
    function getValue(vars: Array<string>, param: string): string {
      for (let i = 0; i < vars.length; i++) {
        let [name, value] = vars[i].split('=');
        if (name === param) {
          return value;
        }
      }
      return '';
    }

    let token = {
      token: '',
      scope: '',
      expires: new Date(0),
      type: ''
    };

    let hash: string;
    try {
      hash = location.hash.substring(1);
    } catch (e) {
      console.error('Oauth2: Get the hash from the location: ', e);
      return token;
    }
    let vars = hash.split('&');

    token.token = getValue(vars, params.token);
    let expires_in = parseInt(getValue(vars, params.expires));
    token.expires = new Date(Date.now() + expires_in * 1000);
    token.scope = getValue(vars, params.scope);
    token.type = getValue(vars, params.type);
    return token;
  }

  // getErrorFromQuery searches for an error param inside the location query
  private getErrorFromQuery(location: Location): string {
    // getvalue extract a value from an array of "key=value" strings
    function getValue(vars: Array<string>, param: string): string {
      for (let i = 0; i < vars.length; i++) {
        let [name, value] = vars[i].split('=');
        if (name === param) {
          return value;
        }
      }
      return '';
    }

    let hash: string;
    try {
      hash = location.search.substring(1);
    } catch (e) {
      console.error('Oauth2: Get the query from the location: ', e);
      return '';
    }
    let vars = hash.split('&');

    return getValue(vars, 'error');
  }

  private putInSession(token: Token): void {
    if (typeof token === 'object') {
      let value = JSON.stringify(token);
      sessionStorage.setItem('oauth_token', value);
    }
  }

  private getFromSession(): Token {
    let value = sessionStorage.getItem('oauth_token');
    try {
      let token = JSON.parse(value);
      token.expires = new Date(token.expires);
      return token;
    } catch (e) {
      return null;
    }
  }

  // getCookie return the value of a cookie
  private getCookie(name: string): string {
    let value = ' ' + document.cookie;
    let start = value.indexOf(' ' + name + '=');
    if (start === -1) {
      value = null;
    } else {
      start = value.indexOf('=', start) + 1;
      let end = value.indexOf(';', start);
      if (end === -1) {
        end = value.length;
      }
      value = decodeURI(value.substring(start, end));
    }
    return value;
  }

}
