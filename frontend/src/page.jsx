// "use client";

// // import '/.env';
// import { useState } from "react";
// import {
//     APIProvider,
//     Map,
//     AdvancedMarker,
//     Pin,
//     InfoWindow,
// } from "@vis.gl/react-google-maps";

// export default function Intro() {
//     const position = { lat: 53.54, lng: 10};

//     return (
//           <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
//                 <div style={{ height: "100vh", width: "auto" }}>
//                     <Map zoom={9} center={position}> 
                        
//                     </Map>
//                 </div>
//         </APIProvider>
//     );
// }
"use client";

import { useState } from "react";
import {
    APIProvider,
    Map,
    AdvancedMarker,
    Pin,
    InfoWindow,
} from "@vis.gl/react-google-maps";

// Assign the env variable to a constant at the top level
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function Intro() {
    const position = { lat: 53.54, lng: 10 };

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <div style={{ height: "100vh", width: "auto" }}>
                <Map zoom={9} center={position}>
                    {/* Map content */}
                </Map>
            </div>
        </APIProvider>
    );
}