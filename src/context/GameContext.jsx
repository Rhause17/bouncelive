import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { Physics } from '../engine/physics.js';
import { VFXManager } from '../engine/vfx.js';
import { Ball } from '../engine/entities/Ball.js';
import { Basket } from '../engine/entities/Basket.js';
import { createShape } from '../engine/shapeFactory.js';
import { getLevelConfig } from '../data/levels.js';
import {
  SIZE_SCALE, LAYOUT, ANIM, OBJECT_ID_MAP, ONEWAY_ELIGIBLE,
  NORMAL_SHAPES, ODD_SHAPES,
} from '../engine/constants.js';

// ========================================
// STATE
// ========================================

const initialState = {
  screen: 'welcome',    // 'welcome' | 'playing' | 'gameover'
  gameState: 'edit',     // 'edit' | 'sim' | 'win' | 'fail'
  level: 1,
  lives: 5,
  initialLives: 5,
  highestCompletedLevel: 0,
  canSubmit: false,
  hasSubmittedOnce: false,
  allShapesPlaced: false,
  selectedShapeIndex: -1,
  gravityLevel: 'Normal',
  reboundLevel: 'Normal',
  tutorialActive: false,
  selectRemoveTargetMode: false,
  activePowerupPopover: null, // 'T' | 'R' | 'E' | null

  // Powerups
  trajectoryCount: 3,
  removeCount: 3,
  widenCount: 3,
  tUsedThisLevel: false,
  rUsedThisLevel: false,
  eUsedThisLevel: false,
  trajectoryExtended: false,
  basketWidened: false,

  // Run modifiers (persist across levels within a run)
  runModifiers: {
    trajectoryMultiplier: 1,
    basketWidthMultiplier: 1,
    trajectoryPowerUsed: false,
    basketPowerUsed: false,
  },
};

// ========================================
// REDUCER
// ========================================

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        screen: 'playing',
        gameState: 'edit',
        level: 1,
        lives: 5,
        initialLives: 5,
        highestCompletedLevel: 0,
        runModifiers: { ...initialState.runModifiers },
        trajectoryCount: 3,
        removeCount: 3,
        widenCount: 3,
        selectRemoveTargetMode: false,
        activePowerupPopover: null,
      };

    case 'SETUP_LEVEL':
      return {
        ...state,
        gameState: 'edit',
        level: action.level,
        lives: 5,
        initialLives: 5,
        canSubmit: false,
        hasSubmittedOnce: false,
        allShapesPlaced: false,
        selectedShapeIndex: -1,
        gravityLevel: action.gravity,
        reboundLevel: action.rebound,
        tUsedThisLevel: state.runModifiers.trajectoryPowerUsed,
        rUsedThisLevel: false,
        eUsedThisLevel: state.runModifiers.basketPowerUsed,
        trajectoryExtended: state.runModifiers.trajectoryPowerUsed,
        basketWidened: state.runModifiers.basketPowerUsed,
        tutorialActive: action.level === 4,
        selectRemoveTargetMode: false,
        activePowerupPopover: null,
      };

    case 'SUBMIT':
      return {
        ...state,
        gameState: 'sim',
        lives: state.lives - 1,
        hasSubmittedOnce: true,
        canSubmit: false,
        selectedShapeIndex: -1,
      };

    case 'WIN':
      return {
        ...state,
        gameState: 'win',
        highestCompletedLevel: Math.max(state.highestCompletedLevel, state.level),
      };

    case 'RETURN_TO_EDIT':
      if (state.lives <= 0) {
        return {
          ...state,
          screen: 'welcome',
          gameState: 'edit',
        };
      }
      return {
        ...state,
        gameState: 'edit',
        canSubmit: state.allShapesPlaced && state.lives > 0,
      };

    case 'SET_CAN_SUBMIT':
      return { ...state, canSubmit: action.value };

    case 'SET_ALL_SHAPES_PLACED':
      return { ...state, allShapesPlaced: action.value };

    case 'SELECT_SHAPE':
      return { ...state, selectedShapeIndex: action.index };

    case 'DESELECT_SHAPE':
      return { ...state, selectedShapeIndex: -1 };

    case 'DISMISS_TUTORIAL':
      return { ...state, tutorialActive: false };

    case 'OPEN_POWERUP_POPOVER':
      return { ...state, activePowerupPopover: action.powerupType };

    case 'CLOSE_POWERUP_POPOVER':
      return { ...state, activePowerupPopover: null };

    case 'ENTER_REMOVE_MODE':
      return { ...state, selectRemoveTargetMode: true };

    case 'EXIT_REMOVE_MODE':
      return { ...state, selectRemoveTargetMode: false };

    case 'REMOVE_SHAPE': {
      // Shape removal is handled via gameObjects; this updates state AND marks powerup as used
      if (state.rUsedThisLevel || state.removeCount <= 0) {
        return { ...state, selectRemoveTargetMode: false };
      }
      return {
        ...state,
        selectRemoveTargetMode: false,
        removeCount: state.removeCount - 1,
        rUsedThisLevel: true,
      };
    }

    case 'USE_TRAJECTORY_POWERUP':
      if (state.tUsedThisLevel || state.trajectoryCount <= 0) return state;
      return {
        ...state,
        trajectoryCount: state.trajectoryCount - 1,
        tUsedThisLevel: true,
        trajectoryExtended: true,
        runModifiers: {
          ...state.runModifiers,
          trajectoryMultiplier: 2,
          trajectoryPowerUsed: true,
        },
      };

    case 'USE_REMOVE_POWERUP':
      if (state.rUsedThisLevel || state.removeCount <= 0) return state;
      return {
        ...state,
        removeCount: state.removeCount - 1,
        rUsedThisLevel: true,
      };

    case 'USE_WIDEN_POWERUP':
      if (state.eUsedThisLevel || state.widenCount <= 0) return state;
      return {
        ...state,
        widenCount: state.widenCount - 1,
        eUsedThisLevel: true,
        basketWidened: true,
        runModifiers: {
          ...state.runModifiers,
          basketWidthMultiplier: 1.3,
          basketPowerUsed: true,
        },
      };

    default:
      return state;
  }
}

