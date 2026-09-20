import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import { App } from './App';
import { mockRatingSource } from './marketplace';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App ratingSource={mockRatingSource} /></React.StrictMode>,
);

