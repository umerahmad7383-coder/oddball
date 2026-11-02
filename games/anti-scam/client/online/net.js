/* Anti-Scam Arcade uses the platform's shared connection layer on its own endpoint. */
import { Net, getSid, wsUrl as platformWsUrl } from '../../../../platform/client/net.js';

export { Net, getSid };
export const wsUrl = () => platformWsUrl('anti-scam');
