interface Params {
  scope?: string;
  type?: string;
  expires?: string;
  token?: string;
};

interface Options {
  authURI: string;
  clientID: string;
  redirectURI: string;
  scopes: Array<string>;
  params?: Params;
}

interface Token {
  scope: string;
  type: string;
  expires: number;
  token: string;
}

class Oauth2 {
  private opts: Options;
  private _token: Token;
  private _error: string;
  private _promise: Promise<Token>;
  private cbs: ((token: Token, error: string) => void)[] = []; // It's an array of callbacks

  constructor(opts: Options) {
    this.opts = this.defaults(opts);
  };

  // redirectURI builds a redirect uri to get an implicit flow token
  redirectURI(): string {
    let redirectUri = encodeURIComponent(this.opts.redirectURI);
    let state = Math.random().toString(36).substr(2, 8);
    let scope = this.opts.scopes.join('%20');
    let uri = this.opts.authURI + '?client_id=' + this.opts.clientID + '&state=' + state + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirectUri;
    return uri;
  }

  private token(): Promise<Token> {
    if (this._token && this._token.token !== '') {
      return new Promise((resolve, reject) => resolve(this._token));
    }

    // Attempt to get the token from the url
    let token = this.getTokenFromHash(window.location, this.opts.params);
    if (token.token !== '') {
      this._token = token;
      return this.token();
    }

    // Attempt to get an error from the url
    let error = this.getErrorFromQuery(window.location);
    if (error) {
      return new Promise((resolve, reject) => reject(error));
    }

    if (!this._promise) {
      this.refresh();
    }

    return this._promise;
  }

  private refresh() {
    // Attempt to get the token from an iframe redirect
    this._promise = this.redirect(this.opts);

    // Refresh the token
    this._promise.then(token => {
      this._token = token;
      for (let i in this.cbs) {
        this.cbs[i](token, '');
      }
      window.setTimeout(this.refresh.bind(this), (token.expires - 5) * 1000);
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

  // redirect creates an iframe and redirects the iframe content to the oauth2 endpoint
  private redirect(opts): Promise<Token> {
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
      expires: 0,
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
    token.expires = parseInt(getValue(vars, params.expires));
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

}
