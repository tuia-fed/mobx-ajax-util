import { observable, action, runInAction } from 'mobx';
import * as nanoId from 'nano-id';

export type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD';
export interface AdapterParameter<TExtra = any> {
  url: string;
  method?: HTTPMethod;
  body?: object;
  query?: object;
  extraData?: TExtra;
}

export type AjaxAdapter<TExtra = any> = (
  args: AdapterParameter<TExtra>
) => Promise<any>;

export interface AjaxStore<TParam = any, TData = any> {
  initial: boolean;
  loading: boolean;
  data: null | TData;
  error: Error | null;
  reset: () => void;
  fetch: (params?: TParam) => Promise<TData>;
}

export function createRequestDecorator<TExtra = any>(
  adapter: AjaxAdapter<TExtra>
) {
  return function asRequest({
    url,
    method = 'GET',
    extraData
  }: {
    url: string;
    method: HTTPMethod;
    extraData?: any;
  }) {
    return function wrap(target: any, name: string): any {
      class AjaxStoreImpl implements AjaxStore {
        @observable initial = true;
        @observable loading = false;
        @observable data = null;
        @observable error: Error | null = null;

        @action.bound fetch(params: object) {
          this.loading = true;
          return adapter({
            url,
            method,
            body: params,
            query: params,
            extraData
          })
            .then(data => {
              runInAction(() => {
                this.data = data;
                this.initial = false;
                this.error = null;
              });
              return data;
            })
            .catch(e => {
              runInAction(() => {
                this.error = e;
              });
              throw e;
            })
            .finally(() => {
              runInAction(() => {
                this.loading = false;
              });
            });
        }

        @action.bound reset() {
          runInAction(() => {
            this.initial = true;
            this.loading = false;
            this.data = null;
          });
        }
      }

      const storeFieldSymbol = Symbol(name);

      Object.defineProperty(target, name, {
        get: function() {
          if (!this[storeFieldSymbol]) {
            this[storeFieldSymbol] = new AjaxStoreImpl();
          }
          return this[storeFieldSymbol];
        }
      });
    };
  };
}
