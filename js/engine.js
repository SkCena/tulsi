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
    // THE $2000 GROWING VISUALS SYSTEM
    // ==========================================
    getPlantVisuals(type, stage) {
        /*
         * BHAI, LOOK HERE! 
         * To use your own images, simply replace the `return \`<svg>...\`` lines below with:
         * return `<img src="path/to/your/image_stage_1.png" style="width:100%; height:100%; object-fit:contain;">`;
         */
        
        const colors = { water: '#5FD9A4', food: '#F2B33D', exercise: '#FF6B4A' };
        const c = colors[type];
        
        // Dynamic Glowing SVG Generator (Faadu level placeholders)
        let visualHTML = '';
        
        if (stage === 0) {
            visualHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4 4" opacity="0.3"/></svg>`;
        } else if (stage === 1 || stage === 2) {
            visualHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="15" fill="${c}" opacity="0.8"/><circle cx="50" cy="50" r="25" fill="${c}" opacity="0.2"/></svg>`;
        } else if (stage === 3 || stage === 4) {
            visualHTML = `<svg viewBox="0 0 100 100"><path d="M50 80 Q30 50 50 20 Q70 50 50 80 Z" fill="${c}" opacity="0.9"/><circle cx="50" cy="50" r="30" fill="none" stroke="${c}" stroke-width="1" opacity="0.5"/></svg>`;
        } else {
            // Level 5: The Masterpiece Mandala (Fully Bloomed)
            visualHTML = `<svg viewBox="0 0 100 100">
                <path d="M50 10 Q60 40 90 50 Q60 60 50 90 Q40 60 10 50 Q40 40 50 10 Z" fill="${c}" opacity="0.8"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="1 6"/>
                <circle cx="50" cy="50" r="10" fill="#fff" opacity="0.9"/>
            </svg>`;
        }

        // Wrapper sets the CSS variable for the breathing glow effect in style.css
        return `<div style="--glow-color: ${c}40; width:100%; height:100%;">${visualHTML}</div>`;
    }
};
