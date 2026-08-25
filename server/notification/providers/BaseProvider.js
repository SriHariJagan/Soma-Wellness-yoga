export class BaseProvider {
  constructor(config = {}) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract — extend it');
    }
    this.config = config;
    this._initialized = false;
  }

  async initialize() {
    throw new Error(`${this.constructor.name} must implement initialize()`);
  }

  async send(mailOptions) {
    throw new Error(`${this.constructor.name} must implement send()`);
  }

  async verify() {
    throw new Error(`${this.constructor.name} must implement verify()`);
  }

  getProviderName() {
    return this.constructor.name;
  }
}

export default BaseProvider;
