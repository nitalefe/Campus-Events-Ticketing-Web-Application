// Adds left/right chevrons to each .events-container and wires scroll behavior
const addScrollControls = () => {
  const containers = document.querySelectorAll('.events-container');
  containers.forEach(container => {
    // avoid duplicate controls
    if (container.querySelector('.scroll-btn.left')) return;

    const left = document.createElement('button');
    left.className = 'scroll-btn left';
    left.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;

    const right = document.createElement('button');
    right.className = 'scroll-btn right';
    right.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    container.appendChild(left);
    container.appendChild(right);

    const scroller = container.querySelector('.events');
    if (!scroller) return;

    const scrollBy = () => {
      // scroll by approx one card width
      const card = scroller.querySelector('.event-card');
      const step = (card ? card.getBoundingClientRect().width : 260) + 16;
      return step;
    };

    left.addEventListener('click', () => {
      scroller.scrollBy({ left: -scrollBy(), behavior: 'smooth' });
    });
    right.addEventListener('click', () => {
      scroller.scrollBy({ left: scrollBy(), behavior: 'smooth' });
    });

    const updateVisibility = () => {
      // hide left if at left edge, hide right if at right edge
      left.classList.toggle('hidden', scroller.scrollLeft <= 8);
      right.classList.toggle('hidden', scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8);
    };

    // update on scroll & resize
    scroller.addEventListener('scroll', updateVisibility);
    window.addEventListener('resize', updateVisibility);

    // initial visibility
    setTimeout(updateVisibility, 100);
  });
};

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addScrollControls);
} else {
  addScrollControls();
}

export default addScrollControls;
