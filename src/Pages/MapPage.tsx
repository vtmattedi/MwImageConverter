import React from 'react';
import Map from '../components/Map';
import { MapContainer } from 'react-leaflet';
import { getAvgPositions } from '../assets/util/AttachedData';
const MapPage: React.FC = () => {
    const centerPos = getAvgPositions();
    return (
        <div className="w-[100vw] h-[calc(100vh-64px)]">

            <MapContainer style={{ height: '100%', width: '100%', zIndex: 1,  }} center={centerPos} zoom={17} scrollWheelZoom={true}
                zoomControl={false}
            >
                <Map  />
            </MapContainer>
           
        </div>
    );
};

export default MapPage;