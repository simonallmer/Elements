/**
 * Elements Game Logic
 */

// --- Constants & Config ---
const COLORS = ['blue', 'red', 'green', 'purple'];
const SHAPES = ['circle', 'square', 'triangle', 'hexagon'];
const CARD_TYPES = {
    REGULAR: 'regular',
    SINGLE: 'single',
    ELEMENTS: 'elements'
};

// --- Game State ---
let state = {
    players: [], // Array of arrays (hands)
    deck: [],
    discardPile: [],
    currentPlayer: 0,
    direction: 1, // 1 (clockwise) or -1 (counter-clockwise)
    topCard: null, // The effective top card (can be overridden by Elements choice)
    forcedColor: null, // If Elements card was played
    forcedShape: null, // If Elements card was played
    turnPhase: 'play', // 'play' or 'pass'
    cardsPlayedThisTurn: 0,
    currentChoice: { color: null, shape: null } // Tracks current turn's constraint
};

// --- DOM Elements ---
const screens = {
    menu: document.getElementById('main-menu'),
    setup: document.getElementById('player-setup'),
    game: document.getElementById('game-board'),
    pass: document.getElementById('pass-device'),
    rules: document.getElementById('rules-screen'),
    pause: document.getElementById('pause-menu')
};

const ui = {
    startBtn: document.getElementById('btn-start-game'),
    rulesBtn: document.getElementById('btn-rules'),
    menuGameBtn: document.getElementById('btn-menu-game'),
    passDeviceBtn: document.getElementById('btn-ready'),
    resumeBtn: document.getElementById('btn-resume'),
    quitBtn: document.getElementById('btn-end-game'),
    drawPile: document.getElementById('draw-pile'),
    discardPile: document.getElementById('discard-pile'),
    playerHand: document.getElementById('player-hand'),
    currentPlayerDisplay: document.getElementById('current-player-display'),
    cardCountDisplay: document.getElementById('card-count-display'),
    messageArea: document.getElementById('message-area'),
    passButton: document.getElementById('btn-pass-turn'),
    elementsModal: document.getElementById('elements-modal'),
    nextPlayerName: document.getElementById('next-player-name'),
    pauseStats: document.getElementById('pause-stats'),
    opponentsStats: document.getElementById('opponents-stats')
};

// --- Initialization ---

function init() {
    // Event Listeners
    ui.startBtn.addEventListener('click', () => {
        showScreen('setup');
    });

    ui.rulesBtn.addEventListener('click', () => showScreen('rules'));

    // Fix: Close Rules button
    document.getElementById('btn-close-rules').addEventListener('click', () => {
        showScreen('menu');
    });

    ui.menuGameBtn.addEventListener('click', () => {
        // Pause Menu
        showPauseMenu();
    });

    ui.resumeBtn.addEventListener('click', () => {
        screens.pause.classList.add('hidden');
    });

    ui.quitBtn.addEventListener('click', () => {
        screens.pause.classList.add('hidden');
        showScreen('menu');
    });

    ui.drawPile.addEventListener('click', drawCardsAction);
    ui.passButton.addEventListener('click', endTurn);

    ui.passDeviceBtn.addEventListener('click', startTurn);

    // Player Count Selection
    document.querySelectorAll('.player-count-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.player-count-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    // Player Count Buttons (old style)
    document.querySelectorAll('.btn-count').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const count = parseInt(e.target.dataset.count);
            startGame(count);
        });
    });

    // Back button from setup
    document.getElementById('btn-back-menu').addEventListener('click', () => {
        showScreen('menu');
    });

    // Elements Modal Selection Logic
    // Color Selection
    document.querySelectorAll('.btn-color').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Deselect others
            document.querySelectorAll('.btn-color').forEach(b => b.classList.remove('selected'));
            // Select this
            e.target.classList.add('selected');
            // Store choice temporarily
            if (!state.tempElementsChoice) state.tempElementsChoice = {};
            state.tempElementsChoice.color = e.target.dataset.color;
            // Show Transform button if both are selected
            checkElementsSelection();
        });
    });

    // Shape Selection
    document.querySelectorAll('.btn-shape').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Deselect others
            document.querySelectorAll('.btn-shape').forEach(b => b.classList.remove('selected'));
            // Select this (handle click on svg/path by finding closest button)
            const button = e.target.closest('.btn-shape');
            button.classList.add('selected');
            // Store choice
            if (!state.tempElementsChoice) state.tempElementsChoice = {};
            state.tempElementsChoice.shape = button.dataset.shape;
            // Show Transform button if both are selected
            checkElementsSelection();
        });
    });

    // Transform button
    document.getElementById('btn-transform').addEventListener('click', () => {
        if (state.tempElementsChoice && state.tempElementsChoice.color && state.tempElementsChoice.shape) {
            resolveElementsCard(state.tempElementsChoice.color, state.tempElementsChoice.shape);
        }
    });
}

