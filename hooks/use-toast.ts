'use client';

// Inspired by react-hot-toast library
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

// Configuration constants
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

// Types
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Toast = Omit<ToasterToast, 'id'>;

// Action types as const enum for better type safety
const ActionType = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

type Action =
  | {
      type: typeof ActionType.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: typeof ActionType.UPDATE_TOAST;
      toast: Partial<ToasterToast> & { id: string };
    }
  | {
      type: typeof ActionType.DISMISS_TOAST;
      toastId?: string;
    }
  | {
      type: typeof ActionType.REMOVE_TOAST;
      toastId?: string;
    };

interface State {
  toasts: ToasterToast[];
}

// Use a more efficient ID generation
let count = 0;
const genId = () => `toast-${Date.now()}-${count++ % 10000}`;

// Create a singleton toast store
class ToastStore {
  private listeners: Set<(state: State) => void> = new Set();
  private state: State = { toasts: [] };
  private toastTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Bind methods
    this.dispatch = this.dispatch.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.getState = this.getState.bind(this);
  }

  getState(): State {
    return this.state;
  }

  subscribe(listener: (state: State) => void) {
    this.listeners.add(listener);
    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener: (state: State) => void) {
    this.listeners.delete(listener);
  }

  dispatch(action: Action) {
    this.state = this.reducer(this.state, action);
    this.listeners.forEach((listener) => listener(this.state));
  }

  private addToRemoveQueue(toastId: string) {
    if (this.toastTimeouts.has(toastId)) {
      return;
    }

    const timeout = setTimeout(() => {
      this.toastTimeouts.delete(toastId);
      this.dispatch({
        type: ActionType.REMOVE_TOAST,
        toastId: toastId,
      });
    }, TOAST_REMOVE_DELAY);

    this.toastTimeouts.set(toastId, timeout);
  }

  private reducer(state: State, action: Action): State {
    switch (action.type) {
      case ActionType.ADD_TOAST:
        return {
          ...state,
          toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
        };

      case ActionType.UPDATE_TOAST:
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === action.toast.id ? { ...t, ...action.toast } : t
          ),
        };

      case ActionType.DISMISS_TOAST: {
        const { toastId } = action;

        // Side effects
        if (toastId) {
          this.addToRemoveQueue(toastId);
        } else {
          state.toasts.forEach((toast) => {
            this.addToRemoveQueue(toast.id);
          });
        }

        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId || toastId === undefined
              ? {
                  ...t,
                  open: false,
                }
              : t
          ),
        };
      }
      case ActionType.REMOVE_TOAST:
        if (action.toastId === undefined) {
          return {
            ...state,
            toasts: [],
          };
        }
        return {
          ...state,
          toasts: state.toasts.filter((t) => t.id !== action.toastId),
        };
    }
  }

  // Toast API methods
  toast(props: Toast) {
    const id = genId();

    const update = (props: Partial<ToasterToast>) =>
      this.dispatch({
        type: ActionType.UPDATE_TOAST,
        toast: { ...props, id },
      });

    const dismiss = () => this.dispatch({ type: ActionType.DISMISS_TOAST, toastId: id });

    this.dispatch({
      type: ActionType.ADD_TOAST,
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss();
        },
      },
    });

    return {
      id,
      dismiss,
      update,
    };
  }

  dismiss(toastId?: string) {
    this.dispatch({ type: ActionType.DISMISS_TOAST, toastId });
  }
}

// Create singleton instance
const toastStore = new ToastStore();

// External API
function toast(props: Toast) {
  return toastStore.toast(props);
}

function useToast() {
  const [state, setState] = useState<State>(toastStore.getState());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(setState);
    return unsubscribe;
  }, []);

  const api = useMemo(
    () => ({
      ...state,
      toast,
      dismiss: useCallback((toastId?: string) => toastStore.dismiss(toastId), []),
    }),
    [state]
  );

  return api;
}

export { useToast, toast };
