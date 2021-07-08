import { render } from 'preact';
import App from './App';
import App2 from './App2';
import App3 from './App3';

render(
  <>
    <App />
    <App2 />
    <App3 />
  </>, document.getElementById('app')!);
