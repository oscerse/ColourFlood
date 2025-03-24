const { useState, useEffect, useRef } = React;

const ColorFlood = () => {
  // Game constants
  const GRID_SIZE = 14;
  const DEFAULT_MOVES = 25;
  const COLORS = {
    default: ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'],
    retro: ['#FF00FF', '#00FFFF', '#FFFF00', '#0000FF', '#FF0000', '#00FF00'],
    beach: ['#FFDE59', '#3AB4F2', '#FF9966', '#59D8A4', '#FF6B6B', '#C490D1'],
    garden: ['#8BC34A', '#FFEB3B', '#F06292', '#9575CD', '#795548', '#4CAF50'],
    pica: ['#FF0000', '#3B4CCA', '#FFDE00', '#B3A125', '#FF65DD', '#77C74C'],
    candy: ['#FF85CB', '#1ECBE1', '#FFAA01', '#CB81FF', '#6BF178', '#FF5A5A'],
    pastel: ['#FF9AA2', '#FFD6A5', '#CAFFBF', '#9BF6FF', '#BDB2FF', '#FFC6FF']/*,
    laci: ['#88E288', '#2E8B57', '#32CD32', '#556B2F', '#9CAF88', '#00A877'],
    monochrome: ['#FFFFFF', '#D6D6D6', '#ADADAD', '#848484', '#5B5B5B', '#333333'] */
  };
  const MUSIC_TRACKS = [
    { file: 'audio/Wave.mp3', name: 'Wave' },
    { file: 'audio/Jaunt.mp3', name: 'Jaunt' },
    { file: 'audio/Pixel.mp3', name: 'Pixel' },
    { file: 'audio/Serene.mp3', name: 'Serene' },
    { file: 'audio/RetroPulse.mp3', name: 'Retro' },
    { file: 'audio/Elysium.mp3', name: 'Elysium' },
    { file: 'audio/Arcadia.mp3', name: 'Arcadia' }
  ];
  
  // Powerup constants
  const POWERUP_COSTS = {
    undo: 1,
    burst: 5,
    prism: 10
  };
  
  const POWERUP_UNLOCK_LEVELS = {
    undo: 3,
    burst: 7,
    prism: 11
  };

  // Game state
  const [grid, setGrid] = useState([]);
  const [activeColor, setActiveColor] = useState('');
  const [activeArea, setActiveArea] = useState([]);
  const [previewColor, setPreviewColor] = useState(null);
  const [previewArea, setPreviewArea] = useState([]);
  const [previewMultiplier, setPreviewMultiplier] = useState(null);
  const [movesLeft, setMovesLeft] = useState(DEFAULT_MOVES);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [colorPalette, setColorPalette] = useState('default');
  const [gameColors, setGameColors] = useState([]);
  const [selectedMode, setSelectedMode] = useState('classic');
  const [darkMode, setDarkMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(40); // Default volume: 40%
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [nowPlaying, setNowPlaying] = useState('Muted'); // Track name display
  
  // New state for powerups
  const [coins, setCoins] = useState(0);
  const [unlockedPowerups, setUnlockedPowerups] = useState({
    undo: false,
    burst: false,
    prism: false
  });
  const [activePowerup, setActivePowerup] = useState(null); // null, 'undo', 'burst', 'prism'
  const [showPowerupTutorial, setShowPowerupTutorial] = useState(false);
  const [tutorialContent, setTutorialContent] = useState({});
  const [boardHistory, setBoardHistory] = useState([]); // For undo feature
  const [activeAreaHistory, setActiveAreaHistory] = useState([]); // For undo feature
  const [scoreHistory, setScoreHistory] = useState([]); // For undo feature
  const [paletteHistory, setPaletteHistory] = useState([]);
  const [burstPreviewArea, setBurstPreviewArea] = useState([]);
  const [prismPreviewColor, setPrismPreviewColor] = useState(null);
  const [prismPreviewAreas, setPrismPreviewAreas] = useState({});
  
  // Audio references
  const audioRef = useRef(null);
  const gameContainerRef = useRef(null);

  // Fixed cell sizes based on device type
  const getCellSize = () => {
    const isMobile = window.innerWidth <= 768;
    const viewHeight = window.innerHeight;
    
    if (isMobile) {
      // For mobile, use smaller cells
      return viewHeight < 700 ? 16 : 20;
    } else {
      // For desktop, use larger cells
      return 24;
    }
  };

  // Initialize game
  useEffect(() => {
    // Setup audio without playing
    setupAudio();
  }, []);

  // Setup audio system
  const setupAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.src = MUSIC_TRACKS[currentTrack].file;
      audioRef.current.volume = volume / 100;
      audioRef.current.addEventListener('ended', playNextTrack);
      
      // Set initial now playing text
      setNowPlaying(MUSIC_TRACKS[currentTrack].name);
      
      // Add error event handler to debug issues
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Failed to load:', MUSIC_TRACKS[currentTrack].file);
      });
      
      // Preload audio
      audioRef.current.load();
    }
  };

  // Play next track when current one ends
  const playNextTrack = () => {
    setCurrentTrack(prevTrack => {
      const nextTrack = (prevTrack + 1) % MUSIC_TRACKS.length;
      
      if (audioRef.current) {
        audioRef.current.src = MUSIC_TRACKS[nextTrack].file;
        
        if (!isMuted) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              setNowPlaying(MUSIC_TRACKS[nextTrack].name);
            }).catch(error => {
              console.error("Audio play failed:", error);
              // Try to recover by moving to next track
              setTimeout(() => playNextTrack(), 1000);
            });
          }
        }
      }
      
      return nextTrack;
    });
  };

  // Simple track skipping function
  const handleTrackSkip = () => {
    if (!isMuted && audioRef.current) {
      const nextTrack = (currentTrack + 1) % MUSIC_TRACKS.length;
      setCurrentTrack(nextTrack);
      
      try {
        audioRef.current.src = MUSIC_TRACKS[nextTrack].file;
        audioRef.current.play().then(() => {
          setNowPlaying(MUSIC_TRACKS[nextTrack].name);
        }).catch(e => {
          console.error("Error playing next track:", e);
        });
      } catch (e) {
        console.error("Track skip error:", e);
      }
    }
  };

  // Handle mute toggle
  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
        setNowPlaying('Muted');
      } else if (audioInitialized) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setNowPlaying(MUSIC_TRACKS[currentTrack].name);
          }).catch(error => {
            console.error("Audio play failed:", error);
          });
        }
      }
    }
  }, [isMuted]);
  
  // Handle track change - this helps ensure the now playing text updates
  useEffect(() => {
    if (!isMuted && audioInitialized) {
      setNowPlaying(MUSIC_TRACKS[currentTrack].name);
    }
  }, [currentTrack, audioInitialized]);
  
  // Handle volume change
  useEffect(() => {
    if (audioRef.current) {
      try {
        audioRef.current.volume = volume / 100;
      } catch (e) {
        console.error("Error setting volume:", e);
      }
    }
  }, [volume]);

  // Unlock powerups based on level
  useEffect(() => {
    // Check for newly unlocked powerups
    const newUnlocks = { ...unlockedPowerups };
    let shouldShowTutorial = false;
    let newTutorialContent = {};
    
    // First powerup unlock also introduces the coin system
    if (level === POWERUP_UNLOCK_LEVELS.undo && !unlockedPowerups.undo) {
      newUnlocks.undo = true;
      shouldShowTutorial = true;
      newTutorialContent = {
        title: "Powerups Unlocked!",
        message: "You've unlocked powerups and the coin system! Complete levels quickly to earn coins that you can spend on special abilities.",
        powerup: "undo",
        description: "The Undo powerup (1 coin) lets you revert your last move, giving back the move and removing points gained."
      };
      
      // Award bonus coins on first powerup unlock
      setCoins(prev => prev + 3);
    }
    
    if (level === POWERUP_UNLOCK_LEVELS.burst && !unlockedPowerups.burst) {
      newUnlocks.burst = true;
      shouldShowTutorial = true;
      newTutorialContent = {
        title: "New Powerup: Burst!",
        message: "You've unlocked the Burst powerup!",
        powerup: "burst",
        description: "The Burst powerup (5 coins) expands your active area to all adjacent tiles AND all connected tiles of the same colour."
      };
      
      // Award bonus coins on burst unlock
      setCoins(prev => prev + 3);
    }
    
    if (level === POWERUP_UNLOCK_LEVELS.prism && !unlockedPowerups.prism) {
      newUnlocks.prism = true;
      shouldShowTutorial = true;
      newTutorialContent = {
        title: "New Powerup: Prism!",
        message: "You've unlocked the Prism powerup!",
        powerup: "prism",
        description: "The Prism powerup (10 coins) converts all tiles of a selected colour to your active area's colour across the entire board."
      };
      
      // Award bonus coins on prism unlock
      setCoins(prev => prev + 3);
    }
    
    // Check if we should show the tutorial
    if (shouldShowTutorial) {
      setUnlockedPowerups(newUnlocks);
      setTutorialContent(newTutorialContent);
      setShowPowerupTutorial(true);
    }
    
    // Award bonus coins at color addition levels (if not already awarded for powerup unlock)
    if ((level === 5 || level === 10 || level === 15) && 
        level !== POWERUP_UNLOCK_LEVELS.undo && 
        level !== POWERUP_UNLOCK_LEVELS.burst && 
        level !== POWERUP_UNLOCK_LEVELS.prism) {
      setCoins(prev => prev + 3);
    }
  }, [level]);

  // Start game from splash screen with selected mode
  const startGame = (mode) => {
    setSelectedMode(mode);
    setShowSplashScreen(false);
    startNewGame();
    
    // Start playing music
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setAudioInitialized(true);
          setNowPlaying(MUSIC_TRACKS[currentTrack].name);
        }).catch(error => {
          console.error("Audio play failed:", error);
        });
      }
    }
  };

  // When level changes, update number of colors with new progression
  useEffect(() => {
    // Keep moves at 25 for all levels
    let levelMoves = DEFAULT_MOVES;
    
    // Only set moves when level changes (not on palette changes)
    setMovesLeft(levelMoves);
    
    // New colour progression: 4th after level 5, 5th after level 10, 6th after level 15
    let numColors = 3;
    if (level > 15) numColors = 6;
    else if (level > 10) numColors = 5;
    else if (level > 5) numColors = 4;
    
    // Update colors for the current palette
    const newColors = COLORS[colorPalette].slice(0, numColors);
    setGameColors(newColors);
    
    // On level change, we'll initialize with new grid in another effect
  }, [level, colorPalette]);

  // Effect to initialize grid when needed - separate from color/palette changes
  useEffect(() => {
    // Initialize grid whenever level changes or game colors change
    if (gameColors.length > 0 && gameState !== 'transitioning') {
      initializeGrid();
    }
  }, [level, gameColors.length, gameState]);

  // Function to check which colors are present on the grid
  const getColorsOnGrid = () => {
    // Safe check - return empty Set if grid is not initialized
    if (!grid || grid.length === 0) return new Set();
    
    const colorsPresent = new Set();
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        colorsPresent.add(grid[row][col]);
      }
    }
    
    return colorsPresent;
  };

  // Initialize the grid with random colors
  const initializeGrid = () => {
    // Safety check - make sure gameColors is not empty
    if (gameColors.length === 0) return;
    
    console.log("Initializing grid with colors:", gameColors);
    
    // Create a new grid with all available colors for the current level
    const newGrid = Array(GRID_SIZE).fill().map(() => 
      Array(GRID_SIZE).fill().map(() => 
        gameColors[Math.floor(Math.random() * gameColors.length)]
      )
    );
    
    setGrid(newGrid);
    
    // Clear history
    setBoardHistory([]);
    setActiveAreaHistory([]);
    setScoreHistory([]);
    
    // Get the color of the start tile
    const startColor = newGrid[0][0];
    setActiveColor(startColor);
    
    // Initialize active area with flood fill
    const initialActiveArea = [];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    // Flood fill algorithm (DFS)
    const floodFill = (row, col) => {
      // Check bounds
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
      
      // Check if already visited or color doesn't match start color
      if (visited[row][col] || newGrid[row][col] !== startColor) return;
      
      // Mark as visited and add to active area
      visited[row][col] = true;
      initialActiveArea.push([row, col]);
      
      // Check neighbors (up, right, down, left)
      floodFill(row - 1, col);
      floodFill(row, col + 1);
      floodFill(row + 1, col);
      floodFill(row, col - 1);
    };
    
    // Start flood fill from top-left corner
    floodFill(0, 0);
    
    setActiveArea(initialActiveArea);
    
    // Reset all powerup previews
    setPreviewArea([]);
    setPreviewColor(null);
    setPreviewMultiplier(null);
    setBurstPreviewArea([]);
    setPrismPreviewColor(null);
    setPrismPreviewAreas({});
    setActivePowerup(null);
  };

  // Start a new game
  const startNewGame = () => {
    // Reset game state
    setMovesLeft(DEFAULT_MOVES);
    setScore(0);
    setLevel(1);
    setCoins(0);
    
    // Always start with exactly 3 colors in level 1
    const numColors = 3;
    setGameColors(COLORS[colorPalette].slice(0, numColors));
    
    // Reset powerup unlocks if starting from level 1
    setUnlockedPowerups({
      undo: false,
      burst: false,
      prism: false
    });
    
    // Clear powerup state
    setActivePowerup(null);
    setBurstPreviewArea([]);
    setPrismPreviewColor(null);
    setPrismPreviewAreas({});
    
    // Reset game state to playing
    setGameState('playing');
    
    // Force grid re-initialization with exactly 3 colors
    setTimeout(() => {
      // Clear the grid first to force a complete rebuild
      setGrid([]);
      
      // Create a new grid with only 3 colors
      const newGrid = Array(GRID_SIZE).fill().map(() => 
        Array(GRID_SIZE).fill().map(() => 
          COLORS[colorPalette].slice(0, 3)[Math.floor(Math.random() * 3)]
        )
      );
      
      setGrid(newGrid);
      
      // Initialize the active area
      const initialActiveArea = [];
      const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
      
      // Flood fill from top-left with the color there
      const startColor = newGrid[0][0];
      setActiveColor(startColor);
      
      const floodFill = (row, col) => {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
        if (visited[row][col] || newGrid[row][col] !== startColor) return;
        
        visited[row][col] = true;
        initialActiveArea.push([row, col]);
        
        floodFill(row - 1, col);
        floodFill(row, col + 1);
        floodFill(row + 1, col);
        floodFill(row, col - 1);
      };
      
      floodFill(0, 0);
      setActiveArea(initialActiveArea);
    }, 50);
  };
  
  // Give up current game
  const giveUp = () => {
    setShowResetConfirm(false);
    setGameState('lost');
  };

  // Start next level
  const startNextLevel = () => {
    // Apply bonus for perfect clear (used less than 15 moves)
    const movesUsed = DEFAULT_MOVES - movesLeft;
    if (movesUsed < 15) {
      // Add score bonus based on remaining moves (50 points per move remaining)
      const scoreBonus = movesLeft * 50;
      setScore(prev => prev + scoreBonus);
      
      // Award 1 bonus coin for completing the level under 15 moves
      setCoins(prev => prev + 1);
    }

    // Award 1 coin for completing the level
      setCoins(prev => prev + 1);
    
    // Check if this level completion unlocks a new color for the next level
    const currentLevel = level;
    const willUnlockNewColor = currentLevel === 5 || currentLevel === 10 || currentLevel === 15;
    
    // Temporarily set the game state to "transitioning" to prevent win check
    setGameState('transitioning');
    
    // Increment the level
    setLevel(prev => prev + 1);
    
    // Force a grid re-initialization for the new level
    setTimeout(() => {
      // Reset history
      setBoardHistory([]);
      setActiveAreaHistory([]);
      setScoreHistory([]);
      
      // If we just unlocked a new color, we need to force a rerender
      if (willUnlockNewColor) {
        // Update game colors first
        const newLevel = currentLevel + 1;
        let numColors = 3;
        if (newLevel > 15) numColors = 6;
        else if (newLevel > 10) numColors = 5;
        else if (newLevel > 5) numColors = 4;
        
        setGameColors(COLORS[colorPalette].slice(0, numColors));
        
        // Then initialize grid with short delay to ensure colors update first
        setTimeout(() => {
          initializeGrid();
          setGameState('playing');
        }, 50);
      } else {
        // Otherwise just initialize normally
        initializeGrid();
        setGameState('playing');
      }
    }, 50);
  };

  // Cycle through color palettes
  const cyclePalette = () => {
    const palettes = Object.keys(COLORS);
    const currentIndex = palettes.indexOf(colorPalette);
    const nextIndex = (currentIndex + 1) % palettes.length;
    
    // Get the new palette name
    const newPalette = palettes[nextIndex];
    
    // Preserve move count
    const currentMoves = movesLeft;
    
    // Update palette in state
    setColorPalette(newPalette);
    
    // Update colors with same count
    const currentColorCount = gameColors.length;
    const newColors = COLORS[newPalette].slice(0, currentColorCount);
    
    // Map old colors to new
    if (grid.length > 0) {
      const colorMap = {};
      gameColors.forEach((oldColor, index) => {
        if (index < newColors.length) {
          colorMap[oldColor] = newColors[index];
        }
      });
      
      // Create new grid with mapped colors
      const newGrid = grid.map(row => 
        row.map(cellColor => colorMap[cellColor] || cellColor)
      );
      
      // Update active color to match
      const newActiveColor = colorMap[activeColor] || activeColor;
      
      // Update grid and active color without reinitializing
      setGrid(newGrid);
      setActiveColor(newActiveColor);
    }
    
    // Set gameColors (but this won't trigger reinitialization)
    setGameColors(newColors);
    
    // Restore move count (since the level/color effect resets it)
    setTimeout(() => {
      setMovesLeft(currentMoves);
    }, 10);
  };

  // Undo the last move
