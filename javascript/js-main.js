/* ============================================================
   MARKET E-COMMERCE - COMPLETE JAVASCRIPT
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    initSlider();
    initProductTabs();
    initNewArrivalsTabs();
    initNewArrivalsCarousel();
    initMobileMenu();
    initLanguageDropdown();
    initSearchBox();
    initCartActions();
    initWishlist();
    initCompare();
    initQuickView();
    initFeaturedThumbnails();
    initScrollEffects();
    initToast();
    initNewsletter();
    initFooterLinks();
    initHotCategories();
    initTopProducts();
    initBannerOverlay();
    initProductHover();
});

/* ============================================================
   1. SLIDER / CAROUSEL
   ============================================================ */
function initSlider() {
    const sliderImages = document.querySelectorAll('.l_ads img');
    const sliderDots = document.querySelectorAll('.slider-dot');

    if (sliderImages.length === 0 || sliderDots.length === 0) return;

    let currentSlide = 0;
    const totalSlides = sliderImages.length;
    let slideInterval;

    function showSlide(index) {
        sliderImages.forEach(img => img.classList.remove('active'));
        sliderDots.forEach(dot => dot.classList.remove('active'));
        sliderImages[index].classList.add('active');
        sliderDots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        showSlide((currentSlide + 1) % totalSlides);
    }

    sliderDots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            showSlide(index);
            resetInterval();
        });
    });

    function startInterval() {
        slideInterval = setInterval(nextSlide, 5000);
    }

    function resetInterval() {
        clearInterval(slideInterval);
        startInterval();
    }

    startInterval();

    const lAds = document.querySelector('.l_ads');
    if (lAds) {
        lAds.addEventListener('mouseenter', () => clearInterval(slideInterval));
        lAds.addEventListener('mouseleave', startInterval);
    }
}

/* ============================================================
   2. PRODUCT TABS (Section 1)
   ============================================================ */
function initProductTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const prevBtn = document.getElementById('prevTab');
    const nextBtn = document.getElementById('nextTab');

    if (tabBtns.length === 0) return;

    let activeTabIndex = 0;

    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const targetContent = document.getElementById(tabId);

        if (targetBtn) targetBtn.classList.add('active');
        if (targetContent) targetContent.classList.add('active');

        tabBtns.forEach((btn, index) => {
            if (btn.dataset.tab === tabId) activeTabIndex = index;
        });

        animateProductsEntrance(targetContent);
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            const newIndex = (activeTabIndex - 1 + tabBtns.length) % tabBtns.length;
            switchTab(tabBtns[newIndex].dataset.tab);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const newIndex = (activeTabIndex + 1) % tabBtns.length;
            switchTab(tabBtns[newIndex].dataset.tab);
        });
    }
}

function animateProductsEntrance(container) {
    if (!container) return;
    const cards = container.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.4s ease';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/* ============================================================
   3. NEW ARRIVALS TABS (Section 2)
   ============================================================ */
function initNewArrivalsTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    if (navTabs.length === 0) return;

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                resetCarouselPosition(targetPanel);
                animateNewArrivalsEntrance(targetPanel);
            }
        });
    });
}

function animateNewArrivalsEntrance(panel) {
    if (!panel) return;
    const cards = panel.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(30px)';
        card.style.transition = 'all 0.5s ease';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, index * 120);
    });
}

/* ============================================================
   4. NEW ARRIVALS CAROUSEL
   ============================================================ */
let carouselPositions = {};

function initNewArrivalsCarousel() {
    const tracks = document.querySelectorAll('.products-track');
    tracks.forEach(track => {
        const trackId = track.dataset.track;
        if (trackId) carouselPositions[trackId] = 0;
        addSwipeSupport(track);
    });
}

function resetCarouselPosition(panel) {
    if (!panel) return;
    const track = panel.querySelector('.products-track');
    if (track) {
        const trackId = track.dataset.track;
        carouselPositions[trackId] = 0;
        track.style.transform = 'translateX(0)';
    }
}

function addSwipeSupport(track) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        isDragging = true;
        track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const trackId = track.dataset.track;
        const currentPos = carouselPositions[trackId] || 0;
        track.style.transform = `translateX(calc(${currentPos}% + ${diff}px))`;
    }, { passive: true });

    track.addEventListener('touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        const diff = currentX - startX;
        const trackId = track.dataset.track;
        if (Math.abs(diff) > 50) {
            moveCarousel(trackId, diff > 0 ? 'prev' : 'next');
        } else {
            const currentPos = carouselPositions[trackId] || 0;
            track.style.transform = `translateX(${currentPos}%)`;
        }
    });
}

