// ====== MOBILE MENU TOGGLE ======
document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const topnav = document.querySelector('.topnav');

    if (mobileToggle && topnav) {
        mobileToggle.addEventListener('click', function() {
            topnav.classList.toggle('active');
            if (!topnav.classList.contains('active')) {
                document.querySelectorAll('.topnavitem').forEach(item => {
                    item.classList.remove('active');
                });
            }
        });
    }

    // Mobile submenu click handler
    document.querySelectorAll('.topnavitem').forEach(item => {
        const link = item.querySelector('.topnavlink');
        if (link) {
            link.addEventListener('click', function(e) {
                if (window.innerWidth <= 600) {
                    const submenu = item.querySelector('.submenu');
                    if (submenu) {
                        e.preventDefault();
                        document.querySelectorAll('.topnavitem').forEach(other => {
                            if (other !== item) other.classList.remove('active');
                        });
                        item.classList.toggle('active');
                    }
                }
            });
        }
    });
});

// ====== IMAGE SLIDER ======
document.addEventListener('DOMContentLoaded', function() {
    const sliderImages = document.querySelectorAll('.l_ads img');
    const sliderDots = document.querySelectorAll('.slider-dot');
    let currentSlide = 0;
    const totalSlides = sliderImages.length;

    if (totalSlides === 0) return;

    function showSlide(index) {
        sliderImages.forEach(img => img.classList.remove('active'));
        sliderDots.forEach(dot => dot.classList.remove('active'));
        if (sliderImages[index]) sliderImages[index].classList.add('active');
        if (sliderDots[index]) sliderDots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        showSlide((currentSlide + 1) % totalSlides);
    }

    let slideInterval = setInterval(nextSlide, 5000);

    sliderDots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            clearInterval(slideInterval);
            showSlide(index);
            slideInterval = setInterval(nextSlide, 5000);
        });
    });

    const lAds = document.querySelector('.l_ads');
    if (lAds) {
        lAds.addEventListener('mouseenter', () => clearInterval(slideInterval));
        lAds.addEventListener('mouseleave', () => {
            slideInterval = setInterval(nextSlide, 5000);
        });
    }
});

// ====== SECTION 1: PRODUCT TABS (tab1, tab2, tab3) ======
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            const selected = document.getElementById(tabId);
            if (selected) selected.classList.add('active');
        });
    });

    const prevTab = document.getElementById('prevTab');
    const nextTab = document.getElementById('nextTab');

    function navigateTab(direction) {
        const activeBtn = document.querySelector('.tab-btn.active');
        if (!activeBtn) return;
        const tabs = Array.from(tabBtns);
        const currentIndex = tabs.indexOf(activeBtn);
        const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
        tabs[newIndex].click();
    }

    if (prevTab) prevTab.addEventListener('click', () => navigateTab(-1));
    if (nextTab) nextTab.addEventListener('click', () => navigateTab(1));
});

// ====== SECTION 2: NEW ARRIVALS TABS (new-tab1, new-tab2, new-tab3) ======
document.addEventListener('DOMContentLoaded', function() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            tabPanels.forEach(panel => panel.classList.remove('active'));
            const selected = document.getElementById(tabId);
            if (selected) selected.classList.add('active');

            // Reset carousel position when switching tabs
            resetCarousel(tabId);
        });
    });

    // Carousel navigation
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    let carouselPositions = {};

    function getVisibleCards() {
        if (window.innerWidth <= 600) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 4;
    }

    function getCardWidth() {
        const container = document.querySelector('.carousel-wrapper');
        if (!container) return 0;
        const containerWidth = container.offsetWidth;
        const visibleCards = getVisibleCards();
        const gap = 20;
        return (containerWidth - (gap * (visibleCards - 1))) / visibleCards;
    }

    function resetCarousel(tabId) {
        carouselPositions[tabId] = 0;
        const track = document.querySelector('#' + tabId + ' .products-track');
        if (track) track.style.transform = 'translateX(0)';
        updateArrowButtons(tabId);
    }

    function updateArrowButtons(tabId) {
        const track = document.querySelector('#' + tabId + ' .products-track');
        if (!track) return;
        const cards = track.querySelectorAll('.product-card');
        const totalCards = cards.length;
        const visibleCards = getVisibleCards();
        const maxPosition = Math.max(0, totalCards - visibleCards);
        const currentPos = carouselPositions[tabId] || 0;

        if (prevBtn) prevBtn.disabled = currentPos === 0;
        if (nextBtn) nextBtn.disabled = currentPos >= maxPosition;
    }

    function moveCarousel(direction) {
        const activeTab = document.querySelector('.nav-tab.active');
        if (!activeTab) return;

        const tabId = activeTab.getAttribute('data-tab');
        const track = document.querySelector('#' + tabId + ' .products-track');
        if (!track) return;

        const cards = track.querySelectorAll('.product-card');
        const totalCards = cards.length;
        const visibleCards = getVisibleCards();
        const maxPosition = Math.max(0, totalCards - visibleCards);

        if (!carouselPositions[tabId]) carouselPositions[tabId] = 0;
        carouselPositions[tabId] += direction;

        if (carouselPositions[tabId] < 0) carouselPositions[tabId] = 0;
        if (carouselPositions[tabId] > maxPosition) carouselPositions[tabId] = maxPosition;

        const cardWidth = getCardWidth();
        const gap = 20;
        const translateX = -(carouselPositions[tabId] * (cardWidth + gap));
        track.style.transform = 'translateX(' + translateX + 'px)';

        updateArrowButtons(tabId);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => moveCarousel(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => moveCarousel(1));

    // Initialize
    tabPanels.forEach(panel => {
        if (panel.id) {
            carouselPositions[panel.id] = 0;
        }
    });

    // Initial button state
    const firstActiveTab = document.querySelector('.nav-tab.active');
    if (firstActiveTab) {
        updateArrowButtons(firstActiveTab.getAttribute('data-tab'));
    }

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            Object.keys(carouselPositions).forEach(key => {
                carouselPositions[key] = 0;
                const track = document.querySelector('#' + key + ' .products-track');
                if (track) track.style.transform = 'translateX(0)';
            });
            if (prevBtn) prevBtn.disabled = true;
            const activeTab = document.querySelector('.nav-tab.active');
            if (activeTab) updateArrowButtons(activeTab.getAttribute('data-tab'));
        }, 250);
    });
});

