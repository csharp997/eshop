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

// ====== NEWSLETTER SUBSCRIPTION ======
document.addEventListener('DOMContentLoaded', function() {
    const newsletterBtn = document.querySelector('.newsletterinput .btnsearch');
    const newsletterInput = document.querySelector('.newsletterinput .searchinput');

    if (newsletterBtn && newsletterInput) {
        newsletterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const email = newsletterInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                showToast('لطفاً ایمیل خود را وارد کنید');
                return;
            }
            if (!emailRegex.test(email)) {
                showToast('لطفاً یک ایمیل معتبر وارد کنید');
                return;
            }
            showToast('ثبت‌نام در خبرنامه با موفقیت انجام شد!');
            newsletterInput.value = '';
        });

        newsletterInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') newsletterBtn.click();
        });
    }
});

// ====== SCROLL TO TOP ======
document.addEventListener('DOMContentLoaded', function() {
    // Create scroll-to-top button
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.id = 'scrollTopBtn';
    scrollTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    scrollTopBtn.title = 'بازگشت به بالا';
    scrollTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 45px;
        height: 45px;
        background: #f4a137;
        color: #fff;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    document.body.appendChild(scrollTopBtn);

    scrollTopBtn.addEventListener('mouseenter', function() {
        this.style.background = '#333';
        this.style.transform = 'translateY(-3px)';
    });
    scrollTopBtn.addEventListener('mouseleave', function() {
        this.style.background = '#f4a137';
        this.style.transform = 'translateY(0)';
    });

    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopBtn.style.display = 'flex';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });
});

// ====== LAZY LOADING IMAGES ======
document.addEventListener('DOMContentLoaded', function() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '50px 0px' });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
});

// ====== HEADER STICKY ON SCROLL ======
document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('.header');
    const mainnav = document.querySelector('.mainnav');
    if (!header || !mainnav) return;

    const navOffset = mainnav.offsetTop;

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > navOffset) {
            mainnav.style.position = 'fixed';
            mainnav.style.top = '0';
            mainnav.style.right = '0';
            mainnav.style.left = '0';
            mainnav.style.zIndex = '1000';
            mainnav.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            document.body.style.paddingTop = mainnav.offsetHeight + 'px';
        } else {
            mainnav.style.position = '';
            mainnav.style.top = '';
            mainnav.style.right = '';
            mainnav.style.left = '';
            mainnav.style.zIndex = '';
            mainnav.style.boxShadow = '';
            document.body.style.paddingTop = '';
        }
    });
});

// ====== PRODUCT QUICK VIEW MODAL ======
document.addEventListener('DOMContentLoaded', function() {
    // Create modal elements
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'quickViewModal';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0; right: 0; bottom: 0; left: 0;
        background: rgba(0,0,0,0.6);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #fff;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        padding: 30px;
        position: relative;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        direction: rtl;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        left: 15px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
        width: 35px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
    `;
    closeBtn.addEventListener('mouseenter', function() {
        this.style.background = '#f4a137';
        this.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'none';
        this.style.color = '#666';
    });

    modalContent.appendChild(closeBtn);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    function openModal(contentHTML) {
        modalContent.innerHTML = '';
        modalContent.appendChild(closeBtn);
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = contentHTML;
        modalContent.appendChild(contentDiv);
        modalOverlay.style.display = 'flex';
        setTimeout(() => {
            modalOverlay.style.opacity = '1';
            modalContent.style.transform = 'scale(1)';
        }, 10);
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.style.opacity = '0';
        modalContent.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });

    // Attach to view-message buttons in Section 1
    document.querySelectorAll('.products-grid .view-message').forEach(viewBtn => {
        viewBtn.style.cursor = 'pointer';
        viewBtn.addEventListener('click', function() {
            const card = this.closest('.product-card');
            if (!card) return;
            const img = card.querySelector('.main-img');
            const name = card.querySelector('.product-name');
            const price = card.querySelector('.current-price');
            const rating = card.querySelector('.product-rating');

            const modalHTML = `
                <div style="text-align: center;">
                    <img src="${img ? img.src : ''}" alt="" style="max-width: 250px; max-height: 250px; object-fit: contain; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-bottom: 10px;">${name ? name.textContent : ''}</h2>
                    <div style="margin-bottom: 10px;">${rating ? rating.innerHTML : ''}</div>
                    <div style="font-size: 1.5em; color: #e74c3c; font-weight: bold; margin-bottom: 20px;">${price ? price.textContent : ''}</div>
                    <p style="color: #666; line-height: 1.8; margin-bottom: 20px;">
                        این محصول با کیفیت عالی و قیمت مناسب در دسترس است. برای اطلاعات بیشتر با ما تماس بگیرید.
                    </p>
                    <button class="btn_default" style="padding: 10px 30px; font-size: 14px; cursor: pointer;" onclick="showToast('محصول به سبد خرید اضافه شد'); closeModal();">
                        <i class="fas fa-shopping-cart"></i> افزودن به سبد خرید
                    </button>
                </div>
            `;
            openModal(modalHTML);
        });
    });

    // Make closeModal globally accessible
    window.closeModal = closeModal;
});

// ====== ANIMATION ON SCROLL (AOS-like) ======
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll(
        '.product-card, .sale-card, .hotcategoryitem, .collectionitem, .topproductitem'
    );

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    animatedElements.forEach(el => observer.observe(el));
});

// ====== CART COUNTER ======
document.addEventListener('DOMContentLoaded', function() {
    let cartCount = 0;
    const cartInfo = document.querySelector('.cartinfo span:last-child');
    const originalCartText = cartInfo ? cartInfo.textContent : '';

    // Override addToCart to update counter
    const originalAddToCart = window.addToCart;
    window.addToCart = function(btn) {
        cartCount++;
        if (cartInfo) {
            cartInfo.textContent = cartCount + ' محصول در سبد خرید';
        }
        // Call original behavior
        btn.classList.add('added');
        btn.innerHTML = '<span>&#10003;</span> اضافه شد';
        showToast('محصول به سبد خرید اضافه شد');
        setTimeout(() => {
            btn.classList.remove('added');
            btn.innerHTML = '<span>&#128722;</span> افزودن به سبد خرید';
        }, 2000);
    };
});

// ====== DROPDOWN LANGUAGE CLOSE ON CLICK OUTSIDE ======
document.addEventListener('DOMContentLoaded', function() {
    const langDropdown = document.querySelector('.lang-dropdown');
    if (langDropdown) {
        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target)) {
                // Dropdown closes automatically via CSS hover, but this ensures mobile behavior
            }
        });
    }
});

// ====== SMOOTH SCROLL FOR ANCHOR LINKS ======
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

// ====== TOOLTIP FOR ACTION BUTTONS ======
document.addEventListener('DOMContentLoaded', function() {
    const tooltipData = {
        'fa-shopping-cart': 'افزودن به سبد خرید',
        'fa-heart': 'افزودن به علاقه‌مندی‌ها',
        'fa-exchange-alt': 'مقایسه محصول',
        'fa-eye': 'نمای سریع'
    };

    document.querySelectorAll('.action-btn, .view-message').forEach(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return;
        const iconClass = Array.from(icon.classList).find(c => tooltipData[c]);
        if (!iconClass) return;

        btn.setAttribute('title', tooltipData[iconClass]);
    });
});