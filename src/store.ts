type Listener<T> = (value: T) => void;

export interface Store<T extends { [key: string]: any }> {
  get(): T;
  set(partialValue: Partial<T>): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T extends { [key: string]: any }>(
  init: (set: Store<T>['set'], get: Store<T>['get']) => T
): Store<T> {
  let value: T;

  let running = false;
  let keepGoing = true;
  let nextValue: null | Partial<T> = null;

  let hasEmpty = false;
  const slots: { ref: Listener<T> | null }[] = [];

  function clean() {
    if (hasEmpty) {
      hasEmpty = false;
      let lazy = 0;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].ref) {
          slots[lazy++] = slots[i];
        }
      }
      slots.length = lazy;
    }
  }

  function get() {
    return value;
  }

  function set(newValue: Partial<T>) {
    if (!Object.keys(newValue).length) {
      return;
    }

    nextValue =
      nextValue === null ? newValue : Object.assign({}, nextValue, newValue);
    if (running) {
      keepGoing = false;
      return;
    }

    running = true;
    while (nextValue) {
      value = Object.assign({}, value, nextValue);
      nextValue = null;
      clean();
      const length = slots.length;
      for (let i = 0; keepGoing && i < length; i++) {
        slots[i].ref?.(value);
      }
      keepGoing = true;
    }
    running = false;
  }

  function subscribe(listener: Listener<T>) {
    if (!running) {
      clean();
    }
    const slot: (typeof slots)['0'] = { ref: listener };
    slots.push(slot);
    return function unsubscribe() {
      hasEmpty = true;
      slot.ref = null;
    };
  }

  value = init(set, get);

  return {
    get,
    set,
    subscribe,
  };
}
