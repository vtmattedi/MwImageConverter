import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "leaflet/dist/leaflet.css";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router-dom";
import Layout from './Layout.tsx';
import { GlobalProvider } from './Providers/Globals.tsx';
import { AlertProvider } from './Providers/Alerts.tsx';
import Converter from './Pages/Converter.tsx';
import QRCodePage from './Pages/QRCode.tsx';
import VideoConverter from './Pages/FFMPEG.tsx';
import Landing from './Pages/Landing.tsx';
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><Landing /></Layout>,
  },
  {
    path: "/converter",
    element: <Layout><Converter /></Layout>,
  },
  {
    path: "/qrcode",
    element: <Layout><QRCodePage /></Layout>,
  },
  {
    path: "/video",
    element: <Layout><VideoConverter /></Layout>,
  },
  {
    // 404 → landing page
    path: "*",
    element: <Layout><Landing /></Layout>,
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
