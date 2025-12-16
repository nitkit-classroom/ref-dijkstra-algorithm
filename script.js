/* Dijkstra Visualization System - Complete Script
  Target: index.html
*/

// --- 1. 設定データ ---

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
// 要件: 3番と7番の間はコスト「3」
const graph = {
    1: { 2: 4, 4: 3, 8: 5 },
    2: { 1: 4, 3: 2, 4: 5, 5: 4 },
    3: { 2: 2, 5: 3, 7: 3 },
    4: { 1: 3, 2: 5, 5: 4, 6: 3, 8: 3 },
    5: { 2: 4, 3: 3, 4: 4, 6: 4, 7: 2 },
    6: { 4: 3, 5: 4, 7: 3, 8: 2, 9: 3 },
    7: { 3: 3, 5: 2, 6: 3, 9: 4 }, 
    8: { 1: 5, 4: 3, 6: 2, 9: 4, 10: 3 },
    9: { 6: 3, 7: 4, 8: 4, 10: 2 },
    10: { 8: 3, 9: 2 }
};

// --- 2. 状態管理変数 ---

let distances = {};      // 各ノードまでの最短距離
let visited = new Set(); // 確定済みノード
let unvisited = new Set(); // 未確定ノード
let currentNode = null;  // 現在着目しているノード
let isProcessing = false; // true=更新計算待ち(Phase2), false=ノード選択待ち(Phase1)
let isFinished = false;  // 全探索終了フラグ

// --- 3. DOM要素の取得 ---

const nodesOverlay = document.getElementById('nodesOverlay');
const startNodeSelect = document.getElementById('startNode');
const stepBtn = document.getElementById('stepBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const currentNodeDisplay = document.getElementById('currentNodeDisplay');

// --- 4. 初期化とリセット ---

// 初回読み込み時の処理
function init() {
    // プルダウンメニューの生成
    startNodeSelect.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `家 ${i}`;
        startNodeSelect.appendChild(option);
    }
    
    // グラフの初期化を実行
    resetGraph();
}

// グラフを初期状態に戻す
function resetGraph() {
    const startNode = parseInt(startNodeSelect.value);
    distances = {};
    visited = new Set();
    unvisited = new Set();
    
    // 距離の初期化（スタート地点は0、他は無限大）
    for (let i = 1; i <= 10; i++) {
        distances[i] = i === startNode ? 0 : Infinity;
        unvisited.add(i);
    }
    
    // 状態のリセット
    currentNode = null;
    isProcessing = false;
    isFinished = false;
    stepBtn.disabled = false;
    stepBtn.textContent = "ステップを進める";
    startNodeSelect.disabled = false;
    
    updateUI("スタート地点を選択してステップを開始してください。");
}

// --- 5. UI描画処理 ---

function updateUI(message) {
    nodesOverlay.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const el = document.createElement('div');
        el.className = 'node';
        el.style.top = nodePositions[i].top + '%';
        el.style.left = nodePositions[i].left + '%';
        
        // 距離テキスト（Infinityなら∞）
        const distText = distances[i] === Infinity ? '∞' : distances[i];
        
        el.innerHTML = `
            <div class="node-id">${i}</div>
            <div class="dist-label">${distText}</div>
        `;
        
        // クラスの付与（色変えロジック）
        // 1. 確定済み (Green)
        if (visited.has(i)) {
            el.classList.add('visited');
        } 
        // 2. 現在注目中 (Yellow)
        else if (i === currentNode) {
            el.classList.add('current');
        } 
        // 3. 注目ノードの隣接かつ未確定 (Blue) - Phase1のときのみ表示
        else if (currentNode && isProcessing && graph[currentNode][i] && !visited.has(i)) {
            el.classList.add('neighbor');
        }
        
        nodesOverlay.appendChild(el);
    }

    if (message) statusMessage.textContent = message;
    currentNodeDisplay.textContent = currentNode ? `家 ${currentNode}` : "-";
}

// --- 6. ステップ実行ロジック (メイン処理) ---

function nextStep() {
    // 実行中はスタート地点変更不可
    startNodeSelect.disabled = true;

    if (isFinished) return;

    // === Phase 1: 次の最小ノードを選択 ===
    if (!isProcessing) {
        if (unvisited.size === 0) {
            finishSearch();
            return;
        }

        // 未確定ノードの中で距離が最小のものを探す
        // (同じ距離なら番号が若い順にヒットするよう実装)
        let minNode = null;
        let minDist = Infinity;

        // Setの反復順序は挿入順(1,2,3...)なので、単純ループで「距離がより小さい場合」のみ更新すれば
        // 同着の場合は自然と若い番号が維持される
        unvisited.forEach(node => {
            if (distances[node] < minDist) {
                minDist = distances[node];
                minNode = node;
            }
        });

        // どこにも行けない場合
        if (minNode === null || minDist === Infinity) {
            updateUI("残りのノードへは到達できません。終了します。");
            finishSearch();
            return;
        }

        // ノードを選択（まだ確定はしない）
        currentNode = minNode;
        isProcessing = true; // 次のクリックでPhase2へ

        updateUI(`家${currentNode}を選択 (暫定距離: ${distances[currentNode]})。隣接する家を確認します...`);
    } 
    
    // === Phase 2: 隣接ノードの計算・更新・確定 ===
    else {
        const neighbors = graph[currentNode];
        let updateLog = [];

        // 要件: 番号の若い順に処理する
        // Object.keysで取得後、数値昇順にソート
        const sortedNeighborKeys = Object.keys(neighbors)
            .map(Number)
            .sort((a, b) => a - b);

        // ソート順に計算
        for (const neighbor of sortedNeighborKeys) {
            const weight = neighbors[neighbor];
            
            // 未確定ノードのみ計算対象
            if (!visited.has(neighbor)) {
                const newDist = distances[currentNode] + weight;
                
                // より短い経路が見つかったら更新
                if (newDist < distances[neighbor]) {
                    distances[neighbor] = newDist;
                    updateLog.push(`家${neighbor} (距離${newDist}に更新)`);
                }
            }
        }

        // 現在のノードを確定リストへ移動
        visited.add(currentNode);
        unvisited.delete(currentNode);
        
        // ログメッセージ生成
        const logText = updateLog.length > 0 
            ? `計算結果: ${updateLog.join(', ')}。`
            : `更新なし。`;
        const msg = `${logText} 家${currentNode}を確定しました。`;

        // フェーズリセット
        isProcessing = false; 
        currentNode = null; 

        updateUI(msg);

        // すべて確定したら終了
        if (unvisited.size === 0) {
            finishSearch();
        }
    }
}

// 探索終了処理
function finishSearch() {
    isFinished = true;
    stepBtn.disabled = true;
    stepBtn.textContent = "探索完了";
    // 最後のメッセージを表示
    statusMessage.textContent = `${statusMessage.textContent} すべての探索が終了しました！`;
}

// --- 7. イベントリスナー設定 ---

stepBtn.addEventListener('click', nextStep);

resetBtn.addEventListener('click', () => {
    resetGraph();
});

startNodeSelect.addEventListener('change', resetGraph);

// --- 8. 開始 ---
init();