function moveCarousel(trackId, direction) {
    const track = document.querySelector(`.products-track[data-track="${trackId}"]`);
    if (!track) return;
    const cards = track.querySelectorAll('.product-card');
    const cardWidth = 25;
    const maxPosition = -(cards.length - 4) * cardWidth;
    let currentPos = carouselPositions[trackId] || 0;

    if (direction === 'next') {
        currentPos -= cardWidth;
        if (currentPos < maxPosition) currentPos = maxPosition;
    } else {
        currentPos += cardWidth;
        if (currentPos > 0) currentPos = 0;
    }

    carouselPositions[trackId] = currentPos;
    track.style.transform = `translateX(${currentPos}%)`;
}

/* ============================================================
   5. MOBILE MENU
   ============================================================ */
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const topnav = document.querySelector('.topnav');

    if (!toggle || !topnav) return;

    toggle.addEventListener('click', function() {
        topnav.classList.toggle('active');
        const icon = toggle.querySelector('i');
        if (topnav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    const topnavItems = document.querySelectorAll('.topnavitem');
    topnavItems.forEach(item => {
        const link = item.querySelector('.topnavlink');
        const submenu = item.querySelector('.submenu');
        if (link && submenu && window.innerWidth <= 768) {
            link.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    item.classList.toggle('active');
                }
            });
        }
    });
}

/* ============================================================
   6. LANGUAGE DROPDOWN
   ============================================================ */
function initLanguageDropdown() {
    const langOptions = document.querySelectorAll('.lang-option');
    const langSelected = document.querySelector('.lang-selected span');
    const langSelectedImg = document.querySelector('.lang-selected .fa-icon');

    if (langOptions.length === 0) return;

    langOptions.forEach(option => {
        option.addEventListener('click', function() {
            langOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const langText = this.querySelector('span').textContent;
            const langImg = this.querySelector('.fa-icon').src;
            if (langSelected) langSelected.textContent = langText;
            if (langSelectedImg) langSelectedImg.src = langImg;
            localStorage.setItem('selectedLanguage', this.dataset.value);
            showToast(`زبان به ${langText} تغییر یافت`);
        });
    });

    const savedLang = localStorage.getItem('selectedLanguage');
    if (savedLang) {
        const savedOption = document.querySelector(`.lang-option[data-value="${savedLang}"]`);
        if (savedOption) savedOption.click();
    }
}

/* ============================================================
   7. SEARCH BOX
   ============================================================ */
function initSearchBox() {
    const searchInput = document.querySelector('.searchinput');
    const searchBtn = document.querySelector('.btnsearch');

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
        searchInput.addEventListener('focus', function() {
            this.parentElement.style.boxShadow = '0 0 0 3px rgba(244, 161, 55, 0.3)';
        });
        searchInput.addEventListener('blur', function() {
            this.parentElement.style.boxShadow = 'none';
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performSearch();
        });
    }
}

function performSearch() {
    const searchInput = document.querySelector('.searchinput');
    const categorySelect = document.querySelector('.categorylist');
    const query = searchInput ? searchInput.value.trim() : '';
    const categoryText = categorySelect ? categorySelect.options[categorySelect.selectedIndex].text : '';

    if (!query) {
        showToast('لطفاً عبارتی برای جستجو وارد کنید', 'warning');
        searchInput.focus();
        return;
    }

    showToast(`جستجو برای "${query}" در دسته ${categoryText}...`);
    setTimeout(() => {
        showToast(`${Math.floor(Math.random() * 50) + 10} محصول یافت شد`);
    }, 1000);
}

/* ============================================================
   8. CART ACTIONS
   ============================================================ */
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function initCartActions() {
    const actionBtns = document.querySelectorAll('.products-grid .action-btn');
    actionBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon && icon.classList.contains('fa-shopping-cart')) {
            btn.addEventListener('click', function() {
                const card = this.closest('.product-card');
                const productName = card.querySelector('.product-name').textContent;
                const priceText = card.querySelector('.current-price').textContent;
                addToCartStorage(productName, priceText);
            });
        }
    });

    const saleCartBtns = document.querySelectorAll('.sale-info .btn-cart');
    saleCartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.sale-card');
            const productName = card.querySelector('.sale-name').textContent;
            const priceText = card.querySelector('.sale-price').textContent;
            addToCartStorage(productName, priceText);
        });
    });

    updateCartDisplay();
}

