window.App = {
    state: { profile: null, targets: null, logDate: '', dailyLog: { meals: [], water: 0, exercise: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }, streaks: { water: 0, food: 0, exercise: 0, lastCheckedDate: '' }, currentTab: 'today' },

    getLocalDate() {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    },

    init() {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(e => console.log(e));
        
        this.loadStorage();
        if (!this.state.profile) {
            document.getElementById('onboarding-wizard').classList.remove('hidden');
        } else {
            this.checkRollover();
            this.Notifications.initAggressive(); 
            document.getElementById('main-app').classList.remove('hidden');
            this.Router.go('today');
        }
    },

    loadStorage() {
        const today = this.getLocalDate();
        this.state.logDate = today;
        this.state.profile = JSON.parse(localStorage.getItem('tulsi_profile') || 'null');
        this.state.targets = JSON.parse(localStorage.getItem('tulsi_targets') || 'null');
        this.state.streaks = JSON.parse(localStorage.getItem('tulsi_streaks') || '{"water":0,"food":0,"exercise":0,"lastCheckedDate":""}');
        this.state.dailyLog = JSON.parse(localStorage.getItem(`tulsi_log_${today}`) || '{"meals":[],"water":0,"exercise":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0}}');
    },

    saveStorage() {
        localStorage.setItem(`tulsi_log_${this.state.logDate}`, JSON.stringify(this.state.dailyLog));
        localStorage.setItem('tulsi_streaks', JSON.stringify(this.state.streaks));
        if (this.state.profile) localStorage.setItem('tulsi_profile', JSON.stringify(this.state.profile));
        if (this.state.targets) localStorage.setItem('tulsi_targets', JSON.stringify(this.state.targets));
    },

    checkRollover() {
        const today = this.state.logDate;
        let lastChecked = this.state.streaks.lastCheckedDate;
        if (!lastChecked || lastChecked === today) { this.state.streaks.lastCheckedDate = today; this.saveStorage(); return; }

        const d = new Date(); d.setDate(d.getDate() - 1);
        const yesterday = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        if (lastChecked === yesterday) {
            const yLog = JSON.parse(localStorage.getItem(`tulsi_log_${yesterday}`) || '{"meals":[],"water":0,"exercise":[],"totals":{"calories":0}}');
            if (yLog.water >= (this.state.targets.water * 0.8)) this.state.streaks.water++; else this.state.streaks.water = 0;
            if ((yLog.meals || []).length >= 2 && yLog.totals.calories >= (this.state.targets.calories * 0.6)) this.state.streaks.food++; else this.state.streaks.food = 0;
            if ((yLog.exercise || []).length > 0) this.state.streaks.exercise++; else this.state.streaks.exercise = 0;
        } else {
            this.state.streaks = { water: 0, food: 0, exercise: 0, lastCheckedDate: today };
        }
        this.state.streaks.lastCheckedDate = today; this.saveStorage();
    },

    // ----------------------------------------------------
    // WIZARD LOGIC (Fixed & Restored)
    // ----------------------------------------------------
    Wizard: {
        step: 1,
        maxSteps: 4,
        next() {
            if (this.step < this.maxSteps) {
                document.getElementById(`step-${this.step}`).classList.add('hidden');
                this.step++;
                document.getElementById(`step-${this.step}`).classList.remove('hidden');
                document.getElementById('ob-progress').style.width = `${(this.step / this.maxSteps) * 100}%`;
            }
        },
        prev() {
            if (this.step > 1) {
                document.getElementById(`step-${this.step}`).classList.add('hidden');
                this.step--;
                document.getElementById(`step-${this.step}`).classList.remove('hidden');
                document.getElementById('ob-progress').style.width = `${(this.step / this.maxSteps) * 100}%`;
            }
        },
        finish() {
            const p = {
                name: document.getElementById('ob-name').value || 'Friend',
                gender: document.getElementById('ob-gender').value,
                age: parseInt(document.getElementById('ob-age').value) || 25,
                height: parseInt(document.getElementById('ob-height').value) || 170,
                weight: parseFloat(document.getElementById('ob-weight').value) || 70,
                diet: document.getElementById('ob-diet').value,
                region: document.getElementById('ob-region').value,
                goal: document.getElementById('ob-goal').value,
                activity: document.getElementById('ob-activity').value,
                wakeTime: document.getElementById('ob-wake').value,
                sleepTime: document.getElementById('ob-sleep').value,
                dislikes: []
            };
            
            App.state.profile = p;
            App.state.targets = Engine.calcTargets(p);
            
            const rems = [
                { id: 'r1', label: 'Morning Hydration', time: p.wakeTime, enabled: true, type: 'water' },
                { id: 'r2', label: 'Lunch', time: '13:30', enabled: true, type: 'food' },
                { id: 'r3', label: 'Evening Walk', time: '18:00', enabled: true, type: 'exercise' },
                { id: 'r4', label: 'Dinner', time: '20:30', enabled: true, type: 'food' }
            ];
            localStorage.setItem('tulsi_reminders', JSON.stringify(rems));
            
            const wh = [{ date: App.state.logDate, weight: p.weight }];
            localStorage.setItem('tulsi_weight_history', JSON.stringify(wh));

            App.saveStorage();
            
            document.getElementById('onboarding-wizard').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            App.init();
        }
    },

    Router: {
        go(tab, element) {
            if (App.state.logDate !== App.getLocalDate()) { App.loadStorage(); App.checkRollover(); }
            App.state.currentTab = tab;
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            if(element) element.classList.add('active');
            
            const container = document.getElementById('tab-content');
            document.getElementById('hdr-greeting').innerText = tab === 'today' ? `Hello, ${App.state.profile.name}` : tab.charAt(0).toUpperCase() + tab.slice(1);
            
            container.innerHTML = App.Views[tab.charAt(0).toUpperCase() + tab.slice(1)]();
            if (tab === 'track') App.DrawChart();
            
            if (tab === 'today') {
                setTimeout(() => {
                    const fill = document.querySelector('.ring-fill');
                    if(fill) {
                        const calPercent = Math.min(100, (App.state.dailyLog.totals.calories / App.state.targets.calories) * 100);
                        // Using dashoffset mapping for stroke-dasharray: 283 logic from your CSS
                        const dashOffset = 283 - ((calPercent / 100) * 283);
                        fill.style.strokeDashoffset = dashOffset;
                    }
                    // Trigger scaleX for macro bars
                    const bars = document.querySelectorAll('.bar-fill');
                    bars.forEach(bar => {
                        const widthPct = bar.getAttribute('data-width');
                        bar.style.setProperty('--pct', widthPct / 100);
                    });
                }, 50);
            }
        }
    },

    // ----------------------------------------------------
    // VIEWS (Fixed & Restored)
    // ----------------------------------------------------
    Views: {
        Today() {
            const { log, target, streaks } = { log: App.state.dailyLog, target: App.state.targets, streaks: App.state.streaks };
            const wStage = Engine.plantStage(streaks.water);
            const fStage = Engine.plantStage(streaks.food);
            const eStage = Engine.plantStage(streaks.exercise);
            
            const pPct = Math.min(100, (log.totals.protein/target.protein)*100);
            const cPct = Math.min(100, (log.totals.carbs/target.carbs)*100);
            const fPct = Math.min(100, (log.totals.fat/target.fat)*100);
            const waterPct = Math.min(100, (log.water/target.water)*100);

            return `
                <div class="card">
                    <div class="macro-ring-container">
                        <div class="ring-wrapper">
                            <svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="45"></circle><circle class="ring-fill" cx="50" cy="50" r="45" style="stroke-dashoffset: 283;"></circle></svg>
                            <div class="ring-text">
                                <span class="val mono" style="color:var(--accent-food)">${log.totals.calories}</span>
                                <span class="lbl">/ ${target.calories} kcal</span>
                            </div>
                        </div>
                        <div class="macro-bars">
                            <div class="macro-bar"><div class="flex-between" style="font-size:0.8rem"><span style="color:#E88B7D">Protein</span><span class="mono">${log.totals.protein}/${target.protein}g</span></div><div class="bar-track"><div class="bar-fill fill-protein" data-width="${pPct}"></div></div></div>
                            <div class="macro-bar"><div class="flex-between" style="font-size:0.8rem"><span style="color:#E5C384">Carbs</span><span class="mono">${log.totals.carbs}/${target.carbs}g</span></div><div class="bar-track"><div class="bar-fill fill-carbs" data-width="${cPct}"></div></div></div>
                            <div class="macro-bar"><div class="flex-between" style="font-size:0.8rem"><span style="color:#86A8E7">Fat</span><span class="mono">${log.totals.fat}/${target.fat}g</span></div><div class="bar-track"><div class="bar-fill fill-fat" data-width="${fPct}"></div></div></div>
                        </div>
                    </div>
                </div>

                <div class="plants-row">
                    <div class="plant-card">
                        <span class="streak streak-water">${streaks.water} Days</span>
                        <div class="plant-visual">${Engine.getPlantVisuals('water', wStage)}</div>
                        <span class="plant-stage-label" style="text-transform:uppercase;">Hydration</span>
                    </div>
                    <div class="plant-card">
                        <span class="streak streak-food">${streaks.food} Days</span>
                        <div class="plant-visual">${Engine.getPlantVisuals('food', fStage)}</div>
                        <span class="plant-stage-label" style="text-transform:uppercase;">Nutrition</span>
                    </div>
                    <div class="plant-card">
                        <span class="streak streak-exercise">${streaks.exercise} Days</span>
                        <div class="plant-visual">${Engine.getPlantVisuals('exercise', eStage)}</div>
                        <span class="plant-stage-label" style="text-transform:uppercase;">Activity</span>
                    </div>
                </div>

                <div class="card" style="margin-top: 24px;">
                    <div class="flex-between">
                        <div><h4 style="letter-spacing:0.5px;">Water Intake</h4><p class="text-secondary mono" style="font-size:0.85rem">${log.water} / ${target.water} ml</p></div>
                        <button class="btn-secondary" style="color:var(--accent-water); border-color:var(--accent-water);" onclick="App.Actions.addWater()">+ 250ml</button>
                    </div>
                    <div class="bar-track" style="margin-top:16px;"><div class="bar-fill" style="background:var(--accent-water);" data-width="${waterPct}"></div></div>
                </div>
                
                <button class="btn-secondary" style="width:100%; color:var(--accent-exercise); background:transparent; border:1px solid rgba(255,255,255,0.1);" onclick="App.Actions.quickExercise()">+ Log Quick Activity</button>
            `;
        },
        Log() {
            let html = `
                <div class="card" style="padding:16px;">
                    <input type="text" id="food-search" placeholder="Search foods..." oninput="App.Actions.searchFood(this.value)">
                    <div id="search-results"></div>
                </div>
                <h3 class="display-font" style="margin-top:24px; margin-bottom:12px;">Today's Log</h3>
            `;
            if (App.state.dailyLog.meals.length === 0) {
                html += `<p class="text-secondary" style="text-align:center; padding: 24px;">No food logged today.</p>`;
            } else {
                App.state.dailyLog.meals.forEach((m, idx) => {
                    const f = window.FOOD_DB.find(x => x.id === m.foodId) || { name: 'Unknown', cal: 0, protein: 0 };
                    html += `
                        <div class="food-item card" style="padding:16px; margin-bottom:12px;">
                            <div class="food-info">
                                <h4>${f.name} <span class="text-secondary" style="font-size:0.8rem">x${m.qty}</span></h4>
                                <span class="food-meta">${m.mealType.toUpperCase()} • ${Math.round(f.protein * m.qty)}g Protein</span>
                            </div>
                            <div style="text-align:right;">
                                <div class="food-cal">${Math.round(f.cal * m.qty)} kcal</div>
                                <button style="background:none; color:#FF6B4A; font-size:0.75rem; margin-top:4px;" onclick="App.Actions.removeMeal(${idx})">Remove</button>
                            </div>
                        </div>
                    `;
                });
            }
            // Trigger animation for any bars drawn here (none by default, but safe to call)
            setTimeout(() => {
                const bars = document.querySelectorAll('.bar-fill');
                bars.forEach(bar => { bar.style.setProperty('--pct', bar.getAttribute('data-width') / 100); });
            }, 50);
            return html;
        },
        Suggest() {
            const hr = new Date().getHours();
            let mealType = 'snack';
            if (hr > 5 && hr < 11) mealType = 'breakfast';
            else if (hr >= 11 && hr < 16) mealType = 'lunch';
            else if (hr >= 19 && hr < 23) mealType = 'dinner';

            const remaining = { calories: App.state.targets.calories - App.state.dailyLog.totals.calories };
            const suggestions = Engine.suggestFoods(mealType, remaining, App.state.profile);

            let html = `
                <div style="margin-bottom: 24px;">
                    <p class="text-secondary">Smart suggestions for <strong style="color:var(--text-primary)">${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</strong>.</p>
                </div>
            `;

            suggestions.forEach(f => {
                html += `
                    <div class="card" style="padding: 16px;">
                        <div class="flex-between" style="align-items:flex-start;">
                            <div class="food-info">
                                <h4>${f.name}</h4>
                                <span class="food-meta">${f.serving}</span>
                                <div class="suggestion-reason">${f.reason}</div>
                            </div>
                            <div style="text-align:right;">
                                <div class="food-cal">${f.cal} kcal</div>
                                <div class="text-secondary mono" style="font-size:0.75rem;">P: ${f.protein}g</div>
                            </div>
                        </div>
                        <button class="btn-secondary" style="width:100%; margin-top:12px;" onclick="App.Actions.logFood('${f.id}', '${mealType}', 1)">+ Log This</button>
                    </div>
                `;
            });
            return html;
        },
        Track() {
            const wh = JSON.parse(localStorage.getItem('tulsi_weight_history') || '[]');
            const currentWeight = wh.length ? wh[wh.length - 1].weight : (App.state.profile ? App.state.profile.weight : '--');
            return `
                <div class="card flex-between">
                    <div>
                        <p class="text-secondary" style="font-size:0.8rem">Current Weight</p>
                        <h2 class="mono" style="color:var(--accent-food)">${currentWeight} kg</h2>
                    </div>
                    <button class="btn-secondary" onclick="App.Actions.logWeight()">Update</button>
                </div>
                <canvas id="weight-chart"></canvas>
                
                <h3 class="display-font" style="margin-top:24px; margin-bottom:12px;">Recent Days</h3>
                <p class="text-secondary" style="font-size:0.8rem;">To view past days, check the JSON export in Settings.</p>
            `;
        }
    },

    // ----------------------------------------------------
    // ACTIONS (Fixed & Restored)
    // ----------------------------------------------------
    Actions: {
        addWater() {
            App.state.dailyLog.water += 250;
            App.saveStorage();
            App.Router.go('today', document.querySelector('[data-tab="today"]'));
        },
        quickExercise() {
            const min = prompt("How many minutes of activity?", "30");
            if (min && !isNaN(min)) {
                App.state.dailyLog.exercise.push({ type: 'quick', minutes: parseInt(min), loggedAt: new Date().toISOString() });
                App.saveStorage();
                App.Router.go('today', document.querySelector('[data-tab="today"]'));
            }
        },
        searchFood(q) {
            const resDiv = document.getElementById('search-results');
            if (q.length < 2) { resDiv.innerHTML = ''; return; }
            q = q.toLowerCase();
            const results = window.FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 5);
            let html = '';
            results.forEach(f => {
                html += `
                    <div class="food-item card" style="cursor:pointer; padding:12px; border:1px solid rgba(255,255,255,0.05);" onclick="App.Actions.promptFood('${f.id}')">
                        <div>
                            <h4 style="margin-bottom:2px;">${f.name}</h4>
                            <span class="text-secondary mono" style="font-size:0.8rem">${f.cal} kcal | P:${f.protein}g</span>
                        </div>
                        <span style="color:var(--accent-food); font-size:1.2rem;">+</span>
                    </div>
                `;
            });
            resDiv.innerHTML = html;
        },
        promptFood(id) {
            const f = window.FOOD_DB.find(x => x.id === id);
            const qtyStr = prompt(`Logging ${f.name}. Enter quantity multiplier (e.g., 0.5 for half, 2 for double):`, "1");
            const qty = parseFloat(qtyStr);
            if (qty && qty > 0) {
                const hr = new Date().getHours();
                let mealType = 'snack';
                if (hr > 5 && hr < 11) mealType = 'breakfast';
                else if (hr >= 11 && hr < 16) mealType = 'lunch';
                else if (hr >= 19 && hr < 23) mealType = 'dinner';
                
                this.logFood(id, mealType, qty);
                document.getElementById('food-search').value = '';
                document.getElementById('search-results').innerHTML = '';
            }
        },
        logFood(id, mealType, qty) {
            const f = window.FOOD_DB.find(x => x.id === id);
            App.state.dailyLog.meals.push({ foodId: id, mealType, qty, loggedAt: new Date().toISOString() });
            
            App.state.dailyLog.totals.calories = Math.round(App.state.dailyLog.totals.calories + (f.cal * qty));
            App.state.dailyLog.totals.protein = Math.round(App.state.dailyLog.totals.protein + (f.protein * qty));
            App.state.dailyLog.totals.carbs = Math.round(App.state.dailyLog.totals.carbs + (f.carbs * qty));
            App.state.dailyLog.totals.fat = Math.round(App.state.dailyLog.totals.fat + (f.fat * qty));
            
            App.saveStorage();
            App.Router.go('log', document.querySelector('[data-tab="log"]'));
        },
        removeMeal(index) {
            const m = App.state.dailyLog.meals[index];
            const f = window.FOOD_DB.find(x => x.id === m.foodId);
            
            App.state.dailyLog.totals.calories = Math.max(0, Math.round(App.state.dailyLog.totals.calories - (f.cal * m.qty)));
            App.state.dailyLog.totals.protein = Math.max(0, Math.round(App.state.dailyLog.totals.protein - (f.protein * m.qty)));
            App.state.dailyLog.totals.carbs = Math.max(0, Math.round(App.state.dailyLog.totals.carbs - (f.carbs * m.qty)));
            App.state.dailyLog.totals.fat = Math.max(0, Math.round(App.state.dailyLog.totals.fat - (f.fat * m.qty)));
            
            App.state.dailyLog.meals.splice(index, 1);
            App.saveStorage();
            App.Router.go('log', document.querySelector('[data-tab="log"]'));
        },
        logWeight() {
            const wtStr = prompt("Enter today's weight in kg:", App.state.profile.weight);
            const wt = parseFloat(wtStr);
            if (wt && wt > 20) {
                const wh = JSON.parse(localStorage.getItem('tulsi_weight_history') || '[]');
                if (wh.length > 0 && wh[wh.length-1].date === App.state.logDate) {
                    wh[wh.length-1].weight = wt;
                } else {
                    wh.push({ date: App.state.logDate, weight: wt });
                }
                localStorage.setItem('tulsi_weight_history', JSON.stringify(wh));
                App.state.profile.weight = wt;
                App.state.targets = Engine.calcTargets(App.state.profile);
                App.saveStorage();
                App.Router.go('track', document.querySelector('[data-tab="track"]'));
            }
        }
    },

    DrawChart() {
        const canvas = document.getElementById('weight-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const wh = JSON.parse(localStorage.getItem('tulsi_weight_history') || '[]');
        if (wh.length < 2) {
            ctx.fillStyle = '#A1A4C1';
            ctx.font = '12px Inter';
            ctx.fillText("Log more days to see chart.", 20, 100);
            return;
        }
        
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * 2; canvas.height = h * 2;
        ctx.scale(2, 2);
        
        const pad = 20;
        const maxWt = Math.max(...wh.map(d => d.weight)) + 1;
        const minWt = Math.min(...wh.map(d => d.weight)) - 1;
        
        ctx.beginPath();
        ctx.strokeStyle = '#F2B33D';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        wh.forEach((pt, i) => {
            const x = pad + (i / (wh.length - 1)) * (w - pad * 2);
            const y = h - pad - ((pt.weight - minWt) / (maxWt - minWt)) * (h - pad * 2);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    },

    // ----------------------------------------------------
    // SETTINGS (Fixed & Restored)
    // ----------------------------------------------------
    Settings: {
        open() {
            const modal = document.getElementById('modals');
            modal.innerHTML = `
                <div class="modal-overlay" onclick="App.Settings.close(event)">
                    <div class="modal-content" onclick="event.stopPropagation()">
                        <div class="flex-between" style="margin-bottom: 24px;">
                            <h2 class="display-font">Settings</h2>
                            <button onclick="App.Settings.close(event)" style="background:none; color:var(--text-secondary); font-size:1.5rem;">&times;</button>
                        </div>
                        <p class="text-secondary" style="font-size:0.85rem; margin-bottom:16px;">Tulsi operates 100% offline. All data is only on this device.</p>
                        
                        <button class="btn-secondary" style="width:100%; margin-bottom:12px; text-align:left;" onclick="App.Notifications.requestPermission()">Test / Re-enable Notifications</button>
                        <button class="btn-secondary" style="width:100%; margin-bottom:12px; text-align:left;" onclick="App.Settings.exportData()">Export Data (JSON)</button>
                        <button class="btn-secondary" style="width:100%; color:#FF6B4A; text-align:left;" onclick="App.Settings.resetData()">Erase All Data</button>
                    </div>
                </div>
            `;
        },
        close(e) { if(e) e.preventDefault(); document.getElementById('modals').innerHTML = ''; },
        exportData() {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('tulsi_')) {
                    try { data[key] = JSON.parse(localStorage.getItem(key)); } 
                    catch(e) { data[key] = localStorage.getItem(key); }
                }
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `tulsi_export_${App.getLocalDate()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },
        resetData() {
            if (confirm("Are you absolutely sure? This will delete all your offline data permanently.")) {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    if (localStorage.key(i).startsWith('tulsi_')) keys.push(localStorage.key(i));
                }
                keys.forEach(k => localStorage.removeItem(k));
                location.reload();
            }
        }
    },

    // ----------------------------------------------------
    // NOTIFICATIONS ENGINE
    // ----------------------------------------------------
    Notifications: {
        timer: null,
        initAggressive() {
            this.checkReminders();
            if(this.timer) clearInterval(this.timer);
            this.timer = setInterval(() => this.checkReminders(), 60000);
            
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === 'visible') {
                    console.log("App woke up. Catching up on missed notifications.");
                    this.checkReminders();
                }
            });
        },
        requestPermission() {
            if (!("Notification" in window)) { alert("Background notifications blocked by OS. Use App regularly!"); return; }
            try {
                Notification.requestPermission().then(p => { if (p === "granted") alert("Premium Notifications Armed."); });
            } catch (e) { alert("Background notifications blocked by OS."); }
        },
        checkReminders() {
            if (!("Notification" in window) || Notification.permission !== "granted") return;
            
            const rems = JSON.parse(localStorage.getItem('tulsi_reminders') || '[]');
            const now = new Date();
            const hr = now.getHours().toString().padStart(2, '0');
            const mn = now.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hr}:${mn}`; 
            const today = App.getLocalDate();

            let state = JSON.parse(localStorage.getItem('tulsi_reminders_state') || '{}');
            if (state.date !== today) state = { date: today, fired: [] };

            rems.forEach(r => {
                if (r.enabled && r.time <= timeStr && !state.fired.includes(r.id)) {
                    this.fire(`Tulsi: ${r.label}`, `Stay consistent. Time for your ${r.type} check-in.`);
                    state.fired.push(r.id);
                }
            });
            localStorage.setItem('tulsi_reminders_state', JSON.stringify(state));
        },
                fire(title, body) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    // YAHAN PATH CHANGE KIYA HAI TERE ASSETS FOLDER KE HISAAB SE
                    reg.showNotification(title, { body: body, icon: 'assets/Icon_192.png', badge: 'assets/Icon_192.png', vibrate: [200, 100, 200] });
                });
            } else { new Notification(title, { body: body }); }
        }

    }
};

window.onload = () => App.init();
