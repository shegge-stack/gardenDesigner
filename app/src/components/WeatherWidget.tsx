import React from 'react';
import { useWeather } from '../hooks/useWeather';

export const WeatherWidget: React.FC = () => {
  const { daily, loading, error, hasFrostWarning } = useWeather();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-earth-200 rounded w-32 mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex-1 h-20 bg-earth-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error && daily.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-sm">
        <p className="text-sm text-soil-500">Weather data unavailable. Check your connection.</p>
      </div>
    );
  }

  const dayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tmrw';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-soil-800 text-sm">7-Day Forecast - Twin Cities</h2>
        {error && <span className="text-[10px] text-soil-400">(cached)</span>}
      </div>

      {hasFrostWarning && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
          <span className="text-lg">&#10052;</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Frost Warning!</p>
            <p className="text-xs text-blue-700">Cover your plants! Lows at or below 32F expected.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {daily.map((day) => {
          const isFrost = day.tempMin <= 32;
          return (
            <div
              key={day.date}
              className={`flex-1 rounded-lg p-2 text-center ${
                isFrost ? 'bg-blue-50 border border-blue-200' : 'bg-earth-50'
              }`}
            >
              <p className="text-xs font-medium text-soil-600 mb-1">{dayName(day.date)}</p>
              <p className="text-lg font-bold text-soil-800">{day.tempMax}&deg;</p>
              <p className={`text-xs font-medium ${isFrost ? 'text-blue-600' : 'text-soil-500'}`}>
                {day.tempMin}&deg;
              </p>
              {day.precipitation > 0 && (
                <p className="text-[10px] text-blue-500 mt-1">{day.precipitation.toFixed(1)}"</p>
              )}
              {isFrost && (
                <span className="text-xs text-blue-500">&#10052;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