function addToCartStorage(productName, price) {
    const product = {
        name: productName.trim(),
        price: price,
        quantity: 1,
        id: Date.now()
    };

    const existingItem = cart.find(item => item.name === product.name);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push(product);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showToast(`"${productName.trim()}" به سبد خرید اضافه شد`);
    animateCartIcon();
}

function addToCart(btn) {
    const card = btn.closest('.product-card');
    const productName = card.querySelector('.product-name').textContent;
    const priceText = card.querySelector('.current-price').textContent;

    btn.innerHTML = '<span>&#10003;</span> اضافه شد';
    btn.classList.add('added');
    setTimeout(() => {
        btn.innerHTML = '<span>&#128722;</span> افزودن به سبد خرید';
        btn.classList.remove('added');
    }, 2000);

    addToCartStorage(productName, priceText);
}

function updateCartDisplay() {
    const cartInfo = document.querySelector('.cartinfo span:last-child');
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cartInfo) {
        cartInfo.textContent = cartCount > 0 ? `${cartCount} محصول در سبد خرید` : 'سبد خرید خالی است';
    }
}

function animateCartIcon() {
    const cartIcon = document.querySelector('.carticon i');
    if (cartIcon) {
        cartIcon.style.transform = 'scale(1.3)';
        cartIcon.style.transition = 'transform 0.2s ease';
        setTimeout(() => {
            cartIcon.style.transform = 'scale(1)';
        }, 200);
    }
}

/* ============================================================
   9. WISHLIST
   ============================================================ */
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

function initWishlist() {
    const wishlistBtns = document.querySelectorAll('.products-grid .action-btn');
    wishlistBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon && icon.classList.contains('fa-heart')) {
            btn.addEventListener('click', function() {
                const card = this.closest('.product-card');
                const productName = card.querySelector('.product-name').textContent;
                toggleWishlistItem(productName, this);
            });
        }
    });

    const newArrivalWishlistBtns = document.querySelectorAll('.container-new-arrivals .btn-wishlist');
    newArrivalWishlistBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            toggleWishlistBtn(this);
        });
    });

    const saleWishlistBtns = document.querySelectorAll('.sale-info .btn-wishlist');
    saleWishlistBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.sale-card');
            const productName = card.querySelector('.sale-name').textContent;
            toggleWishlistItem(productName, this);
        });
    });
}

function toggleWishlistBtn(btn) {
    const card = btn.closest('.product-card');
    const productName = card.querySelector('.product-name').textContent;

    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        btn.innerHTML = '&#9829;';
        if (!wishlist.includes(productName)) wishlist.push(productName);
        showToast(`"${productName}" به لیست علاقه‌مندی‌ها اضافه شد`);
    } else {
        btn.innerHTML = '&#9825;';
        wishlist = wishlist.filter(item => item !== productName);
        showToast(`"${productName}" از لیست علاقه‌مندی‌ها حذف شد`);
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

function toggleWishlistItem(productName, btn) {
    const isActive = btn.classList.toggle('active');
    if (isActive) {
        if (!wishlist.includes(productName)) wishlist.push(productName);
        showToast(`"${productName}" به لیست علاقه‌مندی‌ها اضافه شد`);
    } else {
        wishlist = wishlist.filter(item => item !== productName);
        showToast(`"${productName}" از لیست علاقه‌مندی‌ها حذف شد`);
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

/* ============================================================
   10. COMPARE
   ============================================================ */
let compareList = JSON.parse(localStorage.getItem('compare')) || [];

function initCompare() {
    const compareBtns = document.querySelectorAll('.products-grid .action-btn');
    compareBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon && icon.classList.contains('fa-exchange-alt')) {
            btn.addEventListener('click', function() {
                const card = this.closest('.product-card');
                const productName = card.querySelector('.product-name').textContent;
                addToCompareList(productName, this);
            });
        }
    });

    const newArrivalCompareBtns = document.querySelectorAll('.container-new-arrivals .btn-compare');
    newArrivalCompareBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.product-card');
            const productName = card.querySelector('.product-name').textContent;
            addToCompareList(productName, this);
        });
    });

    const saleCompareBtns = document.querySelectorAll('.sale-info .btn-compare');
    saleCompareBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.sale-card');
            const productName = card.querySelector('.sale-name').textContent;
            addToCompareList(productName, this);
        });
    });
}

