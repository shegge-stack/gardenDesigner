# Plant Database Structure

## Required Data Fields Per Plant

### Core Identity
```json
{
  "id": "string (slug: tomato-cherry-sungold)",
  "common_name": "Sungold Cherry Tomato",
  "botanical_name": "Solanum lycopersicum",
  "family": "Solanaceae",
  "family_common": "Nightshade",
  "plant_type": "annual_vegetable | perennial_vegetable | annual_herb | perennial_herb | annual_flower | perennial_flower | shrub | tree | grass | groundcover",
  "category": "vegetable | herb | fruit | flower | native | grass",
  "subcategory": "tomato | pepper | root_crop | leafy_green | legume | cucurbit | brassica | allium | herb_culinary | herb_medicinal"
}
```

### Growing Requirements
```json
{
  "hardiness_zones": [3, 4, 5, 6, 7, 8, 9],
  "hardiness_zone_min": 3,
  "hardiness_zone_max": 9,
  "sun_requirement": "full_sun | part_sun | part_shade | full_shade",
  "sun_hours_min": 6,
  "sun_hours_ideal": 8,
  "water_need": "low | medium | high",
  "water_inches_per_week_min": 1.0,
  "water_inches_per_week_max": 2.0,
  "soil_ph_min": 6.0,
  "soil_ph_max": 7.0,
  "soil_ph_ideal": 6.5,
  "soil_type_preferred": ["loam", "sandy_loam"],
  "soil_drainage": "well_drained | moist | wet_tolerant | dry_tolerant",
  "frost_tolerance": "none | light (32F) | moderate (28F) | hard (20F)",
  "heat_tolerance": "low | medium | high",
  "drought_tolerance": "low | medium | high"
}
```

### Planting Data
```json
{
  "start_method": "direct_sow | transplant | both",
  "seed_start_weeks_before_frost": 6,
  "seed_depth_inches": 0.25,
  "germination_temp_min_f": 60,
  "germination_temp_optimal_f": 75,
  "germination_days_min": 5,
  "germination_days_max": 10,
  "transplant_timing": "after_last_frost | before_last_frost_2wk | before_last_frost_4wk",
  "direct_sow_soil_temp_min_f": 60,
  "days_to_maturity_min": 55,
  "days_to_maturity_max": 70,
  "days_to_maturity_from": "transplant | direct_sow",
  "succession_sow": true,
  "succession_interval_weeks": 3,
  "succession_window_start": "2 weeks before last frost",
  "succession_window_end": "10 weeks before first frost"
}
```

### Spacing & Size
```json
{
  "spacing_in_row_inches": 24,
  "spacing_between_rows_inches": 36,
  "sfg_per_square_foot": 1,
  "sfg_squares_needed": 1,
  "mature_height_inches_min": 48,
  "mature_height_inches_max": 96,
  "mature_spread_inches": 24,
  "growth_habit": "bush | vine | upright | mounding | spreading | climbing | rosette",
  "needs_support": true,
  "support_type": "cage | stake | trellis | none"
}
```

### Harvest & Yield
```json
{
  "harvest_window_days": 30,
  "harvest_method": "cut_and_come_again | single_harvest | continuous",
  "yield_per_plant_lbs": 10,
  "yield_per_10ft_row_lbs": 15,
  "plants_per_person": 3,
  "storage_method": "fresh | can | freeze | dry | root_cellar",
  "storage_life_days": 7,
  "edible_parts": ["fruit"]
}
```

### Companion Planting
```json
{
  "companions_good": [
    {"plant_id": "basil", "reason": "Reduces thrips, may promote growth", "evidence": "research"},
    {"plant_id": "marigold", "reason": "Reduces thrips", "evidence": "research"},
    {"plant_id": "carrot", "reason": "Different root depths, space efficient", "evidence": "traditional"}
  ],
  "companions_bad": [
    {"plant_id": "fennel", "reason": "Inhibits most nearby plants", "evidence": "established"},
    {"plant_id": "brassica", "reason": "Compete for nutrients", "evidence": "traditional"}
  ],
  "crop_rotation_family": "nightshade",
  "crop_rotation_years_between": 3,
  "feeding_level": "heavy | moderate | light | nitrogen_fixer",
  "nitrogen_fixer": false
}
```

### Pest & Disease Susceptibility
```json
{
  "common_pests": [
    {"pest_id": "tomato_hornworm", "severity": "high", "organic_control": ["hand_pick", "bt"]},
    {"pest_id": "aphids", "severity": "medium", "organic_control": ["neem", "beneficial_insects"]},
    {"pest_id": "flea_beetle", "severity": "low", "organic_control": ["row_cover"]}
  ],
  "common_diseases": [
    {"disease_id": "early_blight", "severity": "high", "prevention": ["rotation", "mulch", "airflow"]},
    {"disease_id": "blossom_end_rot", "severity": "medium", "prevention": ["consistent_water", "calcium"]}
  ],
  "disease_resistance_codes": ["VFN", "VFNT"]
}
```

### Zone-Specific Overrides
```json
{
  "zone_overrides": {
    "4a": {
      "recommended_varieties": ["Early Girl", "Glacier", "Stupice", "Sub Arctic Plenty"],
      "seed_start_date": "April 10-15",
      "transplant_date": "May 15-20",
      "notes": "Choose short-season varieties (60-70 days). Wall-o-water can extend season."
    },
    "4b": {
      "recommended_varieties": ["Early Girl", "Sungold", "Juliet", "Celebrity"],
      "seed_start_date": "April 5-10",
      "transplant_date": "May 10-15",
      "notes": "Standard season varieties work with 65-80 day maturity."
    }
  }
}
```

