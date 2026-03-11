class GaugeGenerator {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
        this.container = document.getElementById('gauge-container');

        // Inputs
        this.styleInput = document.getElementById('gauge-style');
        this.valueInput = document.getElementById('gauge-value');
        this.futureInput = document.getElementById('gauge-future');
        this.colorInput = document.getElementById('gauge-color');

        this.futureColorInput = document.getElementById('gauge-future-color');
        this.thicknessInput = document.getElementById('gauge-thickness');

        // Displays
        this.valueDisplay = document.getElementById('value-display');
        this.futureDisplay = document.getElementById('future-display');
        this.thicknessDisplay = document.getElementById('thickness-display');

        this.init();
    }

    init() {
        // Initial render
        this.renderGauge();

        // Event Listeners
        this.styleInput.addEventListener('change', () => this.renderGauge());
        this.valueInput.addEventListener('input', () => this.update());
        this.futureInput.addEventListener('input', () => this.update());
        this.colorInput.addEventListener('input', () => this.update());

        if (this.futureColorInput) {
            this.futureColorInput.addEventListener('input', () => this.update());
        }
        this.thicknessInput.addEventListener('input', () => this.update());
    }

    getCoordinates(style) {
        if (style === 'semi') {
            return {
                viewBox: "0 0 44 24", // Widened for external texts
                path: `M 7 20 A 15 15 0 0 1 37 20`, // Center X=22, Y=20, R=15
                maxDash: 47.124, // PI * 15
                centerY: 20,
                centerX: 22,
                radius: 15,
                startAngle: -180,
                endAngle: 0
            };
        } else {
            // Circular mode (keeps old behavior generally)
            return {
                viewBox: "0 0 36 36",
                path: `M 18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831`,
                maxDash: 100,
                centerY: 18,
                centerX: 18,
                radius: 15.9155,
                textOffset: { percent: 2, future: -4.5, label: 7 },
                startAngle: -90,
                endAngle: 270
            };
        }
    }

    renderGauge() {
        this.container.innerHTML = '';

        const style = this.styleInput.value;
        const value = parseFloat(this.valueInput.value);
        const futureValue = parseFloat(this.futureInput.value);
        const color = this.colorInput.value;
        const futureColor = this.futureColorInput ? this.futureColorInput.value : "#4ade80";
        const thickness = parseFloat(this.thicknessInput.value);

        const coords = this.getCoordinates(style);

        // Create SVG
        const svg = document.createElementNS(this.svgNS, "svg");
        svg.setAttribute("viewBox", coords.viewBox);
        svg.setAttribute("class", "circular-chart");

        // Background path
        const bgPath = document.createElementNS(this.svgNS, "path");
        bgPath.setAttribute("class", "circle-bg");
        bgPath.setAttribute("d", coords.path);

        if (style === 'semi') {
            // Semi: Very thin, slightly visible background trace (like drawing)
            bgPath.setAttribute("stroke-width", "1");
            bgPath.setAttribute("stroke", color);
            bgPath.setAttribute("stroke-opacity", "0.25");
        } else {
            bgPath.setAttribute("stroke-width", thickness);
            bgPath.setAttribute("stroke", "#e2e8f0");
        }
        this.bgPathElement = bgPath;
        svg.appendChild(bgPath);

        if (style === 'semi') {
            // The precise layout matching the user image

            // 1. Foreground Main Arc
            const path = document.createElementNS(this.svgNS, "path");
            path.setAttribute("class", "circle");
            path.setAttribute("d", coords.path);
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", thickness);
            path.setAttribute("stroke-opacity", "0.85");

            const currentDash = (value / 100) * coords.maxDash;
            setTimeout(() => {
                path.setAttribute("stroke-dasharray", `${currentDash}, ${coords.maxDash}`);
            }, 50);
            this.gaugePathElement = path;
            svg.appendChild(path);

            // 2. Future Needle (matching the current needle style but representing the future value)
            const futureNeedleGroup = document.createElementNS(this.svgNS, "g");
            futureNeedleGroup.setAttribute("class", "needle-group");

            // Render the same polygon shape as the main needle, but painted with the future color
            const futureNeedlePolygon = document.createElementNS(this.svgNS, "polygon");
            futureNeedlePolygon.setAttribute("points", "7,20 22,18.5 22,21.5");
            futureNeedlePolygon.setAttribute("fill", futureColor);

            // Note: The base circle is visually rendered by the main current needle, 
            // so we don't strictly need a second one unless we want the future color on top. 
            // We'll leave it without the base circle so the black base remains dominant at the center.

            futureNeedleGroup.appendChild(futureNeedlePolygon);

            const futureRotation = futureValue * 1.8;
            setTimeout(() => {
                futureNeedleGroup.setAttribute("transform", `rotate(${futureRotation}, 22, 20)`);
            }, 50);
            this.futurePathElement = futureNeedleGroup;
            svg.appendChild(futureNeedleGroup);

            // 3. Central Needle (points to current value)
            const needleGroup = document.createElementNS(this.svgNS, "g");
            needleGroup.setAttribute("class", "needle-group");

            // Base pointing left (-180 degrees)
            const needlePolygon = document.createElementNS(this.svgNS, "polygon");
            needlePolygon.setAttribute("points", "7,20 22,18.5 22,21.5");
            needlePolygon.setAttribute("class", "needle");

            const needleBase = document.createElementNS(this.svgNS, "circle");
            needleBase.setAttribute("cx", "22");
            needleBase.setAttribute("cy", "20");
            needleBase.setAttribute("r", "2.5");
            needleBase.setAttribute("class", "needle-center");

            needleGroup.appendChild(needlePolygon);
            needleGroup.appendChild(needleBase);

            const currentRotation = value * 1.8;
            setTimeout(() => {
                needleGroup.setAttribute("transform", `rotate(${currentRotation}, 22, 20)`);
            }, 50);
            this.needleElement = needleGroup;
            svg.appendChild(needleGroup);

            // 4. Texts
            // Text for current percentage (follows needle tip)
            const textCurrent = document.createElementNS(this.svgNS, "text");
            textCurrent.setAttribute("class", "gauge-text text-current");
            textCurrent.textContent = `${value}%`;

            const calcTextPos = (val) => {
                const angleRad = Math.PI * (val / 100 - 1);
                // Position text 4.5 units beyond the radius (15 + 4.5 = 19.5 radius)
                const x = 22 + 19 * Math.cos(angleRad);
                const y = 20 + 19 * Math.sin(angleRad);
                return { x, y };
            };

            const posCurrent = calcTextPos(value);
            textCurrent.setAttribute("x", posCurrent.x);
            textCurrent.setAttribute("y", posCurrent.y);
            this.textPercentElement = textCurrent;
            svg.appendChild(textCurrent);

            // Text for future percentage (follows the future wedge)
            const textFuture = document.createElementNS(this.svgNS, "text");
            textFuture.setAttribute("class", "gauge-text text-future");
            textFuture.setAttribute("fill", futureColor);
            textFuture.textContent = `${futureValue}%`;

            const posFuture = calcTextPos(futureValue);
            textFuture.setAttribute("x", posFuture.x);
            textFuture.setAttribute("y", posFuture.y);
            this.textFutureElement = textFuture;
            svg.appendChild(textFuture);

        } else {
            // Circular Legacy Mode
            const futurePath = document.createElementNS(this.svgNS, "path");
            futurePath.setAttribute("class", "circle");
            futurePath.setAttribute("d", coords.path);
            futurePath.setAttribute("stroke", color);
            futurePath.setAttribute("stroke-width", thickness);
            futurePath.setAttribute("stroke-opacity", "0.25");

            const futureDash = (futureValue / 100) * coords.maxDash;
            setTimeout(() => {
                futurePath.setAttribute("stroke-dasharray", `${futureDash}, ${coords.maxDash}`);
            }, 50);
            this.futurePathElement = futurePath;

            const path = document.createElementNS(this.svgNS, "path");
            path.setAttribute("class", "circle");
            path.setAttribute("d", coords.path);
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", thickness);

            const currentDash = (value / 100) * coords.maxDash;
            setTimeout(() => {
                path.setAttribute("stroke-dasharray", `${currentDash}, ${coords.maxDash}`);
            }, 50);
            this.gaugePathElement = path;

            svg.appendChild(futurePath);
            svg.appendChild(path);

            const textFuture = document.createElementNS(this.svgNS, "text");
            textFuture.setAttribute("x", "18");
            textFuture.setAttribute("y", coords.centerY + coords.textOffset.future);
            textFuture.setAttribute("class", "future-text");
            textFuture.textContent = `Futuro: ${futureValue}%`;
            this.textFutureElement = textFuture;

            const textPercent = document.createElementNS(this.svgNS, "text");
            textPercent.setAttribute("x", "18");
            textPercent.setAttribute("y", coords.centerY + coords.textOffset.percent);
            textPercent.setAttribute("class", "percentage-text");
            textPercent.textContent = `${value}%`;
            this.textPercentElement = textPercent;

            svg.appendChild(textFuture);
            svg.appendChild(textPercent);
            this.updateTextColor(color);
        }

        this.container.appendChild(svg);
    }

    update() {
        const style = this.styleInput.value;
        const coords = this.getCoordinates(style);
        const value = parseFloat(this.valueInput.value);
        const futureValue = parseFloat(this.futureInput.value);
        const color = this.colorInput.value;
        const futureColor = this.futureColorInput ? this.futureColorInput.value : "#4ade80";
        const thickness = parseFloat(this.thicknessInput.value);

        // Update Displays
        this.valueDisplay.textContent = `${value}%`;
        this.futureDisplay.textContent = `${futureValue}%`;
        this.thicknessDisplay.textContent = thickness;

        const currentDash = (value / 100) * coords.maxDash;

        if (style === 'semi') {
            // Update arc styling
            this.gaugePathElement.setAttribute("stroke-dasharray", `${currentDash}, ${coords.maxDash}`);
            this.gaugePathElement.setAttribute("stroke", color);
            this.gaugePathElement.setAttribute("stroke-width", thickness);

            // the background line should maintain thinness visually
            this.bgPathElement.setAttribute("stroke", color);

            // Update Rotations
            const currentRotation = value * 1.8;
            this.needleElement.setAttribute("transform", `rotate(${currentRotation}, 22, 20)`);

            const futureRotation = futureValue * 1.8;
            this.futurePathElement.setAttribute("transform", `rotate(${futureRotation}, 22, 20)`);

            // Update color of future needle
            if (this.futureNeedlePolygonElement) {
                this.futureNeedlePolygonElement.setAttribute("fill", futureColor);
            }

            // Update texts and exact coordinates
            this.textPercentElement.textContent = `${value}%`;
            this.textFutureElement.textContent = `${futureValue}%`;
            this.textFutureElement.setAttribute("fill", futureColor);

            const calcTextPos = (val) => {
                const angleRad = Math.PI * (val / 100 - 1);
                return {
                    x: 22 + 19 * Math.cos(angleRad),
                    y: 20 + 19 * Math.sin(angleRad)
                };
            };

            const posC = calcTextPos(value);
            this.textPercentElement.setAttribute("x", posC.x);
            this.textPercentElement.setAttribute("y", posC.y);

            const posF = calcTextPos(futureValue);
            this.textFutureElement.setAttribute("x", posF.x);
            this.textFutureElement.setAttribute("y", posF.y);

        } else {
            // Circular Update
            const futureDash = (futureValue / 100) * coords.maxDash;
            this.gaugePathElement.setAttribute("stroke-dasharray", `${currentDash}, ${coords.maxDash}`);
            this.gaugePathElement.setAttribute("stroke", color);
            this.gaugePathElement.setAttribute("stroke-width", thickness);

            this.futurePathElement.setAttribute("stroke-dasharray", `${futureDash}, ${coords.maxDash}`);
            this.futurePathElement.setAttribute("stroke", color);
            this.futurePathElement.setAttribute("stroke-width", thickness);

            this.bgPathElement.setAttribute("stroke-width", thickness);

            this.textPercentElement.textContent = `${value}%`;
            this.textFutureElement.textContent = `Futuro: ${futureValue}%`;

            this.updateTextColor(color);
        }
    }

    updateTextColor(color) {
        if (this.textFutureElement && this.styleInput.value === 'circular') {
            this.textFutureElement.style.fill = color;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GaugeGenerator();
});