function addToCompareList(productName, btn) {
    if (compareList.includes(productName)) {
        showToast('این محصول قبلاً به لیست مقایسه اضافه شده است', 'warning');
        return;
    }
    if (compareList.length >= 4) {
        showToast('حداکثر ۴ محصول می‌توانید مقایسه کنید', 'warning');
        return;
    }
    compareList.push(productName);
    localStorage.setItem('compare', JSON.stringify(compareList));
    showToast(`"${productName}" به لیست مقایسه اضافه شد (${compareList.length}/4)`);
}

/* ============================================================
   11. QUICK VIEW
   ============================================================ */
function initQuickView() {
    const viewMessages = document.querySelectorAll('.view-message');
    viewMessages.forEach(msg => {
        msg.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            const productName = card.querySelector('.product-name').textContent;
            const productImage = card.querySelector('.main-img').src;
            const productPrice = card.querySelector('.current-price').textContent;
            showQuickViewModal(productName, productImage, productPrice);
        });
    });
}

function showQuickViewModal(name, image, price) {
    const existingModal = document.querySelector('.quick-view-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'quick-view-modal';
    modal.innerHTML = `
        <div class="quick-view-overlay"></div>
        <div class="quick-view-content">
            <button class="quick-view-close">&times;</button>
            <div class="quick-view-body">
                <div class="quick-view-image">
                    <img src="${image}" alt="${name}">
                </div>
                <div class="quick-view-info">
                    <h3>${name}</h3>
                    <div class="quick-view-price">${price}</div>
                    <p class="quick-view-desc">این یک محصول با کیفیت عالی است که برای شما انتخاب شده است.</p>
                    <div class="quick-view-actions">
                        <button class="btn-add-cart" onclick="addToCartStorage('${name}', '${price}')">
                            <i class="fas fa-shopping-cart"></i> افزودن به سبد خرید
                        </button>
                        <button class="btn-wishlist" onclick="toggleWishlistItem('${name}', this)">&#9825;</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center;`;

    const overlay = modal.querySelector('.quick-view-overlay');
    overlay.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);`;

    const content = modal.querySelector('.quick-view-content');
    content.style.cssText = `position: relative; background: #fff; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: modalSlideIn 0.3s ease;`;

    const closeBtn = modal.querySelector('.quick-view-close');
    closeBtn.style.cssText = `position: absolute; top: 10px; left: 10px; background: none; border: none; font-size: 28px; cursor: pointer; color: #666; z-index: 10; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;`;
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#f0f0f0');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'none');

    const body = modal.querySelector('.quick-view-body');
    body.style.cssText = `display: flex; gap: 25px; padding: 30px; direction: rtl;`;

    const imgDiv = modal.querySelector('.quick-view-image');
    imgDiv.style.cssText = 'flex-shrink: 0; width: 250px;';
    imgDiv.querySelector('img').style.cssText = 'width: 100%; border-radius: 8px;';

    const info = modal.querySelector('.quick-view-info');
    info.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 12px;';
    info.querySelector('h3').style.cssText = 'margin: 0; font-size: 1.3em; color: #333;';
    info.querySelector('.quick-view-price').style.cssText = 'font-size: 1.5em; font-weight: bold; color: #e74c3c;';
    info.querySelector('.quick-view-desc').style.cssText = 'color: #666; line-height: 1.6; margin: 0;';

    const actions = modal.querySelector('.quick-view-actions');
    actions.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
    actions.querySelector('.btn-add-cart').style.cssText = `flex: 1; padding: 12px; background: #e74c3c; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; transition: all 0.3s;`;
    actions.querySelector('.btn-wishlist').style.cssText = `width: 44px; height: 44px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; font-size: 20px; color: #666; transition: all 0.3s;`;

    if (!document.getElementById('modal-animations')) {
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
            @keyframes modalSlideIn {
                from { opacity: 0; transform: translateY(-30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (max-width: 600px) {
                .quick-view-body { flex-direction: column !important; }
                .quick-view-image { width: 100% !important; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handler);
        }
    });
}

/* ============================================================
   12. FEATURED THUMBNAILS
   ============================================================ */
function initFeaturedThumbnails() {
    const thumbnailContainers = document.querySelectorAll('.featured-thumbnails');
    thumbnailContainers.forEach(container => {
        const thumbnails = container.querySelectorAll('img');
        const card = container.closest('.product-card');
        const mainImg = card.querySelector('.main-img');
        const hoverImg = card.querySelector('.hover-img');

        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function() {
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                if (mainImg) {
                    mainImg.style.opacity = '0';
                    setTimeout(() => {
                        mainImg.src = this.src;
                        mainImg.style.opacity = '1';
                    }, 150);
                }
                if (hoverImg) hoverImg.src = this.src;
            });
        });
    });
}

