import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DeskErrorBoundary } from './components/DeskErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <DeskErrorBoundary>
    <App />
  </DeskErrorBoundary>
);
