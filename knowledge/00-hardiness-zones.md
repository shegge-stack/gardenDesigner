# USDA Hardiness Zones & Frost Dates

## How Hardiness Zones Work

USDA Plant Hardiness Zones are based on the **average annual minimum winter temperature** over a 30-year period (1991-2020 for the current 2023 map). Each zone spans 10°F, divided into "a" (colder) and "b" (warmer) sub-zones of 5°F each.

| Zone | Min Temp Range (°F) | Min Temp Range (°C) |
|------|---------------------|---------------------|
| 3a   | -40 to -35          | -40 to -37.2        |
| 3b   | -35 to -30          | -37.2 to -34.4      |
| 4a   | -30 to -25          | -34.4 to -31.7      |
| 4b   | -25 to -20          | -31.7 to -28.9      |
| 5a   | -20 to -15          | -28.9 to -26.1      |

**Source:** [USDA Plant Hardiness Zone Map (2023)](https://planthardiness.ars.usda.gov/)

## Minnesota Zone Distribution

- **Zone 3a/3b:** Northern Minnesota (International Falls, Bemidji, northern border)
- **Zone 4a:** Central Minnesota (St. Cloud, Brainerd, Duluth)
- **Zone 4b:** Twin Cities metro, southern Minnesota transitional areas
- **Zone 5a:** Far southern Minnesota (Rochester, Winona) — expanded in 2023 map update

The 2023 USDA map shifted many Minnesota areas approximately half a zone warmer compared to the 2012 map due to warming trends in average minimum temperatures.

**Source:** [UMN Extension - New Plant Hardiness Zone Map](https://extension.umn.edu/yard-and-garden-news/new-plant-hardiness-zone-map-usda)

## Frost Dates — Minnesota

### Twin Cities Metro Area (Zone 4b)

| Location       | Last Spring Frost (32°F) | First Fall Frost (32°F) | Growing Season (days) |
|----------------|--------------------------|-------------------------|-----------------------|
| MSP Airport    | April 28                 | October 8               | 163                   |
| Stillwater     | April 28                 | October 6               | 161                   |
| Forest Lake    | May 2                    | October 5               | 156                   |
| Buffalo        | May 3                    | October 2               | 152                   |
| Farmington     | May 5                    | October 2               | 149                   |
| Chaska         | May 5                    | September 30            | 147                   |
| Rosemount      | May 4                    | September 29            | 146                   |
| Jordan         | May 8                    | September 27            | 142                   |
| Cambridge      | May 8                    | September 25            | 139                   |

**Source:** [MN DNR - Frost/Freeze Dates](https://files.dnr.state.mn.us/natural_resources/climate/twin_cities/frost_freeze.html)

### General Minnesota Frost Date Ranges

| Zone  | Avg Last Spring Frost | Avg First Fall Frost | Growing Season |
|-------|----------------------|---------------------|----------------|
| 3b    | May 15-25            | September 10-20     | 110-130 days   |
| 4a    | May 5-15             | September 20-30     | 130-150 days   |
| 4b    | April 25-May 10      | September 25-Oct 10 | 140-165 days   |
| 5a    | April 20-May 5       | October 1-15        | 150-175 days   |

## Microclimate Factors

Frost dates vary significantly within zones due to:

- **Urban heat island effect:** Cities like Minneapolis can be 5-10°F warmer than surrounding rural areas
- **Elevation:** Every 1,000 ft gain ≈ 3.5°F cooler
- **Water proximity:** Lakes and rivers moderate temperatures (longer frost-free season near large bodies of water)
- **Topography:** Cold air pools in valleys and low spots; hilltops and slopes are warmer
- **Built structures:** South-facing walls, paved areas, and buildings create warm microclimates
- **Tree canopy:** Overhead cover can prevent frost by trapping radiant heat

## Key Data for Design Tool

```
ZONE_DATA = {
  "4a": {
    "min_temp_f": [-30, -25],
    "last_frost_avg": "May 10",
    "first_frost_avg": "September 25",
    "growing_season_days": [130, 150],
    "safe_transplant_date": "May 15-20",
    "safe_direct_sow_tender": "May 20-25"
  },
  "4b": {
    "min_temp_f": [-25, -20],
    "last_frost_avg": "May 1",
    "first_frost_avg": "October 3",
    "growing_season_days": [140, 165],
    "safe_transplant_date": "May 10-15",
    "safe_direct_sow_tender": "May 15-20"
  }
}
```

## Authoritative Sources

- [USDA Plant Hardiness Zone Map](https://planthardiness.ars.usda.gov/) — interactive zone lookup by ZIP code
- [MN DNR Frost/Freeze Data](https://www.dnr.state.mn.us/climate/summaries_and_publications/freeze_date.html)
- [MN DNR Historical Temperature Data for Gardeners](https://www.dnr.state.mn.us/climate/summaries_and_publications/garden_temps.html)
- [UMN Extension](https://extension.umn.edu/yard-and-garden)
- [Midwestern Regional Climate Center](https://mrcc.purdue.edu/) — interactive frost date maps
- [Old Farmer's Almanac Frost Dates](https://www.almanac.com/gardening/frostdates/MN)
