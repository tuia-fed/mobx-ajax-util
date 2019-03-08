import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { observer } from 'mobx-react';
import { createRequestDecorator, AjaxStore } from '../src/index';
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
  @asRequest({ url: 'https://api.github.com', method: 'GET' })
  userListStore: AjaxStore;
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
