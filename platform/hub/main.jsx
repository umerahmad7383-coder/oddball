import React from 'react';
import { createRoot } from 'react-dom/client';
import { Hub } from './Hub.jsx';
import { initCosmetics } from '../client/cosmetics.js';
import './hub.css';

initCosmetics();
createRoot(document.getElementById('root')).render(<Hub />);
