import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import './App.css'

ReactDOM.createRoot(document.getElementById('fmi-quote-builder-app')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)