function checkElementsSelection() {
    const transformBtn = document.getElementById('btn-transform');
    if (state.tempElementsChoice && state.tempElementsChoice.color && state.tempElementsChoice.shape) {
        transformBtn.classList.remove('hidden');
    } else {
        transformBtn.classList.add('hidden');
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    Object.values(screens).forEach(s => s.classList.remove('active'));

    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
        screens[screenName].classList.add('active');
    }
}

function hideScreen(screenName) {
    if (screens[screenName]) {
        screens[screenName].classList.add('hidden');
        screens[screenName].classList.remove('active');
    }
}

// --- Deck Management ---

function createDeck() {
    let deck = [];

    // 1. Regular Cards: 16 of each color (4 shapes * 4 copies? Or just mixed?)
    // Rules say: 16 Blue, 16 Red, 16 Green, 16 Purple. Total 64.
    // That means 4 of each shape per color.
    COLORS.forEach(color => {
        SHAPES.forEach(shape => {
            for (let i = 0; i < 4; i++) {
                deck.push({ type: CARD_TYPES.REGULAR, color, shape, id: Math.random() });
            }
        });
    });

    // 2. Single Cards: 8 cards. "Each Single Card is in the game once."
    // There are 4 colors * 4 shapes = 16 combos. Rules say 8 Single Cards.
    // "They only show one shape or color." -> This implies a card is EITHER just "Blue" OR just "Circle".
    // Let's interpret: 4 Color-only cards + 4 Shape-only cards? Or 8 specific combos?
    // "Each Single Card is in the game once." -> Maybe 8 unique cards that are special.
    // Re-reading: "They only show one shape or color."
    // Let's add 4 Color-only cards (Wild Shape) and 4 Shape-only cards (Wild Color).
    // 2. Single Cards: 8 cards.
    // "They only show one shape or color."
    // We use 'none' to indicate the missing property.
    COLORS.forEach(color => {
        deck.push({ type: CARD_TYPES.SINGLE, color: color, shape: 'none', id: Math.random() });
    });
    SHAPES.forEach(shape => {
        deck.push({ type: CARD_TYPES.SINGLE, color: 'none', shape: shape, id: Math.random() });
    });

    // 3. Elements Cards: 8 cards.
    for (let i = 0; i < 8; i++) {
        deck.push({ type: CARD_TYPES.ELEMENTS, color: 'wild', shape: 'wild', id: Math.random() });
    }

    return shuffle(deck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Game Logic ---

function startGame(playerCount) {
    state.players = Array(playerCount).fill().map(() => []);
    state.deck = createDeck();
    state.discardPile = [];
    state.currentPlayer = Math.floor(Math.random() * playerCount); // Random start
    state.direction = 1;

    // Deal 8 cards to each
    for (let i = 0; i < playerCount; i++) {
        for (let j = 0; j < 8; j++) {
            state.players[i].push(state.deck.pop());
        }
    }

    // Flip top card
    let startCard = state.deck.pop();
    while (startCard.type === CARD_TYPES.ELEMENTS) {
        // "If the card that gets turned over... is an Elements Card, any card can be layed out"
        // We can just treat it as a wild start.
        break;
    }
    state.discardPile.push(startCard);
    state.topCard = startCard;

    // Reset turn state
    resetTurnState();

    showScreen('pass');
    updatePassScreen();
}

function resetTurnState() {
    state.cardsPlayedThisTurn = 0;
    state.currentChoice = { color: null, shape: null };
    state.forcedColor = null;
    state.forcedShape = null;
    ui.messageArea.textContent = "";
    ui.passButton.classList.add('hidden');
}

function updatePassScreen() {
    ui.nextPlayerName.textContent = `PLAYER ${state.currentPlayer + 1}`;
}

function startTurn() {
    showScreen('game');
    renderGame();

    // Check if deck is empty -> Game End
    if (state.deck.length === 0) {
        endGameByEmptyDeck();
    }
}

function getEffectiveTopCard() {
    const actualTop = state.discardPile[state.discardPile.length - 1];

    // If the top card is a transformed Elements card, treat it as a regular card
    if (actualTop && actualTop.type === CARD_TYPES.ELEMENTS && actualTop.displayColor && actualTop.displayShape) {
        return {
            color: actualTop.displayColor,
            shape: actualTop.displayShape,
            type: CARD_TYPES.REGULAR
        };
    }

    // If an Elements card was just played THIS TURN and a choice was made, that choice dictates the rule.
    // This only applies during the same turn (before endTurn clears forcedColor/Shape)
    if (state.forcedColor || state.forcedShape) {
        return {
            color: state.forcedColor || 'all',
            shape: state.forcedShape || 'all',
            type: 'virtual'
        };
    }

    return actualTop;
}

function isValidMove(card) {
    const top = getEffectiveTopCard();

    // 1. Elements Card Rules
    if (card.type === CARD_TYPES.ELEMENTS) {
        // "An Elements Card cannot be played as the last card from your hand."
        if (state.players[state.currentPlayer].length === 1) return false;

        // "When you choose the Elements Card, no other card can be played in your turn."
        // This implies it must be the ONLY card played.
        if (state.cardsPlayedThisTurn > 0) return false;

        return true;
    }

    // 1b. Prevent playing a card if it would leave ONLY an Elements card in hand
    // (because Elements card cannot be played as last card)
    const hand = state.players[state.currentPlayer];
    if (hand.length === 2) {
        // Check if the OTHER card (not the one being played) is an Elements card
        const otherCard = hand.find(c => c !== card);
        if (otherCard && otherCard.type === CARD_TYPES.ELEMENTS) {
            return false; // Cannot play this card, as it would leave only Elements card
        }
    }

    // 2. Single Card Restrictions: "Single Cards cannot be placed on other Single Cards."
    if (card.type === CARD_TYPES.SINGLE && top.type === CARD_TYPES.SINGLE) {
        return false;
    }

    // 3. Turn Constraint: "The decision between shape or color cannot be changed once taken."
    if (state.cardsPlayedThisTurn > 0) {
        // If we are locked to a specific Color
        if (state.currentChoice.color && state.currentChoice.color !== 'all') {
            // Card must match the locked color. 'none' (Single Shape card) does NOT match.
            // 'all' (Virtual/Elements) is allowed if we had that logic, but cards don't have 'all' anymore except virtual.
            if (card.color !== state.currentChoice.color) return false;
        }
        // If we are locked to a specific Shape
        if (state.currentChoice.shape && state.currentChoice.shape !== 'all') {
            // Card must match the locked shape. 'none' (Single Color card) does NOT match.
            if (card.shape !== state.currentChoice.shape) return false;
        }
    }

    // 4. Matching Logic
    // If top is Elements/Virtual, we match against forcedColor/Shape
    if (top.type === 'virtual') {
        // Virtual 'all' means ANY.
        if (top.color !== 'all' && card.color !== top.color) return false;
        if (top.shape !== 'all' && card.shape !== top.shape) return false;
        return true;
    }

    // If top is a raw Elements card (no forced choice yet, e.g. start of game), ANY card is valid.
    if (top.type === CARD_TYPES.ELEMENTS) {
        return true;
    }

    // Standard Matching
    // 'none' never matches anything (except 'none'==='none' but Single on Single is blocked).
    // top.color might be 'none' (if top is Single Shape card).
    // card.color might be 'none' (if playing Single Shape card).

    const colorMatch = (card.color === top.color) && (card.color !== 'none');
    const shapeMatch = (card.shape === top.shape) && (card.shape !== 'none');

    // If we have already locked in a choice this turn
    if (state.currentChoice.color) return colorMatch;
    if (state.currentChoice.shape) return shapeMatch;

    return colorMatch || shapeMatch;
}

function playCard(cardIndex) {
    const hand = state.players[state.currentPlayer];
    const card = hand[cardIndex];

    // Capture the effective top card BEFORE we play the new one
    const previousTop = getEffectiveTopCard();

    if (!isValidMove(card)) {
        ui.messageArea.textContent = "Invalid Move!";
        ui.messageArea.style.color = 'red';
        setTimeout(() => ui.messageArea.textContent = "", 1000);
        return;
    }

    // Execute Play
    hand.splice(cardIndex, 1);
    state.discardPile.push(card);
    state.cardsPlayedThisTurn++;
    ui.passButton.classList.remove('hidden');

    // Handle Elements Card
    if (card.type === CARD_TYPES.ELEMENTS) {
        // Elements card is played. User must choose. Turn will end after choice.
        ui.elementsModal.classList.remove('hidden');

        // Reset Selections and Button
        document.querySelectorAll('.btn-color, .btn-shape').forEach(b => b.classList.remove('selected'));
        document.getElementById('btn-transform').classList.add('hidden');

        state.tempElementsChoice = {}; // Reset temp choice

        renderGame();
        return;
    }

    // Determine Constraint (Color or Shape) if first card of turn
    if (state.cardsPlayedThisTurn === 1) {
        // Compare the played card with the PREVIOUS top card

        // Special Case: Single Cards & Virtual Cards (Elements Choice)
        // If the previous card only had ONE specific property, we MUST have matched that property.
        // Therefore, we are locked to that property.

        if (previousTop.type === CARD_TYPES.SINGLE) {
            if (previousTop.color === 'none') {
                // It was a Shape-only card (e.g. Triangle). We matched Shape. Lock Shape.
                state.currentChoice.shape = previousTop.shape;
            } else if (previousTop.shape === 'none') {
                // It was a Color-only card (e.g. Blue). We matched Color. Lock Color.
                state.currentChoice.color = previousTop.color;
            }
        } else if (previousTop.type === 'virtual') {
            // Elements choice. We are locked to whatever was chosen.
            if (previousTop.color !== 'all') state.currentChoice.color = previousTop.color;
            if (previousTop.shape !== 'all') state.currentChoice.shape = previousTop.shape;
        } else {
            // Regular Card (has both Color and Shape)
            const colorMatch = (card.color === previousTop.color) && (card.color !== 'none');
            const shapeMatch = (card.shape === previousTop.shape) && (card.shape !== 'none');

            if (colorMatch && !shapeMatch) {
                state.currentChoice.color = card.color;
            } else if (shapeMatch && !colorMatch) {
                state.currentChoice.shape = card.shape;
            } else if (colorMatch && shapeMatch) {
                // Matched both. Remain open.
            }
        }
    } else {
        // Subsequent cards: Refine lock if it was open
        // If we were open (matched both previously), and now we diverge, we lock.
        if (!state.currentChoice.color && !state.currentChoice.shape) {
            // We need to compare with the card BEFORE this one (which is now at index -2)
            const prevCard = state.discardPile[state.discardPile.length - 2];
            const colorMatch = (card.color === prevCard.color) && (card.color !== 'none');
            const shapeMatch = (card.shape === prevCard.shape) && (card.shape !== 'none');

            if (colorMatch && !shapeMatch) state.currentChoice.color = card.color;
            if (shapeMatch && !colorMatch) state.currentChoice.shape = card.shape;
        }
    }

    // Check Win
    if (hand.length === 0) {
        alert(`Player ${state.currentPlayer + 1} wins. Congratulations on becoming the supreme samurai!`);
        showScreen('menu');
        return;
    }

    renderGame();
}

function resolveElementsCard(color, shape) {
    ui.elementsModal.classList.add('hidden');

    state.forcedColor = color;
    state.forcedShape = shape;

    // Transform the Elements card on the table
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (topCard.type === CARD_TYPES.ELEMENTS) {
        topCard.displayColor = color;
        topCard.displayShape = shape;
    }

    // Also lock the current turn choice (though turn ends immediately)
    state.currentChoice.color = color;
    state.currentChoice.shape = shape;

    // "When you choose the Elements Card, no other card can be played in your turn."
    endTurn();
}

function drawCardsAction() {
    // "Draw 3 cards and skip your turn. The direction of the game changes."
    // "It is possible to draw 3 cards... at will"

    for (let i = 0; i < 3; i++) {
        if (state.deck.length > 0) {
            state.players[state.currentPlayer].push(state.deck.pop());
        }
    }

    state.direction *= -1;
    endTurn();
}

function endTurn() {
    // Move to next player
    let next = state.currentPlayer + state.direction;
    if (next >= state.players.length) next = 0;
    if (next < 0) next = state.players.length - 1;

    state.currentPlayer = next;
    resetTurnState();

    showScreen('pass');
    updatePassScreen();
}

function endGameByEmptyDeck() {
    // "Players with the fewest cards in hand win"
    let minCards = Infinity;
    let winners = [];

    state.players.forEach((hand, index) => {
        if (hand.length < minCards) {
            minCards = hand.length;
            winners = [index + 1];
        } else if (hand.length === minCards) {
            winners.push(index + 1);
        }
    });

    alert(`Game Over! Deck Empty. Winners: Player(s) ${winners.join(', ')}`);
    showScreen('menu');
}

function showPauseMenu() {
    // Populate Stats
    ui.pauseStats.innerHTML = '';
    state.players.forEach((hand, index) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <span class="stat-player">PLAYER ${index + 1}</span>
            <span class="stat-count">${hand.length} Cards</span>
        `;
        ui.pauseStats.appendChild(row);
    });

    screens.pause.classList.remove('hidden');
}

// --- Rendering ---

function renderGame() {
    ui.currentPlayerDisplay.textContent = `PLAYER ${state.currentPlayer + 1}`;
    ui.cardCountDisplay.textContent = `Cards: ${state.players[state.currentPlayer].length}`;

    // Render Opponents Stats
    ui.opponentsStats.innerHTML = '';
    state.players.forEach((hand, index) => {
        if (index !== state.currentPlayer) {
            const row = document.createElement('div');
            row.className = 'opponent-row';
            // Highlight if they are close to winning (e.g. 1 card)
            const count = hand.length;
            const warningClass = count === 1 ? 'style="color: var(--accent-red); font-weight: bold;"' : '';

            row.innerHTML = `
                <span class="opponent-name">P${index + 1}</span>
                <span class="opponent-cards" ${warningClass}>
                    ${count} <span style="font-size: 0.8em;">🎴</span>
                </span>
            `;
            ui.opponentsStats.appendChild(row);
        }
    });

    // Render Discard Pile (Top Card)
    ui.discardPile.innerHTML = '';
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (topCard) {
        ui.discardPile.appendChild(createCardElement(topCard, false));
    }

    // Render Hand
    ui.playerHand.innerHTML = '';
    state.players[state.currentPlayer].forEach((card, index) => {
        const el = createCardElement(card, true);
        el.addEventListener('click', () => playCard(index));
        ui.playerHand.appendChild(el);
    });

    // Visual feedback for Elements choice
    if (state.forcedColor) {
        ui.messageArea.textContent = `Must play: ${state.forcedColor.toUpperCase()}`;
        ui.messageArea.style.color = `var(--accent-${state.forcedColor})`;
    } else if (state.forcedShape) {
        ui.messageArea.textContent = `Must play: ${state.forcedShape.toUpperCase()}`;
        ui.messageArea.style.color = '#fff';
    } else {
        ui.messageArea.textContent = "";
    }
}

function createCardElement(card, isHand) {
    const el = document.createElement('div');

    // Determine effective properties (handle transformation)
    let renderType = card.type;
    let renderColor = card.color;
    let renderShape = card.shape;

    if (card.type === CARD_TYPES.ELEMENTS && card.displayColor && card.displayShape) {
        renderType = CARD_TYPES.REGULAR;
        renderColor = card.displayColor;
        renderShape = card.displayShape;
    }

    // Determine classes
    let colorClass = renderColor === 'none' ? 'white' : renderColor;
    // If it's an Elements card (and NOT transformed), it's special
    if (renderType === CARD_TYPES.ELEMENTS) {
        colorClass = 'elements';
    }

    el.className = `card ${colorClass}`;

    // SVG Shapes
    const getShapeSVG = (shape) => {
        if (shape === 'circle') return `<svg viewBox="0 0 100 100" class="shape-svg"><circle cx="50" cy="50" r="40" /></svg>`;
        if (shape === 'square') return `<svg viewBox="0 0 100 100" class="shape-svg"><rect x="15" y="15" width="70" height="70" /></svg>`;
        if (shape === 'triangle') return `<svg viewBox="0 0 100 100" class="shape-svg"><polygon points="50,15 15,85 85,85" /></svg>`;
        if (shape === 'hexagon') return `<svg viewBox="0 0 100 100" class="shape-svg"><polygon points="50,10 85,30 85,70 50,90 15,70 15,30" /></svg>`;
        if (shape === 'no-shape') return `<div class="no-shape-symbol"></div>`;
        // 4-pointed star for Elements
        if (shape === 'wild') return `<svg viewBox="0 0 100 100" class="shape-svg"><path d="M50 5 L65 35 L95 50 L65 65 L50 95 L35 65 L5 50 L35 35 Z" /></svg>`;
        return '';
    };

    let centerShapeHtml = '';
    let cornerShapeHtml = '';

    if (renderType === CARD_TYPES.ELEMENTS) {
        centerShapeHtml = getShapeSVG('wild');
        cornerShapeHtml = getShapeSVG('wild');
    } else if (renderType === CARD_TYPES.SINGLE) {
        if (renderShape === 'none') {
            // Color only, No Shape
            centerShapeHtml = getShapeSVG('no-shape');
            cornerShapeHtml = getShapeSVG('no-shape');
        } else {
            // Shape only, No Color (White)
            centerShapeHtml = getShapeSVG(renderShape);
            cornerShapeHtml = getShapeSVG(renderShape);
        }
    } else {
        // Regular
        centerShapeHtml = getShapeSVG(renderShape);
        cornerShapeHtml = getShapeSVG(renderShape);
    }

    el.innerHTML = `
        <div class="card-face">
            <div class="card-inner"></div>
            <div class="corner-pip corner-top-right">${cornerShapeHtml}</div>
            <div class="center-shape">${centerShapeHtml}</div>
            <div class="corner-pip corner-bottom-left">${cornerShapeHtml}</div>
        </div>
    `;

    return el;
}

// Start
init();
