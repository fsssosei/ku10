const loadCSS = function (src) {
  var head = document.getElementsByTagName('head')[0];
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = src;
  link.media = 'all';
  head.appendChild(link);
};

const getIsMobile = function () {
  if (
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i)
  ) {
    return true;
  } else {
    return false;
  }
};

window.addEventListener('DOMContentLoaded', function () {
  loadCSS('./css/style.css');
  const isMobile = getIsMobile();

  if (isMobile) {
    loadCSS('./css/mobile.css');
  } else {
    loadCSS('./css/style.css');
  }
});
