// 🐍 贪吃蛇游戏 - 完整版本
// 作者说明：每一行代码都有详细的中文注释，方便理解和调试

// 获取画布和绘图上下文 - 这是我们绘制游戏的地方
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏基础设置
const GRID_SIZE = 20;                    // 网格大小（像素）
const CANVAS_WIDTH = canvas.width;       // 画布宽度
const CANVAS_HEIGHT = canvas.height;     // 画布高度
const GRID_WIDTH = CANVAS_WIDTH / GRID_SIZE;   // 水平网格数量
const GRID_HEIGHT = CANVAS_HEIGHT / GRID_SIZE; // 垂直网格数量

// 游戏状态变量
let gameRunning = false;     // 游戏是否正在运行
let gamePaused = false;      // 游戏是否暂停
let score = 0;              // 当前得分
let highScore = localStorage.getItem('snakeHighScore') || 0; // 最高分（从本地存储读取）
let gameSpeed = 200;        // 游戏速度（毫秒）
let gameLoop = null;        // 游戏循环定时器

// 蛇的数据结构
let snake = [
    {x: 10, y: 10}  // 蛇的初始位置（网格坐标）
];

// 蛇的移动方向
let direction = {x: 0, y: 0}; // 初始时蛇不移动
let nextDirection = {x: 0, y: 0}; // 下一个方向（防止快速按键导致的问题）

// 🍎 食物系统 - 支持多种功能食物
let food;

// 🎯 特殊食物类型定义
const FOOD_TYPES = {
    NORMAL: { 
        name: '普通食物', 
        color: '#e53e3e', 
        highlightColor: '#fc8181',
        probability: 0.6,  // 60% 概率
        points: 10,
        effect: 'none'
    },
    SPEED_UP: { 
        name: '加速食物', 
        color: '#ecc94b', 
        highlightColor: '#f6e05e',
        probability: 0.15, // 15% 概率
        points: 20,
        effect: 'speed_up'
    },
    SLOW_DOWN: { 
        name: '减速食物', 
        color: '#4299e1', 
        highlightColor: '#63b3ed',
        probability: 0.1,  // 10% 概率
        points: 15,
        effect: 'slow_down'
    },
    DOUBLE_POINTS: { 
        name: '双倍积分', 
        color: '#9f7aea', 
        highlightColor: '#b794f6',
        probability: 0.08, // 8% 概率
        points: 30,
        effect: 'double_points'
    },
    SHRINK: { 
        name: '缩短食物', 
        color: '#f6ad55', 
        highlightColor: '#fbd38d',
        probability: 0.05, // 5% 概率
        points: 25,
        effect: 'shrink'
    },
    INVINCIBLE: { 
        name: '无敌食物', 
        color: '#68d391', 
        highlightColor: '#9ae6b4',
        probability: 0.02, // 2% 概率
        points: 50,
        effect: 'invincible'
    }
};

// 🎮 游戏效果状态管理
let activeEffects = {
    speedBoost: { active: false, timer: 0, originalSpeed: gameSpeed },
    slowDown: { active: false, timer: 0, originalSpeed: gameSpeed },
    doublePoints: { active: false, timer: 0 },
    invincible: { active: false, timer: 0 }
};

// 🎮 获取页面元素引用
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// 🎯 新增的游戏界面元素
const gameStartOverlay = document.getElementById('gameStartOverlay');

// 🎯 特殊效果显示元素引用
const effectsDisplay = document.getElementById('effectsDisplay');
const speedBoostEffect = document.getElementById('speedBoostEffect');
const slowDownEffect = document.getElementById('slowDownEffect');
const doublePointsEffect = document.getElementById('doublePointsEffect');
const invincibleEffect = document.getElementById('invincibleEffect');

// 📊 更新分数显示
function updateScoreDisplay() {
    scoreElement.textContent = score;               // 显示当前分数
    highScoreElement.textContent = highScore;       // 显示最高分
}

