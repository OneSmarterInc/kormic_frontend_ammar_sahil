import { registerRootComponent } from 'expo';
import App from './src/App';
import { installKormicApiTransport } from './src/services/apiTransport';
import { API_BASE_URL } from './src/services/api';

installKormicApiTransport(API_BASE_URL);
registerRootComponent(App);
