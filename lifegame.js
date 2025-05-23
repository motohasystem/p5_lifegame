// lifegame.js
window.addEventListener("DOMContentLoaded", () => {
    // const title = document.createElement("h1");
    // title.textContent = "🌱 ライフゲーム：はたらく細胞のアルゴリズム";
    // title.style.fontSize = "2em";
    // title.style.marginTop = "0.5em";
    // title.style.textAlign = "center";
    // document.body.insertBefore(title, document.body.firstChild);

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
    const stopButton = document.getElementById("stop");
    const startButton = document.getElementById("start");

    if (!slider || !label || !stopButton || !startButton) {
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

        // 状態履歴を保持（最大履歴数は100に制限）
        let history = [];
        const maxHistory = 100;

        p.setup = () => {
            label.textContent = cellSize;
            updateCanvasSize();
            updateCanvas();
            p.frameRate(10);

            const stopButton = document.getElementById("stop");
            const startButton = document.getElementById("start");

            stopButton.addEventListener("click", () => {
                running = false;
            });

            startButton.addEventListener("click", () => {
                running = true;
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

            // カーソルキーで1サイクル進める/戻すをトリガー
            window.addEventListener("keydown", (e) => {
                if (e.key === "ArrowRight") {
                    window.stepGeneration();
                } else if (e.key === "ArrowLeft") {
                    window.previousGeneration();
                }
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
            if (cellSize >= 40) {
                drawGrid();
            }
            drawCells();
            if (cellSize >= 40) {
                // 次のステップで生まれる細胞と死ぬ細胞を計算（描画用）
                const { bornCells, dieCells } = calculateNextChanges();
                // 生まれる細胞を緑で描画
                p.fill(0, 255, 0, 150);
                for (let pos of bornCells) {
                    let [x, y] = pos.split(",").map(Number);
                    p.rect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
                // 死ぬ細胞を赤で描画
                p.fill(255, 0, 0, 150);
                for (let pos of dieCells) {
                    let [x, y] = pos.split(",").map(Number);
                    p.rect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
            if (running) {
                saveHistory();
                nextGeneration();
            }
        };

        function drawGrid() {
            p.stroke(180);
            p.strokeWeight(1);
            for (let x = 0; x <= cols; x++) {
                p.line(x * cellSize, 0, x * cellSize, rows * cellSize);
            }
            for (let y = 0; y <= rows; y++) {
                p.line(0, y * cellSize, cols * cellSize, y * cellSize);
            }
            p.noStroke();
        }

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

        // 履歴に現在の状態を保存
        function saveHistory() {
            // Setのコピーを作成
            const snapshot = new Set(liveCells);
            history.push(snapshot);
            if (history.length > maxHistory) {
                history.shift();
            }
        }

        function calculateNextChanges() {
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
            let bornCells = new Set();
            let dieCells = new Set();
            // 生存判定と変化判定
            for (let [key, count] of neighborCounts.entries()) {
                let alive = liveCells.has(key);
                if (
                    (alive && (count === 2 || count === 3)) ||
                    (!alive && count === 3)
                ) {
                    newLiveCells.add(key);
                    if (!alive) {
                        bornCells.add(key);
                    }
                } else {
                    if (alive) {
                        dieCells.add(key);
                    }
                }
            }
            // liveCellsに存在してneighborCountsにない細胞は死ぬ
            for (let pos of liveCells) {
                if (!neighborCounts.has(pos)) {
                    dieCells.add(pos);
                }
            }
            return { bornCells, dieCells };
        }

        function nextGeneration() {
            const { bornCells, dieCells } = calculateNextChanges();
            let newLiveCells = new Set([...liveCells]);
            // 生まれる細胞を追加
            for (let pos of bornCells) {
                newLiveCells.add(pos);
            }
            // 死ぬ細胞を削除
            for (let pos of dieCells) {
                newLiveCells.delete(pos);
            }
            liveCells = newLiveCells;
        }

        // ステップ実行用にnextGenerationを外部公開
        window.stepGeneration = () => {
            saveHistory();
            nextGeneration();
        };

        // 1サイクル戻す関数を外部公開
        window.previousGeneration = () => {
            if (history.length === 0) {
                return;
            }
            liveCells = history.pop();
        };

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

        window.clearField = () => {
            liveCells.clear();
            running = false;
        };

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
