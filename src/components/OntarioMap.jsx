/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import L from 'leaflet';

// Hand-placed pin positions for the SVG fallback map (viewBox 900x550).
const SVG_PINS = [
  { id: 'st-jacobs', name: 'St. Jacobs', x: 420, y: 340, city: 'Woolwich' },
  { id: 'kitchener', name: 'Kitchener', x: 435, y: 360, city: 'Kitchener' },
  { id: 'guelph', name: 'Guelph', x: 470, y: 340, city: 'Guelph' },
  { id: 'hamilton', name: 'Hamilton', x: 500, y: 390, city: 'Hamilton' },
  { id: 'kensington', name: 'Kensington (Toronto)', x: 550, y: 360, city: 'Toronto' },
  { id: 'covent-garden', name: 'Covent Garden', x: 340, y: 410, city: 'London' },
  { id: 'peterborough', name: 'Peterborough', x: 620, y: 280, city: 'Peterborough' },
  { id: 'byward', name: 'ByWard Market', x: 770, y: 150, city: 'Ottawa' },
];

// Brand-green teardrop pin with a shopping-bag icon, used for Leaflet markers.
function createPinIcon() {
  return L.divIcon({
    className: 'basket-pin-marker',
    html: `
      <div style="
        background-color: #2F5D3A;
        color: #FAF6EE;
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        border: 2px solid #FFFFFF;
        cursor: pointer;
      ">
        <svg style="transform: rotate(45deg); width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

// Creates a styled element using textContent, so market data is never parsed as HTML.
function styledEl(tag, cssText, text) {
  const el = document.createElement(tag);
  el.style.cssText = cssText;
  el.textContent = text || '';
  return el;
}

// Builds the Leaflet popup for a market: name, city, hours, vendor count and a link.
function buildPopupContent(market) {
  const popup = document.createElement('div');
  popup.className = 'p-3 max-w-[260px] text-[#232323]';

  const link = styledEl(
    'a',
    'display: inline-flex; align-items: center; justify-content: center; width: 100%; background-color: #2F5D3A; color: #FAF6EE; padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; text-decoration: none;',
    'View Market & Pre-Order →'
  );
  link.href = `/markets/${encodeURIComponent(market.id)}`;

  popup.append(
    styledEl('div', "font-family: 'Fraunces', serif; font-weight: 700; font-size: 15px; color: #2F5D3A; margin-bottom: 2px;", market.name),
    styledEl('div', 'font-size: 11px; color: #C96F4A; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;', market.city),
    styledEl('div', 'font-size: 12px; color: #555; margin-bottom: 8px;', market.summaryHours),
    styledEl('div', 'font-size: 11px; color: #2F5D3A; font-weight: 600; margin-bottom: 10px;', `${market.vendorCount ?? '3+'} Local Vendors Available`),
    link
  );
  return popup;
}

// Market map: interactive Leaflet/OpenStreetMap view, with a hand-drawn SVG map as a fallback.
export default function OntarioMap({ markets, selectedMarketId, onSelectMarket }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [useFallbackSvg, setUseFallbackSvg] = useState(false);
  const [activeMarket, setActiveMarket] = useState(null);
  const navigate = useNavigate();

  // (Re)build the Leaflet map whenever markets change; on failure, switch to the SVG map.
  useEffect(() => {
    if (useFallbackSvg) return;
    if (!mapContainerRef.current) return;

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Center around Southern/Eastern Ontario (Kitchener/Toronto/Ottawa corridor)
      const map = L.map(mapContainerRef.current, {
        center: [43.85, -79.8],
        zoom: 7,
        scrollWheelZoom: false,
      });
      mapInstanceRef.current = map;

      // Free OpenStreetMap tile layer (no API key required)
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      });

      // Tile errors are only logged; users can switch to the SVG map with the toggle.
      tileLayer.on('tileerror', () => {
        console.warn('Map tiles failed to load; the SVG region map is available via the toggle.');
      });

      tileLayer.addTo(map);

      const customPinIcon = createPinIcon();

      // Add pins for each Ontario market
      markets.forEach((market) => {
        if (!market.lat || !market.lng) return;

        const marker = L.marker([market.lat, market.lng], { icon: customPinIcon }).addTo(map);

        marker.on('click', () => {
          setActiveMarket(market);
          if (onSelectMarket) onSelectMarket(market.id);
        });

        marker.bindPopup(buildPopupContent(market));
      });

      // Fit bounds if markets exist
      if (markets.length > 0) {
        const bounds = L.latLngBounds(markets.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (err) {
      console.error('Leaflet initialization failed, switching to SVG map fallback', err);
      setUseFallbackSvg(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markets, useFallbackSvg, onSelectMarket]);

  return (
    <div className="relative w-full h-[540px] bg-stone-100 rounded-3xl overflow-hidden border border-[#2F5D3A]/15 shadow-md">
      {/* Map View Toggle Header Button */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-stone-200 text-xs font-semibold text-[#2F5D3A]">
        <button
          onClick={() => setUseFallbackSvg(false)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            !useFallbackSvg ? 'bg-[#2F5D3A] text-[#FAF6EE]' : 'text-stone-600 hover:text-[#2F5D3A]'
          }`}
        >
          Leaflet Map
        </button>
        <button
          onClick={() => setUseFallbackSvg(true)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            useFallbackSvg ? 'bg-[#2F5D3A] text-[#FAF6EE]' : 'text-stone-600 hover:text-[#2F5D3A]'
          }`}
        >
          Ontario Region Map
        </button>
      </div>

      {!useFallbackSvg ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        /* Styled interactive SVG Map of Ontario with Clickable Pins */
        <div className="w-full h-full relative bg-[#EAF2EC] flex flex-col items-center justify-center p-6 overflow-hidden">
          {/* Subtle Map Legend */}
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-[#2F5D3A]/20 shadow-sm max-w-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2F5D3A] block mb-1">
              Ontario Pre-Order Network
            </span>
            <p className="text-xs text-stone-600">
              Click any pin on the Ontario regional map to view market hours and reserve fresh farm items.
            </p>
          </div>

          <svg
            viewBox="0 0 900 550"
            className="w-full h-full max-h-[500px] select-none"
            aria-label="Map of Southern and Eastern Ontario Farmers Markets"
          >
            <defs>
              <linearGradient id="ontarioLand" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DFEADE" />
                <stop offset="100%" stopColor="#CFDEC8" />
              </linearGradient>
              <linearGradient id="lakeWater" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C4DCF2" />
                <stop offset="100%" stopColor="#AFD1EF" />
              </linearGradient>
            </defs>

            {/* Great Lakes & Georgian Bay Backdrop */}
            <path
              d="M 120 500 C 180 480, 220 440, 240 400 C 260 360, 230 320, 260 250 C 280 200, 340 180, 380 220 C 420 260, 390 320, 460 330 C 500 340, 540 310, 580 340 C 650 380, 750 360, 850 320 L 900 550 L 50 550 Z"
              fill="url(#lakeWater)"
              opacity="0.75"
            />

            {/* Simplified Geographic Contour of Southern Ontario */}
            <path
              d="M 150 420 
                 C 190 360, 220 310, 250 260 
                 C 290 200, 320 150, 380 130 
                 C 440 110, 540 90, 680 80 
                 C 780 70, 860 120, 840 210 
                 C 820 260, 730 290, 680 320 
                 C 620 360, 560 380, 500 420 
                 C 450 440, 410 460, 340 460 
                 C 260 460, 200 450, 150 420 Z"
              fill="url(#ontarioLand)"
              stroke="#A2BA9B"
              strokeWidth="2.5"
            />

            {/* Georgian Bay & Lake Ontario Accents */}
            <text x="560" y="440" fill="#789EC2" fontSize="13" fontWeight="600" letterSpacing="2">
              LAKE ONTARIO
            </text>
            <text x="220" y="490" fill="#789EC2" fontSize="13" fontWeight="600" letterSpacing="2">
              LAKE ERIE
            </text>
            <text x="280" y="160" fill="#789EC2" fontSize="13" fontWeight="600" letterSpacing="2">
              GEORGIAN BAY
            </text>
            <text x="730" y="110" fill="#789EC2" fontSize="13" fontWeight="600" letterSpacing="2">
              OTTAWA RIVER
            </text>

            {/* Market pins; markets missing from the data fall back to the pin's own label */}
            {SVG_PINS.map((pin) => {
              const market = markets.find((m) => m.id === pin.id) || {
                id: pin.id,
                name: pin.name,
                city: pin.city,
                summaryHours: 'Weekend mornings',
              };
              const isSelected = activeMarket?.id === pin.id || selectedMarketId === pin.id;

              return (
                <g
                  key={pin.id}
                  className="cursor-pointer group"
                  onClick={() => {
                    setActiveMarket(market);
                    if (onSelectMarket) onSelectMarket(pin.id);
                  }}
                >
                  {/* Pulse ring for selected */}
                  {isSelected && (
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r="22"
                      fill="#C96F4A"
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Marker Pin Base Shadow */}
                  <ellipse cx={pin.x} cy={pin.y + 4} rx="6" ry="3" fill="#000" opacity="0.25" />

                  {/* Marker Pin */}
                  <path
                    d={`M ${pin.x} ${pin.y + 2} 
                        C ${pin.x - 12} ${pin.y - 12}, ${pin.x - 14} ${pin.y - 24}, ${pin.x} ${pin.y - 28} 
                        C ${pin.x + 14} ${pin.y - 28}, ${pin.x + 12} ${pin.y - 12}, ${pin.x} ${pin.y + 2} Z`}
                    fill={isSelected ? '#C96F4A' : '#2F5D3A'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-transform group-hover:scale-110 origin-bottom"
                  />

                  {/* Inner Dot */}
                  <circle cx={pin.x} cy={pin.y - 18} r="4" fill="#FAF6EE" />

                  {/* Label */}
                  <text
                    x={pin.x}
                    y={pin.y + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#232323"
                    className="select-none pointer-events-none drop-shadow-sm"
                  >
                    {pin.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Active Market Pop-over on SVG Map */}
          {activeMarket && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-md bg-white rounded-2xl p-4 shadow-xl border border-[#2F5D3A]/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="text-left w-full">
                <span className="text-[11px] font-bold text-[#C96F4A] uppercase tracking-wider block">
                  {activeMarket.city}
                </span>
                <h4 className="font-display font-bold text-lg text-[#2F5D3A] leading-tight">
                  {activeMarket.name}
                </h4>
                <p className="text-xs text-stone-600 mt-1">{activeMarket.summaryHours}</p>
              </div>
              <button
                onClick={() => navigate(`/markets/${activeMarket.id}`)}
                className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl bg-[#2F5D3A] text-[#FAF6EE] text-xs font-semibold hover:bg-[#22442A] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Pre-Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
