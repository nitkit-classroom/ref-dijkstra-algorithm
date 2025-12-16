// ノードの座標（画像上の配置位置 %）
// 画像を見ながら微調整が必要な場合はここを変更してください
const nodePositions = {
    1: { top: 18, left: 24 },
    2: { top: 48, left: 10 },
    3: { top: 82, left: 10 },
    4: { top: 30, left: 39 },
    5: { top: 65, left: 33 },
    6: { top: 50, left: 52 },
    7: { top: 88, left: 50 },
    8: { top: 12, left: 63 },
    9: { top: 72, left: 80 },
    10: { top: 30, left: 90 }
};

// グラフデータ（隣接リスト）: { 接続先ノード: コスト(石の数) }
// 修正: 3と7の間をコスト3に変更
const graph = {
    1: { 2: 4, 4: 3, 8: 5 },
    2: { 1: 4, 3: 4, 4: 3, 5: 3 },
    3: { 2: 4, 7: 3 },             // ← ここを 2 から 3 に変更
    4: { 1: 3, 2: 3, 5: 3, 6: 3, 8: 3 },
    5: { 2: 3, 4: 3, 6: 3, 7: 3 },
    6: { 4: 3, 5: 3, 7: 3, 8: 3, 9: 4 },
    7: { 3: 3, 5: 3, 6: 3, 9: 3 }, // ← ここを 2 から 3 に変更
    8: { 1: 5, 4: 3, 6: 3, 10: 4 },
    9: { 6: 4, 7: 3, 10: 3 },
    10: { 8: 4, 9: 3 }
};

// 状態管理変数
let distances = {};
let visited = new Set();
let unvisited = new Set();
let currentNode = null;
let isFinished = false;

// DOM要素
const nodesOverlay = document.getElementById('nodesOverlay');
const startNodeSelect = document.getElementById('startNode');
const stepBtn = document.getElementById('stepBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const currentNodeDisplay = document.getElementById('currentNodeDisplay');

// 初期化処理
function init() {
    // プルダウン生成
    startNodeSelect.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `家 ${i}`;
        startNodeSelect.appendChild(option);
    }
    
    resetGraph();
}

// グラフのリセット
function resetGraph() {
    const startNode = parseInt(startNodeSelect.value);
    distances = {};
    visited = new Set();
    unvisited = new Set();
    
    // 全ノードの距離を無限大に、スタートだけ0に
    for (let i = 1; i <= 10; i++) {
        distances[i] = i === startNode ? 0 : Infinity;
        unvisited.add(i);
    }
    
    currentNode = null;
    isFinished = false;
    stepBtn.disabled = false;
    startNodeSelect.disabled = false;
    
    updateUI("スタート地点を選択してステップを開始してください。");
}

// UIの描画更新
function updateUI(message) {
    nodesOverlay.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const el = document.createElement('div');
        el.className = 'node';
        el.style.top = nodePositions[i].top + '%';
        el.style.left = nodePositions[i].left + '%';
        
        // 距離の表示テキスト（無限大は∞）
        const distText = distances[i] === Infinity ? '∞' : distances[i];
        
        el.innerHTML = `
            <div class="node-id">${i}</div>
            <div class="dist-label">${distText}</div>
        `;
        
        // クラス付与（色変え）
        if (visited.has(i)) {
            el.classList.add('visited');
        } else if (i === currentNode) {
            el.classList.add('current');
        } else if (currentNode && graph[currentNode][i] && !visited.has(i)) {
            // 現在のノードの隣接ノードをハイライト（オプション）
            // el.classList.add('neighbor');
        }
        
        nodesOverlay.appendChild(el);
    }

    if (message) statusMessage.textContent = message;
    currentNodeDisplay.textContent = currentNode ? `家 ${currentNode}` : "-";
}

// 1ステップ進める（ダイクストラ法の1周期）
function nextStep() {
    startNodeSelect.disabled = true;

    if (unvisited.size === 0 || isFinished) {
        statusMessage.textContent = "探索終了！すべての最短距離が確定しました。";
        stepBtn.disabled = true;
        return;
    }

    // 1. 未確定ノードの中で、現在最も距離が小さいノードを選ぶ
    let minNode = null;
    let minDist = Infinity;

    unvisited.forEach(node => {
        if (distances[node] < minDist) {
            minDist = distances[node];
            minNode = node;
        }
    });

    // 到達可能なノードがない場合（連結していない場合など）
    if (minNode === null || minDist === Infinity) {
        isFinished = true;
        updateUI("残りのノードへは到達できません。終了します。");
        return;
    }

    currentNode = minNode; // 現在の処理ノードとして設定

    // 2. 選ばれたノードの隣接ノードの距離を更新（緩和）
    const neighbors = graph[currentNode];
    let updateMsg = `家${currentNode}を確定 (距離: ${distances[currentNode]})。隣接ノードを確認中...`;
    
    for (const [neighborStr, weight] of Object.entries(neighbors)) {
        const neighbor = parseInt(neighborStr);
        if (!visited.has(neighbor)) {
            const newDist = distances[currentNode] + weight;
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
            }
        }
    }

    // 3. 処理済みリストへ移動
    visited.add(currentNode);
    unvisited.delete(currentNode);

    // UI更新
    updateUI(updateMsg);

    // 次のステップで終了判定になるかもしれないのでチェック
    if (unvisited.size === 0) {
        stepBtn.textContent = "完了";
    }
}

// イベントリスナー
stepBtn.addEventListener('click', nextStep);
resetBtn.addEventListener('click', () => {
    stepBtn.textContent = "ステップを進める";
    resetGraph();
});
startNodeSelect.addEventListener('change', resetGraph);

// 初期実行
init();