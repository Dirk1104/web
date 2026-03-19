// ============================================
// DIRK WOUTERS — Website Interactions
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar scroll effect ---
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- Mobile nav toggle ---
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Close mobile nav on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // --- Animated number counters ---
    const animateCounters = () => {
        document.querySelectorAll('.stat-number').forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 1500;
            const start = performance.now();

            const update = (now) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                counter.textContent = Math.round(target * eased);

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            };

            requestAnimationFrame(update);
        });
    };

    // Trigger counters when hero is in view
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                heroObserver.disconnect();
            }
        });
    }, { threshold: 0.3 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) heroObserver.observe(heroStats);

    // --- Scroll-triggered fade-in animations ---
    const addFadeIn = () => {
        const selectors = [
            '.about-text', '.highlight-card', '.competency-card',
            '.exp-card', '.education-card', '.contact-card'
        ];

        document.querySelectorAll(selectors.join(',')).forEach(el => {
            el.classList.add('fade-in');
        });
    };

    addFadeIn();

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-in').forEach(el => {
        fadeObserver.observe(el);
    });

    // --- Active nav link on scroll ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const updateActiveNav = () => {
        const scrollY = window.scrollY + 100;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', updateActiveNav, { passive: true });

    // --- News Ticker Carousel ---
    const slides = document.querySelectorAll('.news-ticker-slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        let tickerInterval;

        const showSlide = (index) => {
            slides.forEach(s => {
                s.classList.remove('active', 'exit-up');
            });
            slides[currentSlide].classList.add('exit-up');
            currentSlide = (index + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
        };

        const startTicker = () => {
            tickerInterval = setInterval(() => showSlide(currentSlide + 1), 5000);
        };

        const prevBtn = document.getElementById('newsPrev');
        const nextBtn = document.getElementById('newsNext');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                clearInterval(tickerInterval);
                showSlide(currentSlide + 1);
                startTicker();
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                clearInterval(tickerInterval);
                showSlide(currentSlide - 1);
                startTicker();
            });
        }

        startTicker();
    }

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