// 🎯 更新特殊效果状态显示
function updateEffectsDisplay() {
    let hasActiveEffects = false;
    
    // 更新加速效果显示
    if (activeEffects.speedBoost.active) {
        speedBoostEffect.style.display = 'block';
        const seconds = Math.ceil(activeEffects.speedBoost.timer / 1000);
        speedBoostEffect.textContent = `⚡ 加速中 ${seconds}s`;
        hasActiveEffects = true;
    } else {
        speedBoostEffect.style.display = 'none';
    }
    
    // 更新减速效果显示
    if (activeEffects.slowDown.active) {
        slowDownEffect.style.display = 'block';
        const seconds = Math.ceil(activeEffects.slowDown.timer / 1000);
        slowDownEffect.textContent = `🐌 减速中 ${seconds}s`;
        hasActiveEffects = true;
    } else {
        slowDownEffect.style.display = 'none';
    }
    
    // 更新双倍积分效果显示
    if (activeEffects.doublePoints.active) {
        doublePointsEffect.style.display = 'block';
        const seconds = Math.ceil(activeEffects.doublePoints.timer / 1000);
        doublePointsEffect.textContent = `💎 双倍积分 ${seconds}s`;
        hasActiveEffects = true;
    } else {
        doublePointsEffect.style.display = 'none';
    }
    
    // 更新无敌效果显示
    if (activeEffects.invincible.active) {
        invincibleEffect.style.display = 'block';
        const seconds = Math.ceil(activeEffects.invincible.timer / 1000);
        invincibleEffect.textContent = `🛡️ 无敌状态 ${seconds}s`;
        hasActiveEffects = true;
    } else {
        invincibleEffect.style.display = 'none';
    }
    
    // 控制整个效果显示区域的可见性
    effectsDisplay.style.display = hasActiveEffects ? 'flex' : 'none';
}

// 🍎 生成随机食物（包含特殊食物类型）
function generateFood() {
    let newFood;
    do {
        // 在网格范围内生成随机位置
        newFood = {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };
    } while (isSnakePosition(newFood)); // 确保食物不会生成在蛇身上
    
    // 🎲 根据概率随机选择食物类型
    const rand = Math.random();
    let cumulativeProbability = 0;
    
    for (let [key, foodType] of Object.entries(FOOD_TYPES)) {
        cumulativeProbability += foodType.probability;
        if (rand <= cumulativeProbability) {
            newFood.type = key;           // 食物类型
            newFood.data = foodType;      // 食物数据
            break;
        }
    }
    
    // 如果没有匹配到任何类型，默认为普通食物
    if (!newFood.type) {
        newFood.type = 'NORMAL';
        newFood.data = FOOD_TYPES.NORMAL;
    }
    
    return newFood;
}

// 🔍 检查指定位置是否是蛇身
function isSnakePosition(position) {
    return snake.some(segment => segment.x === position.x && segment.y === position.y);
}

// 🎨 绘制游戏画面
function draw() {
    // 清空画布 - 设置背景色
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 绘制网格线（可选，美化效果）
    drawGrid();
    
    // 绘制蛇身
    drawSnake();
    
    // 绘制食物
    drawFood();
}

// 📐 绘制网格线
function drawGrid() {
    ctx.strokeStyle = '#4a5568';  // 网格线颜色
    ctx.lineWidth = 1;            // 线条粗细
    
    // 绘制垂直线
    for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE);
        ctx.stroke();
    }
}

// 🐍 绘制蛇
function drawSnake() {
    snake.forEach((segment, index) => {
        // 蛇头用不同颜色
        if (index === 0) {
            ctx.fillStyle = '#38a169';  // 蛇头颜色（深绿）
        } else {
            ctx.fillStyle = '#68d391';  // 蛇身颜色（浅绿）
        }
        
        // 绘制圆角矩形
        drawRoundRect(
            segment.x * GRID_SIZE + 1,      // x坐标（加1留出边距）
            segment.y * GRID_SIZE + 1,      // y坐标（加1留出边距）
            GRID_SIZE - 2,                  // 宽度（减2留出边距）
            GRID_SIZE - 2,                  // 高度（减2留出边距）
            4                               // 圆角半径
        );
        
        // 如果是蛇头，添加眼睛
        if (index === 0) {
            drawSnakeEyes(segment);
        }
    });
}

