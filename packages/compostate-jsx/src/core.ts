export {
  root,
  memo,
  createComponent,
} from './lib';
export {
  computation as effect,
} from 'compostate';

interface SharedConfigContext {
  id: string;
  count: number;
}

interface SharedConfig {
  context: SharedConfigContext;
}

export const sharedConfig: Partial<SharedConfig> = {};
export const getOwner = null;
