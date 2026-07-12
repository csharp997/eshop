   // ====== Tab Switching ======
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        let currentTab = 0;

        function switchTab(index) {
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            tabBtns[index].classList.add('active');
            tabContents[index].classList.add('active');
            currentTab = index;
        }

        tabBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => switchTab(index));
        });

        // Arrow navigation
        document.getElementById('prevTab').addEventListener('click', () => {
            const newIndex = (currentTab - 1 + tabBtns.length) % tabBtns.length;
            switchTab(newIndex);
        });

        document.getElementById('nextTab').addEventListener('click', () => {
            const newIndex = (currentTab + 1) % tabBtns.length;
            switchTab(newIndex);
        });

        // ====== Featured Product Thumbnail Switching ======
        document.querySelectorAll('.featured-thumbnails img').forEach(thumb => {
            thumb.addEventListener('click', function() {
                const parent = this.closest('.product-card');
                const mainImg = parent.querySelector('.product-image img');

                // Remove active from all thumbnails
                parent.querySelectorAll('.featured-thumbnails img').forEach(t => t.classList.remove('active'));
                // Add active to clicked thumbnail
                this.classList.add('active');

                // Change main image with fade effect
                mainImg.style.opacity = '0';
                setTimeout(() => {
                    mainImg.src = this.src;
                    mainImg.style.opacity = '1';
                }, 200);
            });
        });

        // ====== Image Slider ======
        (function() {
            var slides = document.querySelectorAll('.l_ads img');
            var dots = document.querySelectorAll('.slider-dot');
            var current = 0;
            var total = slides.length;
            var interval = 4000;

            function showSlide(index) {
                slides.forEach(function(slide) { slide.classList.remove('active'); });
                dots.forEach(function(dot) { dot.classList.remove('active'); });
                slides[index].classList.add('active');
                dots[index].classList.add('active');
                current = index;
            }

            function nextSlide() {
                showSlide((current + 1) % total);
            }

            var timer = setInterval(nextSlide, interval);

            dots.forEach(function(dot, idx) {
                dot.addEventListener('click', function() {
                    clearInterval(timer);
                    showSlide(idx);
                    timer = setInterval(nextSlide, interval);
                });
            });
        })();

        /*Tab Switching 2 */
         const carouselState = {
    tab1: { position: 0, visible: 4 },
    tab2: { position: 0, visible: 4 },
    tab3: { position: 0, visible: 4 }
  };
  
  let currentTab = 'tab1';
  
  function updateVisibleCards() {
    const width = window.innerWidth;
    let visible = 4;
    if (width <= 480) visible = 1;
    else if (width <= 768) visible = 2;
    else if (width <= 992) visible = 3;
    
    carouselState.tab1.visible = visible;
    carouselState.tab2.visible = visible;
    carouselState.tab3.visible = visible;
  }
  
  function getActiveTrack() {
    return document.querySelector('.tab-panel.active .products-track');
  }
  
  function getActiveCards() {
    const track = getActiveTrack();
    return track ? Array.from(track.querySelectorAll('.product-card')) : [];
  }
  
  function updateCarousel() {
    const track = getActiveTrack();
    if (!track) return;
    
    const cards = getActiveCards();
    const state = carouselState[currentTab];
    const cardWidth = cards[0]?.offsetWidth + 20 || 0;
    const maxPosition = Math.max(0, cards.length - state.visible);
    
    state.position = Math.min(state.position, maxPosition);
    state.position = Math.max(0, state.position);
    
    track.style.transform = `translateX(${state.position * cardWidth}px)`;
    
    document.getElementById('prevBtn').disabled = state.position === 0;
    document.getElementById('nextBtn').disabled = state.position >= maxPosition;
  }
  
  function slideNext() {
    const state = carouselState[currentTab];
    const cards = getActiveCards();
    const maxPosition = Math.max(0, cards.length - state.visible);
    
    if (state.position < maxPosition) {
      state.position++;
      updateCarousel();
    }
  }
  
  function slidePrev() {
    const state = carouselState[currentTab];
    if (state.position > 0) {
      state.position--;
      updateCarousel();
    }
  }
  
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const targetTab = tab.dataset.tab;
      currentTab = targetTab;
      
      panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === targetTab) {
          panel.classList.add('active');
        }
      });
      
      setTimeout(updateCarousel, 50);
    });
  });
  
  document.getElementById('nextBtn').addEventListener('click', slideNext);
  document.getElementById('prevBtn').addEventListener('click', slidePrev);
  
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
  
  function addToCart(btn) {
    btn.classList.toggle('added');
    const isAdded = btn.classList.contains('added');
    btn.innerHTML = isAdded ? '<span>&#10003;</span> اضافه شد' : '<span>&#128722;</span> افزودن به سبد خرید';
    showToast(isAdded ? 'محصول به سبد خرید اضافه شد' : 'محصول از سبد خرید حذف شد');
  }
  
  function toggleWishlist(btn) {
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');
    btn.innerHTML = isActive ? '&#10084;' : '&#9825;';
    showToast(isActive ? 'محصول به علاقه‌مندی‌ها اضافه شد' : 'محصول از علاقه‌مندی‌ها حذف شد');
  }
  
  function addToCompare(btn) {
    showToast('محصول به لیست مقایسه اضافه شد');
  }
  
  window.addEventListener('resize', () => {
    updateVisibleCards();
    updateCarousel();
  });
  
  updateVisibleCards();
  setTimeout(updateCarousel, 100);