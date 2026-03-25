import { jsPDF } from 'jspdf';
import { GardenSpec } from '../types/garden';
import { getPlantById } from '../data/plants';

export function exportGardenPdf(spec: GardenSpec) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = 215.9;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // ---- Page 1: Garden Overview ----
  doc.setFontSize(22);
  doc.setTextColor(30, 80, 30);
  doc.text('Garden Plan', margin, 25);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Zone ${spec.zone} | Last Frost: ${spec.lastFrostDate} | First Frost: ${spec.firstFrostDate}`, margin, 33);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 39);

  doc.setDrawColor(180, 160, 130);
  doc.line(margin, 43, pageW - margin, 43);

  // Bed overview
  let y = 50;
  doc.setFontSize(14);
  doc.setTextColor(30, 80, 30);
  doc.text('Garden Beds', margin, y);
  y += 8;

  spec.beds.forEach(bed => {
    if (y > 260) { doc.addPage(); y = 25; }

    doc.setFillColor(245, 240, 232);
    doc.roundedRect(margin, y - 4, contentW, 18, 2, 2, 'F');

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(bed.name, margin + 3, y + 2);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${bed.widthFt}' x ${bed.lengthFt}' (${bed.widthFt * bed.lengthFt} sq ft) | ${bed.type.replace('_', ' ')} | ${bed.sunExposure.replace('_', ' ')}`, margin + 3, y + 8);

    const plantedCount = bed.squares.flat().filter(s => s.plantId).length;
    const totalCount = bed.widthFt * bed.lengthFt;
    doc.text(`${plantedCount}/${totalCount} squares planted`, margin + 3, y + 13);

    y += 22;
  });

  if (spec.beds.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('No beds created yet.', margin, y);
  }

  // ---- Page 2: Planting Plan ----
  doc.addPage();
  y = 25;
  doc.setFontSize(16);
  doc.setTextColor(30, 80, 30);
  doc.text('Planting Plan', margin, y);
  y += 10;

  // Table header
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFillColor(230, 225, 215);
  doc.rect(margin, y - 3, contentW, 7, 'F');
  const cols = [margin, margin + 45, margin + 85, margin + 115, margin + 145];
  doc.text('Plant', cols[0] + 2, y + 1);
  doc.text('Bed', cols[1] + 2, y + 1);
  doc.text('Squares', cols[2] + 2, y + 1);
  doc.text('Spacing', cols[3] + 2, y + 1);
  doc.text('Days to Mature', cols[4] + 2, y + 1);
  y += 8;

  // Collect all plants across beds
  const plantRows: Array<{ plantName: string; bedName: string; count: number; spacing: number; days: number; companions: string }> = [];
  spec.beds.forEach(bed => {
    const counts: Record<string, number> = {};
    bed.squares.flat().forEach(s => {
      if (s.plantId) counts[s.plantId] = (counts[s.plantId] || 0) + 1;
    });
    Object.entries(counts).forEach(([plantId, count]) => {
      const plant = getPlantById(plantId);
      if (plant) {
        plantRows.push({
          plantName: plant.common_name,
          bedName: bed.name,
          count,
          spacing: plant.spacing_per_sqft,
          days: plant.days_to_maturity,
          companions: plant.companions_good.slice(0, 3).join(', '),
        });
      }
    });
  });

  doc.setFontSize(8);
  plantRows.forEach(row => {
    if (y > 260) { doc.addPage(); y = 25; }
    doc.setTextColor(50, 50, 50);
    doc.text(row.plantName, cols[0] + 2, y);
    doc.text(row.bedName, cols[1] + 2, y);
    doc.text(String(row.count), cols[2] + 2, y);
    doc.text(`${row.spacing}/sqft`, cols[3] + 2, y);
    doc.text(`${row.days}d`, cols[4] + 2, y);
    y += 6;
  });

  if (plantRows.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text('No plants placed yet.', margin, y);
  }

  // ---- Page 3: Calendar ----
  doc.addPage();
  y = 25;
  doc.setFontSize(16);
  doc.setTextColor(30, 80, 30);
  doc.text('Monthly Calendar', margin, y);
  y += 10;

  const months = [
    { name: 'March', tasks: ['Start tomato & pepper seeds indoors', 'Plan garden layout', 'Order seeds'] },
    { name: 'April', tasks: ['Start brassica seeds indoors', 'Prepare beds - add compost', 'Harden off seedlings'] },
    { name: 'May', tasks: ['Transplant after last frost (May 10)', 'Direct sow beans, squash, corn', 'Install supports/trellises'] },
    { name: 'June', tasks: ['Succession plant lettuce/radish', 'Mulch beds', 'Monitor for pests'] },
    { name: 'July', tasks: ['Harvest early crops', 'Water consistently', 'Side-dress with fertilizer'] },
    { name: 'August', tasks: ['Plant fall crops (kale, spinach)', 'Continue harvesting', 'Save seeds'] },
    { name: 'September', tasks: ['Harvest remaining warm-season crops before frost (Sep 28)', 'Plant garlic', 'Clean up beds'] },
    { name: 'October', tasks: ['Final harvest', 'Add cover crops or mulch', 'Store tools'] },
  ];

  doc.setFontSize(9);
  months.forEach(m => {
    if (y > 255) { doc.addPage(); y = 25; }
    doc.setFontSize(11);
    doc.setTextColor(30, 80, 30);
    doc.text(m.name, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    m.tasks.forEach(task => {
      doc.text(`  - ${task}`, margin + 3, y);
      y += 5;
    });
    y += 3;
  });

  // ---- Page 4: Shopping List ----
  doc.addPage();
  y = 25;
  doc.setFontSize(16);
  doc.setTextColor(30, 80, 30);
  doc.text('Shopping List', margin, y);
  y += 10;

  if (spec.shoppingList.length > 0) {
    const categories = [...new Set(spec.shoppingList.map(i => i.category))];
    categories.forEach(cat => {
      if (y > 255) { doc.addPage(); y = 25; }
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(cat.replace('_', ' ').toUpperCase(), margin, y);
      y += 6;

      const items = spec.shoppingList.filter(i => i.category === cat);
      doc.setFontSize(8);
      items.forEach(item => {
        if (y > 260) { doc.addPage(); y = 25; }
        const check = item.purchased ? '[x]' : '[ ]';
        doc.setTextColor(item.purchased ? 150 : 50, item.purchased ? 150 : 50, item.purchased ? 150 : 50);
        doc.text(`${check} ${item.name} - ${item.quantity} ${item.unit} - $${item.estimatedCost.toFixed(2)}`, margin + 3, y);
        y += 5;
      });
      y += 3;
    });

    const total = spec.shoppingList.reduce((sum, i) => sum + i.estimatedCost * i.quantity, 0);
    doc.setFontSize(10);
    doc.setTextColor(30, 80, 30);
    doc.text(`Estimated Total: $${total.toFixed(2)}`, margin, y + 5);
  } else {
    // Generate from planted items
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);

    const plantSet = new Set<string>();
    spec.beds.forEach(bed => {
      bed.squares.flat().forEach(s => {
        if (s.plantId) plantSet.add(s.plantId);
      });
    });

    if (plantSet.size > 0) {
      doc.text('Seeds / Transplants Needed:', margin, y);
      y += 6;
      doc.setFontSize(8);
      plantSet.forEach(pid => {
        if (y > 260) { doc.addPage(); y = 25; }
        const plant = getPlantById(pid);
        if (plant) {
          doc.text(`[ ] ${plant.common_name} seeds - ~$3.50/packet`, margin + 3, y);
          y += 5;
        }
      });

      y += 5;
      doc.text('Soil & Amendments:', margin, y);
      y += 6;
      const totalSqFt = spec.beds.reduce((sum, b) => sum + b.widthFt * b.lengthFt, 0);
      doc.text(`[ ] Compost - ${Math.ceil(totalSqFt * 0.5)} cu ft - ~$${(Math.ceil(totalSqFt * 0.5) * 5).toFixed(2)}`, margin + 3, y);
      y += 5;
      doc.text(`[ ] Mulch - ${Math.ceil(totalSqFt * 0.3)} cu ft - ~$${(Math.ceil(totalSqFt * 0.3) * 4).toFixed(2)}`, margin + 3, y);
    } else {
      doc.text('No plants placed yet. Add plants to generate a shopping list.', margin, y);
    }
  }

  // Save
  doc.save('garden-plan.pdf');
}