### Visual/Display
```json
{
  "image_url": "string",
  "icon": "string (emoji or icon name)",
  "color_primary": "#FF6347",
  "color_foliage": "#228B22",
  "bloom_color": "yellow",
  "season_interest": ["summer", "fall"],
  "tags": ["beginner_friendly", "container_suitable", "heat_loving", "deer_resistant"]
}
```

## Complete Schema (JSON Schema)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "common_name", "family", "plant_type", "sun_requirement", "water_need", "spacing_in_row_inches", "days_to_maturity_min"],
  "properties": {
    "id": {"type": "string"},
    "common_name": {"type": "string"},
    "botanical_name": {"type": "string"},
    "family": {"type": "string", "enum": ["Solanaceae", "Brassicaceae", "Cucurbitaceae", "Fabaceae", "Liliaceae", "Apiaceae", "Chenopodiaceae", "Asteraceae", "Poaceae", "Lamiaceae", "Rosaceae"]},
    "plant_type": {"type": "string", "enum": ["annual_vegetable", "perennial_vegetable", "annual_herb", "perennial_herb", "annual_flower", "perennial_flower", "shrub", "tree", "grass", "groundcover"]},
    "hardiness_zone_min": {"type": "integer", "minimum": 1, "maximum": 13},
    "hardiness_zone_max": {"type": "integer", "minimum": 1, "maximum": 13},
    "sun_requirement": {"type": "string", "enum": ["full_sun", "part_sun", "part_shade", "full_shade"]},
    "sun_hours_min": {"type": "number"},
    "water_need": {"type": "string", "enum": ["low", "medium", "high"]},
    "water_inches_per_week_min": {"type": "number"},
    "water_inches_per_week_max": {"type": "number"},
    "soil_ph_min": {"type": "number"},
    "soil_ph_max": {"type": "number"},
    "frost_tolerance": {"type": "string", "enum": ["none", "light", "moderate", "hard"]},
    "start_method": {"type": "string", "enum": ["direct_sow", "transplant", "both"]},
    "seed_start_weeks_before_frost": {"type": "integer"},
    "seed_depth_inches": {"type": "number"},
    "days_to_maturity_min": {"type": "integer"},
    "days_to_maturity_max": {"type": "integer"},
    "spacing_in_row_inches": {"type": "integer"},
    "spacing_between_rows_inches": {"type": "integer"},
    "sfg_per_square_foot": {"type": "number"},
    "mature_height_inches_min": {"type": "integer"},
    "mature_height_inches_max": {"type": "integer"},
    "growth_habit": {"type": "string"},
    "needs_support": {"type": "boolean"},
    "yield_per_plant_lbs": {"type": "number"},
    "plants_per_person": {"type": "integer"},
    "companions_good": {"type": "array", "items": {"type": "object"}},
    "companions_bad": {"type": "array", "items": {"type": "object"}},
    "crop_rotation_family": {"type": "string"},
    "feeding_level": {"type": "string", "enum": ["heavy", "moderate", "light", "nitrogen_fixer"]},
    "common_pests": {"type": "array", "items": {"type": "object"}},
    "common_diseases": {"type": "array", "items": {"type": "object"}},
    "zone_overrides": {"type": "object"},
    "tags": {"type": "array", "items": {"type": "string"}}
  }
}
```

## Minimum Viable Plant Database — Priority Crops for Zone 4

### Tier 1 (must have — 20 most common):
Tomato, Pepper, Cucumber, Zucchini, Bush Bean, Pea, Lettuce, Spinach, Kale, Carrot, Beet, Radish, Onion, Garlic, Potato, Broccoli, Cabbage, Basil, Dill, Corn

### Tier 2 (should have — next 20):
Cauliflower, Brussels Sprouts, Swiss Chard, Parsley, Cilantro, Eggplant, Winter Squash, Pumpkin, Watermelon, Cantaloupe, Turnip, Parsnip, Leek, Kohlrabi, Celery, Chives, Thyme, Oregano, Sage, Mint

### Tier 3 (nice to have — 20 more):
Pole Bean, Arugula, Endive, Rutabaga, Shallot, Green Onion, Fennel, Rosemary, Okra, Sunflower, Marigold, Nasturtium, Sweet Potato, Rhubarb, Asparagus, Strawberry, Raspberry, Blueberry, Tomatillo, Hot Pepper varieties

## Authoritative Data Sources

- [USDA Plants Database](https://plants.usda.gov/) — botanical data, native range, characteristics
- [UMN Extension Vegetable Growing Guides](https://extension.umn.edu/vegetables) — zone-specific growing data
- [Johnny's Selected Seeds](https://www.johnnyseeds.com/growers-library/vegetables/growers-library-vegetables.html) — variety-specific days to maturity, spacing
- [Old Farmer's Almanac Growing Guides](https://www.almanac.com/gardening) — spacing, companion planting, frost dates
- [Harvest to Table](https://harvesttotable.com/vegetable_crop_yields_plants_p/) — yield data per plant
- [Garden In Minutes](https://gardeninminutes.com/blogs/easy-growing/plant-spacing-chart-square-foot-gardening) — SFG spacing data