// 👀 绘制蛇的眼睛
function drawSnakeEyes(head) {
    const centerX = head.x * GRID_SIZE + GRID_SIZE / 2;
    const centerY = head.y * GRID_SIZE + GRID_SIZE / 2;
    
    ctx.fillStyle = '#ffffff';  // 眼睛颜色（白色）
    
    // 根据移动方向调整眼睛位置
    let eyeOffset = 3;
    if (direction.x !== 0 || direction.y !== 0) {
        // 左眼
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 右眼
        ctx.beginPath();
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 🍎 绘制食物（支持多种特殊食物类型）
function drawFood() {
    const centerX = food.x * GRID_SIZE + GRID_SIZE / 2;
    const centerY = food.y * GRID_SIZE + GRID_SIZE / 2;
    const radius = GRID_SIZE / 2 - 2;
    
    // 根据食物类型设置颜色
    ctx.fillStyle = food.data.color;
    
    // 🎨 绘制基础圆形食物
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // ✨ 添加高光效果
    ctx.fillStyle = food.data.highlightColor;
    ctx.beginPath();
    ctx.arc(centerX - 3, centerY - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 🎯 为特殊食物添加额外的视觉效果
    if (food.type !== 'NORMAL') {
        // 绘制外圈闪烁效果
        const time = Date.now() * 0.01;
        const pulseFactor = Math.sin(time) * 0.3 + 0.7;
        
        ctx.strokeStyle = food.data.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulseFactor;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1.0; // 重置透明度
        
        // 🔤 在食物上方显示类型标识
        drawFoodTypeIndicator(centerX, centerY - radius - 8, food.type);
    }
}

// 🏷️ 绘制食物类型标识
function drawFoodTypeIndicator(x, y, type) {
    const indicators = {
        'SPEED_UP': '⚡',
        'SLOW_DOWN': '🐌', 
        'DOUBLE_POINTS': '💎',
        'SHRINK': '✂️',
        'INVINCIBLE': '🛡️'
    };
    
    if (indicators[type]) {
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        // 先绘制描边，再绘制文字（增强可读性）
        ctx.strokeText(indicators[type], x, y);
        ctx.fillText(indicators[type], x, y);
    }
}

// 🖼️ 绘制圆角矩形辅助函数
function drawRoundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// 🔄 游戏主循环
function update() {
    if (!gameRunning || gamePaused) return;  // 游戏未运行或已暂停时不更新
    
    // ⏰ 更新特殊效果计时器
    updateEffectTimers();
    
    // 更新蛇的移动方向
    direction = {...nextDirection};
    
    // 如果蛇还没有开始移动，不进行更新
    if (direction.x === 0 && direction.y === 0) return;
    
    // 计算蛇头的新位置
    const head = {...snake[0]};  // 复制当前蛇头位置
    head.x += direction.x;       // 根据方向更新x坐标
    head.y += direction.y;       // 根据方向更新y坐标
    
    // 🌀 实现碰墙穿越功能 - 边界处理
    if (head.x < 0) {
        head.x = GRID_WIDTH - 1;    // 从左边界穿越到右边界
    } else if (head.x >= GRID_WIDTH) {
        head.x = 0;                 // 从右边界穿越到左边界
    }
    
    if (head.y < 0) {
        head.y = GRID_HEIGHT - 1;   // 从上边界穿越到下边界
    } else if (head.y >= GRID_HEIGHT) {
        head.y = 0;                 // 从下边界穿越到上边界
    }
    
    // 🔍 检查是否撞到自己（只检查身体碰撞，不检查墙壁）
    if (checkSelfCollision(head)) {
        gameOver();
        return;
    }
    
    // 将新头部添加到蛇身
    snake.unshift(head);
    
    // 🍎 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 根据食物类型处理不同效果
        handleFoodEffect(food);
        
        // 🎯 根据食物类型和双倍积分效果计算得分
        let pointsToAdd = food.data.points;
        if (activeEffects.doublePoints.active) {
            pointsToAdd *= 2;  // 双倍积分效果激活时翻倍
        }
        
        score += pointsToAdd;
        updateScoreDisplay();
        
        // 🆕 生成新食物
        food = generateFood();
        
        // ⚡ 每吃到食物，游戏速度稍微提升（除非有特殊效果影响）
        if (gameSpeed > 100 && !activeEffects.speedBoost.active && !activeEffects.slowDown.active) {
            gameSpeed -= 5;
        }
        
        // 🏆 检查是否刷新最高分
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);  // 保存到本地存储
        }
    } else {
        // 没吃到食物：移除蛇尾（保持蛇的长度不变）
        snake.pop();
    }
    
    // 重新绘制游戏画面
    draw();
}

