document.querySelectorAll('.sidebar-item:has(> .sidebar-section)').forEach(item => {
  const section = item.querySelector(':scope > .sidebar-section');

  const openSection = () => {
    item.classList.add('open');
    section.style.height = section.scrollHeight + 'px';
    section.addEventListener('transitionend', () => {
      section.style.height = 'auto';
    }, { once: true });
  };

  const closeSection = () => {
    section.style.height = section.scrollHeight + 'px';
    section.offsetHeight; // force reflow so browser commits the explicit height before transitioning
    section.style.height = '0';
    item.classList.remove('open');
  };

  // Initialize open state from server-rendered active class — no animation
  if (item.classList.contains('active') || item.querySelector('.sidebar-section .active')) {
    item.classList.add('open');
    section.style.height = 'auto';
  }

  item.querySelector(':scope > a').addEventListener('click', e => {
    if (item.classList.contains('open')) {
      e.preventDefault();
      closeSection();
    } else {
      openSection();
    }
  });
});