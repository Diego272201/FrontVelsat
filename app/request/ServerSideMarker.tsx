import React from 'react';

export default async function ServerSideMarker() {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    return AdvancedMarkerElement;
}
