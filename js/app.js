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
            this.Notifications.initAggressive(); // V1.2 Background Hack
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

    Wizard: { /* ... Keep exact same Wizard code from previous version ... */ },

    Router: {
        go(tab) {
            if (App.state.logDate !== App.getLocalDate()) { App.loadStorage(); App.checkRollover(); }
            App.state.currentTab = tab;
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            const activeNav = document.getElementById('nav-' + tab);
            if(activeNav) activeNav.classList.add('active');
            
            const container = document.getElementById('tab-content');
            document.getElementById('hdr-greeting').innerText = tab === 'today' ? `Hello, ${App.state.profile.name}` : tab.charAt(0).toUpperCase() + tab.slice(1);
            
            // Re-render with fade in class for 60fps smoothness
            container.innerHTML = `<div class="animate-in">${App.Views[tab.charAt(0).toUpperCase() + tab.slice(1)]()}</div>`;
            if (tab === 'track') App.DrawChart();
            
            // Trigger chart ring animation 
            if (tab === 'today') {
                setTimeout(() => {
                    const fill = document.querySelector('.ring-fill');
                    if(fill) {
                        const calPercent = Math.min(100, (App.state.dailyLog.totals.calories / App.state.targets.calories) * 100);
                        fill.style.strokeDasharray = `${(calPercent / 100) * 283} 283`;
                    }
                }, 50);
            }
        }
    },

    Views: {
        Today() {
            const { log, target, streaks } = { log: App.state.dailyLog, target: App.state.targets, streaks: App.state.streaks };
            const wStage = Engine.plantStage(streaks.water);
            const fStage = Engine.plantStage(streaks.food);
            const eStage = Engine.plantStage(streaks.exercise);

            return `
                <div class="glass-panel">
                    <div class="macro-ring-container">
                        <div class="ring-wrapper">
                            <svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="45"></circle><circle class="ring-fill" cx="50" cy="50" r="45" style="stroke-dasharray: 0 283;"></circle></svg>
                            <div class="ring-text">
                                <span class="val mono" style="color:var(--accent-food)">${log.totals.calories}</span>
                                <span class="lbl">/ ${target.calories} kcal</span>
                            </div>
                        </div>
                        <div class="macro-bars">
                            <div class="macro-bar"><div class="flex-between" style="font-size:0.8rem"><span>Protein</span><span class="mono">${log.totals.protein}/${target.protein}g</span></div><div class="bar-track"><div class="bar-fill fill-protein" style="width: ${Math.min(100, log.totals.protein/target.protein*100)}%"></div></div></div>
                            <div class="macro-bar"><div class="flex-between" style="font-size:0.8rem"><span>Carbs</span><span class="mono">${log.totals.carbs}/${target.carbs}g</span></div><div class="bar-track"><div class="bar-fill fill-carbs" style="width: ${Math.min(100, log.totals.carbs/target.carbs*100)}%"></div></div></div>
                            <div class="macro-bar"><div class="flex-between" style="font-size:0.8rem"><span>Fat</span><span class="mono">${log.totals.fat}/${target.fat}g</span></div><div class="bar-track"><div class="bar-fill fill-fat" style="width: ${Math.min(100, log.totals.fat/target.fat*100)}%"></div></div></div>
                        </div>
                    </div>
                </div>

                <div class="plants-row">
                    <div class="plant-card">
                        <span class="streak" style="background:rgba(95, 217, 164, 0.1); color:var(--accent-water)">${streaks.water} Days</span>
                        <div class="plant-icon">${Engine.getPlantVisuals('water', wStage)}</div>
                        <span class="text-secondary" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Hydration</span>
                    </div>
                    <div class="plant-card">
                        <span class="streak" style="background:rgba(242, 179, 61, 0.1); color:var(--accent-food)">${streaks.food} Days</span>
                        <div class="plant-icon">${Engine.getPlantVisuals('food', fStage)}</div>
                        <span class="text-secondary" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Nutrition</span>
                    </div>
                    <div class="plant-card">
                        <span class="streak" style="background:rgba(255, 107, 74, 0.1); color:var(--accent-exercise)">${streaks.exercise} Days</span>
                        <div class="plant-icon">${Engine.getPlantVisuals('exercise', eStage)}</div>
                        <span class="text-secondary" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Activity</span>
                    </div>
                </div>

                <div class="glass-panel" style="margin-top: 24px;">
                    <div class="flex-between">
                        <div><h4 style="letter-spacing:0.5px;">Water Intake</h4><p class="text-secondary mono" style="font-size:0.85rem">${log.water} / ${target.water} ml</p></div>
                        <button class="btn-secondary" style="color:var(--accent-water); border-color:var(--accent-water);" onclick="App.Actions.addWater()">+ Log</button>
                    </div>
                    <div class="bar-track" style="margin-top:16px;"><div class="bar-fill fill-fat" style="width: ${Math.min(100, log.water/target.water*100)}%"></div></div>
                </div>
            `;
        },
        Log() { /* Keep exact logic, but wrap outer divs with class="glass-panel" for styling */ },
        Suggest() { /* Keep exact logic, wrap cards with class="glass-panel" */ },
        Track() { /* Keep exact logic, wrap top section in class="glass-panel" */ }
    },

    Actions: { /* ... Keep exact Actions from previous code ... */ },
    DrawChart() { /* ... Keep exact Canvas logic from previous code ... */ },
    Settings: { /* ... Keep exact Settings from previous code ... */ },

    // ==========================================
    // V1.2 AGGRESSIVE NOTIFICATION ENGINE
    // ==========================================
    Notifications: {
        timer: null,
        initAggressive() {
            // Check immediately on load
            this.checkReminders();
            // Start the 60s loop while app is open
            if(this.timer) clearInterval(this.timer);
            this.timer = setInterval(() => this.checkReminders(), 60000);
            
            // THE HACK: If Android kills the WebView background process, 
            // this fires the millisecond the user unlocks the phone and brings the app to foreground.
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
            // Fail silently if no permission, don't throw errors
            if (!("Notification" in window) || Notification.permission !== "granted") return;
            
            const rems = JSON.parse(localStorage.getItem('tulsi_reminders') || '[]');
            const now = new Date();
            const hr = now.getHours().toString().padStart(2, '0');
            const mn = now.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hr}:${mn}`; // 24hr format
            const today = App.getLocalDate();

            let state = JSON.parse(localStorage.getItem('tulsi_reminders_state') || '{}');
            if (state.date !== today) state = { date: today, fired: [] };

            rems.forEach(r => {
                // If it's enabled, it's time (or slightly past time due to background sleep), and hasn't fired today
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
                    reg.showNotification(title, { body: body, icon: '/icon.png', badge: '/icon.png', vibrate: [200, 100, 200] });
                });
            } else { new Notification(title, { body: body }); }
        }
    }
};

window.onload = () => App.init();
