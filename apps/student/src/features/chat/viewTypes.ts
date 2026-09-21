import { AriaChatProps } from './types';
import { AriaChatController } from './useAriaChat';

export type ChatViewState = AriaChatController & Pick<AriaChatProps, 'session'>;
