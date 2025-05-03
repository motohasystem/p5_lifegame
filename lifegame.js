// lifegame.js
window.addEventListener("DOMContentLoaded", () => {
    const title = document.createElement("h1");
    title.textContent = "🌱 ライフゲーム：はたらく細胞のアルゴリズム";
    title.style.fontSize = "2em";
    title.style.marginTop = "0.5em";
    title.style.textAlign = "center";
    document.body.insertBefore(title, document.body.firstChild);

    // ルール開閉ボタン対策（遅延防止）
    const ruleToggle = document.getElementById("rule-toggle");
    const ruleContent = document.getElementById("rule-content");
    if (ruleToggle && ruleContent) {
        ruleToggle.addEventListener("click", () => {
            ruleContent.style.display =
                ruleContent.style.display === "none" ? "block" : "none";
        });
        // 初期状態明示とバグ回避用に一度 display を設定
        ruleContent.style.display = "none";
    }

    const slider = document.getElementById("cellSizeSlider");
    const label = document.getElementById("cellSizeLabel");
    const toggleButton = document.getElementById("toggle");

    if (!slider || !label || !toggleButton) {
        console.error(
            "必要なDOM要素が見つかりませんでした。HTMLの読み込み順を確認してください。"
        );
        return;
    }

    new p5((p) => {
        let liveCells = new Set();
        let cellSize = parseInt(slider.value || "10");
        let cols, rows;
        let canvas;
        let running = true;
        let canvasWidth, canvasHeight;

        p.setup = () => {
            label.textContent = cellSize;
            updateCanvasSize();
            updateCanvas();
            p.frameRate(10);

            toggleButton.addEventListener("click", () => {
                running = !running;
                toggleButton.textContent = running
                    ? "⏸️ とめる"
                    : "▶️ うごかす";
            });

            slider.addEventListener("input", () => {
                cellSize = parseInt(slider.value);
                label.textContent = cellSize;
                updateCanvas();
            });

            window.addEventListener("resize", () => {
                updateCanvasSize();
                updateCanvas();
            });
        };

        function updateCanvasSize() {
            canvasWidth = Math.floor(window.innerWidth * 0.9);
            canvasHeight = Math.floor(window.innerHeight * 0.6);
        }

        function updateCanvas() {
            cols = Math.floor(canvasWidth / cellSize);
            rows = Math.floor(canvasHeight / cellSize);
            if (canvas) canvas.remove();
            canvas = p.createCanvas(cols * cellSize, rows * cellSize);
            canvas.parent(document.body);
        }

        p.draw = () => {
            p.background(220);
            drawCells();
            if (running) nextGeneration();
        };

        function drawCells() {
            p.fill(0);
            for (let pos of liveCells) {
                let [x, y] = pos.split(",").map(Number);
                p.rect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }

        function mod(n, m) {
            return ((n % m) + m) % m;
        }

        function nextGeneration() {
            let neighborCounts = new Map();
            for (let pos of liveCells) {
                let [x, y] = pos.split(",").map(Number);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        let nx = mod(x + dx, cols);
                        let ny = mod(y + dy, rows);
                        let key = `${nx},${ny}`;
                        neighborCounts.set(
                            key,
                            (neighborCounts.get(key) || 0) + 1
                        );
                    }
                }
            }
            let newLiveCells = new Set();
            for (let [key, count] of neighborCounts.entries()) {
                let alive = liveCells.has(key);
                if (
                    (alive && (count === 2 || count === 3)) ||
                    (!alive && count === 3)
                ) {
                    newLiveCells.add(key);
                }
            }
            liveCells = newLiveCells;
        }

        function toggleCellUnderMouse() {
            let x = Math.floor(p.mouseX / cellSize);
            let y = Math.floor(p.mouseY / cellSize);
            if (x >= 0 && y >= 0 && x < cols && y < rows) {
                let key = `${x},${y}`;
                if (liveCells.has(key)) {
                    liveCells.delete(key);
                } else {
                    liveCells.add(key);
                }
            }
        }

        p.mousePressed = () => toggleCellUnderMouse();
        p.mouseDragged = () => toggleCellUnderMouse();

        window.clearField = () => liveCells.clear();

        window.placePattern = (name) => {
            const cx = Math.floor(cols / 2);
            const cy = Math.floor(rows / 2);
            clearField();
            const addCell = (x, y) => {
                if (x >= 0 && y >= 0 && x < cols && y < rows) {
                    liveCells.add(`${x},${y}`);
                }
            };
            if (name === "glider") {
                [
                    [0, 1],
                    [1, 2],
                    [2, 0],
                    [2, 1],
                    [2, 2],
                ].forEach(([dx, dy]) => addCell(cx + dx, cy + dy));
            } else if (name === "blinker") {
                [
                    [-1, 0],
                    [0, 0],
                    [1, 0],
                ].forEach(([dx, dy]) => addCell(cx + dx, cy + dy));
            } else if (name === "block") {
                [
                    [0, 0],
                    [0, 1],
                    [1, 0],
                    [1, 1],
                ].forEach(([dx, dy]) => addCell(cx + dx, cy + dy));
            } else if (name === "pulsar") {
                const pattern = [
                    [-6, -4],
                    [-6, -3],
                    [-6, -2],
                    [-1, -4],
                    [-1, -3],
                    [-1, -2],
                    [-4, -6],
                    [-3, -6],
                    [-2, -6],
                    [-4, -1],
                    [-3, -1],
                    [-2, -1],
                    [-4, 1],
                    [-3, 1],
                    [-2, 1],
                    [-4, 6],
                    [-3, 6],
                    [-2, 6],
                    [-1, 4],
                    [-1, 3],
                    [-1, 2],
                    [-6, 4],
                    [-6, 3],
                    [-6, 2],
                    [1, -4],
                    [1, -3],
                    [1, -2],
                    [6, -4],
                    [6, -3],
                    [6, -2],
                    [4, -6],
                    [3, -6],
                    [2, -6],
                    [4, -1],
                    [3, -1],
                    [2, -1],
                    [4, 1],
                    [3, 1],
                    [2, 1],
                    [4, 6],
                    [3, 6],
                    [2, 6],
                    [1, 4],
                    [1, 3],
                    [1, 2],
                    [6, 4],
                    [6, 3],
                    [6, 2],
                ];
                pattern.forEach(([dx, dy]) => addCell(cx + dx, cy + dy));
            } else if (name === "lwss") {
                [
                    [0, 1],
                    [0, 3],
                    [1, 0],
                    [2, 0],
                    [3, 0],
                    [4, 0],
                    [4, 1],
                    [4, 2],
                    [3, 3],
                ].forEach(([dx, dy]) => addCell(cx + dx, cy + dy));
            } else if (name === "glidergun") {
                const pattern = [
                    [1, 5],
                    [1, 6],
                    [2, 5],
                    [2, 6],
                    [11, 5],
                    [11, 6],
                    [11, 7],
                    [12, 4],
                    [12, 8],
                    [13, 3],
                    [13, 9],
                    [14, 3],
                    [14, 9],
                    [15, 6],
                    [16, 4],
                    [16, 8],
                    [17, 5],
                    [17, 6],
                    [17, 7],
                    [18, 6],
                    [21, 3],
                    [21, 4],
                    [21, 5],
                    [22, 3],
                    [22, 4],
                    [22, 5],
                    [23, 2],
                    [23, 6],
                    [25, 1],
                    [25, 2],
                    [25, 6],
                    [25, 7],
                    [35, 3],
                    [35, 4],
                    [36, 3],
                    [36, 4],
                ];
                pattern.forEach(([dx, dy]) =>
                    addCell(cx + dx - 20, cy + dy - 10)
                );
            }
        };
    });
});
