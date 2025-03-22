const { useState, useEffect, useRef } = React;

const ColorFlood = () => {
  // Game constants
  const GRID_SIZE = 14;
  const DEFAULT_MOVES = 25;
  const COLORS = {
    default: ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'],
    pastel: ['#FF9AA2', '#FFD6A5', '#CAFFBF', '#9BF6FF', '#BDB2FF', '#FFC6FF'],
    retrowave: ['#FF00FF', '#00FFFF', '#FFFF00', '#0000FF', '#FF0000', '#00FF00'],
    metallic: ['#A79E70', '#8D8741', '#7D5E2A', '#574932', '#513B29', '#3F2D20'],
    monochrome: ['#FFFFFF', '#D6D6D6', '#ADADAD', '#848484', '#5B5B5B', '#333333'],
    beach: ['#FFDE59', '#3AB4F2', '#FF9966', '#59D8A4', '#FF6B6B', '#C490D1'],
    garden: ['#8BC34A', '#FFEB3B', '#F06292', '#9575CD', '#795548', '#4CAF50']
  };
  const MUSIC_TRACKS = ['audio/background1.mp3', 'audio/background2.mp3', 'audio/background3.mp3'];

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
  const [volume, setVolume] = useState(50); // Default volume: 50%
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  
  // Audio references
  const audioRef = useRef(null);

  // Initialize game
  useEffect(() => {
    // Check screen size
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    // Setup audio without playing
    setupAudio();
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Setup audio system
  const setupAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(MUSIC_TRACKS[currentTrack]);
      audioRef.current.volume = volume / 100;
      audioRef.current.addEventListener('ended', playNextTrack);
    }
  };

  // Play next track when current one ends
  const playNextTrack = () => {
    const nextTrack = (currentTrack + 1) % MUSIC_TRACKS.length;
    setCurrentTrack(nextTrack);
    
    if (audioRef.current) {
      audioRef.current.src = MUSIC_TRACKS[nextTrack];
      
      if (!isMuted) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Audio play failed:", error);
          });
        }
      }
    }
  };

  // Handle mute toggle
  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
      } else if (audioInitialized) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Audio play failed:", error);
          });
        }
      }
    }
  }, [isMuted]);
  
  // Handle volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Start game from splash screen
  const startGame = () => {
    setShowSplashScreen(false);
    startNewGame();
    
    // Start playing music
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setAudioInitialized(true);
        }).catch(error => {
          console.log("Audio play failed:", error);
        });
      }
    }
  };

  // When level changes, update number of colors with new progression
  useEffect(() => {
    // New color progression: 4th at level 5, 5th at level 10, 6th at level 15
    let numColors = 3;
    if (level >= 15) numColors = 6;
    else if (level >= 10) numColors = 5;
    else if (level >= 5) numColors = 4;
    
    setGameColors(COLORS[colorPalette].slice(0, numColors));
  }, [level, colorPalette]);

  // When colors change, reset the game
  useEffect(() => {
    if (gameColors.length > 0) {
      initializeGrid();
    }
  }, [gameColors]);

  // Initialize the grid with random colors
  const initializeGrid = () => {
    const newGrid = Array(GRID_SIZE).fill().map(() => 
      Array(GRID_SIZE).fill().map(() => 
        gameColors[Math.floor(Math.random() * gameColors.length)]
      )
    );
    
    setGrid(newGrid);
    
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
    setGameState('playing');
  };

  // Start a new game
  const startNewGame = () => {
    setMovesLeft(DEFAULT_MOVES);
    setScore(0);
    setLevel(1);
    const numColors = 3; // Start with 3 colors
    setGameColors(COLORS[colorPalette].slice(0, numColors));
  };
  
  // Reset current level
  const resetLevel = () => {
    setShowResetConfirm(false);
    setMovesLeft(DEFAULT_MOVES);
    initializeGrid();
  };

  // Start next level
  const startNextLevel = () => {
    // Apply bonus for perfect clear (used less than 15 moves)
    if (DEFAULT_MOVES - movesLeft < 15) {
      setScore(prev => prev + 500); // Perfect clear bonus
    }
    
    setLevel(prev => prev + 1);
    setMovesLeft(DEFAULT_MOVES);
    // Score carries over
  };

  // Cycle through color palettes
  const cyclePalette = () => {
    const palettes = Object.keys(COLORS);
    const currentIndex = palettes.indexOf(colorPalette);
    const nextIndex = (currentIndex + 1) % palettes.length;
    setColorPalette(palettes[nextIndex]);
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

  // Handle color button click
  const handleColorClick = (color) => {
    if (gameState !== 'playing' || color === activeColor) return;

    // Clear preview state
    setPreviewArea([]);
    setPreviewColor(null);
    setPreviewMultiplier(null);

    // Reduce moves
    setMovesLeft(prev => prev - 1);

    // Change active color
    setActiveColor(color);

    // First pass: Update grid and get initial active area
    const newGrid = [...grid];
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
    
    // Check if all cells are the same color now
    const allSameColor = newGrid.every(row => 
      row.every(cellColor => cellColor === color)
    );
    
    // Check win condition
    if (allSameColor || newActiveArea.length === GRID_SIZE * GRID_SIZE) {
      setGameState('won');
    } 
    // Check lose condition
    else if (movesLeft - 1 <= 0 && newActiveArea.length < GRID_SIZE * GRID_SIZE) {
      setGameState('lost');
    }
  };

  // RENDER METHODS

  // Render splash screen
  const renderSplashScreen = () => {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <h1 className="splash-title">COLOR FLOOD</h1>
          <div className="splash-description">
            Fill the grid with a single color in as few moves as possible!
          </div>
          <button className="play-button" onClick={startGame}>
            PLAY GAME
          </button>
        </div>
      </div>
    );
  };

  // Render the game grid
  const renderGrid = () => {
    // Calculate cell size based on screen width
    const getCellSize = () => {
      if (isSmallScreen) {
        return 16; // Smaller on mobile
      }
      return 24; // Normal size on desktop
    };
    
    const cellSize = getCellSize();
    
    return (
      <div className="grid-container">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((cell, colIndex) => {
              const isActive = activeArea.some(([r, c]) => r === rowIndex && c === colIndex);
              const isPreview = previewArea.some(([r, c]) => r === rowIndex && c === colIndex);
              const isStart = rowIndex === 0 && colIndex === 0;
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`grid-cell ${isActive ? 'active' : ''} ${isPreview ? 'preview' : ''} ${isStart ? 'start' : ''}`}
                  style={{ 
                    backgroundColor: cell,
                    width: `${cellSize}px`,
                    height: `${cellSize}px`
                  }}
                >
                  {isStart && <span className="start-marker">S</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Render color buttons
  const renderColorButtons = () => {
    return (
      <div className="color-buttons-container">
        <div className="color-buttons">
          {gameColors.map((color, index) => (
            <div key={index} className="button-wrapper">
              {previewMultiplier && color === previewColor && previewArea.length > 0 && (
                <div className="multiplier-indicator">
                  {previewMultiplier}x
                </div>
              )}
              <button
                className={`color-button ${color === activeColor ? 'active' : ''} ${color === previewColor ? 'previewing' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorClick(color)}
                onMouseEnter={() => calculatePreviewArea(color)}
                onMouseLeave={() => {
                  setPreviewArea([]);
                  setPreviewColor(null);
                  setPreviewMultiplier(null);
                }}
                disabled={gameState !== 'playing' || color === activeColor}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render game info
  const renderGameInfo = () => {
    return (
      <div className="game-info">
        <div className={`info-grid ${isSmallScreen ? 'compact' : ''}`}>
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
            <div className="buttons-container">
              <button className="ui-button palette-button" onClick={cyclePalette} title="Change color theme">
                <span className="button-label">PALETTE</span>
                <span className="button-value">{colorPalette}</span>
              </button>
              <button className="ui-button reset-button" onClick={() => setShowResetConfirm(true)} title="Reset current level">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render game modes
  const renderGameModes = () => {
    if (isSmallScreen) {
      return (
        <div className="game-modes">
          <button 
            className={`mode-button ${selectedMode === 'classic' ? 'active' : ''}`}
            onClick={() => setSelectedMode('classic')}
          >
            Classic
          </button>
          <div className="compact-modes-dropdown">
            <span>More Modes</span>
            <div className="dropdown-content">
              <button className="mode-button coming-soon">Time Attack</button>
              <button className="mode-button coming-soon">Puzzle Mode</button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="game-modes">
        <button 
          className={`mode-button ${selectedMode === 'classic' ? 'active' : ''}`}
          onClick={() => setSelectedMode('classic')}
        >
          Classic Mode
        </button>
        <button className="mode-button coming-soon">
          Time Attack (Coming Soon)
        </button>
        <button className="mode-button coming-soon">
          Puzzle Mode (Coming Soon)
        </button>
      </div>
    );
  };

  // Render controls (theme, audio, info)
  const renderControls = () => {
    return (
      <div className="controls-container">
        <div className="controls-group">
          <button 
            className="info-button" 
            onClick={() => setShowInfoModal(true)} 
            title="Game information"
          >
            <span>i</span>
          </button>
          
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
          
          <button 
            className="audio-toggle" 
            onClick={() => setIsMuted(!isMuted)} 
            title={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    );
  };

  // Render modals
  const renderModals = () => {
    return (
      <>
        {/* Game Over Modal */}
        {gameState !== 'playing' && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>{gameState === 'won' ? 'LEVEL COMPLETE!' : 'GAME OVER'}</h2>
              <div className="modal-content">
                {gameState === 'won' ? (
                  <>
                    <p>You cleared the level in {DEFAULT_MOVES - movesLeft} moves!</p>
                    <p>Your score: <span className="highlight-text">{score}</span></p>
                    {(DEFAULT_MOVES - movesLeft < 15) && (
                      <p className="bonus-text">Perfect Clear Bonus: +500!</p>
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

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div className="modal-overlay">
            <div className="modal confirm-modal">
              <h3>Reset Level?</h3>
              <p>Are you sure you want to reset this level? Your current progress will be lost.</p>
              <div className="confirm-buttons">
                <button className="confirm-button cancel" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
                <button className="confirm-button reset" onClick={resetLevel}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Modal with Volume Control */}
        {showInfoModal && (
          <div className="modal-overlay">
            <div className="modal info-modal">
              <h3>Game Settings & How to Play</h3>
              
              {/* Volume Control */}
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
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className="mute-toggle"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
              
              <div className="info-divider"></div>
              
              {/* Game Rules */}
              <div className="info-content">
                <p><strong>Goal:</strong> Fill the entire grid with one colour using minimal moves.</p>
                
                <p><strong>How to Play:</strong> Click colour buttons to change the colour region starting from top-left.</p>
                
                <p><strong>Scoring:</strong></p>
                <ul>
                  <li>• 1 point per tile changed</li>
                  <li>• 1.5× bonus when changing 10+ tiles at once</li>
                  <li>• 2× bonus when changing 20+ tiles at once</li>
                  <li>• 500 point bonus for completing in ≤15 moves</li>
                </ul>
                
                <p><strong>Progression:</strong> New colours added at levels 5, 10, and 15.</p>
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
      className={`color-flood-game ${darkMode ? 'dark-mode' : 'light-mode'} ${isSmallScreen ? 'mobile-layout' : ''}`}
    >
      <h1 className="game-title">COLOUR FLOOD</h1>
      {renderGameModes()}
      {renderGameInfo()}
      {renderGrid()}
      {renderColorButtons()}
      {renderControls()}
      {renderModals()}
    </div>
  );
};

// Render the game
ReactDOM.render(<ColorFlood />, document.getElementById('root'));
