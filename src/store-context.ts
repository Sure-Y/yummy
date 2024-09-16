import { Store, createStore } from './store';
import {
  createElement,
  createContext,
  useContext,
  Context,
  memo,
  FunctionComponent,
  ReactNode,
  useMemo,
} from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

export interface StoreContext<T extends { [key: string]: any }> {
  context: Context<Store<T>>;
  Provider: FunctionComponent<{ children: ReactNode; value?: Partial<T> }>;
}

export function createStoreContext<T extends { [key: string]: any }>(
  init: Parameters<typeof createStore<T>>[0]
): StoreContext<T> {
  const context = createContext(createStore(init));
  return {
    context,
    Provider: memo(
      function Provider({ children, value }) {
        const store = useMemo(() => {
          const ret = createStore(init);
          if (value) {
            ret.set(value);
          }
          return ret;
        }, []);
        return createElement(context.Provider, {
          value: store,
          children,
        });
      },
      (p, n) => p.children === n.children
    ),
  };
}

export function useStoreContext<T extends { [key: string]: any }>(
  StoreContext: StoreContext<T>
): T;
export function useStoreContext<T extends { [key: string]: any }, P>(
  StoreContext: StoreContext<T>,
  selector: (state: T) => P,
  isEqual?: (prev: P, next: P) => boolean
): P;
export function useStoreContext<T extends { [key: string]: any }, P>(
  StoreContext: StoreContext<T>,
  selector?: (state: T) => P,
  isEqual?: (prev: P, next: P) => boolean
) {
  const store = useContext(StoreContext.context);
  const { subscribe, getSnapshot } = useMemo(() => {
    const subscribe: Parameters<typeof useSyncExternalStore<T>>[0] = (
      listener
    ) => {
      return store.subscribe(listener);
    };

    let getSnapshot: Parameters<typeof useSyncExternalStore<T | P>>[1];
    if (selector) {
      if (isEqual) {
        let current = selector(store.get());
        getSnapshot = () => {
          const latest = selector(store.get());
          if (!isEqual(current, latest)) {
            current = latest;
          }
          return current;
        };
      } else {
        getSnapshot = () => selector(store.get());
      }
    } else {
      getSnapshot = () => store.get();
    }

    return { subscribe, getSnapshot };
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot);
}
