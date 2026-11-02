/**
 * Toast Notification Utility
 */

export function showToast(message, type = 'info', duration = 2800) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  // Icon based on type
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="#F44336" stroke-width="2" stroke-linecap="round"/></svg>`;
  } else {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#7C4DFF" stroke-width="1.5"/><path d="M8 5V8.5M8 11.5H8.01" stroke="#7C4DFF" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }

  toast.innerHTML = `
    <span class="toast__icon">${iconSvg}</span>
    <span class="toast__message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}