// 🍎 处理吃到食物的特殊效果
function handleFoodEffect(eatenFood) {
    const effectType = eatenFood.data.effect;
    
    switch(effectType) {
        case 'speed_up':
            // ⚡ 加速效果：临时提升游戏速度
            if (!activeEffects.speedBoost.active) {
                activeEffects.speedBoost.originalSpeed = gameSpeed;
            }
            activeEffects.speedBoost.active = true;
            activeEffects.speedBoost.timer = 5000;  // 5秒持续时间
            gameSpeed = Math.max(50, gameSpeed - 60);  // 大幅提升速度
            clearInterval(gameLoop);
            gameLoop = setInterval(update, gameSpeed);
            break;
            
        case 'slow_down':
            // 🐌 减速效果：临时降低游戏速度  
            if (!activeEffects.slowDown.active) {
                activeEffects.slowDown.originalSpeed = gameSpeed;
            }
            activeEffects.slowDown.active = true;
            activeEffects.slowDown.timer = 5000;  // 5秒持续时间
            gameSpeed += 100;  // 降低速度
            clearInterval(gameLoop);
            gameLoop = setInterval(update, gameSpeed);
            break;
            
        case 'double_points':
            // 💎 双倍积分效果：接下来的食物得分翻倍
            activeEffects.doublePoints.active = true;
            activeEffects.doublePoints.timer = 10000;  // 10秒持续时间
            break;
            
        case 'shrink':
            // ✂️ 缩短效果：让蛇身体缩短一节（如果蛇长度大于1）
            if (snake.length > 1) {
                snake.pop();  // 移除蛇尾
            }
            break;
            
        case 'invincible':
            // 🛡️ 无敌效果：短时间内撞到自己不会死
            activeEffects.invincible.active = true;
            activeEffects.invincible.timer = 8000;  // 8秒持续时间
            break;
            
        case 'none':
        default:
            // 🍎 普通食物无特殊效果
            break;
    }
}

// ⏰ 更新特殊效果计时器
function updateEffectTimers() {
    // 更新加速效果
    if (activeEffects.speedBoost.active) {
        activeEffects.speedBoost.timer -= gameSpeed;
        if (activeEffects.speedBoost.timer <= 0) {
            activeEffects.speedBoost.active = false;
            gameSpeed = activeEffects.speedBoost.originalSpeed;
            clearInterval(gameLoop);
            gameLoop = setInterval(update, gameSpeed);
        }
    }
    
    // 更新减速效果
    if (activeEffects.slowDown.active) {
        activeEffects.slowDown.timer -= gameSpeed;
        if (activeEffects.slowDown.timer <= 0) {
            activeEffects.slowDown.active = false;
            gameSpeed = activeEffects.slowDown.originalSpeed;
            clearInterval(gameLoop);
            gameLoop = setInterval(update, gameSpeed);
        }
    }
    
    // 更新双倍积分效果
    if (activeEffects.doublePoints.active) {
        activeEffects.doublePoints.timer -= gameSpeed;
        if (activeEffects.doublePoints.timer <= 0) {
            activeEffects.doublePoints.active = false;
        }
    }
    
    // 更新无敌效果
    if (activeEffects.invincible.active) {
        activeEffects.invincible.timer -= gameSpeed;
        if (activeEffects.invincible.timer <= 0) {
            activeEffects.invincible.active = false;
        }
    }
    
    // 🎯 更新效果显示界面
    updateEffectsDisplay();
}

// 🔍 检查是否撞到自己的身体（用于碰墙穿越模式）
function checkSelfCollision(head) {
    // 🛡️ 如果无敌效果激活，不检查身体碰撞
    if (activeEffects.invincible.active) {
        return false;
    }
    
    // 只检查是否撞到自己的身体，不检查墙壁
    // 因为现在支持碰墙穿越功能
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;  // 撞到了自己的身体
        }
    }
    
    return false;  // 没有撞到自己
}

// 🎯 游戏结束处理
function gameOver() {
    gameRunning = false;                    // 停止游戏
    clearInterval(gameLoop);                // 清除游戏循环定时器
    finalScoreElement.textContent = score;  // 显示最终分数
    gameOverDiv.style.display = 'block';    // 显示游戏结束界面
}

// 🎮 开始游戏
function startGame() {
    if (gameRunning) return;  // 如果已经在运行，不重复开始
    
    gameRunning = true;
    gamePaused = false;
    
    // 开始游戏循环
    gameLoop = setInterval(update, gameSpeed);
    
    // 🎯 隐藏开始游戏覆盖层
    gameStartOverlay.style.display = 'none';
    
    // 隐藏游戏结束界面
    gameOverDiv.style.display = 'none';
}

