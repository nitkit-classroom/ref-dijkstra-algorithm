// ノードの座標（画像上の配置位置 %）
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

// グラフデータ（隣接リスト）: { 接続先ノード: コスト }
// 修正済み: 3と7の間はコスト3
const graph = {
    1: { 2: 4, 4: 3, 8: 5 },
    2: { 1: 4, 3: 4, 4: 3, 5: 3 },
    3: { 2: 4, 7: 3 },             
    4: { 1: 3, 2: 3, 5: 3, 6: 3, 8: 3 },
    5: { 2: 3, 4: 3, 6: 3, 7: 3 },
    6: { 4: 3, 5: 3, 7: 3, 8: 3, 9: 4 },
    7: { 3: 3, 5: 3, 6: 3, 9: 3 }, 
    8: { 1: 5, 4: 3, 6: 3, 10: 4 },
    9: { 6: 4, 7: 3, 10: 3 },
    10: { 8: 4, 9: 3 }
};

// 状態管理変数
let distances = {};
let visited = new Set();
let unvisited = new Set();
let currentNode = null; // 現在処理中のノード
let isProcessing = false; // trueなら「更新中（計算前）」、falseなら「次のノード選択待ち」
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
    
    for (let i = 1; i <= 10; i++) {
        distances[i] = i === startNode ? 0 : Infinity;
        unvisited.add(i);
    }
    
    currentNode = null;
    isProcessing = false; // フェーズリセット
    isFinished = false;
    stepBtn.disabled = false;
    stepBtn.textContent = "ステップを進める";
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
        
        const distText = distances[i] === Infinity ? '∞' : distances[i];
        
        el.innerHTML = `
            <div class="node-id">${i}</div>
            <div class="dist-label">${distText}</div>
        `;
        
        // --- 色分けの優先順位 ---
        // 1. 確定済み (Green)
        if (visited.has(i)) {
            el.classList.add('visited');
        } 
        // 2. 現在処理中 (Yellow)
        else if (i === currentNode) {
            el.classList.add('current');
        } 
        // 3. 処理中ノードの隣接かつ未確定 (Blue)
        else if (currentNode && graph[currentNode][i] && !visited.has(i)) {
            el.classList.add('neighbor');
        }
        // 4. それ以外 (White/Unvisited)
        
        nodesOverlay.appendChild(el);
    }

    if (message) statusMessage.textContent = message;
    currentNodeDisplay.textContent = currentNode ? `家 ${currentNode}` : "-";
}

// ステップ進行（2段階構成）
function nextStep() {
    startNodeSelect.disabled = true;

    if (isFinished) return;

    // --- フェーズ1: 次のノードを選択してハイライト ---
    if (!isProcessing) {
        if (unvisited.size === 0) {
            finishSearch();
            return;
        }

        // 未確定ノードの中で最小距離のノードを探す
        // (注: Setの走査順が挿入順(1,2,3...)なので、距離が同じなら若い番号が優先されます)
        let minNode = null;
        let minDist = Infinity;

        unvisited.forEach(node => {
            if (distances[node] < minDist) {
                minDist = distances[node];
                minNode = node;
            }
        });

        // 到達不可能な場合
        if (minNode === null || minDist === Infinity) {
            updateUI("残りのノードへは到達できません。終了します。");
            isFinished = true;
            stepBtn.disabled = true;
            return;
        }

        // ノードを選択状態にする
        currentNode = minNode;
        isProcessing = true; 

        updateUI(`家${currentNode}を選択しました。隣接する家を確認します...`);
    } 
    
    // --- フェーズ2: 距離の更新と確定 ---
    else {
        const neighbors = graph[currentNode];
        let updateLog = [];

        // ★修正点: 隣接ノードを「番号の若い順」にソートして処理する
        const sortedNeighborKeys = Object.keys(neighbors)
            .map(Number)              // 文字列のキーを数値に変換
            .sort((a, b) => a - b);   // 昇順に並び替え

        // ソート順に従ってループ処理
        for (const neighbor of sortedNeighborKeys) {
            const weight = neighbors[neighbor];
            
            if (!visited.has(neighbor)) {
                const newDist = distances[currentNode] + weight;
                if (newDist < distances[neighbor]) {
                    distances[neighbor] = newDist;
                    updateLog.push(`家${neighbor}を${newDist}に更新`);
                }
            }
        }

        // 確定済みリストへ移動
        visited.add(currentNode);
        unvisited.delete(currentNode);
        
        // メッセージ作成
        const msg = updateLog.length > 0 
            ? `計算完了: ${updateLog.join(', ')}。家${currentNode}を確定しました。`
            : `更新なし。家${currentNode}を確定しました。`;

        // 状態リセット
        isProcessing = false; 
        currentNode = null; 

        updateUI(msg);

        // 終了判定
        if (unvisited.size === 0) {
            finishSearch();
        }
    }
}
    
    // --- フェーズ2: 距離の更新と確定 ---
    else {
        const neighbors = graph[currentNode];
        let updateLog = [];

        // 隣接ノードの距離更新（緩和）
        for (const [neighborStr, weight] of Object.entries(neighbors)) {
            const neighbor = parseInt(neighborStr);
            if (!visited.has(neighbor)) {
                const newDist = distances[currentNode] + weight;
                if (newDist < distances[neighbor]) {
                    distances[neighbor] = newDist;
                    updateLog.push(`家${neighbor}を${newDist}に更新`);
                }
            }
        }

        // 確定済みリストへ移動
        visited.add(currentNode);
        unvisited.delete(currentNode);
        
        // メッセージ作成
        const msg = updateLog.length > 0 
            ? `計算完了: ${updateLog.join(', ')}。家${currentNode}を確定しました。`
            : `更新なし。家${currentNode}を確定しました。`;

        // 状態リセット
        isProcessing = false; 
        currentNode = null; // 一旦選択解除（次のSelectフェーズで見やすくするため）

        updateUI(msg);

        // 終了判定
        if (unvisited.size === 0) {
            finishSearch();
        }
    }
}

function finishSearch() {
    isFinished = true;
    stepBtn.disabled = true;
    stepBtn.textContent = "探索完了";
    updateUI("すべての探索が終了しました！");
}

// イベントリスナー
stepBtn.addEventListener('click', nextStep);
resetBtn.addEventListener('click', () => {
    resetGraph();
});
startNodeSelect.addEventListener('change', resetGraph);

// 初期実行
init();