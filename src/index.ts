import { observable, action, runInAction, transaction } from 'mobx';

export type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD';
export interface ProviderParameter<TExtra = any> {
  url: string;
  method?: HTTPMethod;
  body?: object;
  query?: object;
  extraData?: TExtra;
}

export type AjaxProvider<TExtra = any> = (
  args: ProviderParameter<TExtra>
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
  provider: AjaxProvider<TExtra>
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
    return function wrap<T extends object>(target: T, name: string): any {
      class AjaxStoreImpl implements AjaxStore {
        @observable initial = true;
        @observable loading = false;
        @observable data = null;
        @observable error: Error | null;

        @action async fetch(params: object) {
          this.loading = true;

          try {
            const data = await provider({
              url,
              method,
              body: params,
              query: params,
              extraData
            });
            transaction(() => {
              this.data = data;
              this.initial = false;
              this.error = null;
              this.loading = false;
            });
            return data;
          } catch (e) {
            transaction(() => {
              this.loading = false;
              this.error = e;
            });
            throw e;
          }
        }

        @action reset() {
          runInAction(() => {
            this.initial = true;
            this.loading = false;
            this.data = null;
          });
        }
      }
      const instance = new AjaxStoreImpl();
      target[name] = instance;
      return instance;
    };
  };
}
