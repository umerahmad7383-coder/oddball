import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initCosmetics } from '../../../platform/client/cosmetics.js';
import './styles.css';

initCosmetics();

createRoot(document.getElementById('root')).render(<App />);
