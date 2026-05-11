(function () {
  var trackingIds = [
    'UA-221701518-1',
    'G-159L8FZ1E9',
    'G-RVJM6WG1NE'
  ];

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());

  trackingIds.forEach(function (trackingId) {
    window.gtag('config', trackingId);
  });
}());