// ====== FEATURED THUMBNAILS ======
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.featured-thumbnails img').forEach(thumb => {
        thumb.addEventListener('click', function() {
            const card = this.closest('.product-card');
            if (!card) return;
            const mainImg = card.querySelector('.main-img');
            if (mainImg) mainImg.src = this.src;

            const siblings = this.parentElement.querySelectorAll('img');
            siblings.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// ====== WISHLIST ======
function toggleWishlist(btn) {
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');
    btn.innerHTML = isActive ? '&#9829;' : '&#9825;';
    showToast(isActive ? 'به لیست علاقه‌مندی‌ها اضافه شد' : 'از لیست علاقه‌مندی‌ها حذف شد');
}

// ====== ADD TO CART ======
function addToCart(btn) {
    btn.classList.add('added');
    btn.innerHTML = '<span>&#10003;</span> اضافه شد';
    showToast('محصول به سبد خرید اضافه شد');
    setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<span>&#128722;</span> افزودن به سبد خرید';
    }, 2000);
}

// ====== COMPARE ======
function addToCompare(btn) {
    showToast('محصول به لیست مقایسه اضافه شد');
}

// ====== TOAST ======
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ====== LANGUAGE ======
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', function() {
            const selectedLang = this.getAttribute('data-value');
            const langSelected = document.querySelector('.lang-selected span');
            const langIcon = document.querySelector('.lang-selected .fa-icon');

            document.querySelectorAll('.lang-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');

            if (langSelected) langSelected.textContent = selectedLang === 'fa' ? 'فارسی' : 'English';
            if (langIcon) {
                langIcon.src = selectedLang === 'fa' ? 'images/icons/iran.png' : 'images/icons/uk.png';
                langIcon.alt = selectedLang === 'fa' ? 'persian language' : 'english language';
            }
        });
    });
});

// ====== SEARCH ======
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.searchinput');
    const searchBtn = document.querySelector('.btnsearch');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) showToast('در حال جستجو برای: ' + query);
            else showToast('لطفاً عبارتی برای جستجو وارد کنید');
        });
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchBtn.click();
        });
    }
});


// ====== SPECIAL SALE SECTION EVENT DELEGATION ======
document.addEventListener('DOMContentLoaded', function() {
    const specialSaleGrid = document.querySelector('.special-sale-grid');
    if (!specialSaleGrid) return;

    specialSaleGrid.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Add to Cart
        if (btn.classList.contains('btn-cart')) {
            e.preventDefault();
            if (btn.classList.contains('added')) return;
            btn.classList.add('added');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> اضافه شد';
            showToast('محصول به سبد خرید اضافه شد');
            setTimeout(() => {
                btn.classList.remove('added');
                btn.innerHTML = originalHTML;
            }, 2000);
        }

        // Wishlist
        if (btn.classList.contains('btn-wishlist')) {
            e.preventDefault();
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            btn.innerHTML = isActive ? '&#9829;' : '&#9825;';
            showToast(isActive ? 'به لیست علاقه‌مندی‌ها اضافه شد' : 'از لیست علاقه‌مندی‌ها حذف شد');
        }

        // Compare
        if (btn.classList.contains('btn-compare')) {
            e.preventDefault();
            showToast('محصول به لیست مقایسه اضافه شد');
        }
    });
});