/* ============================================================
   13. SCROLL EFFECTS
   ============================================================ */
function initScrollEffects() {
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        } else {
            header.style.boxShadow = 'none';
        }
        lastScroll = currentScroll;
    });

    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll('.container, .collections, .hotcategorys, .container-special-sale');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.6s ease';
        observer.observe(section);
    });
}

/* ============================================================
   14. TOAST NOTIFICATIONS
   ============================================================ */
let toastTimeout;

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');

    if (type === 'warning') toast.style.background = '#f39c12';
    else if (type === 'error') toast.style.background = '#e74c3c';
    else toast.style.background = '#27ae60';

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/* ============================================================
   15. NEWSLETTER
   ============================================================ */
function initNewsletter() {
    const newsletterBtn = document.querySelector('.newsletterinput .btnsearch');
    const newsletterInput = document.querySelector('.newsletterinput .searchinput');

    if (newsletterBtn) {
        newsletterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            subscribeNewsletter();
        });
    }

    if (newsletterInput) {
        newsletterInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') subscribeNewsletter();
        });
    }
}

function subscribeNewsletter() {
    const input = document.querySelector('.newsletterinput .searchinput');
    const email = input ? input.value.trim() : '';

    if (!email) {
        showToast('لطفاً ایمیل خود را وارد کنید', 'warning');
        return;
    }
    if (!isValidEmail(email)) {
        showToast('لطفاً یک ایمیل معتبر وارد کنید', 'warning');
        return;
    }

    showToast('با موفقیت در خبرنامه ثبت‌نام شدید!');
    if (input) input.value = '';

    let subscribers = JSON.parse(localStorage.getItem('newsletterSubscribers')) || [];
    if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem('newsletterSubscribers', JSON.stringify(subscribers));
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ============================================================
   16. FOOTER LINKS
   ============================================================ */
function initFooterLinks() {
    const footerLinks = document.querySelectorAll('.footermenulink');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') {
                e.preventDefault();
                const text = this.textContent.trim();
                showToast(`صفحه "${text}" به زودی راه‌اندازی می‌شود`);
            }
        });
    });
}

/* ============================================================
   17. HOT CATEGORIES
   ============================================================ */
function initHotCategories() {
    const hotCategoryItems = document.querySelectorAll('.hotcategoryitem');
    hotCategoryItems.forEach(item => {
        const links = item.querySelectorAll('.hotcategorylistlink');
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const text = this.textContent.trim();
                showToast(`در حال بارگذاری دسته‌بندی "${text}"...`);
            });
        });

        const viewBtn = item.querySelector('.btn_default');
        if (viewBtn) {
            viewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const title = item.querySelector('h4 a').textContent.trim();
                showToast(`در حال نمایش محصولات "${title}"...`);
            });
        }
    });
}

/* ============================================================
   18. TOP PRODUCTS
   ============================================================ */
function initTopProducts() {
    const topProductLinks = document.querySelectorAll('.topproductinfo a');
    topProductLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('در حال انتقال به صفحه محصول...');
        });
    });
}

/* ============================================================
   19. BANNER OVERLAY
   ============================================================ */
function initBannerOverlay() {
    const banners = document.querySelectorAll('.overly_image');
    banners.forEach(banner => {
        banner.addEventListener('click', function() {
            showToast('در حال بارگذاری بنر تبلیغاتی...');
        });
    });
}

/* ============================================================
   20. PRODUCT HOVER EFFECTS
   ============================================================ */
