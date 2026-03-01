/* token.js — drag-and-drop do peão */

const Token = (() => {
  function init(config) {
    config.themes.forEach((theme, themeIndex) => {
      const token = document.getElementById(`token-${themeIndex}`);
      if (!token) return;

      // Position token on correct square based on tokenPosition
      const pos = theme.tokenPosition || 0;
      placeToken(themeIndex, pos, config);

      token.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', `${themeIndex}`);
        token.style.opacity = '0.5';
      });
      token.addEventListener('dragend', () => {
        token.style.opacity = '1';
      });
    });

    // Make squares drop targets
    document.querySelectorAll('.square').forEach(sq => {
      sq.addEventListener('dragover', e => e.preventDefault());
      sq.addEventListener('drop', async e => {
        e.preventDefault();
        const themeIdx = parseInt(e.dataTransfer.getData('text/plain'));
        if (isNaN(themeIdx)) return;

        const cpId = sq.dataset.cpId;
        const theme = config.themes[themeIdx];

        let newPos;
        if (!cpId) {
          newPos = 0; // start square
        } else {
          newPos = theme.checkpoints.findIndex(c => c.id === cpId) + 1;
        }

        await API.put(`/themes/${theme.id}`, { tokenPosition: newPos });
        config.themes[themeIdx].tokenPosition = newPos;
        placeToken(themeIdx, newPos, config);
      });
    });
  }

  function placeToken(themeIndex, position, config) {
    // Remove token from wherever it is
    const existing = document.getElementById(`token-${themeIndex}`);
    if (existing) existing.remove();

    const theme = config.themes[themeIndex];
    const boardEl = document.getElementById(`board-${themeIndex}`);
    if (!boardEl) return;

    let targetSquare;
    if (position === 0) {
      // Start square
      targetSquare = boardEl.querySelector('.square.type-start');
    } else {
      const cp = theme.checkpoints[position - 1];
      if (cp) targetSquare = boardEl.querySelector(`.square[data-cp-id="${cp.id}"]`);
    }

    if (!targetSquare) return;

    const tokenEl = document.createElement('div');
    tokenEl.className = 'token';
    tokenEl.id = `token-${themeIndex}`;
    tokenEl.draggable = true;
    tokenEl.title = 'Arraste para mover o peão';

    // Use theme initial or emoji
    const initial = theme.name ? theme.name.charAt(0).toUpperCase() : '🎯';
    tokenEl.textContent = initial;
    tokenEl.style.borderColor = theme.color;

    const icon = targetSquare.querySelector('.square-icon');
    if (icon) icon.appendChild(tokenEl);

    tokenEl.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', `${themeIndex}`);
      tokenEl.style.opacity = '0.5';
    });
    tokenEl.addEventListener('dragend', () => {
      tokenEl.style.opacity = '1';
    });
  }

  return { init, placeToken };
})();