// ⏸️ 暂停/继续游戏
function togglePause() {
    if (!gameRunning) return;  // 游戏未运行时不能暂停
    
    gamePaused = !gamePaused;  // 切换暂停状态
    
    if (gamePaused) {
        pauseBtn.textContent = '继续';
        clearInterval(gameLoop);    // 暂停时清除定时器
        gameStartOverlay.style.display = 'block';  // 显示暂停按钮覆盖层
        startBtn.style.display = 'none';           // 隐藏开始按钮
        pauseBtn.style.display = 'inline-block';   // 显示继续按钮
    } else {
        pauseBtn.textContent = '暂停';
        gameLoop = setInterval(update, gameSpeed);  // 继续时重启定时器
        gameStartOverlay.style.display = 'none';   // 隐藏覆盖层
    }
}

// 🔄 重置游戏
function resetGame() {
    // 停止当前游戏
    gameRunning = false;
    gamePaused = false;
    clearInterval(gameLoop);
    
    // 重置游戏数据
    snake = [{x: 10, y: 10}];     // 重置蛇的位置
    direction = {x: 0, y: 0};     // 重置移动方向
    nextDirection = {x: 0, y: 0}; // 重置下一个方向
    score = 0;                    // 重置分数
    gameSpeed = 200;              // 重置游戏速度
    food = generateFood();        // 生成新食物
    
    // 🎯 重置所有特殊效果状态
    activeEffects = {
        speedBoost: { active: false, timer: 0, originalSpeed: gameSpeed },
        slowDown: { active: false, timer: 0, originalSpeed: gameSpeed },
        doublePoints: { active: false, timer: 0 },
        invincible: { active: false, timer: 0 }
    };
    
    // 更新显示
    updateScoreDisplay();
    updateEffectsDisplay();  // 更新效果显示（隐藏所有效果）
    draw();
    
    // 🎯 重置按钮显示状态
    gameStartOverlay.style.display = 'block';  // 显示开始游戏覆盖层
    startBtn.style.display = 'inline-block';   // 显示开始按钮
    pauseBtn.style.display = 'none';           // 隐藏暂停按钮
    pauseBtn.textContent = '暂停';
    
    // 隐藏游戏结束界面
    gameOverDiv.style.display = 'none';
}

// ⌨️ 键盘控制
document.addEventListener('keydown', (event) => {
    if (!gameRunning || gamePaused) return;  // 游戏未运行或暂停时不响应
    
    // 防止同一方向连续输入
    const key = event.key.toLowerCase();
    
    switch(key) {
        case 'arrowup':     // 上方向键
        case 'w':           // W键
            if (direction.y !== 1) {  // 防止反向移动
                nextDirection = {x: 0, y: -1};
            }
            break;
            
        case 'arrowdown':   // 下方向键
        case 's':           // S键
            if (direction.y !== -1) { // 防止反向移动
                nextDirection = {x: 0, y: 1};
            }
            break;
            
        case 'arrowleft':   // 左方向键
        case 'a':           // A键
            if (direction.x !== 1) {  // 防止反向移动
                nextDirection = {x: -1, y: 0};
            }
            break;
            
        case 'arrowright':  // 右方向键
        case 'd':           // D键
            if (direction.x !== -1) { // 防止反向移动
                nextDirection = {x: 1, y: 0};
            }
            break;
            
        case ' ':           // 空格键暂停
            event.preventDefault();
            togglePause();
            break;
    }
});

// 🔘 按钮事件绑定
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);

// 🎬 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    // 确保画布可以获取到
    if (!canvas || !ctx) {
        console.error('❌ 画布初始化失败！');
        return;
    }
    
    // 🍎 初始化食物（确保在FOOD_TYPES定义之后）
    food = generateFood();
    
    // 初始化游戏状态
    updateScoreDisplay();  // 更新分数显示
    updateEffectsDisplay(); // 初始化效果显示
    draw();               // 绘制初始游戏画面
    
    console.log('🐍 贪吃蛇游戏加载完成！');
    console.log('💡 使用方向键或WASD控制，空格键暂停游戏');
    console.log('🎯 特殊功能：碰墙穿越 + 6种功能食物');
});

// 📱 触屏设备支持（可选）
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener('touchend', (event) => {
    event.preventDefault();
    
    if (!gameRunning || gamePaused) return;
    
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    // 最小滑动距离
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑动
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && direction.x !== -1) {
                nextDirection = {x: 1, y: 0};  // 向右
            } else if (deltaX < 0 && direction.x !== 1) {
                nextDirection = {x: -1, y: 0}; // 向左
            }
        }
    } else {
        // 垂直滑动
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && direction.y !== -1) {
                nextDirection = {x: 0, y: 1};   // 向下
            } else if (deltaY < 0 && direction.y !== 1) {
                nextDirection = {x: 0, y: -1};  // 向上
            }
        }
    }
});