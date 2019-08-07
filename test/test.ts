import 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { observable, autorun, IReactionDisposer, toJS } from 'mobx';

import { createRequestDecorator, AjaxStore } from '../dist/';
declare const global: any;
interface ITestStore {
  enterLoadingSpy: sinon.SinonSpy<any[], any>;
  leaveLoadingSpy: sinon.SinonSpy<any[], any>;
  requestField1: AjaxStore;
}

const ERROR_MESSAGE = 'No storm in our love';

describe('Test success XHR request', () => {
  let server: sinon.SinonFakeServer;

  let store: ITestStore;

  let disposeAutoRun: IReactionDisposer;

  beforeEach(() => {
    const asRequest = createRequestDecorator(
      ({ url, method, body, extraData }) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              url,
              body,
              method
            });
          }, 10);
        });
      }
    );

    class TestStore implements ITestStore {
      @observable
      enterLoadingSpy: sinon.SinonSpy<any[], any>;

      @observable
      leaveLoadingSpy: sinon.SinonSpy<any[], any>;

      @asRequest({ url: 'path/to/your/heart', method: 'GET' })
      requestField1: AjaxStore;

      constructor() {
        this.enterLoadingSpy = sinon.fake();
        this.leaveLoadingSpy = sinon.fake();
      }
    }
    store = new TestStore();
    disposeAutoRun = autorun(() => {
      if (store.requestField1.initial) {
        return;
      }
      if (store.requestField1.loading) {
        store.enterLoadingSpy();
      } else {
        store.leaveLoadingSpy();
      }
    });
  });

  afterEach(() => {
    disposeAutoRun();
  });

  it('Loading state should become false -> true -> false', async () => {
    assert.equal(store.requestField1.loading, false);
    await store.requestField1.fetch();
    assert.equal(store.enterLoadingSpy.callCount, 1);
    assert.equal(store.leaveLoadingSpy.callCount, 1);
    assert.equal(store.requestField1.loading, false);
    await store.requestField1.fetch();
    assert.equal(store.enterLoadingSpy.callCount, 2);
    assert.equal(store.leaveLoadingSpy.callCount, 2);
  });

  it('Request data should actually pass to server, response body should not be correct', async () => {
    const requestParams = {
      lorem:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    };
    const data = await store.requestField1.fetch(requestParams);
    assert.deepEqual(data.body, requestParams);
    assert.deepEqual(data, toJS(store.requestField1.data));
    assert.equal(null, store.requestField1.error);
  });
});

describe('Failed XHR request', () => {
  let store: ITestStore;
  let disposeAutoRun: IReactionDisposer;

  beforeEach(() => {
    const asRequest = createRequestDecorator(
      ({ url, method, body = { emitError: true }, extraData }) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if ((body as any).emitError) {
              reject(new Error(ERROR_MESSAGE));
              return;
            }

            resolve();
          }, 10);
        });
      }
    );

    class TestStore implements ITestStore {
      @observable
      enterLoadingSpy: sinon.SinonSpy<any[], any>;

      @observable
      leaveLoadingSpy: sinon.SinonSpy<any[], any>;

      @asRequest({ url: 'path/to/your/heart', method: 'GET' })
      requestField1: AjaxStore;

      constructor() {
        this.enterLoadingSpy = sinon.fake();
        this.leaveLoadingSpy = sinon.fake();
      }
    }
    store = new TestStore();
    disposeAutoRun = autorun(() => {
      if (store.requestField1.initial) {
        return;
      }
      if (store.requestField1.loading) {
        store.enterLoadingSpy();
      } else {
        store.leaveLoadingSpy();
      }
    });
  });

  afterEach(() => {
    disposeAutoRun();
  });

  it('XHR with error should be rejected', async () => {
    try {
      await store.requestField1.fetch({ emitError: true });
      assert.fail();
    } catch (e) {
      assert.equal(e.message, ERROR_MESSAGE);
      assert.deepEqual(e, store.requestField1.error);
    }
  });

  it('Subsequent success XHR will reset the error state', async () => {
    try {
      await store.requestField1.fetch({ emitError: true });
      assert.fail();
    } catch {
      assert.isNotNull(store.requestField1.error);
    }

    await store.requestField1.fetch({ emitError: false });
    assert.isNull(store.requestField1.error);
  });
});

describe('Test reset request store', () => {
  it("Store's data should be null and stores initial should be ture after reset", async () => {
    const asRequest = createRequestDecorator(
      ({ url, method, body, extraData }) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              url,
              body,
              method
            });
          }, 10);
        });
      }
    );

    class TestStore implements ITestStore {
      @observable
      enterLoadingSpy: sinon.SinonSpy<any[], any>;

      @observable
      leaveLoadingSpy: sinon.SinonSpy<any[], any>;

      @asRequest({ url: 'path/to/your/heart', method: 'GET' })
      requestField1: AjaxStore;

      constructor() {
        this.enterLoadingSpy = sinon.fake();
        this.leaveLoadingSpy = sinon.fake();
      }
    }
    const store = new TestStore();

    await store.requestField1.fetch({ lorem: 'Lorem' });
    assert.isNotNull(store.requestField1.data);
    assert.isFalse(store.requestField1.initial);
    store.requestField1.reset();
    assert.isNull(store.requestField1.data);
    assert.isTrue(store.requestField1.initial);
  });
});

describe('Test multiple store', () => {
  it('Different store instance has different field ref', async () => {
    const asRequest = createRequestDecorator(
      ({ url, method, body, extraData }) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              url,
              body,
              method
            });
          }, 10);
        });
      }
    );

    class TestStore implements ITestStore {
      @observable
      enterLoadingSpy: sinon.SinonSpy<any[], any>;

      @observable
      leaveLoadingSpy: sinon.SinonSpy<any[], any>;

      @asRequest({ url: 'path/to/your/heart', method: 'GET' })
      requestField1: AjaxStore;

      @asRequest({ url: 'path/to/your/heart', method: 'GET' })
      requestField2: AjaxStore;

      constructor() {
        this.enterLoadingSpy = sinon.fake();
        this.leaveLoadingSpy = sinon.fake();
      }
    }
    const store1 = new TestStore();
    const store2 = new TestStore();

    await store1.requestField1.fetch({ lorem: 'Lorem' });
    assert.isTrue(store1.requestField1 !== store2.requestField1);
    assert.isTrue(store1.requestField1 !== store1.requestField2);
  });
});
