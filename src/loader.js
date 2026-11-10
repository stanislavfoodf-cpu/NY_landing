(() => {
  window.__siteLoaderReady = true;
  const root = document.documentElement;
  const message = document.getElementById('page-loader-message');
  const retry = document.getElementById('page-loader-retry');
  const loader = document.getElementById('page-loader');
  let supportsWebP = false;
  try { supportsWebP = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch {}
  const houseSource = getComputedStyle(document.body).getPropertyValue('--house-source').match(/url\([\"']?([^\"')]+)[\"']?\)/);
  const stylesheet = document.querySelector('link[rel=stylesheet]');
  const houseImage = houseSource && stylesheet
    ? new URL(houseSource[1], stylesheet.href).href
    : 'src/assets/figma/raw/house-v6-3072.3d5b8afd8e1c.webp';
  const resources = [
    houseImage,
    'src/assets/figma/raw/open-window-v5-1000.da7c53b5f7b9.webp',
    'src/assets/figma/raw/lock.png',
    'src/assets/figma/raw/story-06-optimized.22164ac35d8d.webp',
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 'src/assets/figma/raw/story-first-still.png' : (supportsWebP ? 'src/assets/figma/raw/story-first-optimized.314f911edb11.webp' : 'src/assets/figma/raw/story-first.gif'),
    'src/assets/figma/raw/quiz-result-sleigh.png',
    'src/assets/figma/svg/garland-optimized.7ae30fceee27.svg',
  ];
  let finished = false;
  const fail = () => {
    if (finished) return;
    finished = true;
    message.textContent = 'Не удалось загрузить страницу. Проверьте соединение и попробуйте снова.';
    retry.hidden = false;
    loader.setAttribute('role', 'alert');
  };
  const timeout = setTimeout(fail, 30000);
  retry.addEventListener('click', () => location.reload());
  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    image.src = src;
  });
  const windowLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  const fontsLoaded = document.fonts
    ? Promise.all(['500 16px FUD', '700 16px FUD', '400 16px Source', '600 16px Source', '700 16px Source'].map(font => document.fonts.load(font)))
    : Promise.resolve();
  const storiesLoaded = windowLoaded.then(() => window.__storiesReady || Promise.reject(new Error('Окна не загружены')));
  Promise.all([windowLoaded, storiesLoaded, fontsLoaded, ...resources.map(loadImage)])
    .then(() => {
      if (finished) return;
      if (window.__siteLoadFailures.length) return fail();
      finished = true;
      clearTimeout(timeout);
      root.classList.remove('is-loading');
    })
    .catch(fail);
})();