function initProductHover() {
    const allProductCards = document.querySelectorAll('.product-card, .sale-card');
    allProductCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    const collectionItems = document.querySelectorAll('.collectiondetailitem');
    collectionItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const img = this.querySelector('img');
            if (img) img.style.transform = 'scale(1.05)';
        });
        item.addEventListener('mouseleave', function() {
            const img = this.querySelector('img');
            if (img) img.style.transform = 'scale(1)';
        });
    });
}

/* ============================================================
   21. DEBOUNCE / THROTTLE
   ============================================================ */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* ============================================================
   22. WINDOW RESIZE
   ============================================================ */
window.addEventListener('resize', debounce(function() {
    if (window.innerWidth > 768) {
        const topnav = document.querySelector('.topnav');
        const toggleIcon = document.querySelector('.mobile-menu-toggle i');
        if (topnav) topnav.classList.remove('active');
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-times');
            toggleIcon.classList.add('fa-bars');
        }
    }
    const tracks = document.querySelectorAll('.products-track');
    tracks.forEach(track => {
        const trackId = track.dataset.track;
        if (trackId) {
            carouselPositions[trackId] = 0;
            track.style.transform = 'translateX(0)';
        }
    });
}, 250));

/* ============================================================
   23. ACCOUNT LINKS
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const accountLinks = document.querySelectorAll('.accountlistlink');
    accountLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const text = this.textContent.trim();
            showToast(`در حال انتقال به صفحه ${text}...`);
        });
    });
});

/* ============================================================
   24. COLLECTION LINKS
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const collectionLinks = document.querySelectorAll('.collectiondetaillink');
    collectionLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const title = this.closest('.collectiondetailitem').querySelector('.collectiondetailtitle').textContent;
            showToast(`در حال نمایش مجموعه "${title}"...`);
        });
    });
});

/* ============================================================
   25. NAVIGATION LINKS
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.topnavlink');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const hasSubmenu = this.nextElementSibling && this.nextElementSibling.classList.contains('submenu');
            if (!hasSubmenu || window.innerWidth <= 768) {
                if (this.getAttribute('href') === '#') {
                    e.preventDefault();
                    const text = this.textContent.trim().replace('HOT', '').trim();
                    showToast(`صفحه "${text}" به زودی راه‌اندازی می‌شود`);
                }
            }
        });
    });

    const submenuLinks = document.querySelectorAll('.submenu-list a');
    submenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const text = this.textContent.trim();
            showToast(`در حال بارگذاری "${text}"...`);
        });
    });
});

/* ============================================================
   26. SOCIAL LINKS
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const socialLinks = document.querySelectorAll('.sociallink');
    socialLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const icon = this.querySelector('i');
            let platform = 'شبکه اجتماعی';
            if (icon.classList.contains('fa-facebook-f')) platform = 'Facebook';
            else if (icon.classList.contains('fa-twitter')) platform = 'Twitter';
            else if (icon.classList.contains('fa-google-plus-g')) platform = 'Google+';
            else if (icon.classList.contains('fa-instagram')) platform = 'Instagram';
            showToast(`در حال باز کردن ${platform}...`);
        });
    });
});

/* ============================================================
   27. CART ICON CLICK
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const cartIcon = document.querySelector('.carticon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function() {
            if (cart.length === 0) {
                showToast('سبد خرید شما خالی است', 'warning');
            } else {
                showToast(`${cart.length} محصول در سبد خرید شما وجود دارد`);
            }
        });
    }
});

/* ============================================================
   28. CONTACT INFO
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const contactUs = document.querySelector('.contactus');
    if (contactUs) {
        contactUs.addEventListener('click', function() {
            showToast('شماره تماس: 09151471112');
        });
    }
});

/* ============================================================
   29. COPYRIGHT PAYMENT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    const paymentDiv = document.querySelector('.copyright-peyment');
    if (paymentDiv) {
        paymentDiv.addEventListener('click', function() {
            showToast('درگاه پرداخت آنلاین');
        });
    }
});

/* ============================================================
   30. CONSOLE WELCOME
   ============================================================ */
console.log('%c مارکت ', 'background: #f4a137; color: #fff; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px;');
console.log('%cقالب چندمنظوره HTML5/CSS3 پریمیوم', 'color: #232f3e; font-size: 14px;');
console.log('%cDeveloped with love', 'color: #e74c3c; font-size: 12px;');