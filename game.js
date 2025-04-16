/*  Tic‑Tac‑Twist  —  Full game with:
      • 2‑Player  or  Vs Computer (AI plays O)
      • FIFO piece limit
      • Undo button
      • Strike‑through + confetti on win
------------------------------------------------------------------ */

(() => {
    /* ---------- 1. STATE ---------- */
    const board   = Array(9).fill(null);      // 0‑8 → null | 'X' | 'O'
    const fifo    = { X: [], O: [] };         // queues for FIFO rule
    let current   = 'X';                      // X always starts
    let gameOver  = false;
    const history = [];                       // snapshots for Undo
  
    const WIN_LINES = [
      [0,1,2],[3,4,5],[6,7,8],    // rows
      [0,3,6],[1,4,7],[2,5,8],    // cols
      [0,4,8],[2,4,6]             // diags
    ];
  
    /* ---------- 2. DOM ---------- */
    const cells      = document.querySelectorAll('.cell');
    const msgEl      = document.getElementById('message');
    const undoBtn    = document.getElementById('undoBtn');
    const strikeBar  = document.getElementById('strike');
    const modeSelect = document.getElementById('modeSelect');   // <select> we added
    const jsConfetti = new JSConfetti();
  
    /* ---------- 3. EVENT LISTENERS ---------- */
    cells.forEach(c => c.addEventListener('click', handleClick));
    undoBtn.addEventListener('click', handleUndo);
  
    /* ---------- 4. HUMAN CLICK ---------- */
    function handleClick(e) {
      if (gameOver) return;
  
      // Block human clicks while it’s the AI’s turn
      if (modeSelect.value === 'ai' && current === 'O') return;
  
      const idx = +e.target.dataset.index;
      if (board[idx]) return;                 // already occupied
  
      playerMove(idx);                        // place X or O
  
      // If playing Vs Computer and game not over, let AI respond
      if (!gameOver && modeSelect.value === 'ai') {
        setTimeout(aiMove, 300);              // small delay feels nicer
      }
    }
  
    /* ---------- 5. AI MOVE ---------- */
    function aiMove() {
      if (gameOver) return;
  
      // 1) Try to win
      let idx = findBestMove('O');
      // 2) Otherwise block X
      if (idx == null) idx = findBestMove('X');
      // 3) Otherwise random empty square
      if (idx == null) {
        const empties = board
          .map((v,i) => v ? null : i)
          .filter(i => i != null);
        idx = empties[Math.floor(Math.random() * empties.length)];
      }
  
      playerMove(idx);
    }
  
    /* ---------- 6. SHARED “PLACE PIECE” LOGIC ---------- */
    function playerMove(idx) {
      // Save snapshot for Undo
      history.push(snapshot());
  
      // Place piece
      board[idx] = current;
      fifo[current].push(idx);
  
      // Enforce FIFO limit (max 3 per player)
      if (fifo[current].length > 3) {
        const oldIdx = fifo[current].shift();
        board[oldIdx] = null;
      }
  
      renderBoard();
  
      // Check for win / draw
      const winInfo = getWinInfo();
      if (winInfo) {
        celebrate(winInfo);
      } else if (board.every(v => v !== null)) {
        msgEl.textContent = 'Draw! 🤝';
        gameOver = true;
      } else {
        current = current === 'X' ? 'O' : 'X';
        msgEl.textContent = `${current}’s turn`;
      }
  
      // Enable or disable Undo
      undoBtn.disabled = history.length === 0;
    }
  
    /* ---------- 7. UNDO ---------- */
    function handleUndo() {
      if (history.length === 0) return;
  
      const prev = history.pop();
      board.splice(0, 9, ...prev.board);
      fifo.X = [...prev.fifoX];
      fifo.O = [...prev.fifoO];
      current  = prev.current;
      gameOver = prev.gameOver;
  
      renderBoard();
      msgEl.textContent = prev.banner;
  
      // Hide strike bar & remove per‑cell class
      strikeBar.style.display = 'none';
      cells.forEach(c => c.classList.remove('win-cell'));
  
      undoBtn.disabled = history.length === 0;
    }
  
    /* ---------- 8. RENDER BOARD ---------- */
    function renderBoard() {
      board.forEach((val, i) => {
        const cell = cells[i];
        cell.textContent = val || '';
        cell.classList.toggle('filled', !!val);
      });
    }
  
    /* ---------- 9. WIN‑CHECK ---------- */
    function getWinInfo() {
      for (let i = 0; i < WIN_LINES.length; i++) {
        const [a,b,c] = WIN_LINES[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          return { player: board[a], lineIndex: i, cells: [a,b,c] };
        }
      }
      return null;
    }
  
    /* ---------- 10. CELEBRATE ---------- */
    function celebrate({ player, lineIndex, cells: winCells }) {
      gameOver = true;
      msgEl.textContent = `${player} wins! 🎉`;
  
      drawStrike(lineIndex);
      winCells.forEach(i => cells[i].classList.add('win-cell'));
      jsConfetti.addConfetti();
    }
  
    /* ---------- 11. STRIKE‑THROUGH BAR ---------- */
    function drawStrike(lineIdx) {
      // Pre‑calculated transforms for 100 × 100 px cells + 4 px gaps
      const transforms = [
        'translateY(50px) scaleX(1)',                       // row 0
        'translateY(154px) scaleX(1)',                      // row 1
        'translateY(258px) scaleX(1)',                      // row 2
        'translateX(50px) rotate(90deg) scaleX(1)',         // col 0
        'translateX(154px) rotate(90deg) scaleX(1)',        // col 1
        'translateX(258px) rotate(90deg) scaleX(1)',        // col 2
        'rotate(45deg) scaleX(1.41)',                       // main diag
        'translateY(308px) rotate(-45deg) scaleX(1.41)'     // anti‑diag
      ];
      strikeBar.style.display = 'block';
      strikeBar.style.transform = transforms[lineIdx];
    }
  
    /* ---------- 12. AI HELPER ---------- */
    function findBestMove(player) {
      for (const [a,b,c] of WIN_LINES) {
        const line = [a,b,c];
        const vals = line.map(i => board[i]);
        if (vals.filter(v => v === player).length === 2 &&
            vals.includes(null)) {
          return line[vals.indexOf(null)];
        }
      }
      return null;
    }
  
    /* ---------- 13. SNAPSHOT FOR UNDO ---------- */
    function snapshot() {
      return {
        board : [...board],
        fifoX : [...fifo.X],
        fifoO : [...fifo.O],
        current,
        gameOver,
        banner : msgEl.textContent
      };
    }
  
    /* ---------- 14. INITIALISE ---------- */
    renderBoard();
    msgEl.textContent = 'X’s turn';
    undoBtn.disabled  = true;
  
    console.log('Tic‑Tac‑Twist loaded.');
  })();
  