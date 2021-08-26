export {
  root,
  effect,
  memo,
  createComponent,
} from './lib';

interface SharedConfigContext {
  id: string;
  count: number;
}

interface SharedConfig {
  context: SharedConfigContext;
}

export const sharedConfig: Partial<SharedConfig> = {};
export const getOwner = null;
