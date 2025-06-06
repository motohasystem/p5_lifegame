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
    const speedSlider = document.getElementById("speedSlider");
    const speedLabel = document.getElementById("speedLabel");
    const stopButton = document.getElementById("stop");
    const startButton = document.getElementById("start");

    if (!slider || !label || !speedSlider || !speedLabel || !stopButton || !startButton) {
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

        // 統計情報用
        let generation = 0;
        let populationHistory = [];
        const maxPopulationHistory = 200;
        let lastGraphUpdate = 0;
        const graphUpdateInterval = 500; // 0.5秒ごとにグラフを更新
        
        // 速度制御用
        let frameRate = parseInt(speedSlider.value || "10");

        p.setup = () => {
            label.textContent = cellSize;
            speedLabel.textContent = frameRate;
            updateCanvasSize();
            updateCanvas();
            p.frameRate(frameRate);

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
            
            speedSlider.addEventListener("input", () => {
                frameRate = parseInt(speedSlider.value);
                speedLabel.textContent = frameRate;
                p.frameRate(frameRate);
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
            // canvasにIDを追加してチュートリアルでハイライトできるようにする
            canvas.canvas.id = "lifegame-canvas";
        }

        p.draw = () => {
            p.background(220);
            if (cellSize >= 40) {
                drawGrid();
            }
            drawCells();
            if (cellSize >= 40 && !running) {
                // 停止中のみ次のステップで生まれる細胞と死ぬ細胞を計算（描画用）
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
            
            // 統計情報を更新
            updateStats();
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
            // 生きている細胞の周囲だけをチェック
            for (let pos of liveCells) {
                let [x, y] = pos.split(",").map(Number);
                // 8近傍を正しくチェック
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue; // 中心はスキップ
                        
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
            generation++;
        }

        // ステップ実行用にnextGenerationを外部公開
        window.stepGeneration = () => {
            saveHistory();
            nextGeneration();
            updateStats();
        };

        // 1サイクル戻す関数を外部公開
        window.previousGeneration = () => {
            if (history.length === 0) {
                return;
            }
            liveCells = history.pop();
            generation = Math.max(0, generation - 1);
            // 人口履歴も戻す
            if (populationHistory.length > 1) {
                populationHistory.pop();
            }
            updateStats();
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
            generation = 0;
            populationHistory = [];
            updateStats();
            drawPopulationGraph();
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

        // 統計情報を更新する関数
        function updateStats() {
            document.getElementById("generation-count").textContent = generation;
            document.getElementById("cell-count").textContent = liveCells.size;
            
            // 人口履歴を記録
            populationHistory.push(liveCells.size);
            if (populationHistory.length > maxPopulationHistory) {
                populationHistory.shift();
            }
            
            // グラフを一定間隔で描画（パフォーマンス向上）
            const now = Date.now();
            if (now - lastGraphUpdate > graphUpdateInterval || !running) {
                drawPopulationGraph();
                lastGraphUpdate = now;
            }
        }

        // 人口グラフを描画する関数
        function drawPopulationGraph() {
            const canvas = document.getElementById("population-graph");
            const ctx = canvas.getContext("2d");
            const width = canvas.width;
            const height = canvas.height;
            
            // キャンバスをクリア
            ctx.clearRect(0, 0, width, height);
            
            // 背景
            ctx.fillStyle = "#f8f8f8";
            ctx.fillRect(0, 0, width, height);
            
            if (populationHistory.length < 2) return;
            
            // 最大値を見つける
            const maxPop = Math.max(...populationHistory, 10);
            
            // グラフを描画
            ctx.strokeStyle = "#4CAF50";
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            populationHistory.forEach((pop, i) => {
                const x = (i / (maxPopulationHistory - 1)) * width;
                const y = height - (pop / maxPop) * height * 0.8 - height * 0.1;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // 軸とラベル
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height - 10);
            ctx.lineTo(width, height - 10);
            ctx.stroke();
            
            // 現在の細胞数を表示
            ctx.fillStyle = "#333";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`現在: ${liveCells.size}`, width - 10, 20);
        }

        // 初期化時に統計情報を更新
        updateStats();
    });
});
