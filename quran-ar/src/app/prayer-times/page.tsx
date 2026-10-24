"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin } from "lucide-react";

const cities = [
  { name: "مكة المكرمة", country: "SA" },
  { name: "الرياض", country: "SA" },
  { name: "القاهرة", country: "EG" },
  { name: "دبي", country: "AE" },
  { name: "الكويت", country: "KW" },
  { name: "عمان", country: "OM" },
];

export default function PrayerTimesPage() {
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toLocaleDateString("ar-SA"));
    fetchPrayerTimes();
  }, [selectedCity]);

  const fetchPrayerTimes = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${encodeURIComponent(selectedCity.name)}&country=${selectedCity.country}&method=4`
      );
      const data = await res.json();
      if (data.data) {
        setPrayerTimes(data.data.timings);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const prayers = [
    { name: "الفجر", key: "Fajr" },
    { name: "الشروق", key: "Sunrise" },
    { name: "الظهر", key: "Dhuhr" },
    { name: "العصر", key: "Asr" },
    { name: "المغرب", key: "Maghrib" },
    { name: "العشاء", key: "Isha" },
  ];

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          مواقيت الصلاة
        </h1>
        <p className="text-muted-foreground">{date}</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          اختر المدينة
        </label>
        <select
          value={selectedCity.name}
          onChange={(e) => {
            const city = cities.find((c) => c.name === e.target.value);
            if (city) setSelectedCity(city);
          }}
          className="w-full p-3 border rounded-lg bg-background"
        >
          {cities.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : prayerTimes ? (
        <div className="space-y-2">
          {prayers.map((prayer) => (
            <div key={prayer.key} className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">{prayer.name}</span>
              <span className="text-lg font-semibold">{prayerTimes[prayer.key]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
