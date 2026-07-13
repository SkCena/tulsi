window.Engine = {
    calcBMR(gender, weightKg, heightCm, age) {
        const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        return gender === 'male' ? base + 5 : base - 161;
    },
    activityMultipliers: { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 },
    calcTDEE(bmr, activityLevel) { return bmr * (this.activityMultipliers[activityLevel] || 1.2); },
    calcTargets(profile) {
        const bmr = this.calcBMR(profile.gender, profile.weight, profile.height, profile.age);
        const tdee = this.calcTDEE(bmr, profile.activity);
        let calories = tdee;
        if (profile.goal === 'gain') calories = tdee + 450;
        else if (profile.goal === 'lose') calories = Math.max(1200, tdee - 450);
        
        const proteinPerKg = profile.goal === 'gain' ? 1.8 : profile.goal === 'lose' ? 1.9 : 1.4;
        const protein = profile.weight * proteinPerKg;
        return {
            bmr: Math.round(bmr), tdee: Math.round(tdee), calories: Math.round(calories),
            protein: Math.round(protein), carbs: Math.round(Math.max(0, (calories - (protein*4) - ((calories*0.27)/9)*9) / 4)), 
            fat: Math.round((calories*0.27)/9), water: Math.round((profile.weight * 35) / 250) * 250 
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
    
    // ==========================================
    // PREMIUM VISUALS CONNECTION
    // ==========================================
    getPlantVisuals(type, stage) {
        // Yeh line seedha tere naye plants.js ko trigger karegi!
        if (window.Plants) {
            return window.Plants.render(type, stage);
        } else {
            return `<div style="color:white; font-size:10px;">Loading...</div>`;
        }
    }
};
