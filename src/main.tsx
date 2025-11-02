import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "leaflet/dist/leaflet.css";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router-dom";
import Map from './Pages/MapPage.tsx';
import Layout from './Layout.tsx';
import Home from './Pages/Home.tsx';
import Login from './Pages/Login.tsx';
import { GlobalProvider } from './Providers/Globals.tsx';
import { AlertProvider } from './Providers/Alerts.tsx';
import Converter from './Pages/Converter.tsx';
const router = createBrowserRouter([
  {
    path: "*",
    element: <Layout><Converter /></Layout>,
  },

]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <GlobalProvider>
        <RouterProvider router={router} />
      </GlobalProvider>
    </AlertProvider>
  </StrictMode>,
)
