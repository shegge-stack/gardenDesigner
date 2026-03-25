# Garden Infrastructure

## Irrigation Systems

### Water Requirements
Most vegetables need **1-1.5 inches of water per week** (rainfall + irrigation). Increase to 1.5-2 inches during hot/windy periods.

| Crop            | Water (in/week) | Critical Period                         |
|-----------------|----------------|-----------------------------------------|
| Tomatoes        | 1-2            | Flowering through fruit sizing          |
| Peppers         | 1-1.5          | Flowering through harvest               |
| Cucumbers       | 1-2            | Flowering through fruit production      |
| Beans           | 1-1.5          | Flowering and pod sizing                |
| Corn            | 1.5-2.5        | Tasseling, silking, ear formation       |
| Root crops      | 1-1.5          | Consistent throughout (cracking if irregular) |
| Lettuce/greens  | 1-1.5          | Consistent (bolts if stressed)          |
| Peas            | 0.5-1          | Flowering                               |
| Squash/melons   | 1-2            | Fruit production                        |

**Source:** [Utah State Extension - Water Recommendations](https://extension.usu.edu/yardandgarden/research/water-recommendations-for-vegetables)

### Irrigation Methods

| Method          | Efficiency | Cost    | Best For                    | Pros                          | Cons                        |
|-----------------|-----------|---------|-----------------------------|------------------------------ |-----------------------------|
| Drip tape/line  | 90-95%    | $$      | Raised beds, row crops      | Precise, reduces disease      | Needs filter, maintenance   |
| Soaker hose     | 80-90%    | $       | Simple garden beds          | Easy setup, inexpensive       | Uneven flow, degrades       |
| Overhead sprinkler | 50-70% | $       | Large areas, lawns          | Cheap, easy                   | Wastes water, wets foliage  |
| Hand watering   | Variable  | $       | Small beds, containers      | Total control                 | Time-consuming              |

### Drip Irrigation Design

**Emitter Flow Rates:**
- 0.5 GPH: Root vegetables, onions, garlic
- 1.0 GPH: Most vegetables, herbs
- 2.0 GPH: Tomatoes, peppers, squash, corn

**Spacing:**
- Emitters every 6" for close-spaced crops (carrots, lettuce)
- Emitters every 12" for standard crops (beans, beets)
- Individual emitters for large plants (tomatoes, peppers, squash)

**Run Time Calculation:**
```
# To apply 1 inch of water:
# 1 inch of water per sq ft = 0.623 gallons per sq ft

gallons_needed = bed_area_sq_ft * 0.623
total_emitter_gph = num_emitters * emitter_flow_rate_gph
run_time_hours = gallons_needed / total_emitter_gph

# Example: 4x8 bed (32 sq ft), 32 emitters at 1 GPH
# 32 * 0.623 = 19.9 gallons needed
# 32 emitters * 1 GPH = 32 GPH
# 19.9 / 32 = 0.62 hours = ~37 minutes for 1 inch
```

**Timer Settings:**
- Water early morning (6-8am) to reduce evaporation and disease
- Frequency: every 2-3 days in normal weather, daily in extreme heat
- Adjust for rainfall — 1 inch rain = skip one watering cycle

**Source:** [Penn State Extension - Drip Irrigation for Vegetables](https://extension.psu.edu/determining-how-long-to-run-drip-irrigation-systems-for-vegetables)

## Raised Bed Construction

### Basic 4x8x12" Cedar Bed

**Materials:**
- 4x 2"x12"x8' cedar boards (sides)
- 4x 2"x12"x4' cedar boards (ends) — or cut 2 of the 8' boards
- 4x 4"x4"x12" cedar posts (corners)
- 24x 3" deck screws (stainless or coated)
- Optional: hardware cloth on bottom (gopher/mole protection)
- Optional: landscape fabric stapled inside (prevents soil leaching)

**Assembly:**
1. Cut boards to length
2. Pre-drill screw holes to prevent splitting
3. Attach end boards to corner posts
4. Attach side boards to corner posts
5. Level on site, fill with soil mix

**Soil Volume Needed:**
| Bed Size       | 6" Deep    | 12" Deep   | 18" Deep   | 24" Deep   |
|----------------|-----------|-----------|-----------|-----------|
| 4' x 4'        | 0.3 cu yd | 0.6 cu yd | 0.9 cu yd | 1.2 cu yd |
| 4' x 8'        | 0.6 cu yd | 1.2 cu yd | 1.8 cu yd | 2.4 cu yd |
| 4' x 12'       | 0.9 cu yd | 1.8 cu yd | 2.7 cu yd | 3.6 cu yd |
| 3' x 6'        | 0.3 cu yd | 0.7 cu yd | 1.0 cu yd | 1.3 cu yd |

## Trellising

### Trellis Types

| Type             | Height  | Best Crops                      | Materials                    |
|------------------|---------|----------------------------------|------------------------------|
| A-frame          | 6-8'    | Tomatoes, cucumbers, beans       | Lumber + wire/twine          |
| Cattle panel arch| 7-8'    | Squash, cucumbers, beans         | 16' cattle panel, T-posts    |
| String trellis   | 6-7'    | Tomatoes, peas                   | Posts + twine                |
| Obelisk/teepee   | 6-8'    | Pole beans, sweet peas           | Bamboo or lumber             |
| Lean-to/fence    | 4-6'    | Peas, cucumbers, small melons    | Fence/netting on frame       |
| Horizontal netting| 4-5'   | Peas                             | Posts + netting              |

### Trellising Benefits
- Saves ground space (vertical growing)
- Improves air circulation (reduces disease)
- Makes harvesting easier
- Keeps fruit off ground (less rot, pest damage)
- Increases sun exposure to lower leaves

### Crops That Need/Benefit from Trellising
- **Must trellis:** Pole beans, indeterminate tomatoes, peas (tall varieties)
- **Benefit greatly:** Cucumbers, small melons, small squash
- **Optional:** Peppers (cages), eggplant (stakes)
- **Don't trellis:** Large watermelon, large pumpkins (too heavy for most trellises)

## Fencing & Animal Protection

### Deer Fencing
- **Minimum height: 6 feet** (8 feet for guaranteed exclusion)
- **Angled fence:** 5-6' fence angled 45° outward is effective
- **Double fence:** Two 4' fences 4' apart — deer won't jump width
- **Raised bed combo:** 5-6' fence around raised beds — landing deterrent inside

### Rabbit Fencing
- **Height: 24-36 inches** above ground
- **Burial depth: 6-12 inches** below ground (L-shaped footer best)
- **Mesh size: 1 inch or smaller** (baby rabbits can fit through 2" mesh)
- **Material:** Hardware cloth (1/2" galvanized) or chicken wire

### Combined Deer + Rabbit Fence
- 6-8' tall welded wire fence (2"x4" mesh) for deer
- Additional 24" of 1/2" hardware cloth along bottom for rabbits
- Bury hardware cloth 6" underground with 6" L-footer outward

### Other Pest Barriers
- **Row covers:** Exclude cabbage moths, flea beetles, squash vine borers
- **Copper tape:** Deters slugs around raised bed edges
- **Netting:** Bird protection for berries, corn
- **Individual cages:** Tomato cages double as chicken wire critter barriers

## Mulching

### Mulch Types for Vegetable Gardens

| Mulch Type       | Depth   | Benefits                          | Drawbacks                    |
|------------------|---------|-----------------------------------|------------------------------|
| Straw            | 4-6"    | Insulates, decomposes, cheap     | May contain weed seeds       |
| Wood chips       | 3-4"    | Long-lasting, suppresses weeds   | Ties up nitrogen at surface  |
| Shredded leaves  | 2-4"    | Free, good for soil              | Mats down, blows around      |
| Grass clippings  | 1-2"    | Free, adds nitrogen              | Heats up, can mat/mold       |
| Compost          | 1-2"    | Feeds soil + mulches             | Doesn't suppress weeds well  |
| Black plastic    | N/A     | Warms soil, suppresses weeds     | No water/air permeability    |
| Landscape fabric | N/A     | Weed suppression                 | Degrades, prevents soil building |
| Cardboard        | 1 layer | Free weed barrier under mulch    | Temporary, needs topping     |

### Mulch Application Rules
- **Apply 2-4 inches** for most organic mulches
- **Keep 2-3 inches away** from plant stems (prevents rot)
- **Apply after soil warms** in spring (too early = cold soil)
- **Replenish** as needed throughout season
- **Leave in place** over winter for soil protection

## Key Calculations

```
# Fencing material needed
# Perimeter = 2 * (length + width)
fence_linear_feet = 2 * (garden_length + garden_width)
# Add 10% for overlap at gate and corners

# Drip irrigation line needed
drip_line_feet = num_rows * row_length
# Add header line + connections

# Mulch volume
mulch_cu_ft = bed_area_sq_ft * (mulch_depth_inches / 12)
mulch_cu_yd = mulch_cu_ft / 27
# 1 cubic yard covers approximately:
# 162 sq ft at 2" deep
# 108 sq ft at 3" deep
# 81 sq ft at 4" deep

# Raised bed lumber calculator
# For a rectangular bed of height H (in inches):
# Side boards = 2 * length, count = ceil(H / board_width)
# End boards = 2 * width, count = ceil(H / board_width)
# Corner posts = 4 * H inches of 4x4
```
