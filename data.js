// data.js (standalone for the new repo)
window.LastBiteData = (function () {
  const PARTNERS = [
    "COBS Bread",
    "SanRemo Bakery",
    "Dufflet Pastries",
    "Uncle Tetsu’s Cheesecake",
    "Dimpflmeier Bakery",
    "St. Urbain Bagel Bakery",
    "Athens Pastries",
    "Nadege Patisserie",
    "Kettleman’s Bagels",
    "Krispy Kreme",
    "Revolver Pizza Co."
  ];

  const CATEGORIES = ["Bakery", "Bagels", "Pastries", "Pizza", "Dessert", "Bundles"];

  // Impact factors (simple estimates)
  const IMPACT = {
    kgFoodPerMeal: 0.6,
    kgCO2ePerMeal: 1.8,
    grossProfitPickup: 10.4,
    grossProfitDelivery: 5.4,
    donationRate: 0.05
  };

  // Deals dataset (mobile ordering)
  const DEALS = [
    { id:"cobs-1", partner:"COBS Bread", category:"Bakery", title:"End-of-day Bread Bag", description:"Assorted loaves/rolls (best-of-day selection).", price:6.99, originalValue:18.00, window:"8:00–9:00 PM", windowEnd:"21:00", distanceKm:1.2, deliveryAvailable:false, tags:["Best value"], dietary:["Vegetarian"], emoji:"🥖" },
    { id:"cobs-2", partner:"COBS Bread", category:"Bakery", title:"Pastry Surprise Pack", description:"Mixed pastries (varies by day).", price:7.49, originalValue:19.00, window:"8:00–9:00 PM", windowEnd:"21:00", distanceKm:1.2, deliveryAvailable:true, tags:["Limited"], dietary:["Vegetarian"], emoji:"🥐" },

    { id:"sanremo-1", partner:"SanRemo Bakery", category:"Pastries", title:"Cannoli + Treat Box", description:"Cannoli + assorted sweets (end-of-day).", price:9.99, originalValue:26.00, window:"7:30–8:30 PM", windowEnd:"20:30", distanceKm:2.6, deliveryAvailable:true, tags:["Best value"], dietary:["Vegetarian"], emoji:"🍰" },
    { id:"sanremo-2", partner:"SanRemo Bakery", category:"Bundles", title:"Family Dessert Bundle", description:"A shareable bundle of pastries and squares.", price:12.99, originalValue:34.00, window:"7:30–8:30 PM", windowEnd:"20:30", distanceKm:2.6, deliveryAvailable:false, tags:["Limited"], dietary:["Vegetarian"], emoji:"🧁" },

    { id:"dufflet-1", partner:"Dufflet Pastries", category:"Pastries", title:"Croissant Pack (4)", description:"Four assorted croissants.", price:8.49, originalValue:20.00, window:"6:30–7:30 PM", windowEnd:"19:30", distanceKm:3.1, deliveryAvailable:true, tags:["Best value"], dietary:["Vegetarian"], emoji:"🥐" },
    { id:"dufflet-2", partner:"Dufflet Pastries", category:"Dessert", title:"Cake Slice Duo", description:"Two premium cake slices (selection varies).", price:9.49, originalValue:22.00, window:"6:30–7:30 PM", windowEnd:"19:30", distanceKm:3.1, deliveryAvailable:true, tags:["Limited"], dietary:["Vegetarian"], emoji:"🍰" },

    { id:"tetsu-1", partner:"Uncle Tetsu’s Cheesecake", category:"Dessert", title:"Cheesecake Mini Box", description:"Mini cheesecake slices (end-of-day).", price:10.99, originalValue:28.00, window:"8:00–9:00 PM", windowEnd:"21:00", distanceKm:1.8, deliveryAvailable:true, tags:["Limited"], dietary:["Vegetarian"], emoji:"🧀" },
    { id:"tetsu-2", partner:"Uncle Tetsu’s Cheesecake", category:"Dessert", title:"Baked Treats Pack", description:"Assorted baked treats (varies).", price:7.99, originalValue:20.00, window:"8:00–9:00 PM", windowEnd:"21:00", distanceKm:1.8, deliveryAvailable:false, tags:["Best value"], dietary:["Vegetarian"], emoji:"🍮" },

    { id:"dimpf-1", partner:"Dimpflmeier Bakery", category:"Bakery", title:"Rye + Rolls Bundle", description:"German-style rye + fresh rolls.", price:8.99, originalValue:23.00, window:"6:00–7:00 PM", windowEnd:"19:00", distanceKm:4.4, deliveryAvailable:false, tags:["Best value"], dietary:["Vegetarian"], emoji:"🍞" },

    { id:"urbain-1", partner:"St. Urbain Bagel Bakery", category:"Bagels", title:"Bagel Dozen Surprise", description:"A dozen assorted bagels.", price:6.99, originalValue:16.00, window:"5:30–6:30 PM", windowEnd:"18:30", distanceKm:2.2, deliveryAvailable:true, tags:["Best value"], dietary:["Vegan"], emoji:"🥯" },

    { id:"athens-1", partner:"Athens Pastries", category:"Pastries", title:"Baklava Box", description:"Assorted baklava pieces.", price:9.49, originalValue:24.00, window:"7:00–8:00 PM", windowEnd:"20:00", distanceKm:3.8, deliveryAvailable:true, tags:["Limited"], dietary:["Vegetarian"], emoji:"🍯" },

    { id:"nadege-1", partner:"Nadege Patisserie", category:"Dessert", title:"Macaron + Mini Pack", description:"Macarons + minis (chef’s selection).", price:12.99, originalValue:34.00, window:"8:00–9:00 PM", windowEnd:"21:00", distanceKm:1.9, deliveryAvailable:true, tags:["Limited"], dietary:["Gluten-free"], emoji:"🍬" },

    { id:"kettle-1", partner:"Kettleman’s Bagels", category:"Bagels", title:"Hot Bagel Box", description:"Fresh bagels + cream cheese option.", price:8.49, originalValue:20.00, window:"9:00–10:00 PM", windowEnd:"22:00", distanceKm:2.9, deliveryAvailable:true, tags:["Best value"], dietary:["Vegetarian"], emoji:"🥯" },

    { id:"krispy-1", partner:"Krispy Kreme", category:"Dessert", title:"Donut Dozen (Surplus)", description:"Assorted donuts nearing close.", price:9.99, originalValue:22.00, window:"9:00–10:00 PM", windowEnd:"22:00", distanceKm:3.5, deliveryAvailable:false, tags:["Best value"], dietary:["Vegetarian"], emoji:"🍩" },

    { id:"revolver-1", partner:"Revolver Pizza Co.", category:"Pizza", title:"2-Slice Surprise Box", description:"Two slices + dip (varies).", price:7.99, originalValue:18.00, window:"8:30–9:30 PM", windowEnd:"21:30", distanceKm:1.6, deliveryAvailable:true, tags:["Limited"], dietary:[], emoji:"🍕" },
    { id:"revolver-2", partner:"Revolver Pizza Co.", category:"Pizza", title:"Whole Pie Deal", description:"One surplus pie (limited quantities).", price:12.99, originalValue:28.00, window:"8:30–9:30 PM", windowEnd:"21:30", distanceKm:1.6, deliveryAvailable:true, tags:["Limited","Best value"], dietary:[], emoji:"🍕" }
  ];

  return { PARTNERS, CATEGORIES, IMPACT, DEALS };
})();