// ========================================
// CONTEXT
// ========================================

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Mutable game objects (not in React state - these mutate every frame)
  const gameObjects = useRef({
    physics: new Physics(),
    vfx: new VFXManager(),
    ball: null,
    basket: null,
    shapes: [],
    ballSpawnX: 0,
    ballUpperLimit: 0,
    basketLineY: 0,
    bottomControlsY: 0,
    pieceAreaX: 0,
    pieceAreaY: 0,
    pieceAreaWidth: 0,
    pieceAreaHeight: 0,
    levelSeed: null,

    // Fail queue
    failQueued: false,
    failReason: null,
    failStartTime: 0,

    // Animation state
    time: 0,
    hudAnimProgress: 0,
    hudStateOffset: 0,
    targetHudOffset: 0,
    submitButtonGlow: 0,
    submitPopScale: 1,
    submitPopTime: 0,
    wasCanSubmit: false,
    replaySwooshTime: 0,
    prevState: 'edit',

    // Basket widen animation
    basketOriginalRadius: null,
    basketWidenProgress: 1,
  });

  const setupLevel = useCallback((levelNum, canvasWidth, canvasHeight) => {
    const go = gameObjects.current;
    const L = LAYOUT;

    // Reset
    go.vfx.reset();
    go.physics.resetCollisionTracking();
    go.failQueued = false;
    go.failReason = null;
    go.failStartTime = 0;
    go.hudAnimProgress = 0;
    go.basketWidenProgress = 1;
    go.basketOriginalRadius = null;

    const w = canvasWidth;
    const h = canvasHeight;

    go.levelSeed = Math.random() + levelNum;
    let seed = go.levelSeed;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    const csvConfig = getLevelConfig(levelNum);
    let gravity = 'Normal', rebound = 'Normal';
    if (csvConfig) {
      gravity = csvConfig.gravity;
      rebound = csvConfig.rebound;
    }

    go.physics.setLevelSpecs(gravity, rebound);

    // Layout calculations
    const ballRadius = 15 * SIZE_SCALE;
    go.ballUpperLimit = L.levelDataAreaHeight + L.ballLineOffsetFromTop;
    go.bottomControlsY = h - L.powerupAreaHeight - L.bottomControlsHeight;
    go.basketLineY = go.bottomControlsY - L.basketLineExtraOffset;
    go.pieceAreaHeight = L.pieceAreaHeight;
    go.pieceAreaY = go.basketLineY - L.pieceAreaAboveBasket - go.pieceAreaHeight;
    go.pieceAreaX = L.pieceAreaMargin;
    go.pieceAreaWidth = w - L.pieceAreaMargin * 2;

    // Ball position
    const ballOnLeft = rand() > 0.5;
    const halfWidth = w / 2;
    const safeMargin = L.pieceAreaMargin + ballRadius + 10;
    let ballX;
    if (ballOnLeft) {
      ballX = safeMargin + rand() * (halfWidth - safeMargin * 2);
    } else {
      ballX = halfWidth + safeMargin + rand() * (halfWidth - safeMargin * 2);
    }
    go.ball = new Ball(ballX, go.ballUpperLimit, ballRadius);
    go.ballSpawnX = ballX;

    // Basket position
    const basketRadius = 35 * SIZE_SCALE;
    const basketSafeMargin = L.pieceAreaMargin + basketRadius + 10;
    let basketX;
    if (ballOnLeft) {
      basketX = halfWidth + basketSafeMargin + rand() * (halfWidth - basketSafeMargin * 2);
    } else {
      basketX = basketSafeMargin + rand() * (halfWidth - basketSafeMargin * 2);
    }
    go.basket = new Basket(basketX, go.basketLineY, basketRadius);

    // Run-persistent modifiers
    const currentState = state;
    if (currentState.runModifiers.basketPowerUsed) {
      go.basketOriginalRadius = go.basket.radius;
      go.basket.radius *= currentState.runModifiers.basketWidthMultiplier;
      go.basketWidenProgress = 1;
    }

    // Create shapes from level config
    let selectedTypes = [];
    if (csvConfig) {
      for (const objId of csvConfig.objectIds) {
        const shapeType = OBJECT_ID_MAP[objId];
        if (shapeType) selectedTypes.push(shapeType);
      }
    } else {
      const targetCount = levelNum <= 5 ? 3 : (levelNum <= 10 ? 4 : 5);
      const allShapes = [...NORMAL_SHAPES, ...ODD_SHAPES];
      for (let i = 0; i < targetCount; i++) {
        selectedTypes.push(allShapes[Math.floor(rand() * allShapes.length)]);
      }
    }

    // Position shapes in piece area
    const numShapes = selectedTypes.length;
    const BOX_INNER_PAD = 8;
    const boxLeft = go.pieceAreaX + BOX_INNER_PAD;
    const boxRight = go.pieceAreaX + go.pieceAreaWidth - BOX_INNER_PAD;
    const availableWidth = boxRight - boxLeft;
    const centerY = go.pieceAreaY + go.pieceAreaHeight / 2;

    // Create shapes to measure extents using bounding boxes
    const MIN_GAP = 5; // Minimum gap between shapes (spec requirement)
    const tempShapes = selectedTypes.map((t, i) => createShape(t, 0, 0, i));
    const shapeWidths = tempShapes.map(s => {
      const box = s.getBoundingBox();
      return box.width;
    });

    const totalShapeWidth = shapeWidths.reduce((sum, w) => sum + w, 0);

    // Evenly distribute shapes across the available width
    // Gap = (available space - total shape width) / (numShapes - 1)
    let gap;
    if (numShapes <= 1) {
      gap = 0;
    } else {
      gap = (availableWidth - totalShapeWidth) / (numShapes - 1);
      // Ensure minimum gap
      gap = Math.max(MIN_GAP, gap);
    }

    // Start from left edge (shapes will fill the width evenly)
    const startX = boxLeft;

    go.shapes = [];
    let currentX = startX;
    for (let i = 0; i < numShapes; i++) {
      const shapeWidth = shapeWidths[i];
      const xPos = currentX + shapeWidth / 2;
      currentX += shapeWidth + (i < numShapes - 1 ? gap : 0);

      const shape = createShape(selectedTypes[i], xPos, centerY, i);
      shape.startX = shape.x;
      shape.startY = shape.y;
      shape.hasBeenHit = false;
      shape.hasBeenMoved = false;
      shape.isSelected = false;
      shape.oneWayEnabled = false;
      shape.oneWayFaceIndex = -1;
      shape.oneWayAllowedSides = [];
      go.shapes.push(shape);
    }

    // Apply one-way assignments
    if (csvConfig && csvConfig.onewayAssignments && csvConfig.onewayAssignments.length > 0) {
      const assignmentQueue = [...csvConfig.onewayAssignments];
      const shapeAssignments = new Map();

      for (const assignment of assignmentQueue) {
        const { objId, sides } = assignment;
        for (let shapeIdx = 0; shapeIdx < go.shapes.length; shapeIdx++) {
          if (shapeAssignments.has(shapeIdx)) continue;
          const shapeObjId = csvConfig.objectIds[shapeIdx];
          if (shapeObjId === objId) {
            shapeAssignments.set(shapeIdx, sides);
            break;
          }
        }
      }

      for (const [shapeIdx, sides] of shapeAssignments) {
        const shape = go.shapes[shapeIdx];
        const objId = csvConfig.objectIds[shapeIdx];
        if (!ONEWAY_ELIGIBLE[objId]) continue;
        shape.oneWayEnabled = true;
        shape.oneWayAllowedSides = sides;
        shape.oneWayFaceIndex = sides[0];
      }
    }

    dispatch({
      type: 'SETUP_LEVEL',
      level: levelNum,
      gravity,
      rebound,
    });
  }, [state]);

  const submit = useCallback(() => {
    const go = gameObjects.current;
    go.shapes.forEach(s => s.savePosition());
    go.physics.resetCollisionTracking();
    go.ball.reset(go.ballSpawnX, go.ballUpperLimit);
    go.ball.visible = true;
    go.failQueued = false;
    go.failReason = null;
    go.failStartTime = 0;
    dispatch({ type: 'SUBMIT' });
  }, []);

  const returnToEdit = useCallback(() => {
    const go = gameObjects.current;
    go.ball.reset(go.ballSpawnX, go.ballUpperLimit);
    go.ball.visible = true;
    go.shapes.forEach(s => {
      if (!s.removedByPowerup) s.restorePosition();
    });
    go.basket.reset();
    go.vfx.reset();
    go.replaySwooshTime = ANIM.swooshDuration;
    dispatch({ type: 'RETURN_TO_EDIT' });
  }, []);

  const nextLevel = useCallback((canvasWidth, canvasHeight) => {
    setupLevel(state.level + 1, canvasWidth, canvasHeight);
  }, [state.level, setupLevel]);

  const value = {
    state,
    dispatch,
    gameObjects,
    setupLevel,
    submit,
    returnToEdit,
    nextLevel,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
