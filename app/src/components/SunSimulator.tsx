import React, { useState, useMemo } from 'react';
import { PropertyConfig, GardenSpec } from '../types/garden';

interface SunSimulatorProps {
  property: PropertyConfig;
  spec: GardenSpec;
  onShadowsUpdate: (shadows: Array<{ points: string; opacity: number }>) => void;
  onSunHoursUpdate: (sunHourMap: Map<string, number>) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayOfYear(month: number, day: number = 15): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = day;
  for (let i = 0; i < month; i++) doy += daysInMonth[i];
  return doy;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

function toDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

function solarPosition(latitude: number, doy: number, hour: number): { altitude: number; azimuth: number } {
  const declination = 23.45 * Math.sin(toRad(360 / 365 * (284 + doy)));
  const decRad = toRad(declination);
  const latRad = toRad(latitude);
  const hourAngle = (hour - 12) * 15; // degrees, 15 per hour
  const haRad = toRad(hourAngle);

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
    (Math.cos(latRad) * Math.cos(Math.asin(Math.max(-1, Math.min(1, sinAlt)))));
  let azimuth = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (hourAngle > 0) azimuth = 360 - azimuth;

  return { altitude, azimuth };
}

function computeShadow(
  objX: number,
  objY: number,
  objWidth: number,
  objDepth: number,
  objHeight: number,
  altitude: number,
  azimuth: number,
  orientationDeg: number,
): string {
  if (altitude <= 0) return '';

  const shadowLen = objHeight / Math.tan(toRad(altitude));
  const adjustedAz = azimuth - orientationDeg;
  const azRad = toRad(adjustedAz);

  // Shadow direction (opposite of sun)
  const dx = -shadowLen * Math.sin(azRad);
  const dy = shadowLen * Math.cos(azRad);

  // Four corners of the object base
  const corners = [
    [objX, objY],
    [objX + objWidth, objY],
    [objX + objWidth, objY + objDepth],
    [objX, objY + objDepth],
  ];

  // Shadow polygon: the 4 projected corners + the 4 base corners (simplified convex hull)
  const shadowCorners = corners.map(([cx, cy]) => [cx + dx, cy + dy]);

  // Create polygon from base far side + shadow far side
  const pts = [
    ...corners.map(c => c.join(',')),
    ...shadowCorners.reverse().map(c => c.join(',')),
  ].join(' ');

  return pts;
}

export const SunSimulator: React.FC<SunSimulatorProps> = ({
  property,
  spec,
  onShadowsUpdate,
  onSunHoursUpdate,
}) => {
  const [hour, setHour] = useState(12);
  const [month, setMonth] = useState(6); // July
  const [latitude, setLatitude] = useState(44.98);
  const [houseHeight] = useState(20); // feet

  const doy = useMemo(() => dayOfYear(month), [month]);

  // Compute shadows for current time
  const shadows = useMemo(() => {
    const pos = solarPosition(latitude, doy, hour);
    if (pos.altitude <= 0) return [];

    const houseShadow = computeShadow(
      property.house_x, property.house_y,
      property.house_width_ft, property.house_depth_ft,
      houseHeight, pos.altitude, pos.azimuth, property.orientation_deg,
    );

    return houseShadow ? [{ points: houseShadow, opacity: 0.15 }] : [];
  }, [latitude, doy, hour, property, houseHeight]);

  // Compute sun hours for each bed (simplified: check each hour 6-20)
  const sunHourMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const bed of spec.beds) {
      const bx = (bed.x ?? 0) + bed.widthFt / 2;
      const by = (bed.y ?? 0) + bed.lengthFt / 2;
      let sunHours = 0;

      for (let h = 6; h <= 20; h++) {
        const pos = solarPosition(latitude, doy, h);
        if (pos.altitude <= 0) continue;

        // Simple check: is the bed center in shadow from house?
        const shadowLen = houseHeight / Math.tan(toRad(pos.altitude));
        const adjustedAz = pos.azimuth - property.orientation_deg;
        const azRad = toRad(adjustedAz);
        const dx = -shadowLen * Math.sin(azRad);
        const dy = shadowLen * Math.cos(azRad);

        // Very simplified: check if bed center is within shadow rectangle
        const hx1 = property.house_x;
        const hy1 = property.house_y;
        const hx2 = property.house_x + property.house_width_ft;
        const hy2 = property.house_y + property.house_depth_ft;

        const sx1 = Math.min(hx1, hx1 + dx, hx2, hx2 + dx);
        const sy1 = Math.min(hy1, hy1 + dy, hy2, hy2 + dy);
        const sx2 = Math.max(hx1, hx1 + dx, hx2, hx2 + dx);
        const sy2 = Math.max(hy1, hy1 + dy, hy2, hy2 + dy);

        const inShadow = bx >= sx1 && bx <= sx2 && by >= sy1 && by <= sy2;
        if (!inShadow) sunHours++;
      }
      map.set(bed.id, sunHours);
    }
    return map;
  }, [spec.beds, latitude, doy, property, houseHeight]);

  // Push shadows and sun hours to parent
  React.useEffect(() => {
    onShadowsUpdate(shadows);
  }, [shadows, onShadowsUpdate]);

  React.useEffect(() => {
    onSunHoursUpdate(sunHourMap);
  }, [sunHourMap, onSunHoursUpdate]);

  const currentPos = solarPosition(latitude, doy, hour);
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:00 ${ampm}`;
  };

  return (
    <div className="bg-white border border-earth-200 rounded-lg shadow-sm p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-soil-800 text-sm flex items-center gap-1">
          Sun Simulator
        </h3>
        <div className="text-xs text-soil-500">
          Alt: {currentPos.altitude.toFixed(1)} / Az: {currentPos.azimuth.toFixed(1)}
        </div>
      </div>

      <div>
        <label className="block text-xs text-soil-600 mb-1">
          Time: {formatHour(hour)}
        </label>
        <input
          type="range"
          min={6}
          max={20}
          step={0.5}
          value={hour}
          onChange={e => setHour(Number(e.target.value))}
          className="w-full h-1.5 accent-harvest-500"
        />
        <div className="flex justify-between text-[10px] text-soil-400">
          <span>6 AM</span>
          <span>Noon</span>
          <span>8 PM</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-soil-600 mb-1">Month: {MONTHS[month]}</label>
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setMonth(i)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                i === month ? 'bg-harvest-500 text-white' : 'bg-earth-100 text-soil-600 hover:bg-earth-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-soil-600 mb-1">Latitude: {latitude.toFixed(2)}</label>
        <input
          type="range"
          min={25}
          max={50}
          step={0.1}
          value={latitude}
          onChange={e => setLatitude(Number(e.target.value))}
          className="w-full h-1.5 accent-harvest-500"
        />
      </div>

      {/* Sun hours per bed */}
      {spec.beds.length > 0 && (
        <div>
          <p className="text-xs font-medium text-soil-700 mb-1">Est. Sun Hours ({MONTHS[month]})</p>
          <div className="space-y-1">
            {spec.beds.map(bed => {
              const hours = sunHourMap.get(bed.id) ?? 0;
              const color = hours >= 6 ? '#fbbf24' : hours >= 4 ? '#86efac' : '#166534';
              return (
                <div key={bed.id} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="flex-1 truncate text-soil-600">{bed.name}</span>
                  <span className="font-medium text-soil-800">{hours}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
