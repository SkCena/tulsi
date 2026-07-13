// ============================================================
// plants.js — Procedural SVG growth visuals
// Three living illustrations (Water/Food/Exercise), 6 stages each (0-5).
// Pure inline SVG (no external images, no emoji) so it stays crisp at
// any size, themeable via the same CSS variables as the rest of the app,
// and animates using only transform/opacity so it stays on the GPU
// compositor thread — critical for a steady 60fps feel.
// ============================================================

window.Plants = {

    // Reusable soft glow disc sitting behind every stage
    _glow(color, radius = 46) {
        return `<circle cx="60" cy="72" r="${radius}" fill="url(#glow-${color})" opacity="0.55"/>`;
    },

    _defs(id, hex) {
        return `
            <radialGradient id="glow-${id}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="${hex}" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="${hex}" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="stem-${id}" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#3B6B4A"/>
                <stop offset="100%" stop-color="#5FA06E"/>
            </linearGradient>
            <radialGradient id="pot-${id}" cx="35%" cy="20%" r="90%">
                <stop offset="0%" stop-color="#3A3E63"/>
                <stop offset="100%" stop-color="#242846"/>
            </radialGradient>
        `;
    },

    _soil(id) {
        return `<ellipse cx="60" cy="98" rx="30" ry="7" fill="url(#pot-${id})"/>`;
    },

    _leaf(cx, cy, rot, scale, fill) {
        return `<path d="M0,0 C 6,-14 18,-14 22,0 C 18,6 6,6 0,0 Z"
                    transform="translate(${cx},${cy}) rotate(${rot}) scale(${scale})"
                    fill="${fill}"/>`;
    },

    // ---------- WATER: droplet -> lotus (teal) ----------
    water(stage) {
        const c = '#5FD9A4', id = 'w';
        const defs = this._defs(id, c);
        let art = '';
        switch (stage) {
            case 0:
                art = `${this._soil(id)}<ellipse cx="60" cy="97" rx="14" ry="2.5" fill="#1A1D35" opacity="0.6"/>`;
                break;
            case 1:
                art = `${this._soil(id)}
                    <path d="M60,68 C68,80 68,92 60,92 C52,92 52,80 60,68 Z" fill="${c}"/>
                    <ellipse cx="56" cy="80" rx="2.5" ry="4" fill="#EAFBF3" opacity="0.6"/>`;
                break;
            case 2:
                art = `${this._soil(id)}
                    <path d="M60,86 C60,74 60,66 60,60" stroke="url(#stem-${id})" stroke-width="3" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 78, -25, 0.6, c)}${this._leaf(60, 82, 25, 0.6, c)}
                    <circle cx="60" cy="58" r="5" fill="${c}"/>`;
                break;
            case 3:
                art = `${this._soil(id)}
                    <path d="M60,92 C60,76 60,60 60,48" stroke="url(#stem-${id})" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 80, -30, 0.85, c)}${this._leaf(60, 86, 30, 0.85, c)}
                    <g transform="translate(60,46)">
                        <ellipse rx="7" ry="11" fill="${c}"/>
                        <ellipse rx="7" ry="11" fill="${c}" transform="rotate(50)"/>
                        <ellipse rx="7" ry="11" fill="${c}" transform="rotate(-50)"/>
                    </g>`;
                break;
            case 4:
                art = `${this._soil(id)}
                    <path d="M60,92 C60,72 60,54 60,42" stroke="url(#stem-${id})" stroke-width="4" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 82, -32, 1, c)}${this._leaf(60, 88, 32, 1, c)}
                    <g transform="translate(60,40)">
                        ${[0,60,120,180,240,300].map(a=>`<ellipse rx="8" ry="14" fill="${c}" opacity="0.95" transform="rotate(${a})"/>`).join('')}
                        <circle r="5" fill="#EAFBF3"/>
                    </g>`;
                break;
            default:
                art = `${this._soil(id)}
                    <path d="M60,92 C60,70 60,50 60,38" stroke="url(#stem-${id})" stroke-width="4" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 84, -34, 1.1, c)}${this._leaf(60, 90, 34, 1.1, c)}
                    <g transform="translate(60,36)" class="plant-bloom">
                        ${[0,45,90,135,180,225,270,315].map(a=>`<ellipse rx="9" ry="16" fill="${c}" opacity="0.95" transform="rotate(${a})"/>`).join('')}
                        <circle r="6" fill="#FFFFFF"/>
                    </g>
                    <g class="plant-sparkle" opacity="0.9">
                        <circle cx="34" cy="30" r="2" fill="${c}"/><circle cx="88" cy="26" r="1.6" fill="${c}"/><circle cx="90" cy="52" r="1.4" fill="${c}"/>
                    </g>`;
        }
        return this._wrap(id, c, defs, art);
    },

    // ---------- FOOD: seed -> Tulsi in a pot, with a diya at full bloom (gold) ----------
    food(stage) {
        const c = '#F2B33D', id = 'f';
        const defs = this._defs(id, c);
        const potBase = `<path d="M44,92 L48,104 L72,104 L76,92 Z" fill="url(#pot-${id})"/><ellipse cx="60" cy="92" rx="16" ry="3.5" fill="#2E3252"/>`;
        let art = '';
        switch (stage) {
            case 0:
                art = `${potBase}<ellipse cx="60" cy="90" rx="4" ry="1.6" fill="#161829"/>`;
                break;
            case 1:
                art = `${potBase}
                    <path d="M60,90 C60,84 60,80 60,76" stroke="url(#stem-${id})" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 78, -20, 0.5, c)}${this._leaf(60, 78, 20, 0.5, c)}`;
                break;
            case 2:
                art = `${potBase}
                    <path d="M60,90 C60,80 60,70 60,64" stroke="url(#stem-${id})" stroke-width="3" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 80, -28, 0.75, c)}${this._leaf(60, 74, 28, 0.75, c)}${this._leaf(60, 68, -22, 0.6, c)}`;
                break;
            case 3:
                art = `${potBase}
                    <path d="M60,90 C60,76 60,62 60,52" stroke="url(#stem-${id})" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 82, -30, 0.9, c)}${this._leaf(60, 74, 30, 0.9, c)}
                    ${this._leaf(60, 64, -26, 0.8, c)}${this._leaf(60, 56, 26, 0.8, c)}`;
                break;
            case 4:
                art = `${potBase}
                    <path d="M60,90 C60,72 60,54 60,44" stroke="url(#stem-${id})" stroke-width="4" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 82, -32, 1, c)}${this._leaf(60, 72, 32, 1, c)}
                    ${this._leaf(60, 62, -28, 0.9, c)}${this._leaf(60, 52, 28, 0.9, c)}
                    <circle cx="60" cy="42" r="4" fill="${c}"/>`;
                break;
            default:
                art = `${potBase}
                    <path d="M60,90 C60,68 60,50 60,40" stroke="url(#stem-${id})" stroke-width="4" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 82, -34, 1.05, c)}${this._leaf(60, 70, 34, 1.05, c)}
                    ${this._leaf(60, 60, -30, 0.95, c)}${this._leaf(60, 50, 30, 0.95, c)}
                    <g transform="translate(60,38)" class="plant-bloom">
                        ${[0,72,144,216,288].map(a=>`<ellipse rx="5" ry="9" fill="#FFD98A" opacity="0.95" transform="rotate(${a})"/>`).join('')}
                        <circle r="3" fill="#FFF6E0"/>
                    </g>
                    <g transform="translate(84,86)" class="plant-diya">
                        <ellipse cx="0" cy="4" rx="8" ry="3" fill="#4A3418"/>
                        <path d="M-8,4 C-8,-2 8,-2 8,4 Z" fill="#B87B2A"/>
                        <ellipse cx="0" cy="-3" rx="2.2" ry="4" fill="#FFD98A" class="diya-flame"/>
                    </g>`;
        }
        return this._wrap(id, c, defs, art);
    },

    // ---------- EXERCISE: rock -> strong tree (coral) ----------
    exercise(stage) {
        const c = '#FF6B4A', id = 'e';
        const defs = this._defs(id, c);
        let art = '';
        switch (stage) {
            case 0:
                art = `${this._soil(id)}<ellipse cx="60" cy="94" rx="9" ry="5" fill="#3A3E63"/>`;
                break;
            case 1:
                art = `${this._soil(id)}
                    <path d="M60,92 C60,86 60,82 60,78" stroke="url(#stem-${id})" stroke-width="3" fill="none" stroke-linecap="round"/>
                    ${this._leaf(60, 80, -22, 0.55, c)}${this._leaf(60, 80, 22, 0.55, c)}`;
                break;
            case 2:
                art = `${this._soil(id)}
                    <path d="M60,92 C60,80 59,70 58,62" stroke="url(#stem-${id})" stroke-width="4" fill="none" stroke-linecap="round"/>
                    <path d="M58,74 L48,68 M58,80 L70,74" stroke="#5FA06E" stroke-width="2.5" stroke-linecap="round"/>
                    ${this._leaf(48, 68, -10, 0.55, c)}${this._leaf(70, 74, 10, 0.55, c)}`;
                break;
            case 3:
                art = `${this._soil(id)}
                    <path d="M60,92 C58,78 60,62 58,50" stroke="url(#stem-${id})" stroke-width="5" fill="none" stroke-linecap="round"/>
                    <path d="M59,72 L46,64 M58,60 L72,52 M59,80 L72,76" stroke="#5FA06E" stroke-width="3" stroke-linecap="round" fill="none"/>
                    ${this._leaf(46,64,-14,0.7,c)}${this._leaf(72,52,14,0.7,c)}${this._leaf(72,76,10,0.6,c)}`;
                break;
            case 4:
                art = `${this._soil(id)}
                    <path d="M60,92 C58,74 62,56 58,40" stroke="url(#stem-${id})" stroke-width="6" fill="none" stroke-linecap="round"/>
                    <path d="M59,68 L42,58 M60,54 L76,44 M58,78 L74,72 M59,44 L48,34" stroke="#5FA06E" stroke-width="3.5" stroke-linecap="round" fill="none"/>
                    ${[[42,58,-16],[76,44,16],[74,72,10],[48,34,-14],[58,40,0]].map(([x,y,r])=>this._leaf(x,y,r,0.8,c)).join('')}`;
                break;
            default:
                art = `${this._soil(id)}
                    <path d="M60,92 C57,72 63,52 58,36" stroke="url(#stem-${id})" stroke-width="7" fill="none" stroke-linecap="round" class="plant-sway"/>
                    <g class="plant-sway">
                        <path d="M59,64 L38,52 M61,50 L80,38 M58,76 L78,68 M59,40 L44,28 M60,36 L74,24" stroke="#5FA06E" stroke-width="4" stroke-linecap="round" fill="none"/>
                        ${[[38,52,-18],[80,38,18],[78,68,12],[44,28,-16],[74,24,14],[58,36,0]].map(([x,y,r])=>this._leaf(x,y,r,0.95,c)).join('')}
                    </g>
                    <g class="plant-sparkle" opacity="0.85">
                        <circle cx="30" cy="34" r="1.6" fill="${c}"/><circle cx="92" cy="30" r="1.8" fill="${c}"/><circle cx="86" cy="60" r="1.4" fill="${c}"/>
                    </g>`;
        }
        return this._wrap(id, c, defs, art);
    },

    _wrap(id, color, defs, art) {
        return `
            <svg viewBox="0 0 120 110" class="plant-svg" role="img" aria-label="Growth visual">
                <defs>${defs}</defs>
                ${this._glow(id)}
                <g class="plant-art">${art}</g>
            </svg>
        `;
    },

    render(type, stage) {
        if (type === 'water') return this.water(stage);
        if (type === 'food') return this.food(stage);
        if (type === 'exercise') return this.exercise(stage);
        return '';
    }
};