const undoLastMove = () => {
  // Check if we can undo
  if (boardHistory.length === 0 || 
      coins < POWERUP_COSTS.undo || 
      activePowerup === 'undo' || 
      activePowerup === 'used-powerup') {
    return;
  }
  
  // Get the previous state - ensure we have a deep copy
  const prevGrid = JSON.parse(JSON.stringify(boardHistory[boardHistory.length - 1]));
  const prevActiveArea = JSON.parse(JSON.stringify(activeAreaHistory[activeAreaHistory.length - 1]));
  const prevScore = scoreHistory[scoreHistory.length - 1];
  const prevPalette = paletteHistory[paletteHistory.length - 1];
  
  // Map previous colors to current palette if palette changed
  let gridToRestore = prevGrid;
  if (prevPalette !== colorPalette) {
    const oldColors = COLORS[prevPalette].slice(0, gameColors.length);
    const newColors = COLORS[colorPalette].slice(0, gameColors.length);
    
    // Map colors from old palette to new palette
    gridToRestore = prevGrid.map(row => 
      row.map(cellColor => {
        const index = oldColors.indexOf(cellColor);
        return index >= 0 && index < newColors.length ? newColors[index] : cellColor;
      })
    );
  }
  
  // Restore the previous state with mapped colors for current palette
  setGrid(gridToRestore);
  setActiveArea(prevActiveArea);
  
  // Get the color of the active area in the previous state, mapped to current palette
  if (prevActiveArea.length > 0) {
    const [row, col] = prevActiveArea[0];
    const oldActiveColor = prevGrid[row][col];
    
    // Map active color if palette changed
    if (prevPalette !== colorPalette) {
      const index = COLORS[prevPalette].indexOf(oldActiveColor);
      if (index >= 0 && index < gameColors.length) {
        setActiveColor(COLORS[colorPalette][index]);
      } else {
        setActiveColor(gridToRestore[row][col]);
      }
    } else {
      setActiveColor(oldActiveColor);
    }
  }
  
  setScore(prevScore);
  
  // Add back a move
  setMovesLeft(prev => prev + 1);
  
  // Remove from history
  setBoardHistory(prev => prev.slice(0, -1));
  setActiveAreaHistory(prev => prev.slice(0, -1));
  setScoreHistory(prev => prev.slice(0, -1));
  setPaletteHistory(prev => prev.slice(0, -1));
  
  // Deduct coins
  setCoins(prev => prev - POWERUP_COSTS.undo);
  
  // Set powerup state to 'undo' to prevent chaining
  setActivePowerup('undo');
};

  // Calculate preview area for a color
  const calculatePreviewArea = (color) => {
    if (color === activeColor || gameState !== 'playing') {
      setPreviewArea([]);
      setPreviewColor(null);
      setPreviewMultiplier(null);
      return;
    }

    // First update the grid
    const newGrid = JSON.parse(JSON.stringify(grid));
    for (const [row, col] of activeArea) {
      newGrid[row][col] = color;
    }

    // Then calculate the new active area using flood fill
    const newActiveArea = [];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    // Flood fill algorithm (DFS)
    const floodFill = (row, col) => {
      // Check bounds
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
      
      // Check if already visited or color doesn't match
      if (visited[row][col] || newGrid[row][col] !== color) return;
      
      // Mark as visited and add to active area
      visited[row][col] = true;
      newActiveArea.push([row, col]);
      
      // Check neighbors (up, right, down, left)
      floodFill(row - 1, col);
      floodFill(row, col + 1);
      floodFill(row + 1, col);
      floodFill(row, col - 1);
    };
    
    // Start flood fill from top-left corner
    floodFill(0, 0);
    
    // Calculate new tiles only (those not in current active area)
    const newTiles = newActiveArea.filter(([r, c]) => 
      !activeArea.some(([ar, ac]) => ar === r && ac === c)
    );
    
    // Determine multiplier based on new tiles count
    let multiplier = 1;
    if (newTiles.length > 20) multiplier = 2;
    else if (newTiles.length > 10) multiplier = 1.5;
    
    setPreviewArea(newTiles);
    setPreviewColor(color);
    setPreviewMultiplier(multiplier);
  };

  // Calculate preview area for burst powerup
  const calculateBurstPreview = () => {
    if (gameState !== 'playing' || coins < POWERUP_COSTS.burst) {
      setBurstPreviewArea([]);
      return;
    }
    
    const newBurstArea = [];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    // Mark active area as visited
    for (const [row, col] of activeArea) {
      visited[row][col] = true;
    }
    
    // Find all adjacent tiles to active area
    const adjacentTiles = new Set();
    
    for (const [row, col] of activeArea) {
      // Check all 4 directions
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        // Check bounds
        if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) continue;
        
        // If not already in active area, add to adjacent
        if (!visited[newRow][newCol]) {
          adjacentTiles.add(`${newRow},${newCol}`);
          // Add to burst area
          newBurstArea.push([newRow, newCol]);
          visited[newRow][newCol] = true;
        }
      }
    }
    
    // For each adjacent tile, also add all connected tiles of the same color
    const toProcess = [...newBurstArea]; // Start with adjacent tiles
    
    while (toProcess.length > 0) {
      const [row, col] = toProcess.pop();
      const color = grid[row][col];
      
      // Check all 4 directions
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        // Check bounds
        if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) continue;
        
        // If not already visited and same color, add to burst area
        if (!visited[newRow][newCol] && grid[newRow][newCol] === color) {
          newBurstArea.push([newRow, newCol]);
          toProcess.push([newRow, newCol]);
          visited[newRow][newCol] = true;
        }
      }
    }
    
    setBurstPreviewArea(newBurstArea);
  };

  // Calculate preview area for prism powerup
  const calculatePrismPreview = (color) => {
    if (gameState !== 'playing' || coins < POWERUP_COSTS.prism || color === activeColor) {
      setPrismPreviewColor(null);
      setPrismPreviewAreas({});
      return;
    }
    
    // Find all tiles that would be changed (all tiles of the selected color)
    const colorTiles = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] === color) {
          colorTiles.push([row, col]);
        }
      }
    }
    
    setPrismPreviewColor(color);
    setPrismPreviewAreas({
      ...prismPreviewAreas,
      [color]: colorTiles
    });
  };

  // Use burst powerup
  const useBurstPowerup = () => {
    if (gameState !== 'playing' || coins < POWERUP_COSTS.burst || activePowerup === 'undo') return;
    
    // Calculate burst area if not already calculated
    if (burstPreviewArea.length === 0) {
      calculateBurstPreview();
      return;
    }
    
    // Apply burst powerup
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // Change all burst area tiles to active color
    for (const [row, col] of burstPreviewArea) {
      newGrid[row][col] = activeColor;
    }
    
    // Now we need to recalculate the active area completely using flood fill
    // to ensure all connected tiles of the same color are included
    const newActiveArea = [];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    // Flood fill algorithm (DFS)
    const floodFill = (row, col) => {
      // Check bounds
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
      
      // Check if already visited or color doesn't match active color
      if (visited[row][col] || newGrid[row][col] !== activeColor) return;
      
      // Mark as visited and add to active area
      visited[row][col] = true;
      newActiveArea.push([row, col]);
      
      // Check neighbors (up, right, down, left)
      floodFill(row - 1, col);
      floodFill(row, col + 1);
      floodFill(row + 1, col);
      floodFill(row, col - 1);
    };
    
    // Start flood fill from top-left corner
    floodFill(0, 0);
    
    // Update the grid and active area
    setGrid(newGrid);
    setActiveArea(newActiveArea);
    
    // Calculate score based on new tiles added
    const previousActiveAreaSize = activeArea.length;
    const newTiles = newActiveArea.length - previousActiveAreaSize;
    let scoreIncrease = newTiles;
    
    // Add combo multiplier for large areas
    if (newTiles > 20) {
      scoreIncrease = Math.floor(newTiles * 2);
    } else if (newTiles > 10) {
      scoreIncrease = Math.floor(newTiles * 1.5);
    }
    
    setScore(prev => prev + scoreIncrease);
    
    // Deduct coins
    setCoins(prev => prev - POWERUP_COSTS.burst);
    
    // Reset burst preview
    setBurstPreviewArea([]);
    
    // Set powerup state to prevent Undo
    setActivePowerup('used-powerup');
    
    // Check win condition
    checkWinCondition(newGrid, newActiveArea);
  };

  // Use prism powerup
  const usePrismPowerup = (color) => {
    if (gameState !== 'playing' || coins < POWERUP_COSTS.prism || color === activeColor || activePowerup === 'undo') return;
    
    // Apply prism powerup
    const newGrid = JSON.parse(JSON.stringify(grid));
    let newActiveArea = [...activeArea];
    
    // Get all tiles of the selected color
    const colorTiles = prismPreviewAreas[color] || [];
    
    if (colorTiles.length === 0) {
      // Calculate if not already done
      calculatePrismPreview(color);
      return;
    }
    
    // Change all color tiles to active color
    for (const [row, col] of colorTiles) {
      newGrid[row][col] = activeColor;
      
      // Add to active area if connected to existing active area
      const isAdjacent = activeArea.some(([ar, ac]) => 
        (Math.abs(ar - row) === 1 && ac === col) || 
        (Math.abs(ac - col) === 1 && ar === row)
      );
      
      if (isAdjacent) {
        newActiveArea.push([row, col]);
      }
    }
    
    // Need to recalculate the active area using flood fill to ensure connectivity
    const recalculatedActiveArea = [];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    // Flood fill algorithm (DFS)
    const floodFill = (row, col) => {
      // Check bounds
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
      
      // Check if already visited or color doesn't match active color
      if (visited[row][col] || newGrid[row][col] !== activeColor) return;
      
      // Mark as visited and add to active area
      visited[row][col] = true;
      recalculatedActiveArea.push([row, col]);
      
      // Check neighbors (up, right, down, left)
      floodFill(row - 1, col);
      floodFill(row, col + 1);
      floodFill(row + 1, col);
      floodFill(row, col - 1);
    };
    
    // Start flood fill from top-left corner
    floodFill(0, 0);
    
    // Calculate score based on new tiles added
    const previousActiveAreaSize = activeArea.length;
    const newTiles = recalculatedActiveArea.length - previousActiveAreaSize;
    let scoreIncrease = newTiles;
    
    // Add combo multiplier for large areas
    if (newTiles > 20) {
      scoreIncrease = Math.floor(newTiles * 2);
    } else if (newTiles > 10) {
      scoreIncrease = Math.floor(newTiles * 1.5);
    }
    
    // Update state
    setGrid(newGrid);
    setActiveArea(recalculatedActiveArea);
    setScore(prev => prev + scoreIncrease);
    
    // Deduct coins
    setCoins(prev => prev - POWERUP_COSTS.prism);
    
    // Reset prism preview
    setPrismPreviewColor(null);
    setPrismPreviewAreas({});
    
    // Set powerup state to prevent Undo
    setActivePowerup('used-powerup');
    
    // Check win condition
    checkWinCondition(newGrid, recalculatedActiveArea);
  };

  // Check win condition
  const checkWinCondition = (newGrid, newActiveArea) => {
    // Check if all cells are the same color now
    const allSameColor = newGrid.every(row => 
      row.every(cellColor => cellColor === activeColor)
    );
    
    // Check win condition
    if (allSameColor || newActiveArea.length === GRID_SIZE * GRID_SIZE) {
      setGameState('won');
    }
  };

  // Toggle powerup
  const togglePowerup = (powerup) => {
    // Check if powerup is available
    if (!unlockedPowerups[powerup]) return;
    
    // Check if enough coins
    if (coins < POWERUP_COSTS[powerup]) return;
    
    // Toggle the powerup state
    if (activePowerup === powerup) {
      setActivePowerup(null);
      
      // Clear any preview areas
      setBurstPreviewArea([]);
      setPrismPreviewColor(null);
      setPrismPreviewAreas({});
    } else {
      setActivePowerup(powerup);
      
      // Show preview for burst
      if (powerup === 'burst') {
        calculateBurstPreview();
      }
      
      // Clear other preview areas
      if (powerup !== 'burst') setBurstPreviewArea([]);
      if (powerup !== 'prism') {
        setPrismPreviewColor(null);
        setPrismPreviewAreas({});
      }
    }
  };

  // Handle color button click
  const handleColorClick = (color) => {
    // Check if game is active
    if (gameState !== 'playing') return;
    
    // Check if we're in Prism powerup mode
    if (activePowerup === 'prism') {
      usePrismPowerup(color);
      return;
    }
    
    // Don't do anything if clicking the current color
    if (color === activeColor) return;

    // Save current state to history - use deep copies
    setBoardHistory(prev => [...prev, JSON.parse(JSON.stringify(grid))]);
    setActiveAreaHistory(prev => [...prev, JSON.parse(JSON.stringify(activeArea))]);
    setScoreHistory(prev => [...prev, score]);
    // Add palette to history
    setPaletteHistory(prev => [...prev, colorPalette]);

    // Clear preview state
    setPreviewArea([]);
    setPreviewColor(null);
    setPreviewMultiplier(null);

    // Reduce moves
    setMovesLeft(prev => prev - 1);

    // Change active color
    setActiveColor(color);

    // First pass: Update grid and get initial active area (make a deep copy)
    const newGrid = JSON.parse(JSON.stringify(grid));
    for (const [row, col] of activeArea) {
      newGrid[row][col] = color;
    }
    setGrid(newGrid);

    // Second pass: Flood fill to get all connected tiles of the same color
    const newActiveArea = [];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    
    // Flood fill algorithm (DFS)
    const floodFill = (row, col) => {
      // Check bounds
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
      
      // Check if already visited or color doesn't match
      if (visited[row][col] || newGrid[row][col] !== color) return;
      
      // Mark as visited and add to active area
      visited[row][col] = true;
      newActiveArea.push([row, col]);
      
      // Check neighbors (up, right, down, left)
      floodFill(row - 1, col);
      floodFill(row, col + 1);
      floodFill(row + 1, col);
      floodFill(row, col - 1);
    };
    
    // Start flood fill from top-left corner
    floodFill(0, 0);
    
    // Calculate score based on new tiles added
    const previousActiveAreaSize = activeArea.length;
    const newTiles = newActiveArea.length - previousActiveAreaSize;
    let scoreIncrease = newTiles;
    
    // Add combo multiplier for large areas
    if (newTiles > 20) {
      scoreIncrease = Math.floor(newTiles * 2);
    } else if (newTiles > 10) {
      scoreIncrease = Math.floor(newTiles * 1.5);
    }
    
    setScore(prev => prev + scoreIncrease);
    setActiveArea(newActiveArea);
    
    // Reset the undo powerup state after a normal move
    setActivePowerup(null);
    
    // Check win condition
    if (newActiveArea.length === GRID_SIZE * GRID_SIZE) {
      setGameState('won');
    } 
    // Check lose condition
    else if (movesLeft - 1 <= 0) {
      setGameState('lost');
    }
  };

  // RENDER METHODS

  // Render splash screen
  const renderSplashScreen = () => {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <h1 className="splash-title">COLOUR FLOOD</h1>
          <div className="splash-description">
            Fill the grid with a single colour in as few moves as possible!
          </div>
          
          <div className="splash-modes">
            <button className="splash-mode-button active" onClick={() => startGame('classic')}>
              PLAY CLASSIC MODE
            </button>
            <button className="splash-mode-button disabled" disabled>
              TIME ATTACK
            </button>
            <button className="splash-mode-button disabled" disabled>
              PUZZLE MODE
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render the game grid
  const renderGrid = () => {
    const cellSize = getCellSize();
    
    return (
      <div className="grid-container">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((cell, colIndex) => {
              const isActive = activeArea.some(([r, c]) => r === rowIndex && c === colIndex);
              const isPreview = previewArea.some(([r, c]) => r === rowIndex && c === colIndex);
              const isBurstPreview = burstPreviewArea.some(([r, c]) => r === rowIndex && c === colIndex);
              const isPrismPreview = prismPreviewColor && grid[rowIndex][colIndex] === prismPreviewColor;
              const isStart = rowIndex === 0 && colIndex === 0;
              
              // Determine the appropriate CSS class
              let cellClass = "grid-cell";
              if (isActive) cellClass += " active";
              if (isPreview) cellClass += " preview";
              if (isBurstPreview) cellClass += " burst-preview";
              if (isPrismPreview) cellClass += " prism-preview";
              if (isStart) cellClass += " start";
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cellClass}
                  style={{ 
                    backgroundColor: cell,
                    width: `${cellSize}px`,
                    height: `${cellSize}px`
                  }}
                >
                  {isStart && cellSize > 16 && <span className="start-marker">S</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Render color buttons and powerup buttons
  const renderColorButtons = () => {
  // Calculate button size based on screen size
  const isMobile = window.innerWidth <= 768;
  const buttonSize = isMobile ? 40 : 50;
  
  // Get colors on grid (safely)
  let colorsOnGrid = new Set();
  try {
    if (grid && grid.length > 0) {
      colorsOnGrid = getColorsOnGrid();
    }
  } catch (e) {
    console.error("Error getting colors on grid:", e);
  }
  
  return (
    <div className="color-buttons-container">
      <div className="color-buttons">
        {/* Powerup buttons ABOVE color buttons */}
        {(unlockedPowerups.undo || unlockedPowerups.burst || unlockedPowerups.prism) && (
          <div className="buttons-row powerup-buttons-row">
            {renderPowerupButtons()}
          </div>
        )}
        
        {/* Color buttons row BELOW powerups */}
        <div className="buttons-row color-buttons-row">
          {gameColors.map((color, index) => {
            // Check if color is on grid
            const isOnGrid = colorsOnGrid.has(color);
            // Default to enabled if we couldn't compute colors on grid
            const isDisabled = 
              gameState !== 'playing' || 
              (color === activeColor && activePowerup !== 'prism') || 
              (colorsOnGrid.size > 0 && !isOnGrid && activePowerup !== 'prism');
            
            return (
              <div key={index} className="button-wrapper">
                {previewMultiplier && color === previewColor && previewArea.length > 0 && (
                  <div className="multiplier-indicator">
                    {previewMultiplier}x
                  </div>
                )}
                <button
                  className={`color-button ${color === activeColor ? 'active' : ''} ${color === previewColor ? 'previewing' : ''} ${color === prismPreviewColor ? 'prism-target' : ''}`}
                  style={{ 
                    backgroundColor: color,
                    width: `${buttonSize}px`,
                    height: `${buttonSize}px`,
                    display: 'block'
                  }}
                  onClick={() => handleColorClick(color)}
                  onMouseEnter={() => {
                    if (activePowerup === 'prism') {
                      calculatePrismPreview(color);
                    } else {
                      calculatePreviewArea(color);
                    }
                  }}
                  onMouseLeave={() => {
                    if (activePowerup === 'prism') {
                      setPrismPreviewColor(null);
                    } else {
                      setPreviewArea([]);
                      setPreviewColor(null);
                      setPreviewMultiplier(null);
                    }
                  }}
                  disabled={isDisabled}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

  // Render powerup buttons
  const renderPowerupButtons = () => {
    // Calculate button size based on screen size
    const isMobile = window.innerWidth <= 768;
    const buttonSize = isMobile ? 40 : 50;
    
    return (
      <div className="powerup-buttons">
        {/* Undo Powerup */}
        {unlockedPowerups.undo && (
          <div className="powerup-wrapper">
            <button
              className={`powerup-button undo-button ${activePowerup === 'undo' ? 'active' : ''} ${activePowerup === 'used-powerup' ? 'used' : ''}`}
              style={{ 
                width: `${buttonSize}px`,
                height: `${buttonSize}px`
              }}
              onClick={undoLastMove}
              disabled={gameState !== 'playing' || coins < POWERUP_COSTS.undo || boardHistory.length === 0 || activePowerup === 'undo' || activePowerup === 'used-powerup'}
              title={activePowerup === 'used-powerup' ? "Cannot undo after using a powerup" : activePowerup === 'undo' ? "Cannot undo twice in a row" : "Undo Last Move (1 Coin)"}
            >
              <span className="powerup-icon">↩</span>
              <span className="powerup-cost">{POWERUP_COSTS.undo}</span>
            </button>
          </div>
        )}
        
        {/* Burst Powerup */}
        {unlockedPowerups.burst && (
          <div className="powerup-wrapper">
            <button
              className={`powerup-button burst-button ${activePowerup === 'burst' ? 'active' : ''}`}
              style={{ 
                width: `${buttonSize}px`,
                height: `${buttonSize}px`
              }}
              onClick={() => {
                if (activePowerup === 'burst') {
                  useBurstPowerup();
                } else {
                  togglePowerup('burst');
                }
              }}
              onMouseEnter={() => calculateBurstPreview()}
              onMouseLeave={() => setBurstPreviewArea([])}
              disabled={gameState !== 'playing' || coins < POWERUP_COSTS.burst}
              title="Burst: Expand to Adjacent & Connected Tiles (1 Coin)"
            >
              <span className="powerup-icon">⭐</span>
              <span className="powerup-cost">{POWERUP_COSTS.burst}</span>
            </button>
          </div>
        )}
        
        {/* Prism Powerup */}
        {unlockedPowerups.prism && (
          <div className="powerup-wrapper">
            <button
              className={`powerup-button prism-button ${activePowerup === 'prism' ? 'active' : ''}`}
              style={{ 
                width: `${buttonSize}px`,
                height: `${buttonSize}px`
              }}
              onClick={() => togglePowerup('prism')}
              disabled={gameState !== 'playing' || coins < POWERUP_COSTS.prism}
              title="Prism: Convert All Tiles of a Color (1 Coin)"
            >
              <span className="powerup-icon">🔮</span>
              <span className="powerup-cost">{POWERUP_COSTS.prism}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render game info
  const renderGameInfo = () => {
    return (
      <div className="game-info">
        <div className="info-grid">
          <div className="info-cell">
            <div className="info-item">
              <span className="info-label">LEVEL</span>
              <span className="info-value">{level}</span>
            </div>
          </div>
          <div className="info-cell">
            <div className="info-item">
              <span className="info-label">SCORE</span>
              <span className="info-value">{score}</span>
            </div>
          </div>
          <div className="info-cell">
            <div className="info-item">
              <span className="info-label">MOVES</span>
              <span className="info-value">{movesLeft}</span>
            </div>
          </div>
          <div className="info-cell">
            <div className="info-item">
              <span className="info-label">COINS</span>
              <span className="info-value">{coins}</span>
            </div>
          </div>
        </div>
        <div className="action-buttons">
          <button className="ui-button palette-button" onClick={cyclePalette} title="Change colour theme">
            <span className="button-label">PALETTE</span>
            <span className="button-value">{colorPalette}</span>
          </button>
          <button className="ui-button reset-button" onClick={() => setShowResetConfirm(true)} title="Give up this game">
            Give Up
          </button>
        </div>
      </div>
    );
  };

  // Render controls (theme, audio, info)
  const renderControls = () => {
    return (
      <>
        {/* Song name in its own centered row */}
        <div className="now-playing-container">
          <div 
            className="now-playing" 
            onClick={handleTrackSkip} 
            style={{ 
              cursor: !isMuted ? 'pointer' : 'default',
              textDecoration: !isMuted ? 'underline' : 'none'
            }} 
            title={!isMuted ? "Click to skip to next track" : ""}
          >
            ♫ {nowPlaying}
          </div>
        </div>
        
        {/* Controls centered below */}
        <div className="controls-container">
          <div className="controls-group">
            <div className="info-button-container">
              <button 
                className="info-button" 
                onClick={() => setShowInfoModal(true)} 
                title="Game information"
              >
                <span>i</span>
              </button>
            </div>
            
            <div className="theme-toggle-container">
              <div className="theme-toggle">
                <span 
                  className={`theme-option ${!darkMode ? 'active' : ''}`}
                  onClick={() => setDarkMode(false)}
                >
                  Light
                </span>
                <span className="theme-separator">|</span>
                <span 
                  className={`theme-option ${darkMode ? 'active' : ''}`}
                  onClick={() => setDarkMode(true)}
                >
                  Dark
                </span>
              </div>
            </div>
            
            <div className="audio-toggle-container">
              <button 
                className="audio-toggle" 
                onClick={() => setIsMuted(!isMuted)} 
                title={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Render modals
  const renderModals = () => {
    return (
      <>
        {/* Game Over Modal */}
        {(gameState === 'won' || gameState === 'lost') && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>{gameState === 'won' ? 'LEVEL COMPLETE!' : 'GAME OVER'}</h2>
              <div className="modal-content">
                {gameState === 'won' ? (
                  <>
                    <p>You cleared the level in {DEFAULT_MOVES - movesLeft} moves!</p>
                    <p>Your score: <span className="highlight-text">{score}</span></p>
                    
                    {/* Bonus for quick completion */}
                    {(DEFAULT_MOVES - movesLeft < 15) && (
                      <div className="bonus-container">
                        <p className="bonus-text">Score Bonus: +{movesLeft * 50}!</p>
                        <p className="bonus-text">Coin Bonus: +1 coin!</p>
                      </div>
                    )}
                    
                    {/* New color notification */}
                    {(level === 5 || level === 10 || level === 15) && (
                      <div className="new-color-notification">
                        <p className="highlight-text">New Colour Unlocked!</p>
                        <p>The game will now include a new colour for added challenge.</p>
                      </div>
                    )}
                    
                    <button className="modal-button" onClick={startNextLevel}>Next Level</button>
                  </>
                ) : (
                  <>
                    <p>You ran out of moves!</p>
                    <p>Final score: <span className="highlight-text">{score}</span></p>
                    <p>You reached level <span className="highlight-text">{level}</span></p>
                    <button className="modal-button" onClick={startNewGame}>Play Again</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reset/Give Up Confirmation */}
        {showResetConfirm && (
          <div className="modal-overlay">
            <div className="modal confirm-modal">
              <h3>Give Up?</h3>
              <p>Are you sure you want to give up? Your current progress will be lost and the game will end.</p>
              <div className="confirm-buttons">
                <button className="confirm-button cancel" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
                <button className="confirm-button reset" onClick={giveUp}>
                  Give Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Powerup Tutorial Modal */}
        {showPowerupTutorial && (
          <div className="modal-overlay">
            <div className="modal tutorial-modal">
              <h3>{tutorialContent.title}</h3>
              <div className="tutorial-content">
                <p>{tutorialContent.message}</p>
                
                <div className="powerup-tutorial-detail">
                  <div className={`powerup-icon-large ${tutorialContent.powerup}-icon`}>
                    {tutorialContent.powerup === 'undo' && '↩'}
                    {tutorialContent.powerup === 'burst' && '⭐'}
                    {tutorialContent.powerup === 'prism' && '🔮'}
                  </div>
                  <p className="powerup-description">
                    {tutorialContent.description}
                  </p>
                </div>
                
                <p className="bonus-text" style={{ textAlign: 'center' }}>+3 Bonus Coins Added!</p>
              </div>
              <button className="modal-button" onClick={() => setShowPowerupTutorial(false)}>
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* Info Modal with Volume Control */}
{showInfoModal && (
  <div className="modal-overlay">
    <div className="modal info-modal">
      {/* Volume Control - NO TITLE AND NO MUTE BUTTON */}
      <div className="volume-control">
        <label htmlFor="volume-slider">Music Volume: {volume}%</label>
        <input 
          id="volume-slider"
          type="range" 
          min="0" 
          max="100" 
          value={volume} 
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="volume-slider"
        />
      </div>
      
      <div className="info-divider"></div>
      
      {/* Game Rules */}
      <div className="info-content">
        <p><strong>Goal:</strong> Fill the grid with one colour in minimal moves.</p>
        
        <p><strong>Scoring:</strong> 1 point per tile (1.5× for 10+ tiles, 2× for 20+). 50 points per move remaining when under 15 moves.</p>
        
        <p><strong>Progression:</strong> New colours unlocked after completing levels 5, 10, and 15.</p>
        
        {(unlockedPowerups.undo || unlockedPowerups.burst || unlockedPowerups.prism) && (
          <>
            <div className="info-divider"></div>
            <p><strong>Powerups:</strong></p>
            <ul>
              {unlockedPowerups.undo && (
                <li>• <strong>Undo:</strong> Revert last move (1 coin)</li>
              )}
              {unlockedPowerups.burst && (
                <li>• <strong>Burst:</strong> Expand to adjacent tiles (1 coin)</li>
              )}
              {unlockedPowerups.prism && (
                <li>• <strong>Prism:</strong> Convert all tiles of one colour (1 coin)</li>
              )}
            </ul>
            
            <p><strong>Coins:</strong> Earn 1 coin per level completed in under 15 moves</p>
          </>
        )}
      </div>
      <button className="modal-button" onClick={() => setShowInfoModal(false)}>
        Got it!
      </button>
    </div>
  </div>
)}
      </>
    );
  };

  // Return splash screen if it's active
  if (showSplashScreen) {
    return renderSplashScreen();
  }

  // Return loading state if grid isn't initialized yet
  if (grid.length === 0) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div 
      className={`game-wrapper ${window.innerWidth <= 768 ? 'mobile' : 'desktop'}`}
      ref={gameContainerRef}
    >
      <div className={`colour-flood-game ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <h1 className="game-title">COLOUR FLOOD</h1>
        {renderGameInfo()}
        {renderGrid()}
        {renderColorButtons()}
        {renderControls()}
        {renderModals()}
      </div>
    </div>
  );
};

// Render the game
ReactDOM.render(<ColorFlood />, document.getElementById('root'));
