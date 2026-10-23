(function () {
    var GA_ID = 'G-2LZZQCK9W9';
    var KEY = 'cookieConsent';

    function read() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function write(value) {
        try { localStorage.setItem(KEY, value); } catch (e) {}
    }

    function loadAnalytics() {
        if (window.__gaLoaded || GA_ID.indexOf('XXXX') !== -1) return;
        window.__gaLoaded = true;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', GA_ID, { anonymize_ip: true });
    }

    function clearGaCookies() {
        document.cookie.split(';').forEach(function (c) {
            var name = c.split('=')[0].trim();
            if (name.indexOf('_ga') === 0) {
                var host = location.hostname.replace(/^www\./, '');
                ['', '; domain=' + host, '; domain=.' + host].forEach(function (d) {
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
                });
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var banner = document.getElementById('cookieBanner');
        var choice = read();

        if (choice === 'accepted') loadAnalytics();
        else if (choice !== 'declined') banner.hidden = false;

        document.getElementById('cookieAccept').addEventListener('click', function () {
            write('accepted');
            banner.hidden = true;
            loadAnalytics();
        });

        document.getElementById('cookieDecline').addEventListener('click', function () {
            var wasAccepted = read() === 'accepted';
            write('declined');
            banner.hidden = true;
            clearGaCookies();
            if (wasAccepted) location.reload();
        });

        document.getElementById('cookieSettings').addEventListener('click', function () {
            banner.hidden = false;
        });
    });
})();
