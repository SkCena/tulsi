window.Engine = {
    calcBMR(gender, weightKg, heightCm, age) {
        const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        return gender === 'male' ? base + 5 : base - 161;
    },
    activityMultipliers: { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 },
    calcTDEE(bmr, activityLevel) { return bmr * (this.activityMultipliers[activityLevel] || 1.2); },
    
    // SMART DAN LOGIC: Baseline nikalne ke baad Custom Overrides check karega
    calcTargets(profile, customOverrides = null) {
        const bmr = this.calcBMR(profile.gender, profile.weight, profile.height, profile.age);
        const tdee = this.calcTDEE(bmr, profile.activity);
        
        let calories = tdee;
        if (profile.goal === 'gain') calories = tdee + 450;
        else if (profile.goal === 'lose') calories = Math.max(1200, tdee - 450);

        // Apply Custom Calories if user set them
        if (customOverrides && customOverrides.calories) {
            calories = parseInt(customOverrides.calories);
        }
        
        // Protein is scientifically locked to weight & goal, doesn't blindly scale with junk calories
        const proteinPerKg = profile.goal === 'gain' ? 1.8 : profile.goal === 'lose' ? 1.9 : 1.4;
        const protein = profile.weight * proteinPerKg;
        
        // Auto-recalc Fats and Carbs based on the final Calorie number
        const fat = (calories * 0.27) / 9;
        const carbs = Math.max(0, (calories - (protein * 4) - (fat * 9)) / 4);
        
        let water = Math.round((profile.weight * 35) / 250) * 250;
        // Apply Custom Water if user set it (in ml)
        if (customOverrides && customOverrides.water) {
            water = parseInt(customOverrides.water);
        }

        return {
            bmr: Math.round(bmr), 
            tdee: Math.round(tdee), 
            calories: Math.round(calories),
            protein: Math.round(protein), 
            carbs: Math.round(carbs), 
            fat: Math.round(fat), 
            water: water 
        };
    },
    
    suggestFoods(mealType, remaining, profile, limit = 6) {
        const dietAllowed = { veg: ['veg'], egg: ['veg','egg'], nonveg: ['veg','egg','nonveg'] }[profile.diet] || ['veg'];
        let pool = window.FOOD_DB.filter(f => f.meal.includes(mealType) && dietAllowed.includes(f.diet));
        return pool.map(f => {
            let score = 0;
            if (f.region === profile.region || f.region === 'pan') score += 3;
            if (f.cal <= Math.max(remaining.calories, 100)) score += 2;
            score += (f.protein / Math.max(f.cal, 1)) * 20;
            return { ...f, score, reason: f.region === profile.region ? "Local favorite" : "Good macro fit" };
        }).sort((a, b) => b.score - a.score).slice(0, limit);
    },
    
    plantStage(streak) {
        if (streak === 0) return 0;
        if (streak < 3) return 1;
        if (streak < 7) return 2;
        if (streak < 14) return 3;
        if (streak < 30) return 4;
        return 5;
    },
    
    getPlantVisuals(type, stage) {
        if (window.Plants) { return window.Plants.render(type, stage); } 
        else { return `<div style="color:white; font-size:10px;">Loading...</div>`; }
    }
};
