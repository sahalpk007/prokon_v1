import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Info, Target, Zap } from 'lucide-react';

interface GameObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
  trail: { x: number; y: number }[];
  size: number;
}

interface GameState {
  objects: GameObject[];
  friction: number;
  gravity: boolean;
  isLaunching: boolean;
  launchStart: { x: number; y: number } | null;
  currentMouse: { x: number; y: number } | null;
  level: number;
  score: number;
  isPlaying: boolean;
}

const LEVELS = [
  {
    name: "Frictionless Space",
    description: "Launch objects in space with no friction. Notice how they keep moving!",
    friction: 0,
    gravity: false,
    target: "Launch an object and observe continuous motion"
  },
  {
    name: "Air Resistance",
    description: "Add friction to see how external forces slow down objects",
    friction: 0.02,
    gravity: false,
    target: "Compare motion with and without friction"
  },
  {
    name: "Gravity Field",
    description: "Add gravity to see how forces change object motion",
    friction: 0.01,
    gravity: true,
    target: "Launch objects and watch gravity affect their path"
  },
  {
    name: "Real World",
    description: "Full physics with friction and gravity like on Earth",
    friction: 0.03,
    gravity: true,
    target: "Master inertia in realistic conditions"
  }
];

const InertiaGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [showInstructions, setShowInstructions] = useState(true);
  
  const [gameState, setGameState] = useState<GameState>({
    objects: [],
    friction: LEVELS[0].friction,
    gravity: LEVELS[0].gravity,
    isLaunching: false,
    launchStart: null,
    currentMouse: null,
    level: 0,
    score: 0,
    isPlaying: false
  });

  const createObject = useCallback((x: number, y: number, vx: number, vy: number): GameObject => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    return {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      vx,
      vy,
      mass: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      trail: [],
      size: 20
    };
  }, []);

  const updatePhysics = useCallback(() => {
    setGameState(prevState => {
      const newObjects = prevState.objects.map(obj => {
        let newObj = { ...obj };
        
        // Apply gravity
        if (prevState.gravity) {
          newObj.vy += 0.3;
        }
        
        // Apply friction
        if (prevState.friction > 0) {
          newObj.vx *= (1 - prevState.friction);
          newObj.vy *= (1 - prevState.friction);
        }
        
        // Update position
        newObj.x += newObj.vx;
        newObj.y += newObj.vy;
        
        // Add to trail
        newObj.trail = [...newObj.trail, { x: newObj.x, y: newObj.y }];
        if (newObj.trail.length > 50) {
          newObj.trail = newObj.trail.slice(-50);
        }
        
        // Bounce off walls
        const canvas = canvasRef.current;
        if (canvas) {
          if (newObj.x <= newObj.size || newObj.x >= canvas.width - newObj.size) {
            newObj.vx *= -0.8;
            newObj.x = Math.max(newObj.size, Math.min(canvas.width - newObj.size, newObj.x));
          }
          if (newObj.y <= newObj.size || newObj.y >= canvas.height - newObj.size) {
            newObj.vy *= -0.8;
            newObj.y = Math.max(newObj.size, Math.min(canvas.height - newObj.size, newObj.y));
          }
        }
        
        return newObj;
      });
      
      return { ...prevState, objects: newObjects };
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with space background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (i * 137.5) % canvas.width;
      const y = (i * 73.7) % canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw trails
    gameState.objects.forEach(obj => {
      if (obj.trail.length > 1) {
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
        obj.trail.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    
    // Draw objects
    gameState.objects.forEach(obj => {
      // Object
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow effect
      ctx.shadowColor = obj.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Velocity vector
      if (Math.abs(obj.vx) > 0.1 || Math.abs(obj.vy) > 0.1) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.vx * 5, obj.y + obj.vy * 5);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(obj.vy, obj.vx);
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.vx * 5, obj.y + obj.vy * 5);
        ctx.lineTo(
          obj.x + obj.vx * 5 - 10 * Math.cos(angle - Math.PI / 6),
          obj.y + obj.vy * 5 - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          obj.x + obj.vx * 5 - 10 * Math.cos(angle + Math.PI / 6),
          obj.y + obj.vy * 5 - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    });
    
    // Draw launch vector
    if (gameState.isLaunching && gameState.launchStart && gameState.currentMouse) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(gameState.launchStart.x, gameState.launchStart.y);
      ctx.lineTo(gameState.currentMouse.x, gameState.currentMouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Power indicator
      const distance = Math.sqrt(
        Math.pow(gameState.currentMouse.x - gameState.launchStart.x, 2) +
        Math.pow(gameState.currentMouse.y - gameState.launchStart.y, 2)
      );
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';
      ctx.fillText(`Power: ${Math.round(distance / 5)}`, gameState.launchStart.x, gameState.launchStart.y - 30);
    }
  }, [gameState]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setGameState(prev => ({
      ...prev,
      isLaunching: true,
      launchStart: { x, y },
      currentMouse: { x, y },
      isPlaying: true
    }));
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gameState.isLaunching) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setGameState(prev => ({
      ...prev,
      currentMouse: { x, y }
    }));
  }, [gameState.isLaunching]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!gameState.isLaunching || !gameState.launchStart || !gameState.currentMouse) return;
    
    const vx = (gameState.currentMouse.x - gameState.launchStart.x) * 0.2;
    const vy = (gameState.currentMouse.y - gameState.launchStart.y) * 0.2;
    
    const newObject = createObject(gameState.launchStart.x, gameState.launchStart.y, vx, vy);
    
    setGameState(prev => ({
      ...prev,
      objects: [...prev.objects, newObject],
      isLaunching: false,
      launchStart: null,
      currentMouse: null,
      score: prev.score + Math.abs(vx) + Math.abs(vy)
    }));
  }, [gameState.isLaunching, gameState.launchStart, gameState.currentMouse, createObject]);

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      objects: [],
      isLaunching: false,
      launchStart: null,
      currentMouse: null
    }));
  }, []);

  const nextLevel = useCallback(() => {
    const newLevel = Math.min(gameState.level + 1, LEVELS.length - 1);
    setGameState(prev => ({
      ...prev,
      level: newLevel,
      friction: LEVELS[newLevel].friction,
      gravity: LEVELS[newLevel].gravity,
      objects: []
    }));
  }, [gameState.level]);

  useEffect(() => {
    const animate = () => {
      if (gameState.isPlaying) {
        updatePhysics();
      }
      render();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.isPlaying, updatePhysics, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = Math.min(800, window.innerWidth - 40);
      canvas.height = Math.min(600, window.innerHeight - 200);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const currentLevel = LEVELS[gameState.level];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            🚀 Inertia Physics Lab
          </h1>
          <p className="text-xl text-gray-300">Discover Newton's First Law through Interactive Experimentation</p>
        </div>

        {/* Instructions Modal */}
        {showInstructions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">🎯 How to Play</h2>
              <div className="space-y-3 text-gray-300 mb-6">
                <p><strong>Objective:</strong> Learn about inertia - objects in motion stay in motion unless acted upon by a force!</p>
                <p><strong>Controls:</strong> Click and drag to launch objects. Watch how they behave in different environments.</p>
                <p><strong>Observe:</strong> Motion trails show object paths, yellow arrows show velocity vectors.</p>
                <p><strong>Experiment:</strong> Try different launch angles and forces across 4 unique levels.</p>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-600 transition-all"
              >
                Start Experimenting!
              </button>
            </div>
          </div>
        )}

        {/* Game Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-lg p-4 shadow-2xl border border-gray-700">
              <canvas
                ref={canvasRef}
                className="border border-gray-600 rounded cursor-crosshair w-full"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              
              {/* Canvas Instructions */}
              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">
                  Click and drag to launch objects • Yellow arrows show velocity • Colored trails show motion paths
                </p>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {/* Level Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-cyan-400">
                Level {gameState.level + 1}: {currentLevel.name}
              </h3>
              <p className="text-sm text-gray-300 mb-3">{currentLevel.description}</p>
              <div className="text-xs text-yellow-400 bg-yellow-900 bg-opacity-30 p-2 rounded">
                <Target className="inline w-4 h-4 mr-1" />
                {currentLevel.target}
              </div>
            </div>

            {/* Physics Settings */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Physics Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Friction: {(gameState.friction * 100).toFixed(0)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.01"
                    value={gameState.friction}
                    onChange={(e) => setGameState(prev => ({ ...prev, friction: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gameState.gravity}
                    onChange={(e) => setGameState(prev => ({ ...prev, gravity: e.target.checked }))}
                    className="mr-2"
                  />
                  <label className="text-sm">Gravity Enabled</label>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-green-400">Game Stats</h3>
              <div className="space-y-1 text-sm">
                <p>Objects Launched: {gameState.objects.length}</p>
                <p>Energy Score: {Math.round(gameState.score)}</p>
                <p>Level Progress: {gameState.level + 1}/4</p>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
              <button
                onClick={resetGame}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Lab
              </button>
              
              <button
                onClick={nextLevel}
                disabled={gameState.level >= LEVELS.length - 1}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center"
              >
                <Zap className="mr-2 h-4 w-4" />
                Next Level
              </button>
              
              <button
                onClick={() => setShowInstructions(true)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Info className="mr-2 h-4 w-4" />
                Instructions
              </button>
            </div>
          </div>
        </div>

        {/* Educational Content */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">🧠 Understanding Inertia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-purple-400">Newton's First Law</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                "An object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force."
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-400">What You're Observing</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Motion trails show continuous movement</li>
                <li>• Friction acts as an external force</li>
                <li>• Gravity changes motion direction</li>
                <li>• Objects bounce when forces are applied</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InertiaGame;