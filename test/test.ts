import 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { observable, autorun, IReactionDisposer, toJS } from 'mobx';

import { createRequestDecorator, AjaxStore } from '../dist/src/index';
declare const global: any;
interface ITestStore {
  enterLoadingSpy: sinon.SinonSpy<any[], any>;
  leaveLoadingSpy: sinon.SinonSpy<any[], any>;
  requestField: AjaxStore;
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
      requestField: AjaxStore;

      constructor() {
        this.enterLoadingSpy = sinon.fake();
        this.leaveLoadingSpy = sinon.fake();
      }
    }
    store = new TestStore();
    disposeAutoRun = autorun(() => {
      if (store.requestField.initial) {
        return;
      }
      if (store.requestField.loading) {
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
    assert.equal(store.requestField.loading, false);
    await store.requestField.fetch();
    assert.equal(store.enterLoadingSpy.callCount, 1);
    assert.equal(store.leaveLoadingSpy.callCount, 1);
    assert.equal(store.requestField.loading, false);
    await store.requestField.fetch();
    assert.equal(store.enterLoadingSpy.callCount, 2);
    assert.equal(store.leaveLoadingSpy.callCount, 2);
  });

  it('Request data should actually pass to server, response body should not be correct', async () => {
    const requestParams = {
      lorem:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    };
    const data = await store.requestField.fetch(requestParams);
    assert.deepEqual(data.body, requestParams);
    assert.deepEqual(data, toJS(store.requestField.data));
    assert.equal(null, store.requestField.error);
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
      requestField: AjaxStore;

      constructor() {
        this.enterLoadingSpy = sinon.fake();
        this.leaveLoadingSpy = sinon.fake();
      }
    }
    store = new TestStore();
    disposeAutoRun = autorun(() => {
      if (store.requestField.initial) {
        return;
      }
      if (store.requestField.loading) {
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
      await store.requestField.fetch({ emitError: true });
      assert.fail();
    } catch (e) {
      assert.equal(e.message, ERROR_MESSAGE);
      assert.deepEqual(e, store.requestField.error);
    }
  });

  it('Subsequent success XHR will reset the error state', async () => {
    try {
      await store.requestField.fetch({ emitError: true });
      assert.fail();
    } catch {
      assert.isNotNull(store.requestField.error);
    }

    await store.requestField.fetch({ emitError: false });
    assert.isNull(store.requestField.error);
  });
});
