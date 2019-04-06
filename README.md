# Mobx Ajax Util
[![codecov](https://codecov.io/gh/tuia-fed/mobx-ajax-util/branch/master/graph/badge.svg)](https://codecov.io/gh/tuia-fed/mobx-ajax-util)
[![Build Status](https://travis-ci.com/tuia-fed/mobx-ajax-util.svg?branch=master)](https://travis-ci.com/tuia-fed/mobx-ajax-util)
> Make it easy to handle Ajax request with loading status.

While we establishing an Ajax request, often we also need an observable `loading` state for Ajax request loading status.

For example, when a form's submit button click, it should show an loading spinning, and disabled sequence click before ajax finished.

This utility can help you easy to create an ajax request with loading state on mobx

## install

```shell
yarn add mobx-ajax-util
# or use npm
npm install --save mobx-ajax-util
```

## usage

```jsx
// first, import it.
import { createRequestDecorator } from 'mobx-ajax-util';

// then, create an decorator with an AjaxProvider
// A provide should return an promise which include ajax response data. You can use axios, fetch, or etc.
const asRequest = createRequestDecorator(({ url, query, body, method }) => {
  return axios({
    url: url,
    method,
    data: body
  });
});

// The store in your code.
class SomeStore {
  // other code.
  // ....

  // put the url and method to `asRequest`
  @asRequest({ url: 'path/to/your/resource', method: 'POST' })
  userListStore;

  // ....
}

const store = new SomeStore();

// There are four observable in store.userListStore
store.userListStore.initial; // is in initial state
store.userListStore.loading; // is loading state
store.userListStore.error; // the Ajax error, null when request is success
store.userListStore.data; // the response data. null when success

// and two method
store.userListStore.fetch(params); //  invoke it for fetching the data. the first parameter is the request body or url query(it depends on the HTTP method)
store.userListStore.reset(); // reset the userListStore
```

## example

```jsx
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { observer } from 'mobx-react';
import { createRequestDecorator, AjaxStore } from 'mobx-ajax-util';
import axios from 'axios';
import * as queryString from 'query-string';

const asRequest = createRequestDecorator(({ url, query, body, method }) => {
  query && (url += queryString.stringify(query));
  return axios({
    url: url,
    method,
    data: body
  });
});

class FancyStore {
  /**
   * @type{AjaxStore}
   */
  @asRequest({ url: 'https://api.github.com', method: 'GET' })
  userListStore;
}

const store = new FancyStore();

@observer
class App extends React.Component {
  componentDidMount() {}
  render() {
    console.log('initial is', store.userListStore.initial);
    console.log('loading is', store.userListStore.loading);
    return (
      <div>
        <button onClick={() => store.userListStore.fetch({ name: 'foo' })}>
          Load it!
        </button>
        <button onClick={() => store.userListStore.reset()}>Reset</button>
        <div>{store.userListStore.loading && 'loading'}</div>
        <div>
          {store.userListStore.data && store.userListStore.data.data.user_url}
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
```

## API document
### `createRequestDecorator`
Create a decorator, when decorating a filed with it, the field will be an ajax store.

pass an function as the only parameter. Which receive HTTP request config, and return a promise object representing the Ajax.

``` ts
export interface AdapterParameter<TExtra = any> {
    url: string;
    method?: HTTPMethod;
    body?: object;
    query?: object;
    extraData?: TExtra;
}
export declare type AjaxAdapter<TExtra = any> = (args: AdapterParameter<TExtra>) => Promise<any>;

export declare function createRequestDecorator<TExtra = any>(adapter: AjaxAdapter<TExtra>): ({ url, method, extraData }: {
    url: string;
    method: HTTPMethod;
    extraData?: any;
}) => <T extends object>(target: T, name: string) => any
```

### AjaxStore
AjaxStore is just an interface. in some reason, the type of an decorator's return value must be `any`.

This interface can implicit the type of decorated field when you use TypeScript or JSDoc.

``` ts
export interface AjaxStore<TParam = any, TData = any> {
    initial: boolean;
    loading: boolean;
    data: null | TData;
    error: Error | null;
    reset: () => void;
    fetch: (params?: TParam) => Promise<TData>;
}
```

## Unit test
Ensure your node environment support ES2018's`Promise.prototype.catch`

``` sh
yarn test
```
